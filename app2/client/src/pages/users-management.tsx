
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, UserPlus, UserCheck, UserX, Shield, Mail, Calendar, Settings, Search, Filter, Trash2, Edit, MoreVertical, RefreshCw, Download, Eye, Lock, Unlock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/AuthProvider';
import UnifiedFilterDashboard from '@/components/ui/unified-filter-dashboard';
import type { FilterConfig } from '@/components/ui/unified-filter-dashboard/types';
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
    role: '',
    status: '',
    verified: '',
  });

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    role: '',
    isActive: true,
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  };

  // جلب المستخدمين
  const { data: usersData, isLoading, refetch } = useQuery({
    queryKey: ['users', searchValue, filterValues],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchValue) params.append('search', searchValue);
      if (filterValues.role) params.append('role', filterValues.role);
      if (filterValues.status) params.append('status', filterValues.status);
      if (filterValues.verified) params.append('verified', filterValues.verified);

      const response = await fetch(`/api/auth/users?${params}`, {
        headers: getAuthHeaders()
      });
      if (!response.ok) {
        const error = await response.text();
        console.error('خطأ في جلب المستخدمين:', error);
        throw new Error('فشل في جلب المستخدمين');
      }
      return response.json();
    },
    enabled: isAuthenticated,
  });

  // تحديث مستخدم
  const updateMutation = useMutation({
    mutationFn: async (data: { userId: string; updates: any }) => {
      const response = await fetch(`/api/auth/users/${data.userId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data.updates),
      });
      if (!response.ok) throw new Error('فشل في تحديث المستخدم');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'تم تحديث المستخدم بنجاح', variant: 'default' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
    },
    onError: () => {
      toast({ title: 'خطأ في تحديث المستخدم', variant: 'destructive' });
    },
  });

  // حذف مستخدم
  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/auth/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error('فشل في حذف المستخدم');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'تم حذف المستخدم بنجاح', variant: 'default' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    },
    onError: () => {
      toast({ title: 'خطأ في حذف المستخدم', variant: 'destructive' });
    },
  });

  // تبديل حالة المستخدم
  const toggleStatusMutation = useMutation({
    mutationFn: async (data: { userId: string; isActive: boolean }) => {
      const response = await fetch(`/api/auth/users/${data.userId}/toggle-status`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isActive: data.isActive }),
      });
      if (!response.ok) throw new Error('فشل في تحديث الحالة');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'تم تحديث حالة المستخدم', variant: 'default' });
      queryClient.invalidateQueries({ queryKey: ['users'] });
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

  const filterConfigs: FilterConfig[] = [
    {
      key: 'role',
      label: 'الدور',
      type: 'select',
      placeholder: 'اختر الدور',
      options: [
        { value: '', label: 'الكل' },
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
        { value: '', label: 'الكل' },
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
        { value: '', label: 'الكل' },
        { value: 'verified', label: 'محقق' },
        { value: 'unverified', label: 'غير محقق' },
      ],
    },
  ];

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (user: User) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (selectedUser) {
      updateMutation.mutate({
        userId: selectedUser.id,
        updates: editForm,
      });
    }
  };

  const handleConfirmDelete = () => {
    if (selectedUser) {
      deleteMutation.mutate(selectedUser.id);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shadow-lg">
        <div className="px-4 py-4 md:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 via-pink-600 to-red-600 flex items-center justify-center shadow-xl shadow-purple-500/30 ring-2 ring-white dark:ring-slate-900">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-black text-slate-900 dark:text-white truncate">
                  إدارة المستخدمين
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                  إدارة ومراقبة الحسابات
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
                className="gap-2 border-2"
              >
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                <span className="hidden md:inline">تحديث</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6 md:px-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <StatsCard icon={Users} label="إجمالي المستخدمين" value={stats.total} gradient="from-blue-500 to-cyan-500" />
          <StatsCard icon={UserCheck} label="نشط" value={stats.active} gradient="from-green-500 to-emerald-500" />
          <StatsCard icon={UserX} label="معطل" value={stats.inactive} gradient="from-red-500 to-rose-500" />
          <StatsCard icon={Mail} label="محقق" value={stats.verified} gradient="from-purple-500 to-pink-500" />
          <StatsCard icon={Shield} label="مسؤولين" value={stats.admins} gradient="from-orange-500 to-amber-500" />
        </div>

        {/* Filters */}
        <UnifiedFilterDashboard
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="ابحث عن مستخدم..."
          showSearch={true}
          filters={filterConfigs}
          filterValues={filterValues}
          onFilterChange={(key, value) => setFilterValues(prev => ({ ...prev, [key]: value }))}
          onReset={() => {
            setSearchValue('');
            setFilterValues({ role: '', status: '', verified: '' });
          }}
          onRefresh={() => refetch()}
          isRefreshing={isLoading}
        />

        {/* Users Table */}
        <Card className="mt-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <Users className="h-5 w-5" />
              قائمة المستخدمين ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <LoadingUsers />
            ) : users.length === 0 ? (
              <EmptyUsers />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-300">المستخدم</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-300">البريد الإلكتروني</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-300">الدور</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-300">الحالة</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-300">التحقق</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-300">آخر دخول</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-300">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {users.map((user: User) => (
                      <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {user.firstName} {user.lastName}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-slate-600 dark:text-slate-400">{user.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={user.role === 'super_admin' ? 'default' : user.role === 'admin' ? 'secondary' : 'outline'}>
                            {user.role === 'super_admin' ? 'مدير أول' : user.role === 'admin' ? 'مدير' : 'مستخدم'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={user.isActive ? 'default' : 'destructive'} className="gap-1">
                            {user.isActive ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                            {user.isActive ? 'نشط' : 'معطل'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {user.emailVerifiedAt ? (
                            <Badge variant="default" className="gap-1 bg-green-600">
                              <UserCheck className="h-3 w-3" />
                              محقق
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 text-orange-600 border-orange-600">
                              <UserX className="h-3 w-3" />
                              غير محقق
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs text-slate-600 dark:text-slate-400">
                            {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('ar-EG') : 'لم يسجل دخول'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(user)} className="gap-2">
                                  <Edit className="h-4 w-4" />
                                  تعديل
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => toggleStatusMutation.mutate({ userId: user.id, isActive: !user.isActive })}
                                  className="gap-2"
                                >
                                  {user.isActive ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                                  {user.isActive ? 'تعطيل' : 'تفعيل'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDelete(user)} className="gap-2 text-red-600">
                                  <Trash2 className="h-4 w-4" />
                                  حذف
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل المستخدم</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>الاسم الأول</Label>
              <Input
                value={editForm.firstName}
                onChange={(e) => setEditForm(prev => ({ ...prev, firstName: e.target.value }))}
              />
            </div>
            <div>
              <Label>الاسم الأخير</Label>
              <Input
                value={editForm.lastName}
                onChange={(e) => setEditForm(prev => ({ ...prev, lastName: e.target.value }))}
              />
            </div>
            <div>
              <Label>الدور</Label>
              <select
                className="w-full border rounded-md px-3 py-2"
                value={editForm.role}
                onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}
              >
                <option value="user">مستخدم</option>
                <option value="admin">مدير</option>
                <option value="super_admin">مدير أول</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>حفظ</Button>
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

const StatsCard = ({ icon: Icon, label, value, gradient }: any) => (
  <Card className="relative overflow-hidden border-0 bg-white dark:bg-slate-900 shadow-lg hover:shadow-xl transition-all">
    <div className={cn("absolute inset-0 bg-gradient-to-br opacity-5", gradient)} />
    <CardContent className="p-4 relative">
      <div className="flex items-center gap-3 mb-2">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br", gradient)}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
      <p className="text-2xl font-black text-slate-900 dark:text-white">{value}</p>
      <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</p>
    </CardContent>
  </Card>
);

const LoadingUsers = () => (
  <div className="p-4 space-y-3">
    {[1, 2, 3, 4, 5].map(i => (
      <Skeleton key={i} className="h-16 w-full rounded-lg" />
    ))}
  </div>
);

const EmptyUsers = () => (
  <div className="p-12 text-center">
    <Users className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
    <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">لا يوجد مستخدمون</h3>
    <p className="text-sm text-slate-500 dark:text-slate-400">لم يتم العثور على أي مستخدمين</p>
  </div>
);
