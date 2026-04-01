import { useState, useCallback } from "react";
import { ClipboardList, User, BarChart3, ArrowUpDown, Building2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UnifiedStats } from "@/components/ui/unified-stats";
import { DailyReportTab } from "./DailyReportTab";
import { WorkerStatementTab } from "./WorkerStatementTab";
import { PeriodFinalTab } from "./PeriodFinalTab";
import { MultiProjectFinalTab } from "./MultiProjectFinalTab";
import { ProjectComprehensiveTab } from "./ProjectComprehensiveTab";

export default function AxionReports() {
  const [activeTab, setActiveTab] = useState("daily");
  const [currentStats, setCurrentStats] = useState<any[]>([]);

  const handleTabChange = useCallback((tab: string) => {
    setCurrentStats([]);
    setActiveTab(tab);
  }, []);

  const handleStatsReady = useCallback((stats: any[]) => {
    setCurrentStats(stats);
  }, []);

  return (
    <div className="fade-in pb-40" dir="rtl">
      <div className="p-4 space-y-4 min-h-screen">
        {currentStats.length > 0 && (
          <UnifiedStats stats={currentStats} columns={2} hideHeader={true} />
        )}

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="w-full grid grid-cols-5" data-testid="tabs-report-center">
            <TabsTrigger value="daily" className="gap-1 text-xs sm:text-sm" data-testid="tab-daily">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">التقرير اليومي</span>
              <span className="sm:hidden">يومي</span>
            </TabsTrigger>
            <TabsTrigger value="worker" className="gap-1 text-xs sm:text-sm" data-testid="tab-worker">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">كشف حساب العمال</span>
              <span className="sm:hidden">العمال</span>
            </TabsTrigger>
            <TabsTrigger value="final" className="gap-1 text-xs sm:text-sm" data-testid="tab-final">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">التقرير الختامي</span>
              <span className="sm:hidden">ختامي</span>
            </TabsTrigger>
            <TabsTrigger value="multi" className="gap-1 text-xs sm:text-sm" data-testid="tab-multi">
              <ArrowUpDown className="h-4 w-4" />
              <span className="hidden sm:inline">تقرير مجمع</span>
              <span className="sm:hidden">مجمع</span>
            </TabsTrigger>
            <TabsTrigger value="comprehensive" className="gap-1 text-xs sm:text-sm" data-testid="tab-comprehensive">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">تقرير شامل</span>
              <span className="sm:hidden">شامل</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="mt-4">
            <DailyReportTab onStatsReady={handleStatsReady} />
          </TabsContent>
          <TabsContent value="worker" className="mt-4">
            <WorkerStatementTab onStatsReady={handleStatsReady} />
          </TabsContent>
          <TabsContent value="final" className="mt-4">
            <PeriodFinalTab onStatsReady={handleStatsReady} />
          </TabsContent>
          <TabsContent value="multi" className="mt-4">
            <MultiProjectFinalTab onStatsReady={handleStatsReady} />
          </TabsContent>
          <TabsContent value="comprehensive" className="mt-4">
            <ProjectComprehensiveTab onStatsReady={handleStatsReady} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
