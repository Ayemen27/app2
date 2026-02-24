import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Shield, RefreshCw, Briefcase, Eye, Loader2, Search, UserCheck, UserX, Mail, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/AuthProvider';
import { UnifiedFilterDashboard } from '@/components/ui/unified-filter-dashboard';
import { UnifiedCard, UnifiedCardGrid } from '@/components/ui/unified-card';
import type { StatsRowConfig } from '@/components/ui/unified-filter-dashboard/types';
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
  const [searchTerm, setSearchTerm] = useState("");
  
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

  const filteredUsers = useMemo(() => {
    if (!Array.isArray(allUsers)) return [];
    if (!searchTerm) return allUsers;
    const lowerSearch = searchTerm.toLowerCase();
    return allUsers.filter(user => 
      (user.firstName?.toLowerCase() + " " + user.lastName?.toLowerCase()).includes(lowerSearch) ||
      user.email?.toLowerCase().includes(lowerSearch)
    );
  }, [allUsers, searchTerm]);

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

      <UnifiedCardGrid columns={3}>
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <UnifiedCard
              key={user.id}
              title={`${user.firstName} ${user.lastName}`}
              subtitle={user.email}
              titleIcon={Users}
              badges={[
                {
                  label: user.role === 'admin' ? 'مدير نظام' : user.role === 'manager' ? 'مدير مشروع' : 'مستخدم',
                  variant: user.role === 'admin' ? 'default' : user.role === 'manager' ? 'secondary' : 'outline'
                }
              ]}
              fields={[
                {
                  label: "الدور",
                  value: user.role === 'admin' ? 'مدير نظام' : user.role === 'manager' ? 'مدير مشروع' : 'مستخدم (قراءة فقط)',
                  icon: Shield
                }
              ]}
              footer={
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-500">تغيير الصلاحية</label>
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
                      <SelectItem value="user" className="font-bold">مستخدم (قراءة فقط)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              }
            />
          ))
        ) : (
          <div className="col-span-full py-12 text-center bg-white/50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
            <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-bold">لا يوجد مستخدمين لعرضهم</p>
          </div>
        )}
      </UnifiedCardGrid>
    </div>
  );
}
