import { normalizeArabicText, normalizeArabicTextPreserveLines, easternToWestern, extractAmountFromInlineExpense, extractAllAmounts } from './ArabicAmountParser.js';

export interface ExtractedExpense {
  amount: number;
  description: string;
  raw: string;
  lineIndex: number;
}

export function extractInlineExpense(messageText: string): ExtractedExpense | null {
  const result = extractAmountFromInlineExpense(messageText);
  if (!result) return null;

  return {
    amount: result.amount,
    description: result.description,
    raw: result.raw,
    lineIndex: 0,
  };
}

export function splitMultiLineExpenses(messageText: string): ExtractedExpense[] {
  const text = normalizeArabicTextPreserveLines(messageText);
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  if (lines.length < 2) return [];

  const expenses: ExtractedExpense[] = [];
  let financialLineCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = easternToWestern(lines[i]);
    const result = extractAmountFromInlineExpense(line);
    if (result) {
      financialLineCount++;
      expenses.push({
        amount: result.amount,
        description: result.description,
        raw: line,
        lineIndex: i,
      });
    } else {
      const amounts = extractAllAmounts(line);
      if (amounts.length > 0) {
        financialLineCount++;
        const arabicText = line.replace(/\d[\d,.]*\s*/g, '').trim();
        for (const amt of amounts) {
          expenses.push({
            amount: amt.value,
            description: arabicText || line,
            raw: line,
            lineIndex: i,
          });
        }
      }
    }
  }

  if (financialLineCount >= 2) {
    return expenses;
  }

  return [];
}

export function extractExpenses(messageText: string): ExtractedExpense[] {
  const multiLine = splitMultiLineExpenses(messageText);
  if (multiLine.length >= 2) {
    return multiLine;
  }

  const inline = extractInlineExpense(messageText);
  if (inline) {
    return [inline];
  }

  return [];
}
