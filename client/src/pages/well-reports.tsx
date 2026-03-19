import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, FileSpreadsheet, FileText, Download, Loader2, BarChart3, Users, Sun, Truck } from "lucide-react";
import { useSelectedProject } from "@/hooks/use-selected-project";
import { useToast } from "@/hooks/use-toast";
import { toUserMessage } from "@/lib/error-utils";

type ReportType = 'comprehensive' | 'wells_only' | 'crews_only' | 'solar_only';
type ExportFormat = 'xlsx' | 'pdf';

const REPORT_TYPES: { value: ReportType; label: string; icon: any; description: string }[] = [
  { value: 'comprehensive', label: 'تقرير شامل', icon: BarChart3, description: 'جميع البيانات: آبار، فرق عمل، منظومة شمسية، نقل، ملخص مالي' },
  { value: 'wells_only', label: 'بيانات الآبار', icon: Download, description: 'بيانات الآبار الأساسية: أعماق، قواعد، ألواح، حالة الإنجاز' },
  { value: 'crews_only', label: 'فرق العمل', icon: Users, description: 'تفاصيل فرق العمل: أنواع العمل، أجور، أيام عمل، ملخص بالفرق' },
  { value: 'solar_only', label: 'المنظومة الشمسية', icon: Sun, description: 'مكونات المنظومة: إنفرتر، كيابل، تأريض، غطاسات' },
];

export default function WellReports() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { selectedProjectId } = useSelectedProject();
  const [reportType, setReportType] = useState<ReportType>('comprehensive');
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  const { data: projectsData } = useQuery({
    queryKey: ['/api/projects'],
  });

  const { data: wellsSummary } = useQuery({
    queryKey: ['/api/wells', selectedProjectId, 'summary'],
    queryFn: async () => {
      if (!selectedProjectId) return null;
      const response = await apiRequest(`/api/wells/export/full-data?project_id=${selectedProjectId}`);
      const wells = response.data || [];
      const totalCrews = wells.reduce((s: number, w: any) => s + (w.crews?.length || 0), 0);
      const totalWages = wells.reduce((s: number, w: any) =>
        s + (w.crews || []).reduce((cs: number, c: any) => cs + (parseFloat(c.totalWages) || 0), 0), 0);
      const withSolar = wells.filter((w: any) => w.solar).length;
      const totalTransport = wells.reduce((s: number, w: any) => s + (w.transport?.length || 0), 0);
      return { totalWells: wells.length, totalCrews, totalWages, withSolar, totalTransport };
    },
    enabled: !!selectedProjectId,
  });

  const currentProject = (projectsData as any)?.data?.find((p: any) => p.id === selectedProjectId);

  const handleExport = async (format: ExportFormat) => {
    if (!selectedProjectId) {
      toast({ title: 'يرجى اختيار مشروع أولاً', variant: 'destructive' });
      return;
    }

    setExporting(format);
    try {
      const url = `/api/wells/reports/export?project_id=${selectedProjectId}&format=${format}&report_type=${reportType}`;

      if (format === 'xlsx') {
        const response = await fetch(url, { credentials: 'include' });
        if (!response.ok) throw new Error('فشل في تصدير التقرير');
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `تقرير-الآبار-${currentProject?.name || 'report'}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
        toast({ title: 'تم تصدير التقرير بنجاح', description: 'ملف Excel جاهز للتحميل' });
      } else {
        const response = await fetch(url, { credentials: 'include' });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || 'فشل في تصدير التقرير');
        }
        const html = await response.text();
        const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
        const blobUrl = window.URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 5000);
        toast({ title: 'تم فتح التقرير', description: 'يمكنك الطباعة أو حفظه كـ PDF' });
      }
    } catch (error: any) {
      toast({ title: 'خطأ في التصدير', description: toUserMessage(error), variant: 'destructive' });
    } finally {
      setExporting(null);
    }
  };

  const selectedReport = REPORT_TYPES.find(r => r.value === reportType)!;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/wells")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">تصدير تقارير الآبار</h1>
            <p className="text-sm text-muted-foreground" data-testid="text-project-name">
              {currentProject?.name || 'يرجى اختيار مشروع'}
            </p>
          </div>
        </div>
      </div>

      {wellsSummary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary" data-testid="text-total-wells">{wellsSummary.totalWells}</p>
              <p className="text-xs text-muted-foreground">إجمالي الآبار</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600" data-testid="text-total-crews">{wellsSummary.totalCrews}</p>
              <p className="text-xs text-muted-foreground">سجلات فرق العمل</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600" data-testid="text-total-wages">
                {wellsSummary.totalWages.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-muted-foreground">إجمالي الأجور</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-600" data-testid="text-with-solar">{wellsSummary.withSolar}</p>
              <p className="text-xs text-muted-foreground">آبار بمنظومة شمسية</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-purple-600" data-testid="text-total-transport">{wellsSummary.totalTransport}</p>
              <p className="text-xs text-muted-foreground">عمليات النقل</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            اختر نوع التقرير
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {REPORT_TYPES.map((rt) => {
              const Icon = rt.icon;
              const isSelected = reportType === rt.value;
              return (
                <button
                  key={rt.value}
                  onClick={() => setReportType(rt.value)}
                  data-testid={`button-report-type-${rt.value}`}
                  className={`flex items-start gap-3 p-4 rounded-lg border-2 transition-all text-right ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary text-white' : 'bg-muted'}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold ${isSelected ? 'text-primary' : ''}`}>{rt.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{rt.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            تصدير التقرير
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg mb-4">
            <selectedReport.icon className="h-8 w-8 text-primary" />
            <div>
              <p className="font-semibold" data-testid="text-selected-report">{selectedReport.label}</p>
              <p className="text-sm text-muted-foreground">{selectedReport.description}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              size="lg"
              className="flex-1 gap-2"
              onClick={() => handleExport('xlsx')}
              disabled={!selectedProjectId || exporting !== null}
              data-testid="button-export-excel"
            >
              {exporting === 'xlsx' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-5 w-5" />
              )}
              تصدير Excel
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => handleExport('pdf')}
              disabled={!selectedProjectId || exporting !== null}
              data-testid="button-export-pdf"
            >
              {exporting === 'pdf' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <FileText className="h-5 w-5" />
              )}
              طباعة / PDF
            </Button>
          </div>

          {!selectedProjectId && (
            <p className="text-sm text-destructive mt-3 text-center" data-testid="text-no-project">
              يرجى اختيار مشروع من القائمة العلوية أولاً
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
