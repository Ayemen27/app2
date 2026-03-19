import { ENV } from "@/lib/env";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { History, ArrowRight, Calendar, User, FileText, MapPin } from "lucide-react";
import { Equipment } from "@shared/schema";
import { formatDate } from "@/lib/utils";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { getAccessToken, getFetchCredentials, getClientPlatformHeader, getAuthHeaders } from '@/lib/auth-token-store';

interface EquipmentMovementHistoryDialogProps {
  equipment: Equipment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: any[];
}

interface MovementData {
  id: string;
  fromProjectId: string | null;
  toProjectId: string | null;
  movementDate: string;
  reason: string | null;
  performedBy: string;
  notes: string | null;
}

export function EquipmentMovementHistoryDialog({ 
  equipment, 
  open, 
  onOpenChange, 
  projects 
}: EquipmentMovementHistoryDialogProps) {
  
  const { data: movements = [], isLoading } = useQuery({
    queryKey: QUERY_KEYS.equipmentMovementsById(String(equipment?.id ?? '')),
    queryFn: async () => {
      const response = await fetch(ENV.getApiUrl(`/api/equipment/${equipment?.id}/movements`), {
        credentials: getFetchCredentials(),
        headers: {
          ...getClientPlatformHeader(),
          ...getAuthHeaders(),
        }
      });
      if (!response.ok) throw new Error('فشل في جلب سجل الحركات');
      return response.json();
    },
    enabled: !!equipment?.id && open,
    staleTime: 30000, // 30 seconds
  });

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return "غير محدد";
    const project = Array.isArray(projects) ? projects.find(p => p.id === projectId) : undefined;
    return project ? project.name : "مشروع غير معروف";
  };

  const formatMovementDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'short'
      }) + ' - ' + date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[900px] h-[90vh] overflow-hidden flex flex-col" dir="rtl">
        <DialogHeader className="pb-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 -m-6 p-6 rounded-t-lg">
          <DialogTitle className="flex items-center gap-3 text-xl font-bold">
            <div className="p-2 bg-blue-100 rounded-full">
              <History className="w-6 h-6 text-blue-700" />
            </div>
            <div className="flex-1">
              <div className="text-blue-900">سجل حركة المعدة</div>
            </div>
          </DialogTitle>
          <DialogDescription className="text-sm font-normal text-blue-600 mt-1">
            {equipment?.name} - عرض سجل التحويلات والحركات
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 mt-4 px-1">
          {/* معلومات المعدة */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">كود المعدة</div>
                      <div className="font-bold text-gray-900">{equipment?.code}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-gray-600">المشروع الحالي</div>
                      <div className="font-bold text-gray-900 truncate">
                        {getProjectName((equipment as any)?.currentProjectId || null)}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <FileText className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">نوع المعدة</div>
                      <div className="font-bold text-gray-900">{equipment?.type}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                      <div className={`w-3 h-3 rounded-full ${equipment?.status === 'active' ? 'bg-green-500' : 
                                      equipment?.status === 'maintenance' ? 'bg-yellow-500' : 
                                      equipment?.status === 'damaged' ? 'bg-red-500' : 'bg-gray-400'}`}>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">حالة المعدة</div>
                      <Badge className={`font-bold ${equipment?.status === 'active' ? 'bg-green-100 text-green-800' : 
                                        equipment?.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' : 
                                        equipment?.status === 'damaged' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                        {equipment?.status === 'active' ? 'نشط' : 
                         equipment?.status === 'maintenance' ? 'في الصيانة' : 
                         equipment?.status === 'damaged' ? 'معطل' : 'غير نشط'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* سجل الحركات */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-blue-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-full">
                  <History className="w-5 h-5 text-indigo-700" />
                </div>
                <h3 className="font-bold text-gray-900">سجل الحركات</h3>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-indigo-100 text-indigo-800 font-bold px-3 py-1">
                  {movements.length} حركة
                </Badge>
              </div>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200"></div>
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent absolute top-0 left-0"></div>
                </div>
                <div className="mt-4 text-center">
                  <p className="text-sm font-medium text-gray-700">جاري تحميل سجل الحركات...</p>
                  <p className="text-xs text-gray-500 mt-1">الرجاء الانتظار</p>
                </div>
              </div>
            ) : movements.length === 0 ? (
              <Card className="border-0 shadow-lg bg-gradient-to-br from-gray-50 to-slate-50">
                <CardContent className="py-12 text-center">
                  <div className="max-w-sm mx-auto">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                      <History className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-700">لا توجد حركات مسجلة</h3>
                    <p className="text-gray-500 text-sm">
                      لم يتم تسجيل أي حركات نقل لهذه المعدة حتى الآن.
                    </p>
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-blue-600">
                        💡 ستظهر جميع حركات النقل هنا عند تسجيلها
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {movements.map((movement: MovementData, index: number) => (
                  <Card key={movement.id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-gray-50/50">
                    <CardContent className="p-0">
                      {/* رأس الحركة */}
                      <div className="p-4 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold text-blue-700">#{movements.length - index}</span>
                            </div>
                            <div>
                              <div className="font-bold text-gray-900">حركة رقم {movements.length - index}</div>
                              <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                <Calendar className="w-3 h-3" />
                                {formatMovementDate(movement.movementDate)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 space-y-4">
                        {/* تفاصيل النقل - محسن للهواتف */}
                        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 p-4 rounded-xl border border-blue-100">
                          <div className="flex flex-col md:flex-row items-center gap-4">
                            <div className="flex-1 w-full">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                  <MapPin className="w-3 h-3 text-green-600" />
                                </div>
                                <span className="text-xs font-medium text-gray-600">من</span>
                              </div>
                              <div className="bg-white/70 p-3 rounded-lg border border-green-200">
                                <span className="text-sm font-bold text-gray-900 block truncate">
                                  {getProjectName(movement.fromProjectId)}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-center">
                              <div className="p-2 bg-blue-100 rounded-full">
                                <ArrowRight className="w-4 h-4 text-blue-600" />
                              </div>
                            </div>
                            
                            <div className="flex-1 w-full">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                  <MapPin className="w-3 h-3 text-blue-600" />
                                </div>
                                <span className="text-xs font-medium text-gray-600">إلى</span>
                              </div>
                              <div className="bg-white/70 p-3 rounded-lg border border-blue-200">
                                <span className="text-sm font-bold text-gray-900 block truncate">
                                  {getProjectName(movement.toProjectId)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* معلومات إضافية */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-purple-600" />
                            </div>
                            <div>
                              <div className="text-xs text-gray-600">قام بالنقل</div>
                              <div className="text-sm font-bold text-gray-900">{movement.performedBy}</div>
                            </div>
                          </div>

                          {movement.reason && (
                            <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg">
                              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center mt-0.5">
                                <FileText className="w-4 h-4 text-amber-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-gray-600">السبب</div>
                                <p className="text-sm font-medium text-gray-900 break-words">{movement.reason}</p>
                              </div>
                            </div>
                          )}

                          {movement.notes && (
                            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400 p-3 rounded-lg">
                              <div className="flex items-start gap-2">
                                <div className="w-5 h-5 bg-yellow-100 rounded-full flex items-center justify-center mt-0.5">
                                  <span className="text-xs">💡</span>
                                </div>
                                <div>
                                  <span className="text-yellow-800 font-bold text-xs block">ملاحظات مهمة</span>
                                  <span className="text-yellow-700 text-sm break-words">{movement.notes}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}