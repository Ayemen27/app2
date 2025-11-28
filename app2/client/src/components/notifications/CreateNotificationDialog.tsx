import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { Zap, Users, Shield, User, Send, Sparkles, AlertTriangle, ChevronDown, Crown, UserCheck } from "lucide-react";

const notificationSchema = z.object({
  type: z.enum(['safety', 'task', 'payroll', 'announcement', 'system']),
  title: z.string().min(1, "العنوان مطلوب"),
  body: z.string().min(1, "المحتوى مطلوب"),
  priority: z.number().min(1).max(5),
  recipientType: z.enum(['all', 'admins', 'workers', 'specific']),
  specificUserId: z.string().optional(),
});

type NotificationFormData = z.infer<typeof notificationSchema>;

interface CreateNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notificationType?: 'safety' | 'task' | 'payroll' | 'announcement' | 'system';
  projectId?: string;
}

const notificationTypes = [
  { 
    value: 'safety', 
    label: 'تنبيه أمني', 
    description: 'تنبيهات السلامة والأمان',
    icon: '🚨',
    color: 'from-red-500 to-red-600'
  },
  { 
    value: 'task', 
    label: 'إشعار مهمة', 
    description: 'إشعارات المهام والواجبات',
    icon: '📝',
    color: 'from-blue-500 to-blue-600'
  },
  { 
    value: 'payroll', 
    label: 'إشعار راتب', 
    description: 'إشعارات الرواتب والمستحقات',
    icon: '💰',
    color: 'from-green-500 to-green-600'
  },
  { 
    value: 'announcement', 
    label: 'إعلان عام', 
    description: 'إعلانات عامة للجميع',
    icon: '📢',
    color: 'from-purple-500 to-purple-600'
  },
  { 
    value: 'system', 
    label: 'إشعار نظام', 
    description: 'إشعارات النظام التلقائية',
    icon: '⚙️',
    color: 'from-gray-500 to-gray-600'
  },
];

const priorityLevels = [
  { value: 1, label: 'حرج جداً', color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
  { value: 2, label: 'عاجل', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
  { value: 3, label: 'متوسط', color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
  { value: 4, label: 'منخفض', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  { value: 5, label: 'معلومة', color: 'text-gray-600', bg: 'bg-gray-50 border-gray-200' },
];

// دالة لتحديد أيقونة ولون الدور
const getRoleInfo = (role: string) => {
  switch (role?.toLowerCase()) {
    case 'admin':
    case 'مدير':
    case 'مسؤول':
      return {
        icon: Crown,
        label: 'مدير',
        color: 'from-red-500 to-red-600',
        textColor: 'text-red-700',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      };
    case 'manager':
    case 'مشرف':
      return {
        icon: Shield,
        label: 'مشرف',
        color: 'from-orange-500 to-orange-600',
        textColor: 'text-orange-700',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200'
      };
    case 'user':
    case 'مستخدم':
    case 'موظف':
    default:
      return {
        icon: UserCheck,
        label: 'مستخدم',
        color: 'from-blue-500 to-blue-600',
        textColor: 'text-blue-700',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
      };
  }
};

export function CreateNotificationDialog({
  open,
  onOpenChange,
  notificationType = 'announcement',
  projectId
}: CreateNotificationDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getAccessToken } = useAuth();
  const [selectedRecipientType, setSelectedRecipientType] = useState<string>('all');

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': getAccessToken() ? `Bearer ${getAccessToken()}` : '',
  });

  // جلب قائمة المستخدمين مع أدوارهم
  const { data: users = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ['/api/users', 'with-roles'],
    queryFn: async () => {
      const response = await fetch('/api/users?includeRole=true', {
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error('فشل في جلب المستخدمين');
      return response.json();
    },
  });

  const form = useForm<NotificationFormData>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      type: notificationType,
      title: "",
      body: "",
      priority: 3,
      recipientType: "all",
      specificUserId: undefined,
    },
  });

  const createNotificationMutation = useMutation({
    mutationFn: async (data: NotificationFormData & { projectId?: string }) => {
      let endpoint = '/api/notifications';

      // اختيار endpoint بناء على نوع الإشعار
      switch (data.type) {
        case 'safety':
          endpoint = '/api/notifications/safety';
          break;
        case 'task':
          endpoint = '/api/notifications/task';
          break;
        case 'payroll':
          endpoint = '/api/notifications/payroll';
          break;
        case 'announcement':
          endpoint = '/api/notifications/announcement';
          break;
        default:
          endpoint = '/api/notifications';
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...data,
          projectId: projectId,
          recipients: data.recipientType === 'specific' && data.specificUserId ? [data.specificUserId] : data.recipientType,
        }),
      });

      if (!response.ok) {
        throw new Error('فشل في إنشاء الإشعار');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "تم بنجاح",
        description: "تم إنشاء الإشعار بنجاح",
      });

      // تحديث cache الإشعارات
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      // إغلاق الحوار وإعادة تعيين النموذج
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "خطأ",
        description: "فشل في إنشاء الإشعار",
        variant: "destructive",
      });
      console.error('Error creating notification:', error);
    },
  });

  const onSubmit = (data: NotificationFormData) => {
    createNotificationMutation.mutate({
      ...data,
      projectId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[95vw] md:max-w-[600px] border-0 p-0 overflow-hidden bg-white rounded-xl md:rounded-2xl shadow-2xl" data-testid="create-notification-dialog">
        <DialogHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 md:p-5">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-9 h-9 md:w-10 md:h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-4 w-4 md:h-5 md:w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base md:text-lg font-bold">إنشاء إشعار</DialogTitle>
              <DialogDescription className="text-blue-100 text-xs md:text-sm mt-0.5">
                أرسل إشعاراً للمستخدمين
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-3 md:p-5 overflow-y-auto max-h-[80vh]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 md:space-y-4">
              {/* الصف الأول: العنوان فقط */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs md:text-sm font-semibold text-gray-800">العنوان</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="أدخل العنوان..."
                        className="h-9 md:h-10 border-2 border-gray-200 hover:border-blue-300 focus:border-blue-500 rounded-lg text-sm"
                        data-testid="notification-title-input"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* الصف الثاني: النوع والحالة جنباً إلى جنب */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* نوع الإشعار */}
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs md:text-sm font-semibold text-gray-800">النوع</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9 md:h-10 border-2 border-gray-200 hover:border-blue-300 focus:border-blue-500 rounded-lg text-sm" data-testid="notification-type-select">
                            <SelectValue placeholder="اختر" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-lg border-0 shadow-lg">
                          {notificationTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value} className="p-2 rounded-lg text-xs">
                              <span>{type.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* مستوى الأولوية */}
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs md:text-sm font-semibold text-gray-800">الحالة</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        defaultValue={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger className="h-9 md:h-10 border-2 border-gray-200 hover:border-blue-300 focus:border-blue-500 rounded-lg text-sm" data-testid="priority-select">
                            <SelectValue placeholder="اختر" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-lg border-0 shadow-lg">
                          {priorityLevels.map((level) => (
                            <SelectItem key={level.value} value={level.value.toString()} className="p-2 rounded-lg text-xs">
                              <span>{level.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              {/* الصف الثاني: خيارات المستقبلين - بشكل أفقي */}
              <FormField
                control={form.control}
                name="recipientType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs md:text-sm font-semibold text-gray-800">المستقبلين</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'all', label: 'الجميع', icon: Users },
                        { value: 'admins', label: 'المسؤولين', icon: Shield },
                        { value: 'workers', label: 'الموظفين', icon: User },
                        { value: 'specific', label: 'محدد', icon: User },
                      ].map((option) => {
                        const IconComponent = option.icon;
                        const isSelected = field.value === option.value;
                        return (
                          <div key={option.value}>
                            <button
                              type="button"
                              onClick={() => {
                                field.onChange(option.value);
                                setSelectedRecipientType(option.value);
                              }}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 transition-all text-xs md:text-sm font-medium ${
                                isSelected 
                                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                                  : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
                              }`}
                              data-testid={`recipient-type-${option.value}`}
                            >
                              <IconComponent className="h-3.5 w-3.5" />
                              <span>{option.label}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* اختيار المستخدم المحدد */}
                    {field.value === 'specific' && (
                      <div className="mt-2">
                        <FormField
                          control={form.control}
                          name="specificUserId"
                          render={({ field: userField }) => (
                            <FormItem>
                              <FormLabel className="text-xs md:text-sm font-semibold text-gray-700">اختر المستخدم</FormLabel>
                              <Select onValueChange={userField.onChange} value={userField.value}>
                                <FormControl>
                                  <SelectTrigger 
                                    className="h-9 md:h-10 border-2 border-gray-200 hover:border-blue-300 focus:border-blue-500 rounded-lg text-sm"
                                    data-testid="specific-user-select"
                                  >
                                    <SelectValue placeholder="اختر..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="rounded-lg border-0 shadow-lg max-h-40">
                                  {isLoadingUsers ? (
                                    <div className="p-2 text-center text-gray-500 text-xs">جاري التحميل...</div>
                                  ) : users.length > 0 ? (
                                    users.map((user: any) => (
                                      <SelectItem 
                                        key={user.id} 
                                        value={user.id} 
                                        className="p-2 rounded-lg text-xs"
                                      >
                                        <span>{user.firstName || user.name || 'بدون اسم'}</span>
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <div className="p-2 text-center text-gray-500 text-xs">لا يوجد مستخدمون</div>
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage className="text-xs" />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* المحتوى */}
              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs md:text-sm font-semibold text-gray-800">المحتوى</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field}
                        placeholder="اكتب الرسالة..."
                        rows={3}
                        className="border-2 border-gray-200 hover:border-blue-300 focus:border-blue-500 rounded-lg text-sm resize-none"
                        data-testid="notification-body-textarea"
                      />
                    </FormControl>
                    <div className="flex justify-end mt-0.5">
                      <span className="text-xs text-gray-400">
                        {field.value?.length || 0} حرف
                      </span>
                    </div>
                  </FormItem>
                )}
              />

              <div className="flex gap-2 md:gap-3 pt-3 md:pt-4 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1 h-8 md:h-10 border-2 border-gray-300 hover:border-gray-400 rounded-lg font-semibold text-sm md:text-base"
                  data-testid="cancel-notification-button"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  disabled={createNotificationMutation.isPending}
                  className="flex-1 h-8 md:h-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 text-sm md:text-base"
                  data-testid="create-notification-button"
                >
                  {createNotificationMutation.isPending ? (
                    <div className="flex items-center gap-1 md:gap-2">
                      <div className="animate-spin rounded-full h-3 w-3 md:h-4 md:w-4 border-b-2 border-white"></div>
                      إرسال...
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 md:gap-2">
                      <Send className="h-3 w-3 md:h-4 md:w-4" />
                      إرسال
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}