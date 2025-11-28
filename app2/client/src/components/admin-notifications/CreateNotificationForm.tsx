import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Zap, Send } from 'lucide-react';

interface CreateNotificationFormProps {
  onSubmit: (notification: any) => void;
  isLoading: boolean;
}

const typeOptions = [
  { value: 'announcement', label: '📢 إعلان' },
  { value: 'system', label: '⚙️ نظام' },
  { value: 'security', label: '🔒 أمني' },
  { value: 'error', label: '❌ خطأ' },
  { value: 'task', label: '📋 مهمة' },
  { value: 'payroll', label: '💰 راتب' },
  { value: 'maintenance', label: '🔧 صيانة' },
  { value: 'warranty', label: '🛡️ ضمان' }
];

const priorityOptions = [
  { value: '1', label: 'ℹ️ معلومات', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { value: '2', label: '✅ منخفض', color: 'bg-green-50 border-green-200 text-green-700' },
  { value: '3', label: '⚠️ متوسط', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
  { value: '4', label: '🔔 عالي', color: 'bg-orange-50 border-orange-200 text-orange-700' },
  { value: '5', label: '🚨 حرج', color: 'bg-red-50 border-red-200 text-red-700' }
];

export const CreateNotificationForm: React.FC<CreateNotificationFormProps> = ({
  onSubmit,
  isLoading
}) => {
  const [form, setForm] = useState({
    title: '',
    body: '',
    type: 'announcement',
    priority: 3,
    recipients: 'all',
    specificUserId: ''
  });

  const handleSubmit = () => {
    if (!form.title.trim() || !form.body.trim()) {
      return;
    }
    if (form.recipients === 'specific' && !form.specificUserId) {
      return;
    }

    onSubmit({
      ...form,
      priority: parseInt(form.priority.toString())
    });

    // إعادة تعيين النموذج
    setForm({
      title: '',
      body: '',
      type: 'announcement',
      priority: 3,
      recipients: 'all',
      specificUserId: ''
    });
  };

  const selectedPriority = priorityOptions.find(p => p.value === form.priority.toString());

  return (
    <Card className="bg-white border border-gray-200 shadow-lg">
      <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3 border-b border-gray-100">
        <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-600" />
          إنشاء إشعار جديد
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* صف النوع والأولوية */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">نوع الإشعار</label>
            <Select
              value={form.type}
              onValueChange={(value) => setForm({ ...form, type: value })}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">الأولوية</label>
            <div className="flex gap-2 flex-wrap">
              {priorityOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setForm({ ...form, priority: parseInt(option.value) })}
                  className={`px-3 py-2 rounded-lg border text-xs sm:text-sm font-medium transition-all ${
                    form.priority.toString() === option.value
                      ? option.color + ' border-current shadow-md'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* العنوان */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">عنوان الإشعار</label>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="أدخل عنوان الإشعار..."
            className="h-10 border-gray-300"
          />
        </div>

        {/* المحتوى */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">محتوى الإشعار</label>
          <Textarea
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder="أدخل محتوى الإشعار التفصيلي..."
            rows={5}
            className="border-gray-300 resize-none"
          />
        </div>

        {/* المستقبلين */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700">المستقبلين</label>
          <Select
            value={form.recipients}
            onValueChange={(value) => setForm({ ...form, recipients: value })}
          >
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">👥 جميع المستخدمين</SelectItem>
              <SelectItem value="admins">🔐 المسؤولين فقط</SelectItem>
              <SelectItem value="users">👤 المستخدمين العاديين</SelectItem>
              <SelectItem value="specific">🎯 مستخدم محدد</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* زر الإرسال */}
        <Button
          onClick={handleSubmit}
          disabled={!form.title.trim() || !form.body.trim() || isLoading}
          className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Send className="h-4 w-4 mr-2" />
          {isLoading ? 'جاري الإرسال...' : 'إرسال الإشعار'}
        </Button>

        {/* ملخص سريع */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 space-y-2">
          <p className="text-xs sm:text-sm font-semibold text-blue-900">📋 ملخص الإشعار:</p>
          <div className="space-y-1 text-xs sm:text-sm">
            <p><span className="font-medium text-blue-900">النوع:</span> <Badge className="ml-2">{form.type}</Badge></p>
            <p><span className="font-medium text-blue-900">الأولوية:</span> <Badge className="ml-2">{selectedPriority?.label}</Badge></p>
            <p><span className="font-medium text-blue-900">المستقبلين:</span> <Badge className="ml-2">
              {form.recipients === 'all' ? 'جميع المستخدمين' :
               form.recipients === 'admins' ? 'المسؤولين' :
               form.recipients === 'users' ? 'المستخدمين' : 'مستخدم محدد'}
            </Badge></p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
