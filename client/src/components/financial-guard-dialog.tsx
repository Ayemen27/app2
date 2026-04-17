import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Shield, Lightbulb, DollarSign, CheckCircle2, XCircle, ShieldAlert, ChevronDown, ChevronUp, Info } from "lucide-react";
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

const MIN_NOTE_LENGTH = 10;

export function FinancialGuardDialog({ open, onClose, onConfirm, data }: FinancialGuardDialogProps) {
  const [selectedSuggestion, setSelectedSuggestion] = useState<string>("");
  const [adjustedAmount, setAdjustedAmount] = useState(0);
  const [guardNote, setGuardNote] = useState("");
  const [showAmountInput, setShowAmountInput] = useState(false);

  const [isNegativeOverride, setIsNegativeOverride] = useState(false);
  const [overrideExpanded, setOverrideExpanded] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  useEffect(() => {
    if (data) {
      setSelectedSuggestion("");
      setAdjustedAmount(data.enteredAmount);
      setShowAmountInput(false);
      setGuardNote("");
      setIsNegativeOverride(false);
      setOverrideExpanded(false);
      setOverrideReason("");
    }
  }, [data]);

  const handleSelectSuggestion = (suggestion: GuardSuggestion) => {
    setIsNegativeOverride(false);
    setOverrideReason("");
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

  const handleNegativeOverride = () => {
    setIsNegativeOverride(true);
    setSelectedSuggestion("");
    setShowAmountInput(false);
    setAdjustedAmount(data?.enteredAmount ?? 0);
    setOverrideExpanded(true);
  };

  const handleCancelOverride = () => {
    setIsNegativeOverride(false);
    setOverrideReason("");
    setOverrideExpanded(false);
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

  const buildOverrideNote = () => {
    if (!data) return '';
    const balance = data.currentBalance ?? 0;
    const amount = data.enteredAmount;
    const resultBalance = balance - amount;
    return `🔴 [FG_OVERRIDE_NEGATIVE_BALANCE] السماح بالرصيد السالب | العامل: ${data.workerName || ''} | الرصيد قبل: ${formatCurrency(balance)} | مبلغ التحويل: ${formatCurrency(amount)} | الرصيد بعد: ${formatCurrency(resultBalance)} | السبب: ${overrideReason.trim()}`;
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
    if (!data) return;
    if (isNegativeOverride) {
      if (overrideReason.trim().length < MIN_NOTE_LENGTH) return;
      onConfirm({
        selectedSuggestion: 'negative_override',
        adjustedAmount: data.enteredAmount,
        guardNote: buildOverrideNote(),
        originalData: data.originalData,
      });
      return;
    }
    if (!selectedSuggestion) return;
    if (guardNote.trim().length < MIN_NOTE_LENGTH) return;
    onConfirm({
      selectedSuggestion,
      adjustedAmount,
      guardNote,
      originalData: data.originalData,
    });
  };

  if (!data) return null;

  const selectedSug = data.suggestions.find(s => s.id === selectedSuggestion);
  const noteIsValid = guardNote.trim().length >= MIN_NOTE_LENGTH;
  const canConfirmSuggestion = !!(selectedSuggestion && selectedSug?.action !== 'cancel' && adjustedAmount > 0 && noteIsValid);
  const canConfirmOverride = isNegativeOverride && overrideReason.trim().length >= MIN_NOTE_LENGTH;
  const canConfirm = canConfirmSuggestion || canConfirmOverride;

  const resultingBalanceAfterOverride = (data.currentBalance ?? 0) - (data.enteredAmount ?? 0);

  const guardTypeColors: Record<GuardType, { bg: string; border: string; icon: string }> = {
    negative_balance: { bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-800', icon: 'text-red-600' },
    overpaid_purchase: { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', icon: 'text-amber-600' },
    large_amount: { bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-200 dark:border-orange-800', icon: 'text-orange-600' },
  };

  const colors = guardTypeColors[data.type] || guardTypeColors.large_amount;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent
        className="max-w-md max-h-[90vh] overflow-y-auto"
        dir="rtl"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${colors.icon}`}>
            <Shield className="h-5 w-5 shrink-0" />
            <span>{data.title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className={`${colors.bg} border ${colors.border} rounded-lg p-3 space-y-1.5 text-sm`}>
            {data.details.map((detail, i) => (
              <div key={i} className="flex justify-between items-center gap-2">
                <span className="text-muted-foreground shrink-0">{detail.label}:</span>
                <span className={`font-semibold text-left tabular-nums ${detail.color || ''}`}>{detail.value}</span>
              </div>
            ))}
          </div>

          {!isNegativeOverride && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Lightbulb className="h-4 w-4 text-blue-500 shrink-0" />
                <span>اختر الإجراء المناسب:</span>
              </div>

              {data.suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className={`w-full text-right p-3 rounded-lg border-2 transition-all ${
                    selectedSuggestion === suggestion.id
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-primary/50 hover:bg-muted/30'
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
          )}

          {showAmountInput && !isNegativeOverride && (
            <div className="space-y-1.5 bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg">
              <Label htmlFor="guard-amount" className="flex items-center gap-1.5 text-sm">
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

          {selectedSuggestion && selectedSug?.action !== 'cancel' && !isNegativeOverride && (
            <div className="space-y-1.5">
              <Label htmlFor="guard-note" className="flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  سبب التأكيد (إلزامي)
                </span>
                <span className={`text-xs tabular-nums ${noteIsValid ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {guardNote.trim().length}/{MIN_NOTE_LENGTH}+
                </span>
              </Label>
              <Textarea
                id="guard-note"
                value={guardNote}
                onChange={(e) => setGuardNote(e.target.value)}
                className={`h-20 resize-none text-xs transition-colors ${
                  guardNote.trim().length > 0 && !noteIsValid
                    ? 'border-amber-400 focus:border-amber-500'
                    : noteIsValid
                    ? 'border-green-400 focus:border-green-500'
                    : ''
                }`}
                dir="rtl"
                placeholder="اكتب سبب الموافقة على هذا التنبيه..."
                data-testid="input-guard-note"
              />
              {guardNote.trim().length > 0 && !noteIsValid && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  يجب أن لا يقل السبب عن {MIN_NOTE_LENGTH} أحرف ({guardNote.trim().length}/{MIN_NOTE_LENGTH})
                </p>
              )}
            </div>
          )}

          {data.type === 'negative_balance' && !isNegativeOverride && (
            <div className="border-t pt-3 mt-3">
              <button
                onClick={() => setOverrideExpanded(!overrideExpanded)}
                className="w-full flex items-center justify-between text-sm text-muted-foreground hover:text-red-600 transition-colors py-1"
                data-testid="button-expand-negative-override"
              >
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" />
                  <span>استثناء: السماح بالرصيد السالب</span>
                </div>
                {overrideExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {overrideExpanded && (
                <div className="mt-2">
                  <button
                    onClick={handleNegativeOverride}
                    className="w-full text-right p-3 rounded-lg border-2 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 transition-all"
                    data-testid="button-allow-negative-balance"
                  >
                    <div className="flex items-start gap-2">
                      <ShieldAlert className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-bold text-sm text-red-700 dark:text-red-400">السماح بالرصيد السالب</p>
                        <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-1">
                          سيتم تحويل المبلغ كاملاً ({formatCurrency(data.enteredAmount)}) ورصيد العامل سيصبح{' '}
                          <span className="font-bold">{formatCurrency(resultingBalanceAfterOverride)}</span>
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {isNegativeOverride && (
            <div className="space-y-3 bg-red-50 dark:bg-red-950/20 border-2 border-red-300 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-600" />
                <span className="font-bold text-red-700 dark:text-red-400 text-sm">تأكيد السماح بالرصيد السالب</span>
              </div>

              <div className="bg-red-100 dark:bg-red-950/40 rounded-md p-2.5 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-red-700/70 dark:text-red-300/70">المبلغ:</span>
                  <span className="font-bold text-red-800 dark:text-red-300 tabular-nums">{formatCurrency(data.enteredAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-red-700/70 dark:text-red-300/70">الرصيد الحالي:</span>
                  <span className="font-bold tabular-nums">{formatCurrency(data.currentBalance ?? 0)}</span>
                </div>
                <div className="flex justify-between border-t border-red-200 dark:border-red-700 pt-1">
                  <span className="text-red-700/70 dark:text-red-300/70">الرصيد بعد التحويل:</span>
                  <span className="font-black text-red-700 dark:text-red-400 tabular-nums">{formatCurrency(resultingBalanceAfterOverride)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="override-reason" className="text-red-700 dark:text-red-400 font-semibold text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    سبب السماح بالرصيد السالب (إلزامي)
                  </span>
                  <span className={`tabular-nums ${overrideReason.trim().length >= MIN_NOTE_LENGTH ? 'text-green-600' : ''}`}>
                    {overrideReason.trim().length}/{MIN_NOTE_LENGTH}+
                  </span>
                </Label>
                <Textarea
                  id="override-reason"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="اذكر السبب بوضوح — مثال: سلفة طارئة بموافقة المدير للحالة الإنسانية..."
                  className={`h-24 resize-none text-sm transition-colors ${
                    overrideReason.trim().length > 0 && overrideReason.trim().length < MIN_NOTE_LENGTH
                      ? 'border-amber-400 focus:border-amber-500'
                      : overrideReason.trim().length >= MIN_NOTE_LENGTH
                      ? 'border-green-400 focus:border-green-500'
                      : 'border-red-300 dark:border-red-700'
                  } bg-white dark:bg-red-950/30`}
                  dir="rtl"
                  data-testid="input-override-reason"
                />
                {overrideReason.trim().length > 0 && overrideReason.trim().length < MIN_NOTE_LENGTH && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    السبب يجب أن لا يقل عن {MIN_NOTE_LENGTH} أحرف ({overrideReason.trim().length}/{MIN_NOTE_LENGTH})
                  </p>
                )}
              </div>

              <button
                onClick={handleCancelOverride}
                className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
                data-testid="button-cancel-override"
              >
                ← العودة للخيارات الأخرى
              </button>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2 pt-2 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            data-testid="button-guard-cancel"
          >
            إلغاء
          </Button>
          {isNegativeOverride ? (
            <Button
              onClick={handleConfirm}
              disabled={!canConfirmOverride}
              className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
              data-testid="button-override-confirm"
            >
              <ShieldAlert className="h-4 w-4 ml-1" />
              تأكيد السماح بالسالب
            </Button>
          ) : (
            <Button
              onClick={handleConfirm}
              disabled={!canConfirmSuggestion}
              className="bg-primary disabled:opacity-50"
              data-testid="button-guard-confirm"
            >
              <Shield className="h-4 w-4 ml-1" />
              تأكيد وحفظ
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
