import { createHash } from 'crypto';
import { normalizeArabicText, easternToWestern } from './ArabicAmountParser.js';

export interface FingerprintComponents {
  amount: number;
  date: string;
  transferNumber?: string;
  description?: string;
  counterparty?: string;
  candidateType: string;
  projectId?: string;
}

export function computeFingerprint(components: FingerprintComponents): string {
  if (components.transferNumber) {
    return hashString(`transfer:${components.transferNumber}`);
  }

  const normalizedDesc = normalizeArabicText(
    easternToWestern(components.description || '')
  ).slice(0, 50);

  const parts = [
    `amount:${components.amount}`,
    `date:${components.date}`,
    `type:${components.candidateType}`,
    `desc:${normalizedDesc}`,
  ];

  if (components.projectId) {
    parts.push(`project:${components.projectId}`);
  }

  if (components.counterparty) {
    parts.push(`counterparty:${normalizeArabicText(components.counterparty)}`);
  }

  return hashString(parts.join('|'));
}

export function computeCrossMatchKey(
  amount: number,
  dateStr: string,
  counterparty?: string
): string {
  const parts = [
    `amount:${amount}`,
    `date:${dateStr}`,
  ];
  if (counterparty) {
    parts.push(`counterparty:${normalizeArabicText(counterparty)}`);
  }
  return hashString(parts.join('|'));
}

function hashString(input: string): string {
  return createHash('sha256').update(input).digest('hex').slice(0, 32);
}

export function formatDateForFingerprint(date: Date): string {
  const d = date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getDateWindow(dateStr: string, daysRange: number): { start: string; end: string } {
  const date = new Date(dateStr);
  const start = new Date(date);
  start.setDate(start.getDate() - daysRange);
  const end = new Date(date);
  end.setDate(end.getDate() + daysRange);
  return {
    start: formatDateForFingerprint(start),
    end: formatDateForFingerprint(end),
  };
}
