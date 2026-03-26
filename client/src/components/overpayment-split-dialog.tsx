import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, DollarSign, ArrowLeftRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export interface OverpaymentData {
  workerName: string;
  workerId: string;
  projectId: string;
  date: string;
  totalAmount: number;
  actualWage: number;
  workDays: number;
  originalRecord: any;
  recordId?: string;
}

interface OverpaymentSplitDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: {
    wageAmount: number;
    advanceAmount: number;
    advanceNotes: string;
    originalRecord: any;
    recordId?: string;
  }) => void;
  data: OverpaymentData | null;
}

export function OverpaymentSplitDialog({ open, onClose, onConfirm, data }: OverpaymentSplitDialogProps) {
  const [wageAmount, setWageAmount] = useState(0);
  const [advanceAmount, setAdvanceAmount] = useState(0);
  const [advanceNotes, setAdvanceNotes] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (data) {
      const defaultWage = data.workDays === 0 ? 0 : Math.min(data.actualWage, data.totalAmount);
      setWageAmount(defaultWage);
      setAdvanceAmount(data.totalAmount - defaultWage);
      setAdvanceNotes("");
      setError("");
    }
  }, [data]);

  const handleWageChange = useCallback((val: string) => {
    const num = parseFloat(val) || 0;
    if (!data) return;
    if (num < 0) return;
    if (num > data.totalAmount) {
      setError(`مبلغ الأجور لا يمكن أن يتجاوز المبلغ الإجمالي (${formatCurrency(data.totalAmount)})`);
      return;
    }
    setWageAmount(num);
    setAdvanceAmount(data.totalAmount - num);
    setError("");
  }, [data]);

  const handleAdvanceChange = useCallback((val: string) => {
    const num = parseFloat(val) || 0;
    if (!data) return;
    if (num < 0) return;
    if (num > data.totalAmount) {
      setError(`مبلغ السلفة لا يمكن أن يتجاوز المبلغ الإجمالي (${formatCurrency(data.totalAmount)})`);
      return;
    }
    setAdvanceAmount(num);
    setWageAmount(data.totalAmount - num);
    setError("");
  }, [data]);

  const handleConfirm = () => {
    if (!data) return;
    if (wageAmount + advanceAmount !== data.totalAmount) {
      setError(`مجموع الأجور والسلفة (${formatCurrency(wageAmount + advanceAmount)}) يجب أن يساوي المبلغ الإجمالي (${formatCurrency(data.totalAmount)})`);
      return;
    }
    if (advanceAmount <= 0) {
      setError("مبلغ السلفة يجب أن يكون أكبر من صفر");
      return;
    }
    onConfirm({
      wageAmount,
      advanceAmount,
      advanceNotes,
      originalRecord: data.originalRecord,
      recordId: data.recordId,
    });
  };

  if (!data) return null;

  const excessAmount = data.totalAmount - data.actualWage;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[480px]" dir="rtl" data-testid="overpayment-split-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            تنبيه: المبلغ المدفوع يتجاوز الأجر
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">العامل:</span>
              <span className="font-semibold" data-testid="text-worker-name">{data.workerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">التاريخ:</span>
              <span>{data.date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">أيام العمل:</span>
              <span>{data.workDays}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">الأجر الفعلي:</span>
              <span className="text-green-600 font-semibold">{formatCurrency(data.actualWage)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">المبلغ المدخل:</span>
              <span className="text-red-600 font-bold">{formatCurrency(data.totalAmount)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 mt-2 border-amber-300 dark:border-amber-700">
              <span className="text-muted-foreground">الزيادة:</span>
              <span className="text-amber-600 font-bold">{formatCurrency(excessAmount)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeftRight className="h-4 w-4" />
            <span>حدد كم يُسجل كأجور وكم كسلفة/تحويل:</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="wage-amount" className="flex items-center gap-1.5 text-green-700 dark:text-green-400">
                <DollarSign className="h-3.5 w-3.5" />
                مبلغ الأجور
              </Label>
              <Input
                id="wage-amount"
                type="number"
                value={wageAmount}
                onChange={(e) => handleWageChange(e.target.value)}
                className="text-center text-lg font-bold border-green-300 focus:border-green-500"
                min={0}
                max={data.totalAmount}
                data-testid="input-wage-amount"
              />
              <p className="text-xs text-muted-foreground text-center">يُسجل في الحضور</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="advance-amount" className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
                <DollarSign className="h-3.5 w-3.5" />
                مبلغ السلفة
              </Label>
              <Input
                id="advance-amount"
                type="number"
                value={advanceAmount}
                onChange={(e) => handleAdvanceChange(e.target.value)}
                className="text-center text-lg font-bold border-blue-300 focus:border-blue-500"
                min={0}
                max={data.totalAmount}
                data-testid="input-advance-amount"
              />
              <p className="text-xs text-muted-foreground text-center">يُسجل كتحويل/سلفة</p>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 rounded p-2 text-center text-sm">
            المجموع: <span className={`font-bold ${wageAmount + advanceAmount === data.totalAmount ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(wageAmount + advanceAmount)}
            </span>
            {' '}/{' '}
            <span className="text-muted-foreground">{formatCurrency(data.totalAmount)}</span>
            {wageAmount + advanceAmount === data.totalAmount && <span className="text-green-600 mr-2">✓</span>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="advance-notes">ملاحظة السلفة</Label>
            <Textarea
              id="advance-notes"
              placeholder="مثال: سلفة شهرية، مصروف بيت، قات ودخان..."
              value={advanceNotes}
              onChange={(e) => setAdvanceNotes(e.target.value)}
              className="h-16 resize-none"
              data-testid="input-advance-notes"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 p-2 rounded" data-testid="text-split-error">{error}</p>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-split">
            إلغاء
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={wageAmount + advanceAmount !== data.totalAmount || advanceAmount <= 0}
            className="bg-amber-600 hover:bg-amber-700 text-white"
            data-testid="button-confirm-split"
          >
            تأكيد وحفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
