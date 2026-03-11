const PBKDF2_ITERATIONS = 100000;
const PBKDF2_PREFIX = 'pbkdf2:';

function arrayBufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToArrayBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer;
}

function generateSalt(length: number = 16): string {
  const saltBytes = crypto.getRandomValues(new Uint8Array(length));
  return arrayBufferToHex(saltBytes.buffer);
}

async function pbkdf2Hash(password: string, saltHex: string, iterations: number): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const saltBuffer = hexToArrayBuffer(saltHex);

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  return arrayBufferToHex(derivedBits);
}

async function legacySha256(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return arrayBufferToHex(hashBuffer);
}

function isPbkdf2Hash(storedHash: string): boolean {
  return storedHash.startsWith(PBKDF2_PREFIX);
}

function parsePbkdf2Hash(storedHash: string): { salt: string; iterations: number; hash: string } | null {
  if (!isPbkdf2Hash(storedHash)) return null;
  const withoutPrefix = storedHash.slice(PBKDF2_PREFIX.length);
  const parts = withoutPrefix.split(':');
  if (parts.length !== 3) return null;
  const [salt, iterStr, hash] = parts;
  const iterations = parseInt(iterStr, 10);
  if (isNaN(iterations) || !salt || !hash) return null;
  return { salt, iterations, hash };
}

export async function hashPasswordForOffline(password: string): Promise<string> {
  const salt = generateSalt();
  const hash = await pbkdf2Hash(password, salt, PBKDF2_ITERATIONS);
  return `${PBKDF2_PREFIX}${salt}:${PBKDF2_ITERATIONS}:${hash}`;
}

export async function verifyOfflinePassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const parsed = parsePbkdf2Hash(storedHash);
    if (parsed) {
      const computedHash = await pbkdf2Hash(password, parsed.salt, parsed.iterations);
      return computedHash === parsed.hash;
    }

    if (/^[0-9a-f]{64}$/i.test(storedHash)) {
      const legacyHash = await legacySha256(password);
      return legacyHash === storedHash;
    }

    return false;
  } catch {
    return false;
  }
}
