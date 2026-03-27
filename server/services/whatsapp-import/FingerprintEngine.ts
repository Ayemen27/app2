import { createHash } from 'crypto';
import { normalizeArabicText, easternToWestern } from './ArabicAmountParser.js';

export interface FingerprintComponents {
  amount: number;
  date: string;
  transferNumber?: string;
  description?: string;
  counterparty?: string;
  candidateType: string;
}

export function computeFingerprint(components: FingerprintComponents): string {
  if (components.transferNumber) {
    return hashString(`transfer:${components.transferNumber}`);
  }

  const normalizedDesc = normalizeArabicText(
    easternToWestern(components.description || '')
  ).slice(0, 20);

  const parts = [
    `amount:${components.amount}`,
    `date:${components.date}`,
    `type:${components.candidateType}`,
    `desc:${normalizedDesc}`,
  ];

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
  return date.toISOString().split('T')[0];
}

export function getDateWindow(dateStr: string, daysRange: number): { start: string; end: string } {
  const date = new Date(dateStr);
  const start = new Date(date);
  start.setDate(start.getDate() - daysRange);
  const end = new Date(date);
  end.setDate(end.getDate() + daysRange);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}
