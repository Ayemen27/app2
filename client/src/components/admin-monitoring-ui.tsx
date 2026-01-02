import { intelligentMonitor } from '@/offline/intelligent-monitor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, CheckCircle2, Info, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AppEvent } from '@/offline/intelligent-monitor';

export function AdminMonitoringUI() {
  const [events, setEvents] = useState<AppEvent[]>([]);

  useEffect(() => {
    setEvents(intelligentMonitor.getEvents());
    return intelligentMonitor.subscribe((event) => {
      setEvents(prev => [event, ...prev].slice(0, 50));
    });
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'medium': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertCircle className="w-4 h-4" />;
      case 'sync': return <Zap className="w-4 h-4" />;
      case 'performance': return <Info className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          مراقب النظام الذكي
        </CardTitle>
        <Badge variant="outline" className="text-[10px]">Active Monitoring</Badge>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-[400px] px-4">
          <div className="space-y-3 py-4">
            {events.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                لا توجد أحداث مسجلة حالياً
              </div>
            ) : (
              events.map((event) => (
                <div 
                  key={event.id} 
                  className={`p-3 rounded-lg border flex flex-col gap-2 transition-all ${getSeverityColor(event.severity)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-medium text-xs">
                      {getIcon(event.type)}
                      {event.message}
                    </div>
                    <span className="text-[10px] opacity-70">
                      {new Date(event.timestamp).toLocaleTimeString('ar-SA')}
                    </span>
                  </div>
                  {event.actionTaken && (
                    <div className="flex items-center gap-1 text-[10px] bg-white/20 p-1 rounded px-2 w-fit">
                      <CheckCircle2 className="w-3 h-3" />
                      الإجراء: {event.actionTaken}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
