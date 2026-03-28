import { normalizeArabicText, easternToWestern } from './ArabicAmountParser.js';
import { safeParseNum } from '../../utils/safe-numbers.js';

export interface TransferReceiptResult {
  transferNumber: string;
  amount: number;
  fee: number;
  sender: string;
  recipient: string;
  companyName: string;
  date: string | null;
  patternType: 'rashad_bahir' | 'houshabi' | 'najm';
  raw: string;
}

export function parseRashadBahir(messageText: string): TransferReceiptResult | null {
  const text = normalizeArabicText(easternToWestern(messageText));

  if (!text.includes('رشاد') && !text.includes('بحير')) {
    return null;
  }

  let amount = 0;
  let fee = 0;
  let sender = '';
  let recipient = '';
  let transferNumber = '';

  const amountMatch = text.match(/(?:مبلغ\s*الحوالة|المبلغ)\s*:?\s*(\d[\d,.]*)/);
  if (amountMatch) {
    amount = safeParseNum(amountMatch[1]);
  }

  const feeMatch = text.match(/(?:خدمة\s*(?:التحويل|تحويل)|رسوم|عمولة)\s*:?\s*(\d[\d,.]*)/);
  if (feeMatch) {
    fee = safeParseNum(feeMatch[1]);
  }

  const recipientMatch = text.match(/(?:المستلم|اسم\s*المستلم)\s*:?\s*([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]+?)(?:\n|$|:|\d)/);
  if (recipientMatch) {
    recipient = recipientMatch[1].trim();
  }

  const senderMatch = text.match(/(?:المرسل|اسم\s*المرسل)\s*:?\s*([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]+?)(?:\n|$|:|\d)/);
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
    companyName: 'شركه رشاد بحير',
    date: null,
    patternType: 'rashad_bahir',
    raw: text,
  };
}

export function parseHoushabi(messageText: string): TransferReceiptResult | null {
  const text = normalizeArabicText(easternToWestern(messageText));

  const transferNumMatch = text.match(/رقم\s*:?\s*(202\d{9})/);
  if (!transferNumMatch) return null;

  const transferNumber = transferNumMatch[1];

  let amount = 0;
  const amountMatch = text.match(/(?:مبلغ|المبلغ|حوالة)\s*:?\s*(\d[\d,.]*)/);
  if (amountMatch) {
    amount = safeParseNum(amountMatch[1]);
  }

  if (!amount) {
    const numMatch = text.match(/(\d{4,})(?:\s*ريال)?/);
    if (numMatch && numMatch[1] !== transferNumber) {
      amount = safeParseNum(numMatch[1]);
    }
  }

  let sender = '';
  let recipient = '';
  const senderMatch = text.match(/(?:المرسل|من)\s*:?\s*([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]+?)(?:\n|$|:|\d)/);
  if (senderMatch) sender = senderMatch[1].trim();

  const recipientMatch = text.match(/(?:المستلم|الى|إلى)\s*:?\s*([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]+?)(?:\n|$|:|\d)/);
  if (recipientMatch) recipient = recipientMatch[1].trim();

  if (!amount || amount <= 0) return null;

  return {
    transferNumber,
    amount,
    fee: 0,
    sender,
    recipient,
    companyName: 'الحوشبي',
    date: null,
    patternType: 'houshabi',
    raw: text,
  };
}

export function parseNajm(messageText: string): TransferReceiptResult | null {
  const text = normalizeArabicText(easternToWestern(messageText));

  if (!text.includes('النجم')) return null;

  const transferNumMatch = text.match(/رقم\s*:?\s*(\d{6,12})/);
  if (!transferNumMatch) return null;

  const transferNumber = transferNumMatch[1];

  let amount = 0;
  const amountMatch = text.match(/(?:مبلغ|المبلغ|حوالة)\s*:?\s*(\d[\d,.]*)/);
  if (amountMatch) {
    amount = safeParseNum(amountMatch[1]);
  }

  if (!amount) {
    const numMatch = text.match(/(\d{4,})(?:\s*ريال)?/);
    if (numMatch && numMatch[1] !== transferNumber) {
      amount = safeParseNum(numMatch[1]);
    }
  }

  let sender = '';
  let recipient = '';
  const senderMatch = text.match(/(?:المرسل|من)\s*:?\s*([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]+?)(?:\n|$|:|\d)/);
  if (senderMatch) sender = senderMatch[1].trim();

  const recipientMatch = text.match(/(?:المستلم|الى|إلى)\s*:?\s*([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\s]+?)(?:\n|$|:|\d)/);
  if (recipientMatch) recipient = recipientMatch[1].trim();

  if (!amount || amount <= 0) return null;

  return {
    transferNumber,
    amount,
    fee: 0,
    sender,
    recipient,
    companyName: 'النجم',
    date: null,
    patternType: 'najm',
    raw: text,
  };
}

export function tryParseTransferReceipt(messageText: string): TransferReceiptResult | null {
  return parseRashadBahir(messageText)
    || parseHoushabi(messageText)
    || parseNajm(messageText);
}
