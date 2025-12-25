
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, UserPlus, UserCheck, UserX, Shield, Mail, Calendar, Settings, Search, Filter, Trash2, Edit, MoreVertical, RefreshCw, Download, Eye, Lock, Unlock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/AuthProvider';
import { UnifiedFilterDashboard } from '@/components/ui/unified-filter-dashboard';
import { UnifiedCard, UnifiedCardGrid } from '@/components/ui/unified-card';
import type { StatsRowConfig, FilterConfig } from '@/components/ui/unified-filter-dashboard/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  emailVerifiedAt: string | null;
  lastLogin: string | null;
  createdAt: string;
}

export default function UsersManagementPage() {
  const { toast } = useToast();
  const { isAuthenticated, getAccessToken } = useAuth();
  const queryClient = useQueryClient();

  const [searchValue, setSearchValue] = useState('');
  const [filterValues, setFilterValues] = useState({
    role: 'all',
    status: 'all',
    verified: 'all',
  });

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: '',
    isActive: true,
  });

  // جلب المستخدمين - موحد مع صفحة المشاريع
  const { data: usersData, isLoading, refetch, error } = useQuery({
    queryKey: ['users', searchValue, filterValues],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (searchValue) params.append('search', searchValue);
        if (filterValues.role && filterValues.role !== 'all') params.append('role', filterValues.role);
        if (filterValues.status && filterValues.status !== 'all') params.append('status', filterValues.status);
        if (filterValues.verified && filterValues.verified !== 'all') params.append('verified', filterValues.verified);

        const queryString = params.toString();
        const endpoint = `/api/users/list${queryString ? '?' + queryString : ''}`;
        
        console.log('🔄 [Users] جلب المستخدمين من:', endpoint);
        
        const response = await apiRequest(endpoint, "GET");
        
        // معالجة هيكل الاستجابة المتعددة (مثل صفحة المشاريع)
        let users = [];
        if (response && typeof response === 'object') {
          if (response.success !== undefined && response.users !== undefined) {
            users = Array.isArray(response.users) ? response.users : [];
          } else if (response.success !== undefined && response.data !== undefined) {
            users = Array.isArray(response.data) ? response.data : [];
          } else if (Array.isArray(response)) {
            users = response;
          } else if (response.data) {
            users = Array.isArray(response.data) ? response.data : [];
          }
        }

        // تحويل البيانات لضمان وجود firstName و lastName
        users = users.map((u: any) => ({
          ...u,
          firstName: u.firstName || u.name?.split(' ')[0] || u.email?.split('@')[0] || 'مستخدم',
          lastName: u.lastName || u.name?.split(' ').slice(1).join(' ') || '',
          isActive: u.isActive !== undefined ? u.isActive : true,
        }));

        return { users };
      } catch (error) {
        console.error('❌ [Users] خطأ في جلب المستخدمين:', error);
        return { users: [] };
      }
    },
    enabled: isAuthenticated,
  });

  // تحديث مستخدم
  const updateMutation = useMutation({
    mutationFn: async (data: { userId: string; updates: any }) => {
      const response = await apiRequest(`/api/auth/users/${data.userId}`, "PUT", data.updates);
      return response;
    },
    onSuccess: () => {
      toast({ title: 'تم تحديث المستخدم بنجاح', variant: 'default' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({ 
        title: 'خطأ في تحديث المستخدم', 
        description: error.message || 'فشل الاتصال بالسيرفر',
        variant: 'destructive' 
      });
    },
  });

  // حذف مستخدم
  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest(`/api/auth/users/${userId}`, "DELETE");
      return response;
    },
    onSuccess: () => {
      toast({ title: 'تم حذف المستخدم بنجاح', variant: 'default' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    },
  });

  // تبديل حالة المستخدم
  const toggleStatusMutation = useMutation({
    mutationFn: async (data: { userId: string; isActive: boolean }) => {
      // استخدام المسار الصحيح المكتشف من السجل
      const response = await apiRequest(`/api/auth/users/${data.userId}/toggle-status`, "POST", { 
        isActive: data.isActive 
      });
      return response;
    },
    onSuccess: () => {
      toast({ title: 'تم تحديث حالة المستخدم', variant: 'default' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      toast({ 
        title: 'خطأ في تحديث الحالة', 
        description: error.message || 'تأكد من صلاحياتك كمسؤول',
        variant: 'destructive' 
      });
    },
  });

  const users = usersData?.users || [];
  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter((u: User) => u.isActive).length,
    inactive: users.filter((u: User) => !u.isActive).length,
    verified: users.filter((u: User) => u.emailVerifiedAt).length,
    admins: users.filter((u: User) => u.role === 'admin' || u.role === 'super_admin').length,
  }), [users]);

  // تكوين صفوف الإحصائيات - شبكة 3×2
  const statsRowsConfig: StatsRowConfig[] = useMemo(() => [
    {
      columns: 3,
      gap: 'sm',
      items: [
        {
          key: 'total',
          label: 'إجمالي المستخدمين',
          value: stats.total,
          icon: Users,
          color: 'blue'
        },
        {
          key: 'active',
          label: 'نشط',
          value: stats.active,
          icon: UserCheck,
          color: 'green'
        },
        {
          key: 'inactive',
          label: 'معطل',
          value: stats.inactive,
          icon: UserX,
          color: 'red'
        }
      ]
    },
    {
      columns: 3,
      gap: 'sm',
      items: [
        {
          key: 'verified',
          label: 'محقق',
          value: stats.verified,
          icon: Mail,
          color: 'purple'
        },
        {
          key: 'admins',
          label: 'مسؤولين',
          value: stats.admins,
          icon: Shield,
          color: 'orange'
        },
        {
          key: 'unverified',
          label: 'غير محقق',
          value: stats.total - stats.verified,
          icon: Mail,
          color: 'gray'
        }
      ]
    }
  ], [stats.total, stats.active, stats.inactive, stats.verified, stats.admins]);

  const filterConfigs: FilterConfig[] = useMemo(() => [
    {
      key: 'role',
      label: 'الدور',
      type: 'select',
      placeholder: 'اختر الدور',
      options: [
        { value: 'all', label: 'الكل' },
        { value: 'super_admin', label: 'مدير أول' },
        { value: 'admin', label: 'مدير' },
        { value: 'user', label: 'مستخدم' },
      ],
    },
    {
      key: 'status',
      label: 'الحالة',
      type: 'select',
      placeholder: 'اختر الحالة',
      options: [
        { value: 'all', label: 'الكل' },
        { value: 'active', label: 'نشط' },
        { value: 'inactive', label: 'معطل' },
      ],
    },
    {
      key: 'verified',
      label: 'التحقق',
      type: 'select',
      placeholder: 'حالة التحقق',
      options: [
        { value: 'all', label: 'الكل' },
        { value: 'verified', label: 'محقق' },
        { value: 'unverified', label: 'غير محقق' },
      ],
    },
  ], []);

  const handleEdit = React.useCallback((user: User) => {
    setSelectedUser(user);
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: '', // لا تظهر كلمة المرور الحالية لأسباب أمنية
      role: user.role,
      isActive: user.isActive,
    });
    setIsEditDialogOpen(true);
  }, []);

  const handleDelete = React.useCallback((user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleSaveEdit = React.useCallback(() => {
    if (selectedUser) {
      // إرسال البيانات فقط إذا تم إدخال كلمة مرور جديدة، وإلا استبعاد الحقل
      const updates = { ...editForm };
      if (!updates.password) {
        delete (updates as any).password;
      }
      
      updateMutation.mutate({
        userId: selectedUser.id,
        updates: updates,
      });
    }
  }, [selectedUser, editForm, updateMutation]);

  const handleConfirmDelete = React.useCallback(() => {
    if (selectedUser) {
      deleteMutation.mutate(selectedUser.id);
    }
  }, [selectedUser, deleteMutation]);

  const getRoleLabel = (role: string) => {
    switch(role) {
      case 'super_admin': return 'مدير أول';
      case 'admin': return 'مدير';
      default: return 'مستخدم';
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch(role) {
      case 'super_admin': return 'default';
      case 'admin': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" dir="rtl">
      {/* Main Content */}
      <div className="px-4 py-6 md:px-6 space-y-6">
        {/* Unified Filter Dashboard */}
        <UnifiedFilterDashboard
          statsRows={statsRowsConfig}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="ابحث عن مستخدم..."
          showSearch={true}
          filters={filterConfigs}
          filterValues={filterValues}
          onFilterChange={React.useCallback((key: string, value: any) => {
            setFilterValues(prev => ({ ...prev, [key]: value }));
          }, [])}
          onReset={React.useCallback(() => {
            setSearchValue('');
            setFilterValues({ role: 'all', status: 'all', verified: 'all' });
          }, [])}
          onRefresh={React.useCallback(() => refetch(), [refetch])}
          isRefreshing={isLoading}
        />

        {/* Users Grid with UnifiedCard */}
        {isLoading ? (
          <LoadingUsers />
        ) : users.length === 0 ? (
          <EmptyUsers />
        ) : (
          <UnifiedCardGrid columns={2}>
            {users.map((user: User) => (
              <UnifiedCard
                key={user.id}
                title={`${user.firstName} ${user.lastName}`}
                subtitle={user.email}
                titleIcon={Users}
                badges={[
                  {
                    label: getRoleLabel(user.role),
                    variant: getRoleBadgeVariant(user.role) as any
                  },
                  {
                    label: user.isActive ? 'نشط' : 'معطل',
                    variant: user.isActive ? 'success' : 'destructive'
                  },
                  {
                    label: user.emailVerifiedAt ? 'محقق' : 'غير محقق',
                    variant: user.emailVerifiedAt ? 'success' : 'warning'
                  }
                ]}
                fields={[
                  {
                    label: 'البريد',
                    value: user.email,
                    icon: Mail,
                    color: 'info'
                  },
                  {
                    label: 'الدور',
                    value: getRoleLabel(user.role),
                    icon: Shield,
                    color: 'default'
                  },
                  {
                    label: 'الحالة',
                    value: user.isActive ? 'نشط' : 'معطل',
                    icon: user.isActive ? Unlock : Lock,
                    color: user.isActive ? 'success' : 'danger',
                    emphasis: true
                  },
                  {
                    label: 'آخر دخول',
                    value: user.lastLogin 
                      ? new Date(user.lastLogin).toLocaleDateString('ar-EG')
                      : 'لم يسجل دخول',
                    icon: Calendar,
                    color: 'muted'
                  }
                ]}
                actions={[
                  {
                    icon: Edit,
                    label: 'تعديل',
                    onClick: () => handleEdit(user),
                    color: 'blue'
                  },
                  {
                    icon: user.isActive ? Lock : Unlock,
                    label: user.isActive ? 'تعطيل' : 'تفعيل',
                    onClick: () => toggleStatusMutation.mutate({ 
                      userId: user.id, 
                      isActive: !user.isActive 
                    }),
                    color: user.isActive ? 'orange' : 'green'
                  },
                  {
                    icon: Trash2,
                    label: 'حذف',
                    onClick: () => handleDelete(user),
                    color: 'red'
                  }
                ]}
                compact={false}
              />
            ))}
          </UnifiedCardGrid>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-blue-500" />
              تعديل بيانات المستخدم
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">الاسم الأول</Label>
                <Input
                  id="firstName"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, firstName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">الاسم الأخير</Label>
                <Input
                  id="lastName"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, lastName: e.target.value }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور الجديدة (اختياري)</Label>
              <Input
                id="password"
                type="password"
                placeholder="اتركها فارغة لعدم التغيير"
                value={editForm.password}
                onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">الدور</Label>
              <select
                id="role"
                className="w-full h-10 border rounded-md px-3 bg-background"
                value={editForm.role}
                onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}
              >
                <option value="user">مستخدم</option>
                <option value="admin">مدير</option>
                <option value="super_admin">مدير أول</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50 dark:bg-slate-900">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">حالة الحساب</Label>
                <p className="text-xs text-muted-foreground">تفعيل أو تعطيل دخول المستخدم</p>
              </div>
              <Button
                variant={editForm.isActive ? "default" : "outline"}
                size="sm"
                onClick={() => setEditForm(prev => ({ ...prev, isActive: !prev.isActive }))}
                className={cn(
                  "gap-2",
                  editForm.isActive ? "bg-green-600 hover:bg-green-700" : "text-red-600 border-red-200 bg-red-50 hover:bg-red-100"
                )}
              >
                {editForm.isActive ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                {editForm.isActive ? 'نشط' : 'معطل'}
              </Button>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1">إلغاء</Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending} className="flex-1">
              {updateMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف المستخدم {selectedUser?.firstName} {selectedUser?.lastName} نهائياً. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const LoadingUsers = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    {[1, 2, 3, 4].map(i => (
      <Skeleton key={i} className="h-48 w-full rounded-xl" />
    ))}
  </div>
);

const EmptyUsers = () => (
  <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
    <Users className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
    <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">لا يوجد مستخدمون</h3>
    <p className="text-sm text-slate-500 dark:text-slate-400">لم يتم العثور على أي مستخدمين</p>
  </div>
);
