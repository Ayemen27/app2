import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getWorker, deleteWorker, updateWorker } from './repo';
import { getWorkerAttendanceSummary } from '../attendance/repo';
import type { Worker } from '../../db/schema';
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { useToast } from '../../hooks/use-toast';
import { ArrowRight, Edit2, Trash2, User, DollarSign, Phone, Calendar, Clock, Wallet, Building, RefreshCw, CreditCard, AlertTriangle } from 'lucide-react';

interface AttendanceSummary {
  totalDays: number;
  totalEarned: number;
  totalPaid: number;
  balance: number;
  lastAttendance: string | null;
}

export function WorkerDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [worker, setWorker] = useState<Worker | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    workerType: '' as Worker['workerType'],
    dailyWage: 0,
    status: '' as Worker['status'],
    notes: '',
  });

  const loadWorker = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const data = await getWorker(id);
      setWorker(data);
      
      if (data) {
        setEditForm({
          name: data.name,
          phone: data.phone || '',
          workerType: data.workerType,
          dailyWage: data.dailyWage,
          status: data.status,
          notes: data.notes || '',
        });
        
        const summary = await getWorkerAttendanceSummary(id);
        setAttendanceSummary(summary);
      }
    } catch (error) {
      console.error('خطأ في تحميل بيانات العامل:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadWorker();
  }, [loadWorker]);

  const handleUpdate = async () => {
    if (!worker) return;
    
    try {
      setIsUpdating(true);
      await updateWorker({
        id: worker.id,
        name: editForm.name,
        phone: editForm.phone || undefined,
        workerType: editForm.workerType,
        dailyWage: editForm.dailyWage,
        status: editForm.status,
        notes: editForm.notes || undefined,
      });
      setShowEditForm(false);
      toast({
        title: t('workers.updateSuccess', 'تم التحديث بنجاح'),
        description: t('workers.updateSuccessDesc', { name: editForm.name, defaultValue: `تم تحديث بيانات العامل "${editForm.name}"` }),
      });
      loadWorker();
    } catch (error) {
      console.error('خطأ في تحديث بيانات العامل:', error);
      toast({
        title: t('workers.updateError', 'خطأ في التحديث'),
        description: t('workers.updateErrorDesc', 'فشل في تحديث بيانات العامل'),
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!worker) return;
    
    try {
      setIsDeleting(true);
      await deleteWorker(worker.id);
      setShowDeleteConfirm(false);
      toast({
        title: t('workers.deleteSuccess', 'تم الحذف بنجاح'),
        description: t('workers.deleteSuccessDesc', { name: worker.name, defaultValue: `تم حذف العامل "${worker.name}"` }),
      });
      navigate('/workers');
    } catch (error) {
      console.error('خطأ في حذف العامل:', error);
      toast({
        title: t('workers.deleteError', 'خطأ في الحذف'),
        description: t('workers.deleteErrorDesc', 'فشل في حذف العامل'),
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getWorkerTypeBadgeVariant = (type: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      skilled: 'default',
      unskilled: 'secondary',
      supervisor: 'default',
      driver: 'outline',
      other: 'secondary',
    };
    return variants[type] || 'secondary';
  };

  const getWorkerTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      skilled: 'ماهر',
      unskilled: 'عادي',
      supervisor: 'مشرف',
      driver: 'سائق',
      other: 'أخرى',
    };
    return labels[type] || type;
  };

  const getStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      inactive: 'secondary',
      terminated: 'destructive',
    };
    return variants[status] || 'secondary';
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      active: 'نشط',
      inactive: 'غير نشط',
      terminated: 'منتهي',
    };
    return labels[status] || status;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString() + ' ريال';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4" dir="rtl">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-muted-foreground">جاري تحميل بيانات العامل...</p>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4" dir="rtl">
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <p className="text-lg text-muted-foreground">العامل غير موجود</p>
        <Button onClick={() => navigate('/workers')} variant="default">
          <ArrowRight className="ml-2 h-4 w-4" />
          العودة لقائمة العمال
        </Button>
      </div>
    );
  }

  return (
    <div className="worker-detail-page space-y-4 p-4" dir="rtl">
      <div className="flex justify-start mb-4">
        <Button 
          variant="outline"
          onClick={() => navigate('/workers')}
          size="sm"
        >
          <ArrowRight className="ml-2 h-4 w-4" />
          رجوع
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex flex-col gap-1">
              <CardTitle className="text-xl">{worker.name}</CardTitle>
              <Badge variant={getWorkerTypeBadgeVariant(worker.workerType)}>
                {getWorkerTypeLabel(worker.workerType)}
              </Badge>
            </div>
          </div>
          <Badge variant={getStatusBadgeVariant(worker.status)} className="text-sm">
            {getStatusLabel(worker.status)}
          </Badge>
        </CardHeader>
        
        <CardContent className="space-y-3 pt-4">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              الأجر اليومي:
            </span>
            <span className="font-semibold text-green-600">{formatCurrency(worker.dailyWage)}</span>
          </div>
          
          {worker.phone && (
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                رقم الهاتف:
              </span>
              <a 
                href={`tel:${worker.phone}`}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
                dir="ltr"
              >
                <Phone className="h-4 w-4" />
                {worker.phone}
              </a>
            </div>
          )}
          
          {worker.nationalId && (
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="flex items-center gap-2 text-muted-foreground">
                <CreditCard className="h-4 w-4" />
                رقم الهوية:
              </span>
              <span dir="ltr">{worker.nationalId}</span>
            </div>
          )}
          
          {worker.startDate && (
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                تاريخ البدء:
              </span>
              <span>{worker.startDate}</span>
            </div>
          )}
          
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              تاريخ الإضافة:
            </span>
            <span>{formatDate(worker.createdAt)}</span>
          </div>
          
          {worker.notes && (
            <div className="py-2">
              <span className="flex items-center gap-2 text-muted-foreground mb-2">
                ملاحظات:
              </span>
              <p className="bg-gray-50 p-3 rounded-lg text-sm">
                {worker.notes}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between py-2 pt-3 border-t border-gray-200">
            <span className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className="h-4 w-4" />
              حالة المزامنة:
            </span>
            <Badge variant={worker.syncStatus === 'synced' ? 'default' : 'secondary'}>
              {worker.syncStatus === 'synced' ? 'متزامن' : worker.syncStatus === 'pending' ? 'ينتظر' : worker.syncStatus}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {attendanceSummary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building className="h-5 w-5" />
              إحصائيات الحضور
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <div className="text-xl font-bold text-blue-700">{attendanceSummary.totalDays}</div>
                <div className="text-xs text-blue-600">أيام العمل</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <div className="text-xl font-bold text-green-700">{attendanceSummary.totalEarned.toLocaleString()}</div>
                <div className="text-xs text-green-600">إجمالي المستحق</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-amber-50 p-3 rounded-lg text-center">
                <div className="text-xl font-bold text-amber-700">{attendanceSummary.totalPaid.toLocaleString()}</div>
                <div className="text-xs text-amber-600">المدفوع</div>
              </div>
              <div className={`p-3 rounded-lg text-center ${attendanceSummary.balance > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                <div className={`text-xl font-bold ${attendanceSummary.balance > 0 ? 'text-red-700' : 'text-green-700'}`}>
                  {attendanceSummary.balance.toLocaleString()}
                </div>
                <div className={`text-xs ${attendanceSummary.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {attendanceSummary.balance > 0 ? 'المتبقي' : 'تمت التسوية'}
                </div>
              </div>
            </div>
            {attendanceSummary.lastAttendance && (
              <div className="mt-3 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Clock className="h-4 w-4" />
                آخر حضور: {attendanceSummary.lastAttendance}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3 pt-2">
        <Button 
          variant="default" 
          className="flex-1"
          onClick={() => setShowEditForm(true)}
        >
          <Edit2 className="ml-2 h-4 w-4" />
          تعديل
        </Button>
        <Button 
          variant="destructive"
          className="flex-1"
          onClick={() => setShowDeleteConfirm(true)}
        >
          <Trash2 className="ml-2 h-4 w-4" />
          حذف
        </Button>
      </div>

      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5" />
              تعديل بيانات العامل
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">الاسم *</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">رقم الهاتف</label>
              <input
                type="tel"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={editForm.phone}
                onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                dir="ltr"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">نوع العامل *</label>
              <select
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={editForm.workerType}
                onChange={e => setEditForm({ ...editForm, workerType: e.target.value as Worker['workerType'] })}
              >
                <option value="skilled">ماهر</option>
                <option value="unskilled">عادي</option>
                <option value="supervisor">مشرف</option>
                <option value="driver">سائق</option>
                <option value="other">أخرى</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">الأجر اليومي (ريال) *</label>
              <input
                type="number"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={editForm.dailyWage}
                onChange={e => setEditForm({ ...editForm, dailyWage: parseFloat(e.target.value) || 0 })}
                min="0"
                step="0.01"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">الحالة *</label>
              <select
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={editForm.status}
                onChange={e => setEditForm({ ...editForm, status: e.target.value as Worker['status'] })}
              >
                <option value="active">نشط</option>
                <option value="inactive">غير نشط</option>
                <option value="terminated">منتهي</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">ملاحظات</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y"
                value={editForm.notes}
                onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter className="flex gap-2 flex-row-reverse sm:flex-row">
            <Button 
              variant="outline" 
              onClick={() => setShowEditForm(false)}
              disabled={isUpdating}
            >
              إلغاء
            </Button>
            <Button 
              variant="default"
              onClick={handleUpdate}
              disabled={!editForm.name || editForm.dailyWage <= 0 || isUpdating}
              loading={isUpdating}
              loadingText="جاري الحفظ..."
            >
              حفظ التعديلات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              تأكيد الحذف
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-3">
            <p>
              هل أنت متأكد من حذف العامل "{worker.name}"؟
            </p>
            <p className="text-red-600 text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              سيتم حذف العامل من القائمة ولكن يمكن استعادته لاحقاً
            </p>
          </div>
          
          <DialogFooter className="flex gap-2 flex-row-reverse sm:flex-row">
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
            >
              إلغاء
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              loading={isDeleting}
              loadingText="جاري الحذف..."
            >
              <Trash2 className="ml-2 h-4 w-4" />
              نعم، احذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default WorkerDetailPage;
