import { normalizeArabicText } from './ArabicAmountParser.js';
import { safeParseNum } from '../../utils/safe-numbers.js';

const MOHAMMAD_HASSAN_NAJJAR_ID = 'd9f327e5';
const JARAHI_PROJECT_IDS = ['6c9d8a97', '00735182'];

const KNOWN_CARPENTERS_JARAHI = [
  { id: '8f1dc035', name: 'بدر نجار الجراحي' },
  { id: '1c7ab56f', name: 'نجار الجراحي' },
  { id: 'a95b1744', name: 'نجار الجراحي رقم 2' },
  { id: '28b939fb', name: 'مساعد نحار الجراحي' },
];

const NAJJAR_KEYWORDS = ['نجار', 'محمد حسن', 'نحار'];

export interface CarpenterAggregationFlag {
  candidateId: number;
  reason: string;
  possibleCarpenters: Array<{ id: string; name: string }>;
}

export function detectCarpenterAggregation(
  candidateId: number,
  projectId: string | null,
  description: string | null,
  category: string | null
): CarpenterAggregationFlag | null {
  if (!projectId || !JARAHI_PROJECT_IDS.includes(projectId)) return null;

  const normalizedDesc = normalizeArabicText(description || '');

  const mentionsNajjar = NAJJAR_KEYWORDS.some(kw => normalizedDesc.includes(kw));
  const isCarpentryCat = category && ['carpentry', 'labor', 'wages'].includes(category);

  if (!mentionsNajjar && !isCarpentryCat) return null;

  if (mentionsNajjar) {
    return {
      candidateId,
      reason: 'possible_aggregated_carpenter_debt',
      possibleCarpenters: KNOWN_CARPENTERS_JARAHI,
    };
  }

  return null;
}

export interface LoanReconciliationResult {
  candidateId: number;
  matchedLoanId: number | null;
  isBalanced: boolean;
  reason: string;
}

export function reconcileLoans(
  batchCandidates: Array<{
    id: number;
    candidateType: string;
    amount: string | null;
    description: string | null;
  }>
): LoanReconciliationResult[] {
  const loans = batchCandidates.filter(c => c.candidateType === 'loan');
  const results: LoanReconciliationResult[] = [];

  const matched = new Set<number>();

  for (const loan of loans) {
    if (matched.has(loan.id)) continue;

    const loanAmount = safeParseNum(loan.amount);
    const matchingLoan = loans.find(
      other => other.id !== loan.id &&
      !matched.has(other.id) &&
      Math.abs(safeParseNum(other.amount) - loanAmount) < 1
    );

    if (matchingLoan) {
      matched.add(loan.id);
      matched.add(matchingLoan.id);
      results.push({
        candidateId: loan.id,
        matchedLoanId: matchingLoan.id,
        isBalanced: true,
        reason: `Matched with loan candidate #${matchingLoan.id}`,
      });
      results.push({
        candidateId: matchingLoan.id,
        matchedLoanId: loan.id,
        isBalanced: true,
        reason: `Matched with loan candidate #${loan.id}`,
      });
    } else {
      results.push({
        candidateId: loan.id,
        matchedLoanId: null,
        isBalanced: false,
        reason: 'Unmatched loan — no counterpart found',
      });
    }
  }

  return results;
}
