import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, ArrowLeft, ArrowRight, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import comparisonData from "@/data/comparison_data.json";

interface Detail {
  cat: string;
  name: string;
  excel: number;
  system: number;
  diff: number;
  status: string;
  notes: string;
}

interface ProjInfo {
  name: string;
  income: number;
  expenses: number;
  wages: number;
  transport: number;
  misc: number;
}

interface DiffDay {
  date: string;
  isoDate: string;
  exIncome: number;
  exExpense: number;
  exWages: number;
  exTransport: number;
  exMisc: number;
  dbIncome: number;
  dbExpense: number;
  dbWages: number;
  dbTransport: number;
  dbMisc: number;
  diffInc: number;
  diffExp: number;
  details: Detail[];
  projInfo: ProjInfo[];
}

const data: DiffDay[] = comparisonData as DiffDay[];

const fmt = (n: number) => {
  if (n === 0) return "0";
  return n.toLocaleString("en");
};

const diffColor = (n: number) => {
  if (n > 0) return "text-red-600 dark:text-red-400";
  if (n < 0) return "text-blue-600 dark:text-blue-400";
  return "";
};

const diffBg = (n: number) => {
  if (n > 0) return "bg-red-50 dark:bg-red-950/30";
  if (n < 0) return "bg-blue-50 dark:bg-blue-950/30";
  return "";
};

function DayRow({ day }: { day: DiffDay }) {
  const [expanded, setExpanded] = useState(false);

  const absDiffExp = Math.abs(day.diffExp);
  const severity = absDiffExp > 100000 ? "destructive" : absDiffExp > 10000 ? "warning" : "secondary";

  return (
    <div className="border border-border rounded-lg mb-3 overflow-hidden" data-testid={`diff-day-${day.isoDate}`}>
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
        data-testid={`toggle-day-${day.isoDate}`}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-bold text-lg min-w-[100px]" data-testid={`date-${day.isoDate}`}>{day.date}</span>
          {day.projInfo.map(p => (
            <Badge key={p.name} variant="outline" className="text-xs">
              {p.name}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-4 flex-wrap justify-end">
          <div className="text-center">
            <div className="text-xs text-muted-foreground">فرق الدخل</div>
            <div className={`font-bold ${diffColor(day.diffInc)}`} data-testid={`diff-inc-${day.isoDate}`}>
              {day.diffInc > 0 ? "+" : ""}{fmt(day.diffInc)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">فرق المصروف</div>
            <div className={`font-bold ${diffColor(day.diffExp)}`} data-testid={`diff-exp-${day.isoDate}`}>
              {day.diffExp > 0 ? "+" : ""}{fmt(day.diffExp)}
            </div>
          </div>
          <Badge variant={severity as any} className="min-w-[60px] justify-center">
            {absDiffExp > 100000 ? "كبير" : absDiffExp > 10000 ? "متوسط" : "صغير"}
          </Badge>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border p-4 bg-muted/20">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse mb-4" data-testid={`summary-table-${day.isoDate}`}>
              <thead>
                <tr className="border-b border-border">
                  <th className="text-right p-2 font-semibold">البند</th>
                  <th className="text-center p-2 font-semibold">الإكسل</th>
                  <th className="text-center p-2 font-semibold">النظام</th>
                  <th className="text-center p-2 font-semibold">الفرق</th>
                </tr>
              </thead>
              <tbody>
                <tr className={`border-b border-border/50 ${diffBg(day.diffInc)}`}>
                  <td className="text-right p-2 font-medium">الدخل</td>
                  <td className="text-center p-2">{fmt(day.exIncome)}</td>
                  <td className="text-center p-2">{fmt(day.dbIncome)}</td>
                  <td className={`text-center p-2 font-bold ${diffColor(day.diffInc)}`}>{day.diffInc > 0 ? "+" : ""}{fmt(day.diffInc)}</td>
                </tr>
                <tr className={`border-b border-border/50 ${diffBg(day.diffExp)}`}>
                  <td className="text-right p-2 font-medium">المصروف الإجمالي</td>
                  <td className="text-center p-2">{fmt(day.exExpense)}</td>
                  <td className="text-center p-2">{fmt(day.dbExpense)}</td>
                  <td className={`text-center p-2 font-bold ${diffColor(day.diffExp)}`}>{day.diffExp > 0 ? "+" : ""}{fmt(day.diffExp)}</td>
                </tr>
                {(day.exWages > 0 || day.dbWages > 0) && (
                  <tr className={`border-b border-border/50 ${diffBg(day.exWages - day.dbWages)}`}>
                    <td className="text-right p-2 pr-6">أجور العمال</td>
                    <td className="text-center p-2">{fmt(day.exWages)}</td>
                    <td className="text-center p-2">{fmt(day.dbWages)}</td>
                    <td className={`text-center p-2 font-bold ${diffColor(day.exWages - day.dbWages)}`}>{fmt(day.exWages - day.dbWages)}</td>
                  </tr>
                )}
                {(day.exTransport > 0 || day.dbTransport > 0) && (
                  <tr className={`border-b border-border/50 ${diffBg(day.exTransport - day.dbTransport)}`}>
                    <td className="text-right p-2 pr-6">مواصلات</td>
                    <td className="text-center p-2">{fmt(day.exTransport)}</td>
                    <td className="text-center p-2">{fmt(day.dbTransport)}</td>
                    <td className={`text-center p-2 font-bold ${diffColor(day.exTransport - day.dbTransport)}`}>{fmt(day.exTransport - day.dbTransport)}</td>
                  </tr>
                )}
                {(day.exMisc > 0 || day.dbMisc > 0) && (
                  <tr className={`border-b border-border/50 ${diffBg(day.exMisc - day.dbMisc)}`}>
                    <td className="text-right p-2 pr-6">نثريات</td>
                    <td className="text-center p-2">{fmt(day.exMisc)}</td>
                    <td className="text-center p-2">{fmt(day.dbMisc)}</td>
                    <td className={`text-center p-2 font-bold ${diffColor(day.exMisc - day.dbMisc)}`}>{fmt(day.exMisc - day.dbMisc)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {day.projInfo.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold mb-2 text-sm">تفاصيل المشاريع في النظام:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {day.projInfo.map(p => (
                  <div key={p.name} className="border border-border rounded p-2 bg-background text-xs">
                    <div className="font-bold mb-1">{p.name}</div>
                    {p.income > 0 && <div>💰 دخل: {fmt(p.income)}</div>}
                    {p.wages > 0 && <div>👷 أجور: {fmt(p.wages)}</div>}
                    {p.transport > 0 && <div>🚗 مواصلات: {fmt(p.transport)}</div>}
                    {p.misc > 0 && <div>📋 نثريات: {fmt(p.misc)}</div>}
                    <div className="font-semibold mt-1">📊 إجمالي: {fmt(p.expenses)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {day.details.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2 text-sm">تفاصيل الفروقات:</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse" data-testid={`details-table-${day.isoDate}`}>
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-right p-2">الصنف</th>
                      <th className="text-right p-2">البند</th>
                      <th className="text-center p-2">الإكسل</th>
                      <th className="text-center p-2">النظام</th>
                      <th className="text-center p-2">الفرق</th>
                      <th className="text-right p-2">الحالة</th>
                      <th className="text-right p-2">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {day.details.map((d, i) => (
                      <tr key={i} className={`border-b border-border/30 ${diffBg(d.diff)}`}>
                        <td className="text-right p-2">
                          <Badge variant="outline" className="text-xs">{d.cat}</Badge>
                        </td>
                        <td className="text-right p-2 font-medium">{d.name}</td>
                        <td className="text-center p-2">{d.excel > 0 ? fmt(d.excel) : "-"}</td>
                        <td className="text-center p-2">{d.system > 0 ? fmt(d.system) : "-"}</td>
                        <td className={`text-center p-2 font-bold ${diffColor(d.diff)}`}>{d.diff > 0 ? "+" : ""}{fmt(d.diff)}</td>
                        <td className="text-right p-2">
                          <Badge
                            variant={d.status === "إكسل فقط" ? "destructive" : d.status === "نظام فقط" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {d.status === "إكسل فقط" && <ArrowLeft className="h-3 w-3 ml-1" />}
                            {d.status === "نظام فقط" && <ArrowRight className="h-3 w-3 ml-1" />}
                            {d.status}
                          </Badge>
                        </td>
                        <td className="text-right p-2 text-xs text-muted-foreground max-w-[200px] truncate">{d.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ExcelComparisonReport() {
  const [filter, setFilter] = useState<"all" | "income" | "expense" | "big">("all");

  const totalDiffInc = data.reduce((s, d) => s + d.diffInc, 0);
  const totalDiffExp = data.reduce((s, d) => s + d.diffExp, 0);

  const filtered = data.filter(d => {
    if (filter === "income") return Math.abs(d.diffInc) > 1;
    if (filter === "expense") return Math.abs(d.diffExp) > 1;
    if (filter === "big") return Math.abs(d.diffExp) > 10000 || Math.abs(d.diffInc) > 10000;
    return true;
  });

  return (
    <div className="min-h-screen bg-background p-4 md:p-6" dir="rtl" data-testid="comparison-report-page">
      <div className="max-w-6xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl md:text-2xl" data-testid="report-title">
              تقرير المقارنة — الإكسل مقابل النظام
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              مشروع ابار الجراحي + التحيتا (المهندس محمد) — من 23/11/2025 إلى 26/2/2026
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 rounded-lg bg-muted">
                <div className="text-2xl font-bold" data-testid="total-days">94</div>
                <div className="text-xs text-muted-foreground">إجمالي الأيام</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
                <div className="text-2xl font-bold text-green-600" data-testid="match-days">36</div>
                <div className="text-xs text-muted-foreground">أيام متطابقة</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
                <div className="text-2xl font-bold text-red-600" data-testid="diff-days">{data.length}</div>
                <div className="text-xs text-muted-foreground">أيام بها فروقات</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30">
                <div className="text-2xl font-bold text-orange-600" data-testid="total-diff-exp">{fmt(totalDiffExp)}</div>
                <div className="text-xs text-muted-foreground">إجمالي فرق المصروف</div>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm">
                <span className="text-red-600 font-bold">أحمر</span> = الإكسل أكثر من النظام (ناقص في النظام)
              </span>
              <span className="mx-2">|</span>
              <span className="text-sm">
                <span className="text-blue-600 font-bold">أزرق</span> = النظام أكثر من الإكسل (زائد في النظام)
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2 mb-4 flex-wrap">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
            data-testid="filter-all"
          >
            الكل ({data.length})
          </Button>
          <Button
            variant={filter === "big" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("big")}
            data-testid="filter-big"
          >
            فروقات كبيرة (&gt;10,000)
          </Button>
          <Button
            variant={filter === "income" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("income")}
            data-testid="filter-income"
          >
            فرق دخل
          </Button>
          <Button
            variant={filter === "expense" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("expense")}
            data-testid="filter-expense"
          >
            فرق مصروف
          </Button>
        </div>

        <div data-testid="diff-days-list">
          {filtered.map(day => (
            <DayRow key={day.isoDate} day={day} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            لا توجد فروقات بهذا الفلتر
          </div>
        )}
      </div>
    </div>
  );
}
