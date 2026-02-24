import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { User, Mail, Shield, Lock, Phone } from "lucide-react";
import { CompactFieldGroup } from "@/components/ui/form-grid";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface User {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  role: string;
  phone?: string | null;
}

interface AddUserFormProps {
  user?: User;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function AddUserForm({ user, onSuccess, onCancel }: AddUserFormProps) {
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [role, setRole] = useState(user?.role || "user");
  const [phone, setPhone] = useState(user?.phone || "");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (user) {
        return apiRequest(`/api/users/${user.id}`, "PATCH", data);
      } else {
        return apiRequest("/api/auth/register", "POST", {
          ...data,
          fullName: `${data.firstName} ${data.lastName}`.trim()
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users || ["/api/users"] });
      toast({
        title: "تم بنجاح",
        description: user ? "تم تحديث بيانات المستخدم" : "تم إضافة المستخدم بنجاح",
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || (!user && !password) || !firstName || !lastName) {
      toast({
        title: "تنبيه",
        description: "يرجى ملء الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    mutation.mutate({
      email,
      password: password || undefined,
      firstName,
      lastName,
      role,
      phone,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <CompactFieldGroup columns={2}>
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <User className="h-4 w-4 text-blue-500" />
            الاسم الأول *
          </Label>
          <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <User className="h-4 w-4 text-blue-500" />
            الاسم الأخير *
          </Label>
          <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        </div>
      </CompactFieldGroup>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-purple-500" />
          البريد الإلكتروني *
        </Label>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>

      {!user && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-red-500" />
            كلمة المرور *
          </Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
      )}

      <CompactFieldGroup columns={2}>
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-green-500" />
            رقم الهاتف
          </Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-orange-500" />
            الصلاحية
          </Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">مدير نظام</SelectItem>
              <SelectItem value="manager">مدير مشروع</SelectItem>
              <SelectItem value="user">مستخدم</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CompactFieldGroup>

      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1" disabled={mutation.isPending}>
          {mutation.isPending ? "جاري الحفظ..." : user ? "حفظ التعديلات" : "إضافة مستخدم"}
        </Button>
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
          إلغاء
        </Button>
      </div>
    </form>
  );
}
