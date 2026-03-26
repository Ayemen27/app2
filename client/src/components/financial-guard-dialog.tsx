import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Shield, Lightbulb, DollarSign, CheckCircle2, XCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export type GuardType = 'negative_balance' | 'overpaid_purchase' | 'large_amount';

export interface GuardSuggestion {
  id: string;
  label: string;
  description: string;
  action: 'proceed_with_note' | 'adjust_amount' | 'cancel';
  adjustedAmount?: number;
  icon?: 'check' | 'edit' | 'cancel';
}

export interface FinancialGuardData {
  type: GuardType;
  title: string;
  workerName?: string;
  projectName?: string;
  date?: string;
  currentBalance?: number;
  enteredAmount: number;
  resultingBalance?: number;
  totalInvoice?: number;
  suggestions: GuardSuggestion[];
  details: { label: string; value: string; color?: string }[];
  originalData: any;
}

interface FinancialGuardDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: {
    selectedSuggestion: string;
    adjustedAmount: number;
    guardNote: string;
    originalData: any;
  }) => void;
  data: FinancialGuardData | null;
}

export function FinancialGuardDialog({ open, onClose, onConfirm, data }: FinancialGuardDialogProps) {
  const [selectedSuggestion, setSelectedSuggestion] = useState<string>("");
  const [adjustedAmount, setAdjustedAmount] = useState(0);
  const [guardNote, setGuardNote] = useState("");
  const [showAmountInput, setShowAmountInput] = useState(false);

  useEffect(() => {
    if (data) {
      setSelectedSuggestion("");
      setAdjustedAmount(data.enteredAmount);
      setShowAmountInput(false);
      setGuardNote("");
    }
  }, [data]);

  const handleSelectSuggestion = (suggestion: GuardSuggestion) => {
    setSelectedSuggestion(suggestion.id);
    if (suggestion.action === 'adjust_amount') {
      setShowAmountInput(true);
      setAdjustedAmount(suggestion.adjustedAmount ?? data?.enteredAmount ?? 0);
      const autoNote = buildAutoNote(suggestion, suggestion.adjustedAmount ?? data?.enteredAmount ?? 0);
      setGuardNote(autoNote);
    } else if (suggestion.action === 'proceed_with_note') {
      setShowAmountInput(false);
      setAdjustedAmount(data?.enteredAmount ?? 0);
      const autoNote = buildAutoNote(suggestion, data?.enteredAmount ?? 0);
      setGuardNote(autoNote);
    } else if (suggestion.action === 'cancel') {
      onClose();
      return;
    }
  };

  const buildAutoNote = (suggestion: GuardSuggestion, amount: number) => {
    if (!data) return '';
    if (data.type === 'negative_balance') {
      const balance = data.currentBalance ?? 0;
      const resultBalance = balance - amount;
      return `⚠️ تنبيه الحارس المالي: تحويل ${formatCurrency(amount)} | الرصيد قبل: ${formatCurrency(balance)} | الرصيد بعد: ${formatCurrency(resultBalance)} | ${suggestion.label}`;
    }
    if (data.type === 'overpaid_purchase') {
      return `⚠️ تنبيه الحارس المالي: المبلغ المدفوع (${formatCurrency(amount)}) ${amount > (data.totalInvoice ?? 0) ? 'يتجاوز' : 'أقل من'} إجمالي الفاتورة (${formatCurrency(data.totalInvoice ?? 0)}) | ${suggestion.label}`;
    }
    if (data.type === 'large_amount') {
      return `⚠️ تنبيه: مبلغ كبير ${formatCurrency(amount)} | ${suggestion.label}`;
    }
    return '';
  };

  const handleAmountChange = (val: string) => {
    const num = parseFloat(val) || 0;
    setAdjustedAmount(num);
    const suggestion = data?.suggestions.find(s => s.id === selectedSuggestion);
    if (suggestion) {
      setGuardNote(buildAutoNote(suggestion, num));
    }
  };

  const handleConfirm = () => {
    if (!data || !selectedSuggestion) return;
    onConfirm({
      selectedSuggestion,
      adjustedAmount,
      guardNote,
      originalData: data.originalData,
    });
  };

  if (!data) return null;

  const selectedSug = data.suggestions.find(s => s.id === selectedSuggestion);
  const canConfirm = selectedSuggestion && selectedSug?.action !== 'cancel' && adjustedAmount > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <Shield className="h-5 w-5" />
            {data.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 space-y-1.5 text-sm">
            {data.details.map((detail, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-muted-foreground">{detail.label}:</span>
                <span className={`font-semibold ${detail.color || ''}`}>{detail.value}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Lightbulb className="h-4 w-4 text-blue-500" />
              <span>اختر الإجراء المناسب:</span>
            </div>

            {data.suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                onClick={() => handleSelectSuggestion(suggestion)}
                className={`w-full text-right p-3 rounded-lg border-2 transition-all ${
                  selectedSuggestion === suggestion.id
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-primary/50'
                }`}
                data-testid={`suggestion-${suggestion.id}`}
              >
                <div className="flex items-start gap-2">
                  {suggestion.icon === 'check' && <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />}
                  {suggestion.icon === 'edit' && <DollarSign className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />}
                  {suggestion.icon === 'cancel' && <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />}
                  {!suggestion.icon && <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />}
                  <div>
                    <p className="font-medium text-sm">{suggestion.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{suggestion.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {showAmountInput && (
            <div className="space-y-1.5 bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg">
              <Label htmlFor="guard-amount" className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" />
                المبلغ المعدّل
              </Label>
              <Input
                id="guard-amount"
                type="number"
                value={adjustedAmount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="text-center text-lg font-bold"
                min={0}
                data-testid="input-guard-adjusted-amount"
              />
            </div>
          )}

          {selectedSuggestion && selectedSug?.action !== 'cancel' && (
            <div className="space-y-1.5">
              <Label htmlFor="guard-note">ملاحظة (تلقائية — يمكنك تعديلها)</Label>
              <Textarea
                id="guard-note"
                value={guardNote}
                onChange={(e) => setGuardNote(e.target.value)}
                className="h-20 resize-none text-xs"
                dir="rtl"
                data-testid="input-guard-note"
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose} data-testid="button-guard-cancel">
            إلغاء
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="bg-primary"
            data-testid="button-guard-confirm"
          >
            <Shield className="h-4 w-4 ml-1" />
            تأكيد وحفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}