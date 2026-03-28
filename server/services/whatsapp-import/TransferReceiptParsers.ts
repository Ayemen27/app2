import { normalizeArabicText, easternToWestern } from './ArabicAmountParser.js';
import { safeParseNum } from '../../utils/safe-numbers.js';
import { db } from '../../db.js';
import { waTransferCompanies } from '@shared/schema';
import { eq } from 'drizzle-orm';
import type { WaTransferCompany } from '@shared/schema';

export interface TransferReceiptResult {
  transferNumber: string;
  amount: number;
  fee: number;
  sender: string;
  recipient: string;
  companyName: string;
  date: string | null;
  patternType: string;
  raw: string;
}

class TransferCompanyRegistry {
  private cache: WaTransferCompany[] | null = null;
  private cacheExpiry = 0;

  async loadCompanies(): Promise<WaTransferCompany[]> {
    if (this.cache && Date.now() < this.cacheExpiry) {
      return this.cache;
    }
    try {
      this.cache = await db.select().from(waTransferCompanies)
        .where(eq(waTransferCompanies.isActive, true));
      this.cacheExpiry = Date.now() + 5 * 60 * 1000;
      return this.cache;
    } catch {
      return this.cache || [];
    }
  }

  clearCache(): void {
    this.cache = null;
    this.cacheExpiry = 0;
  }
}

export const transferCompanyRegistry = new TransferCompanyRegistry();

function parseDynamicCompany(messageText: string, company: WaTransferCompany): TransferReceiptResult | null {
  const text = normalizeArabicText(easternToWestern(messageText));

  const normalizedKeywords = company.keywordsNormalized || [];
  const hasKeyword = normalizedKeywords.some(k => text.includes(k));
  if (!hasKeyword) return null;

  let amount = 0;
  let fee = 0;
  let sender = '';
  let recipient = '';
  let transferNumber = '';

  const amountMatch = text.match(/(?:مبلغ\s*الحوالة|المبلغ|مبلغ|حوالة)\s*:?\s*(\d[\d,.]*)/);
  if (amountMatch) {
    amount = safeParseNum(amountMatch[1]);
  }

  if (!amount) {
    const numMatch = text.match(/(\d{4,})(?:\s*ريال)?/);
    const transferNumCandidate = text.match(/(?:رقم\s*:?\s*|رقم\s*الحوالة\s*:?\s*)(\d{4,})/);
    if (numMatch) {
      const numVal = numMatch[1];
      if (!transferNumCandidate || transferNumCandidate[1] !== numVal) {
        amount = safeParseNum(numVal);
      }
    }
  }

  const feeMatch = text.match(/(?:خدمة\s*(?:التحويل|تحويل)|رسوم|عمولة)\s*:?\s*(\d[\d,.]*)/);
  if (feeMatch) {
    fee = safeParseNum(feeMatch[1]);
  }

  const recipientMatch = text.match(/(?:المستلم|اسم\s*المستلم|إلى|الى)\s*:?\s*([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]+?)(?:\n|$|:|\d)/);
  if (recipientMatch) {
    recipient = recipientMatch[1].trim();
  }

  const senderMatch = text.match(/(?:المرسل|اسم\s*المرسل|من)\s*:?\s*([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]+?)(?:\n|$|:|\d)/);
  if (senderMatch) {
    sender = senderMatch[1].trim();
  }

  const transferNumMatch = text.match(/(?:رقم\s*الحوالة|الرقم\s*العام|رقم)\s*:?\s*(\d{4,})/);
  if (transferNumMatch) {
    transferNumber = transferNumMatch[1];
  }

  if (!amount || amount <= 0) return null;

  return {
    transferNumber,
    amount,
    fee,
    sender,
    recipient,
    companyName: company.displayName,
    date: null,
    patternType: company.code,
    raw: text,
  };
}

export function parseGenericTransfer(messageText: string): TransferReceiptResult | null {
  const text = normalizeArabicText(easternToWestern(messageText));

  const strongKeywords = ['حوالة', 'تحويل'];
  const weakKeywords = ['ارسال', 'استلام'];
  const hasStrongKeyword = strongKeywords.some(k => text.includes(k));
  const hasWeakKeyword = weakKeywords.some(k => text.includes(k));

  if (!hasStrongKeyword && !hasWeakKeyword) {
    return null;
  }

  const hasTransferNumber = /\d{6,}/.test(text);
  const hasRecipientLabel = /(?:المستلم|إلى|الى|لـ)\s*:/.test(text);

  const hasCurrencyMention = /ريال/.test(text);

  if (hasWeakKeyword && !hasStrongKeyword && !hasTransferNumber && !hasRecipientLabel) {
    return null;
  }

  if (hasStrongKeyword && !hasTransferNumber && !hasRecipientLabel && !hasCurrencyMention) {
    return null;
  }

  let amount = 0;
  const amountMatch = text.match(/(?:مبلغ|المبلغ|حوالة|بمبلغ)\s*:?\s*(\d[\d,.]*)/);
  if (amountMatch) {
    amount = safeParseNum(amountMatch[1].replace(/,/g, ''));
  }

  if (!amount) {
    const numMatch = text.match(/(\d{4,})(?:\s*ريال)?/);
    if (numMatch) {
      amount = safeParseNum(numMatch[1]);
    }
  }

  if (!amount || amount <= 0) return null;

  let transferNumber = '';
  const transferNumMatch = text.match(/(\d{6,})/);
  if (transferNumMatch) {
    transferNumber = transferNumMatch[1];
  }

  let recipient = '';
  const recipientMatch = text.match(/(?:المستلم|إلى|الى|لـ)\s*:?\s*([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]+?)(?:\n|$|:|\d)/);
  if (recipientMatch) {
    recipient = recipientMatch[1].trim();
  }

  let sender = '';
  const senderMatch = text.match(/(?:المرسل|من)\s*:?\s*([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]+?)(?:\n|$|:|\d)/);
  if (senderMatch) {
    sender = senderMatch[1].trim();
  }

  return {
    transferNumber,
    amount,
    fee: 0,
    sender,
    recipient,
    companyName: '',
    date: null,
    patternType: 'generic_transfer',
    raw: text,
  };
}

export async function tryParseTransferReceiptAsync(messageText: string): Promise<TransferReceiptResult | null> {
  const companies = await transferCompanyRegistry.loadCompanies();
  for (const company of companies) {
    const result = parseDynamicCompany(messageText, company);
    if (result) return result;
  }
  return parseGenericTransfer(messageText);
}

export function tryParseTransferReceipt(messageText: string): TransferReceiptResult | null {
  return parseGenericTransfer(messageText);
}
