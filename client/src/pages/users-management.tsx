import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Shield, RefreshCw, Briefcase, Eye, Loader2, Search, UserCheck, UserX, Mail, Settings, Edit2, Trash2, Phone, Power, User, MailCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/AuthProvider';
import { UnifiedFilterDashboard } from '@/components/ui/unified-filter-dashboard';
import { UnifiedCard, UnifiedCardGrid } from '@/components/ui/unified-card';
import type { StatsRowConfig } from '@/components/ui/unified-filter-dashboard/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AddUserForm from '@/components/forms/add-user-form';
import { useFloatingButton } from '@/components/layout/floating-button-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { QUERY_KEYS } from "@/constants/queryKeys";

export default function UsersManagementPage() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { setFloatingAction } = useFloatingButton();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showDialog, setShowDialog] = useState(false);
  
  const { data: userData, isLoading, refetch } = useQuery<any>({
    queryKey: QUERY_KEYS.users || ["/api/users"],
    queryFn: async () => {
      const res = await apiRequest("/api/users", "GET");
      return res;
    }
  });

  const allUsers = useMemo(() => {
    if (!userData) return [];
    if (Array.isArray(userData)) return userData;
    if (userData.users && Array.isArray(userData.users)) return userData.users;
    if (userData.data && Array.isArray(userData.data)) return userData.data;
    return [];
  }, [userData]);

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await apiRequest(`/api/users/${userId}/role`, "PATCH", { role });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users || ["/api/users"] });
      toast({
        title: "تم تحديث الصلاحيات",
        description: "تم تغيير دور المستخدم بنجاح.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "فشل التحديث",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest(`/api/users/${userId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users || ["/api/users"] });
      toast({
        title: "تم الحذف",
        description: "تم حذف المستخدم بنجاح",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في الحذف",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleToggleStatus = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      return apiRequest(`/api/users/${userId}`, "PATCH", { isActive: !isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users || ["/api/users"] });
      toast({
        title: "تم تحديث الحالة",
        description: "تم تغيير حالة المستخدم بنجاح",
      });
    }
  });

  const [showDisabled, setShowDisabled] = useState(false);

  const filteredUsers = useMemo(() => {
    if (!Array.isArray(allUsers)) return [];
    
    const lowerSearch = searchTerm.toLowerCase();
    return allUsers.filter(user => {
      const matchesSearch = !searchTerm || 
        (user.fullName?.toLowerCase() || "").includes(lowerSearch) ||
        (user.firstName?.toLowerCase() || "").includes(lowerSearch) ||
        (user.lastName?.toLowerCase() || "").includes(lowerSearch) ||
        user.email?.toLowerCase().includes(lowerSearch);
        
      if (!searchTerm && !showDisabled && !user.isActive) {
        return false;
      }

      return matchesSearch;
    });
  }, [allUsers, searchTerm, showDisabled]);

  const statsRows: StatsRowConfig[] = [
    {
      items: [
        {
          key: "total",
          label: "إجمالي المستخدمين",
          value: Array.isArray(allUsers) ? allUsers.length : 0,
          icon: Users,
          color: "blue"
        },
        {
          key: "admins",
          label: "مدراء النظام",
          value: Array.isArray(allUsers) ? allUsers.filter(u => u.role === 'admin').length : 0,
          icon: Shield,
          color: "purple"
        },
        {
          key: "managers",
          label: "مدراء المشاريع",
          value: Array.isArray(allUsers) ? allUsers.filter(u => u.role === 'manager').length : 0,
          icon: Briefcase,
          color: "orange"
        }
      ]
    }
  ];

  const handleAddUser = () => {
    setEditingUser(null);
    setShowDialog(true);
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setShowDialog(true);
  };

  const handleDeleteUser = (user: any) => {
    if (window.confirm(`هل أنت متأكد من حذف المستخدم "${user.fullName || user.email}"؟`)) {
      deleteUserMutation.mutate(user.id);
    }
  };

  useEffect(() => {
    setFloatingAction(handleAddUser, "إضافة مستخدم جديد");
    return () => setFloatingAction(null);
  }, [setFloatingAction]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <UnifiedFilterDashboard
        statsRows={statsRows}
        showSearch={true}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="البحث عن مستخدم باسمه أو بريده..."
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
        hideHeader={true}
      />

      <div className="flex items-center gap-2 px-1">
        <Button
          variant={showDisabled ? "default" : "outline"}
          size="sm"
          onClick={() => setShowDisabled(!showDisabled)}
          className="rounded-xl font-bold gap-2"
        >
          {showDisabled ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
          {showDisabled ? "إخفاء المعطلين" : "عرض جميع المستخدمين (بمن فيهم المعطلين)"}
        </Button>
      </div>

      <UnifiedCardGrid columns={3}>
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <UnifiedCard
              key={user.id}
              title={user.fullName || `${user.firstName} ${user.lastName}`}
              subtitle={user.email}
              titleIcon={User}
              headerColor={user.role === 'admin' ? '#9333ea' : user.role === 'manager' ? '#f97316' : '#2563eb'}
              badges={[
                {
                  label: user.role === 'admin' ? 'مدير نظام' : user.role === 'manager' ? 'مدير مشروع' : 'مستخدم',
                  variant: user.role === 'admin' ? 'default' : user.role === 'manager' ? 'secondary' : 'outline'
                },
                {
                  label: user.isActive ? 'نشط' : 'معطل',
                  variant: user.isActive ? 'success' : 'destructive'
                }
              ]}
              fields={[
                {
                  label: "البريد",
                  value: user.email,
                  icon: Mail,
                  color: "purple"
                },
                {
                  label: "رقم الهاتف",
                  value: user.phone || 'غير محدد',
                  icon: Phone,
                  color: user.phone ? "success" : "muted"
                },
                {
                  label: "تاريخ الانضمام",
                  value: user.createdAt ? new Date(user.createdAt).toLocaleDateString('ar-YE') : '-',
                  icon: UserCheck,
                  color: "blue"
                }
              ]}
              actions={[
                {
                  icon: Edit2,
                  label: "تعديل",
                  onClick: () => handleEditUser(user),
                  color: "blue"
                },
                {
                  icon: Power,
                  label: user.isActive ? "تعطيل" : "تفعيل",
                  onClick: () => handleToggleStatus.mutate({ userId: user.id, isActive: user.isActive }),
                  color: user.isActive ? "yellow" : "green"
                },
                {
                  icon: Trash2,
                  label: "حذف",
                  onClick: () => handleDeleteUser(user),
                  color: "red",
                  disabled: user.id === currentUser?.id
                }
              ]}
              footer={
                <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="text-xs font-bold text-slate-500">تغيير الصلاحية السريع</label>
                  <Select
                    defaultValue={user.role}
                    onValueChange={(value) => updateRoleMutation.mutate({ userId: user.id, role: value })}
                    disabled={updateRoleMutation.isPending || user.id === currentUser?.id}
                  >
                    <SelectTrigger className="w-full h-9 rounded-xl font-bold border-slate-200 dark:border-slate-700">
                      <SelectValue placeholder="اختر الدور" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                      <SelectItem value="admin" className="font-bold">مدير نظام</SelectItem>
                      <SelectItem value="manager" className="font-bold">مدير مشروع</SelectItem>
                      <SelectItem value="user" className="font-bold">مستخدم</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              }
              compact
            />
          ))
        ) : (
          <div className="col-span-full py-12 text-center bg-white/50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
            <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-bold">لا يوجد مستخدمين لعرضهم</p>
          </div>
        )}
      </UnifiedCardGrid>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingUser ? 'تعديل بيانات المستخدم' : 'إضافة مستخدم جديد'}
            </DialogTitle>
            <DialogDescription>
              {editingUser ? 'تعديل الصلاحيات والبيانات الأساسية' : 'إنشاء حساب جديد للموظف أو المدير'}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <AddUserForm 
              user={editingUser} 
              onSuccess={() => setShowDialog(false)} 
              onCancel={() => setShowDialog(false)} 
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
