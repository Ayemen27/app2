import { ENV } from "@/lib/env";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { getValidToken } from "@/lib/token-utils";
import { shouldUseBearerAuth, getFetchCredentials, getAuthHeaders, authFetch } from "@/lib/auth-token-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Loader2, CheckCircle2, QrCode, MessageSquare, AlertCircle,
  RefreshCw, Smartphone, ShieldCheck, Zap, History, BarChart3,
  Settings2, Copy, Shield, Clock, WifiOff, Wifi, PhoneCall,
  Lock, Unlock, AlertTriangle, Activity, Timer, Send,
  ChevronDown, ChevronUp, Eye, EyeOff, Power, RotateCcw,
  CheckCircle, XCircle, Info, Gauge, TrendingUp, Users,
  LinkIcon, Unlink, UserCheck, Trash2, Settings, FolderOpen,
  Paperclip, Image, X, ChevronRight, Edit, Plus, BookOpen
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { useToast } from "@/hooks/use-toast";
import { toUserMessage } from "@/lib/error-utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UnifiedStats } from "@/components/ui/unified-stats";
import { formatDate } from "@/lib/utils";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/AuthProvider";
import BotSettingsTab from "./BotSettingsTab";

const ANTI_BAN_TIPS = [
  { icon: Clock, title: "تأخير الردود", desc: "يتم إضافة تأخير عشوائي 2-5 ثوانٍ قبل كل رد لمحاكاة السلوك البشري", key: "delay" },
  { icon: Shield, title: "تنويع المحتوى", desc: "إضافة أحرف غير مرئية لكل رسالة لتجنب اكتشاف التكرار", key: "zerowidth" },
  { icon: RefreshCw, title: "تحديث الإصدار", desc: "يتم جلب أحدث إصدار WhatsApp Web تلقائياً عند كل اتصال", key: "version" },
  { icon: Activity, title: "إعادة الاتصال الذكي", desc: "عند انقطاع الاتصال يُعاد تلقائياً مع تأخير متزايد (Exponential Backoff)", key: "reconnect" },
  { icon: Users, title: "تصفية المستخدمين", desc: "فقط الأرقام المصرح لها يمكنها التفاعل مع البوت", key: "filter" },
  { icon: Lock, title: "محاكاة المتصفح", desc: "يتم تقديم الاتصال كمتصفح Chrome حقيقي وليس كبوت", key: "browser" },
];

const CONNECTION_STEPS = [
  { step: 1, title: "افتح واتساب", desc: "افتح تطبيق واتساب على هاتفك المحمول", icon: Smartphone },
  { step: 2, title: "الإعدادات", desc: "اذهب إلى الإعدادات ← الأجهزة المرتبطة", icon: Settings2 },
  { step: 3, title: "ربط جهاز", desc: "اضغط على \"ربط جهاز جديد\"", icon: Zap },
  { step: 4, title: "المسح أو الكود", desc: "امسح رمز QR أو أدخل كود الربط المعروض", icon: QrCode },
];

type ProtectionLevel = "maximum" | "balanced" | "minimal";

interface ConfirmDialogState {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  variant?: "destructive" | "default";
}

function PermissionsTabContent({ allLinks, isLoadingAllLinks, allProjects, toast }: {
  allLinks: any[];
  isLoadingAllLinks: boolean;
  allProjects: any[];
  toast: any;
}) {
  const [expandedLinkId, setExpandedLinkId] = useState<number | null>(null);
  const [savingLinkId, setSavingLinkId] = useState<number | null>(null);
  const [linkForms, setLinkForms] = useState<Record<number, {
    permissionsMode: string;
    canRead: boolean;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
    scopeAllProjects: boolean;
    selectedProjectIds: string[];
  }>>({});

  const { data: expandedLinkProjects } = useQuery({
    queryKey: ["/api/whatsapp-ai/admin/links", expandedLinkId, "projects"],
    enabled: !!expandedLinkId,
  });

  const initForm = useCallback((link: any) => {
    setLinkForms(prev => {
      if (prev[link.id]) return prev;
      return {
        ...prev,
        [link.id]: {
          permissionsMode: link.permissionsMode || "inherit_user",
          canRead: link.canRead ?? true,
          canAdd: link.canAdd ?? true,
          canEdit: link.canEdit ?? true,
          canDelete: link.canDelete ?? true,
          scopeAllProjects: link.scopeAllProjects ?? true,
          selectedProjectIds: [],
        }
      };
    });
  }, []);

  useEffect(() => {
    if (expandedLinkProjects && expandedLinkId) {
      const projectIds = Array.isArray(expandedLinkProjects) ? expandedLinkProjects.map((p: any) => p.project_id || p.projectId) : [];
      setLinkForms(prev => ({
        ...prev,
        [expandedLinkId]: {
          ...(prev[expandedLinkId] || {}),
          selectedProjectIds: projectIds,
        } as any,
      }));
    }
  }, [expandedLinkProjects, expandedLinkId]);

  const updateField = useCallback((linkId: number, field: string, value: any) => {
    setLinkForms(prev => ({
      ...prev,
      [linkId]: { ...prev[linkId], [field]: value },
    }));
  }, []);

  const toggleProject = useCallback((linkId: number, projectId: string) => {
    setLinkForms(prev => {
      const form = prev[linkId];
      if (!form) return prev;
      const ids = form.selectedProjectIds || [];
      return {
        ...prev,
        [linkId]: {
          ...form,
          selectedProjectIds: ids.includes(projectId) ? ids.filter(id => id !== projectId) : [...ids, projectId],
        },
      };
    });
  }, []);

  const handleSave = useCallback(async (linkId: number) => {
    const form = linkForms[linkId];
    if (!form) return;
    setSavingLinkId(linkId);
    try {
      await apiRequest(`/api/whatsapp-ai/admin/links/${linkId}/permissions`, "PUT", {
        permissionsMode: form.permissionsMode,
        canRead: form.canRead,
        canAdd: form.canAdd,
        canEdit: form.canEdit,
        canDelete: form.canDelete,
        scopeAllProjects: form.scopeAllProjects,
      });

      if (!form.scopeAllProjects) {
        await apiRequest(`/api/whatsapp-ai/admin/links/${linkId}/projects`, "PUT", {
          projectIds: form.selectedProjectIds,
        });
      }

      toast({ title: "✅ تم الحفظ", description: "تم تحديث الصلاحيات بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-ai/all-links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-ai/admin/links", linkId, "permissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-ai/admin/links", linkId, "projects"] });
    } catch (error: any) {
      toast({ title: "خطأ", description: toUserMessage(error, "فشل في حفظ الصلاحيات"), variant: "destructive" });
    } finally {
      setSavingLinkId(null);
    }
  }, [linkForms, toast]);

  if (isLoadingAllLinks) {
    return (
      <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-indigo-400 via-purple-500 to-violet-500" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      </Card>
    );
  }

  if (!Array.isArray(allLinks) || allLinks.length === 0) {
    return (
      <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-indigo-400 via-purple-500 to-violet-500" />
        <div className="text-center py-20">
          <Shield className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-400">لا يوجد مستخدمون مربوطون</p>
          <p className="text-xs text-slate-400 mt-1">يجب ربط المستخدمين أولاً من تبويب "المستخدمون"</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-indigo-400 via-purple-500 to-violet-500" />
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 font-black">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <Shield className="h-4 w-4 text-indigo-600" />
            </div>
            إدارة الصلاحيات
            <Badge variant="secondary" className="text-[9px] font-black">{allLinks.length} مستخدم</Badge>
          </CardTitle>
          <p className="text-xs text-slate-500 mr-10">اضغط على أي مستخدم لتعديل صلاحياته وتحديد المشاريع المسموحة</p>
        </CardHeader>
      </Card>

      {allLinks.map((link: any) => {
        const isExpanded = expandedLinkId === link.id;
        const form = linkForms[link.id];
        const isSaving = savingLinkId === link.id;

        if (isExpanded && !form) {
          initForm(link);
        }

        return (
          <Card key={link.id} data-testid={`perm-card-${link.id}`} className={cn(
            "border shadow-md bg-white dark:bg-slate-900 rounded-2xl overflow-hidden transition-all",
            isExpanded ? "border-indigo-300 dark:border-indigo-700 ring-1 ring-indigo-200 dark:ring-indigo-800" : "border-slate-200 dark:border-slate-700"
          )}>
            <button
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              onClick={() => {
                if (isExpanded) {
                  setExpandedLinkId(null);
                } else {
                  initForm(link);
                  setExpandedLinkId(link.id);
                }
              }}
              data-testid={`btn-expand-perm-${link.id}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                  {(link.userName || link.userEmail || "?")?.charAt(0)?.toUpperCase()}
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{link.userName || link.userEmail?.split("@")[0] || "مستخدم"}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-slate-500 font-mono" dir="ltr">+{link.phoneNumber}</span>
                    <Badge className={cn("text-[8px] font-black h-4", link.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30" : "bg-red-100 text-red-700")}>
                      {link.isActive ? "نشط" : "معطل"}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center gap-1.5">
                  {[
                    { key: "canRead", label: "ق", ok: link.permissionsMode === "inherit_user" || link.canRead, cls: "bg-blue-100 text-blue-600 dark:bg-blue-900/30" },
                    { key: "canAdd", label: "ض", ok: link.permissionsMode === "inherit_user" || link.canAdd, cls: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30" },
                    { key: "canEdit", label: "ع", ok: link.permissionsMode === "inherit_user" || link.canEdit, cls: "bg-amber-100 text-amber-600 dark:bg-amber-900/30" },
                    { key: "canDelete", label: "ح", ok: link.permissionsMode === "inherit_user" || link.canDelete, cls: "bg-red-100 text-red-600 dark:bg-red-900/30" },
                  ].map(p => (
                    <span key={p.key} className={cn("w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black", p.ok ? p.cls : "bg-slate-100 text-slate-400 dark:bg-slate-800")}>
                      {p.label}
                    </span>
                  ))}
                </div>
                <ChevronDown className={cn("h-5 w-5 text-slate-400 transition-transform", isExpanded && "rotate-180")} />
              </div>
            </button>

            {isExpanded && form && (
              <div className="border-t border-slate-200 dark:border-slate-700 p-5 space-y-5 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-indigo-500" />
                    <Label className="text-sm font-black text-slate-700 dark:text-slate-300">وضع الصلاحيات</Label>
                  </div>
                  <Select
                    value={form.permissionsMode}
                    onValueChange={(val: string) => updateField(link.id, "permissionsMode", val)}
                    data-testid={`select-perm-mode-${link.id}`}
                  >
                    <SelectTrigger className="rounded-xl bg-white dark:bg-slate-800" data-testid={`select-perm-mode-trigger-${link.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inherit_user">🔗 وراثة من صلاحيات المستخدم الأصلية</SelectItem>
                      <SelectItem value="custom">🔧 تخصيص الصلاحيات يدوياً</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.permissionsMode === "custom" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-purple-500" />
                      <Label className="text-sm font-black text-slate-700 dark:text-slate-300">الصلاحيات المخصصة</Label>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { key: "canRead" as const, label: "قراءة البيانات", desc: "عرض المشاريع والتقارير", icon: Eye, activeClass: "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20", iconColor: "text-blue-500" },
                        { key: "canAdd" as const, label: "إضافة بيانات", desc: "إنشاء سجلات جديدة", icon: CheckCircle, activeClass: "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20", iconColor: "text-emerald-500" },
                        { key: "canEdit" as const, label: "تعديل البيانات", desc: "تحديث السجلات الموجودة", icon: Settings2, activeClass: "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20", iconColor: "text-amber-500" },
                        { key: "canDelete" as const, label: "حذف البيانات", desc: "إزالة السجلات", icon: Trash2, activeClass: "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20", iconColor: "text-red-500" },
                      ].map((perm) => (
                        <div
                          key={perm.key}
                          data-testid={`perm-toggle-${perm.key}-${link.id}`}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl border-2 transition-all",
                            form[perm.key] ? perm.activeClass : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <perm.icon className={cn("h-5 w-5", form[perm.key] ? perm.iconColor : "text-slate-400")} />
                            <div>
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{perm.label}</p>
                              <p className="text-[10px] text-slate-500">{perm.desc}</p>
                            </div>
                          </div>
                          <Switch
                            checked={form[perm.key]}
                            onCheckedChange={(checked) => updateField(link.id, perm.key, checked)}
                            data-testid={`switch-perm-${perm.key}-${link.id}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-teal-500" />
                      <Label className="text-sm font-black text-slate-700 dark:text-slate-300">نطاق المشاريع</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{form.scopeAllProjects ? "الكل" : "محدد"}</span>
                      <Switch
                        checked={form.scopeAllProjects}
                        onCheckedChange={(checked) => updateField(link.id, "scopeAllProjects", checked)}
                        data-testid={`switch-scope-${link.id}`}
                      />
                    </div>
                  </div>

                  {form.scopeAllProjects ? (
                    <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 text-center">
                      <p className="text-sm font-bold text-teal-700 dark:text-teal-400">✅ المستخدم يصل لجميع مشاريعه</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500 font-bold">اختر المشاريع المسموح الوصول إليها:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[250px] overflow-y-auto p-1">
                        {Array.isArray(allProjects) && allProjects.length > 0 ? allProjects.map((project: any) => {
                          const projectId = project.id;
                          const isSelected = (form.selectedProjectIds || []).includes(projectId);
                          return (
                            <div
                              key={projectId}
                              data-testid={`project-check-${projectId}-${link.id}`}
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all",
                                isSelected
                                  ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-600"
                                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800"
                              )}
                              onClick={() => toggleProject(link.id, projectId)}
                            >
                              <Checkbox checked={isSelected} className="pointer-events-none" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{project.name}</p>
                                {project.status && (
                                  <Badge variant="outline" className="text-[8px] font-bold mt-0.5">
                                    {project.status === "active" ? "نشط" : project.status === "completed" ? "مكتمل" : project.status}
                                  </Badge>
                                )}
                              </div>
                              {isSelected && <CheckCircle className="h-4 w-4 text-indigo-500 flex-shrink-0" />}
                            </div>
                          );
                        }) : (
                          <p className="text-xs text-slate-400 col-span-2 text-center py-6">لا توجد مشاريع</p>
                        )}
                      </div>
                      {(form.selectedProjectIds || []).length > 0 && (
                        <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                          ✓ تم اختيار {form.selectedProjectIds.length} مشروع من أصل {allProjects.length}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    data-testid={`btn-save-perm-${link.id}`}
                    className="flex-1 rounded-xl font-black bg-indigo-600 hover:bg-indigo-700 text-white gap-2 h-11"
                    onClick={() => handleSave(link.id)}
                    disabled={isSaving}
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    حفظ الصلاحيات
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl font-bold h-11"
                    onClick={() => setExpandedLinkId(null)}
                    data-testid={`btn-cancel-perm-${link.id}`}
                  >
                    إغلاق
                  </Button>
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function ChatInputBar({ phoneNumber }: { phoneNumber: string }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageCaption, setImageCaption] = useState("");
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if (imagePreview) {
      await handleSendImage();
      return;
    }
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      await apiRequest(`/api/whatsapp-ai/conversations/${phoneNumber}/send`, "POST", { message: message.trim() });
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-ai/conversations", phoneNumber, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-ai/conversations"] });
      inputRef.current?.focus();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleSendImage = async () => {
    if (!imagePreview || sending) return;
    setSending(true);
    try {
      await apiRequest(`/api/whatsapp-ai/conversations/${phoneNumber}/send-image`, "POST", {
        imageBase64: imagePreview,
        caption: imageCaption.trim() || undefined,
      });
      setImagePreview(null);
      setImageCaption("");
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-ai/conversations", phoneNumber, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-ai/conversations"] });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "خطأ", description: "يُسمح بالصور فقط", variant: "destructive" });
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast({ title: "خطأ", description: "الحد الأقصى 4 ميجابايت", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (imagePreview) {
    return (
      <div className="bg-[#1b2b34]">
        <div className="relative flex items-center justify-center" style={{ height: 260 }}>
          <img src={imagePreview} alt="معاينة" className="max-h-[240px] max-w-[90%] object-contain rounded-lg" />
          <button
            data-testid="btn-cancel-image"
            onClick={() => { setImagePreview(null); setImageCaption(""); }}
            className="absolute top-3 right-3 bg-[#0000004d] text-white rounded-full p-2 hover:bg-[#00000080]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-3 py-2 flex items-center gap-2 bg-[#202c33]" dir="rtl">
          <button
            data-testid="btn-send-image"
            onClick={handleSendImage}
            disabled={sending}
            className="bg-[#00a884] hover:bg-[#06cf9c] text-white rounded-full h-[42px] w-[42px] flex items-center justify-center flex-shrink-0 transition-colors"
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 rotate-180" />}
          </button>
          <div className="flex-1 bg-[#2a3942] rounded-lg px-3 py-2">
            <input
              data-testid="input-image-caption"
              value={imageCaption}
              onChange={(e) => setImageCaption(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSendImage(); } }}
              placeholder="أضف تعليقاً..."
              className="w-full bg-transparent text-[#d1d7db] placeholder-[#8696a0] outline-none text-[15px] text-right"
              dir="rtl"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[62px] px-3 flex items-center gap-2 bg-[#f0f2f5] dark:bg-[#202c33]" dir="rtl">
      <button
        data-testid="btn-send-msg"
        onClick={handleSend}
        disabled={!message.trim() || sending}
        className={cn(
          "rounded-full h-[42px] w-[42px] flex items-center justify-center flex-shrink-0 transition-colors",
          message.trim() ? "bg-[#00a884] hover:bg-[#06cf9c] text-white" : "bg-transparent text-[#8696a0]"
        )}
      >
        {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 rotate-180" />}
      </button>
      <div className="flex-1 bg-white dark:bg-[#2a3942] rounded-lg flex items-center px-2">
        <input
          ref={inputRef}
          data-testid="input-send-msg"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="اكتب رسالة"
          className="flex-1 bg-transparent text-[#111b21] dark:text-[#d1d7db] placeholder-[#667781] dark:placeholder-[#8696a0] outline-none py-2 px-2 text-[15px] text-right"
          dir="rtl"
        />
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
      <button
        data-testid="btn-attach-image"
        onClick={() => fileInputRef.current?.click()}
        className="p-2 text-[#54656f] dark:text-[#8696a0] hover:text-[#00a884] rounded-full transition-colors"
        title="إرفاق صورة"
      >
        <Paperclip className="h-6 w-6 rotate-45" />
      </button>
    </div>
  );
}

export default function WhatsAppSetupPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "connecting" | "open" | "close">("idle");
  const [lastError, setLastError] = useState<string | null>(null);
  const [needsRelink, setNeedsRelink] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [linkPhoneNumber, setLinkPhoneNumber] = useState("");
  const [linkCountryCode, setLinkCountryCode] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [isRelinking, setIsRelinking] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [protectionLevel, setProtectionLevel] = useState<ProtectionLevel>("maximum");
  const [activeTab, setActiveTab] = useState(() => {
    const u = JSON.parse(localStorage.getItem("user") || "{}");
    const admin = u?.role === "admin" || u?.role === "super_admin";
    return admin ? "connection" : "myscope";
  });
  const [pairingCountdown, setPairingCountdown] = useState(0);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    open: false, title: "", description: "", onConfirm: () => {},
  });
  const [permissionsDialogLink, setPermissionsDialogLink] = useState<any>(null);
  const [permForm, setPermForm] = useState({
    permissionsMode: "inherit_user",
    canRead: true,
    canAdd: true,
    canEdit: true,
    canDelete: true,
    scopeAllProjects: true,
  });
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const { data: botStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ["/api/whatsapp-ai/status"],
    refetchInterval: (query) => {
      const data = query.state.data as any;
      if (data?.status === "close" || data?.status === "idle") return 10000;
      if (data?.status === "connecting") return 3000;
      return 5000;
    },
  });

  const { data: myLink, isLoading: isLoadingMyLink } = useQuery({
    queryKey: ["/api/whatsapp-ai/my-link"],
  });

  const { data: allLinksData = [], isLoading: isLoadingAllLinks } = useQuery({
    queryKey: ["/api/whatsapp-ai/all-links"],
    enabled: isAdmin,
  });
  const allLinks = allLinksData as any[];

  const linkPhoneMutation = useMutation({
    mutationFn: async (phone: string) => {
      return await apiRequest("/api/whatsapp-ai/link-phone", "POST", { phoneNumber: phone });
    },
    onSuccess: () => {
      toast({ title: "تم الربط", description: "تم ربط رقم الواتساب بحسابك بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-ai/my-link"] });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-ai/all-links"] });
      setLinkPhoneNumber("");
      setLinkCountryCode("");
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: toUserMessage(error, "فشل في ربط الرقم"), variant: "destructive" });
    }
  });

  const unlinkPhoneMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/whatsapp-ai/unlink-phone", "POST");
    },
    onSuccess: () => {
      toast({ title: "تم إلغاء الربط", description: "تم إلغاء ربط رقم الواتساب من حسابك" });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-ai/my-link"] });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-ai/all-links"] });
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: toUserMessage(error, "فشل في إلغاء الربط"), variant: "destructive" });
    }
  });

  const adminUnlinkMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest(`/api/whatsapp-ai/admin-unlink/${userId}`, "DELETE");
    },
    onSuccess: () => {
      toast({ title: "تم", description: "تم إلغاء ربط المستخدم" });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-ai/all-links"] });
    },
  });

  const { data: myScope, isLoading: isLoadingMyScope } = useQuery({
    queryKey: ["/api/whatsapp-ai/my-scope"],
  });

  const { data: realStats } = useQuery({
    queryKey: [isAdmin ? "/api/whatsapp-ai/stats/admin" : "/api/whatsapp-ai/stats/me"],
  });

  const { data: myMessages, isLoading: isLoadingMessages } = useQuery({
    queryKey: ["/api/whatsapp-ai/messages/me"],
    enabled: activeTab === "myscope",
  });

  const { data: allProjects = [] } = useQuery({
    queryKey: ["/api/projects"],
    enabled: isAdmin && (!!permissionsDialogLink || activeTab === "permissions" || activeTab === "allowed"),
  });

  const { data: linkPermissions, isLoading: isLoadingPermissions } = useQuery({
    queryKey: ["/api/whatsapp-ai/admin/links", permissionsDialogLink?.id, "permissions"],
    enabled: isAdmin && !!permissionsDialogLink?.id,
  });

  const { data: linkProjects, isLoading: isLoadingLinkProjects } = useQuery({
    queryKey: ["/api/whatsapp-ai/admin/links", permissionsDialogLink?.id, "projects"],
    enabled: isAdmin && !!permissionsDialogLink?.id,
  });

  useEffect(() => {
    if (linkPermissions) {
      const perms = linkPermissions as any;
      setPermForm({
        permissionsMode: perms.permissionsMode || "inherit_user",
        canRead: perms.canRead ?? true,
        canAdd: perms.canAdd ?? true,
        canEdit: perms.canEdit ?? true,
        canDelete: perms.canDelete ?? true,
        scopeAllProjects: perms.scopeAllProjects ?? true,
      });
    }
  }, [linkPermissions]);

  useEffect(() => {
    if (linkProjects && Array.isArray(linkProjects)) {
      setSelectedProjectIds(linkProjects.map((p: any) => p.projectId));
    }
  }, [linkProjects]);

  useEffect(() => {
    if (botStatus) {
      const bs = botStatus as any;
      setStatus(bs.status);
      setQrCode(bs.qr || null);
      setPairingCode(bs.pairingCode || null);
      setLastError(bs.lastError || null);
      setNeedsRelink(bs.needsRelink || false);
      if (bs.status === "open") setPhoneNumber("");
    }
  }, [botStatus]);

  useEffect(() => {
    if (!qrCode) {
      setQrImageUrl(null);
      return;
    }
    let cancelled = false;
    const fetchQrImage = async () => {
      try {
        const res = await authFetch(ENV.getApiUrl(`/api/whatsapp-ai/qr-image?t=${Date.now()}`));
        if (!res.ok) throw new Error("QR fetch failed");
        const blob = await res.blob();
        if (!cancelled) {
          const url = URL.createObjectURL(blob);
          setQrImageUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return url; });
        }
      } catch { if (!cancelled) setQrImageUrl(null); }
    };
    fetchQrImage();
    return () => { cancelled = true; };
  }, [qrCode]);

  useEffect(() => {
    if (pairingCode) {
      setPairingCountdown(60);
      if (countdownRef.current) clearInterval(countdownRef.current);
      countdownRef.current = setInterval(() => {
        setPairingCountdown((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setPairingCountdown(0);
      if (countdownRef.current) clearInterval(countdownRef.current);
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [pairingCode]);

  const handlePhoneChange = useCallback((value: string) => {
    const cleanValue = value.replace(/[^\d+]/g, "");
    setPhoneNumber(cleanValue);
    try {
      const phone = parsePhoneNumberFromString(cleanValue.startsWith('+') ? cleanValue : `+${cleanValue}`);
      setCountryCode(phone?.country || "");
    } catch {
      setCountryCode("");
    }
  }, []);

  const handleLinkPhoneChange = useCallback((value: string) => {
    const cleanValue = value.replace(/[^\d+]/g, "");
    setLinkPhoneNumber(cleanValue);
    try {
      const phone = parsePhoneNumberFromString(cleanValue.startsWith('+') ? cleanValue : `+${cleanValue}`);
      setLinkCountryCode(phone?.country || "");
    } catch {
      setLinkCountryCode("");
    }
  }, []);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "تم النسخ", description: "تم نسخ الكود إلى الحافظة" });
  }, [toast]);

  const handleRestart = useCallback(async (phone?: string) => {
    try {
      setIsRequestingCode(!!phone);
      let formattedPhone = phone;
      if (phone) {
        const cleanPhone = phone.replace(/[^\d]/g, "");
        if (cleanPhone.length < 8) throw new Error("رقم الهاتف غير صالح (يجب أن يكون 8 أرقام على الأقل)");
        formattedPhone = cleanPhone;
      }
      await apiRequest("/api/whatsapp-ai/restart", "POST", { phoneNumber: formattedPhone });
      toast({
        title: phone ? "جاري طلب كود الربط" : "جاري إعادة التشغيل",
        description: phone ? `يتم إنشاء كود الربط للرقم ${phone}...` : "يتم إعادة تشغيل بوت الواتساب...",
      });
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-ai/status"] }), 1000);
    } catch (error: any) {
      toast({ title: "خطأ", description: toUserMessage(error, "فشل في تنفيذ العملية"), variant: "destructive" });
    } finally {
      setIsRequestingCode(false);
    }
  }, [toast]);

  const showConfirm = useCallback((title: string, description: string, onConfirm: () => void, variant: "destructive" | "default" = "destructive") => {
    setConfirmDialog({ open: true, title, description, onConfirm, variant });
  }, []);

  const handleOpenPermissionsDialog = useCallback((link: any) => {
    setPermissionsDialogLink(link);
  }, []);

  const handleSavePermissions = useCallback(async () => {
    if (!permissionsDialogLink?.id) return;
    setIsSavingPermissions(true);
    try {
      await apiRequest(`/api/whatsapp-ai/admin/links/${permissionsDialogLink.id}/permissions`, "PUT", {
        permissionsMode: permForm.permissionsMode,
        canRead: permForm.canRead,
        canAdd: permForm.canAdd,
        canEdit: permForm.canEdit,
        canDelete: permForm.canDelete,
        scopeAllProjects: permForm.scopeAllProjects,
      });

      if (!permForm.scopeAllProjects) {
        await apiRequest(`/api/whatsapp-ai/admin/links/${permissionsDialogLink.id}/projects`, "PUT", {
          projectIds: selectedProjectIds,
        });
      }

      toast({ title: "تم الحفظ", description: "تم تحديث الصلاحيات بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-ai/admin/links", permissionsDialogLink.id, "permissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-ai/admin/links", permissionsDialogLink.id, "projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-ai/all-links"] });
      setPermissionsDialogLink(null);
    } catch (error: any) {
      toast({ title: "خطأ", description: toUserMessage(error, "فشل في حفظ الصلاحيات"), variant: "destructive" });
    } finally {
      setIsSavingPermissions(false);
    }
  }, [permissionsDialogLink, permForm, selectedProjectIds, toast]);

  const isConnected = status === "open";
  const isConnecting = status === "connecting";

  const getFeatureStatus = useCallback((key: string): boolean => {
    if (key === "version" || key === "reconnect" || key === "filter" || key === "browser") return true;
    if (key === "delay" || key === "zerowidth") return protectionLevel !== "minimal";
    return true;
  }, [protectionLevel]);

  const statusConfig = useMemo(() => ({
    open: { label: "متصل", color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800", icon: Wifi, pulse: "bg-emerald-500" },
    connecting: { label: "جاري الاتصال...", color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800", icon: Loader2, pulse: "bg-amber-500" },
    close: { label: "غير متصل", color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-200 dark:border-red-800", icon: WifiOff, pulse: "bg-red-500" },
    idle: { label: "في الانتظار", color: "text-slate-500", bg: "bg-slate-50 dark:bg-slate-900", border: "border-slate-200 dark:border-slate-800", icon: Clock, pulse: "bg-slate-400" },
  }), []);

  const currentStatus = statusConfig[status];
  const StatusIcon = currentStatus.icon;

  const stats = useMemo(() => {
    const items = [
      {
        title: "حالة الاتصال",
        value: currentStatus.label,
        icon: isConnected ? Wifi : WifiOff,
        color: isConnected ? "green" as const : "red" as const,
        status: isConnected ? "normal" as const : "critical" as const
      },
      { title: isAdmin ? "الرسائل المعالجة" : "رسائلي", value: (realStats as any)?.totalMessages?.toString() || "0", icon: MessageSquare, color: "blue" as const },
      { title: "مستوى الحماية", value: protectionLevel === "maximum" ? "أقصى" : protectionLevel === "balanced" ? "متوازن" : "أدنى", icon: Shield, color: "purple" as const },
    ];
    if (isAdmin) {
      items.push({ title: "دقة التحليل", value: (realStats as any)?.accuracy || "0%", icon: TrendingUp, color: "blue" as const });
    } else {
      items.push({ title: "مشاريعي", value: (realStats as any)?.accessibleProjectsCount?.toString() || "0", icon: Activity, color: "blue" as const });
    }
    return items;
  }, [status, realStats, protectionLevel, currentStatus, isConnected, isAdmin]);

  const protectionScore = useMemo(() => {
    const scores: Record<ProtectionLevel, number> = { maximum: 95, balanced: 75, minimal: 45 };
    return scores[protectionLevel];
  }, [protectionLevel]);

  const [newAllowedPhone, setNewAllowedPhone] = useState("");
  const [newAllowedLabel, setNewAllowedLabel] = useState("");

  const { data: allowedNumbers = [], isLoading: isLoadingAllowed } = useQuery({
    queryKey: ["/api/whatsapp-ai/allowed-numbers"],
    enabled: isAdmin,
    refetchOnMount: "always",
    staleTime: 0,
  });

  const addAllowedMutation = useMutation({
    mutationFn: async (data: { phoneNumber: string; label: string }) => {
      return await apiRequest("/api/whatsapp-ai/allowed-numbers", "POST", data);
    },
    onSuccess: () => {
      toast({ title: "تمت الإضافة", description: "تم إضافة الرقم للقائمة المسموحة" });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-ai/allowed-numbers"] });
      setNewAllowedPhone("");
      setNewAllowedLabel("");
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: toUserMessage(error, "فشل في إضافة الرقم"), variant: "destructive" });
    }
  });

  const toggleAllowedMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      return await apiRequest(`/api/whatsapp-ai/allowed-numbers/${id}`, "PATCH", { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-ai/allowed-numbers"] });
    },
  });

  const deleteAllowedMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/whatsapp-ai/allowed-numbers/${id}`, "DELETE");
    },
    onSuccess: () => {
      toast({ title: "تم الحذف", description: "تم حذف الرقم من القائمة" });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-ai/allowed-numbers"] });
    },
  });

  const [expandedAllowedId, setExpandedAllowedId] = useState<number | null>(null);

  const updatePermsMutation = useMutation({
    mutationFn: async ({ id, ...perms }: { id: number; canRead?: boolean; canAdd?: boolean; canEdit?: boolean; canDelete?: boolean; scopeAllProjects?: boolean; projectIds?: string[] }) => {
      return await apiRequest(`/api/whatsapp-ai/allowed-numbers/${id}/permissions`, "PATCH", perms);
    },
    onSuccess: () => {
      toast({ title: "تم التحديث", description: "تم تحديث الصلاحيات بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-ai/allowed-numbers"] });
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: toUserMessage(error, "فشل في تحديث الصلاحيات"), variant: "destructive" });
    }
  });

  const [selectedConvPhone, setSelectedConvPhone] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const { data: conversations = [], isLoading: isLoadingConversations } = useQuery({
    queryKey: ["/api/whatsapp-ai/conversations"],
    enabled: isAdmin && activeTab === "chats" && isConnected,
    refetchInterval: activeTab === "chats" && isConnected ? 10000 : false,
  });

  const { data: convMessages, isLoading: isLoadingConvMessages } = useQuery({
    queryKey: ["/api/whatsapp-ai/conversations", selectedConvPhone, "messages"],
    enabled: isAdmin && !!selectedConvPhone && isConnected,
    refetchInterval: selectedConvPhone && isConnected ? 5000 : false,
  });

  const tabItems = useMemo(() => {
    const items: { id: string; label: string; icon: any; color: string }[] = [];
    if (isAdmin) {
      items.push({ id: "connection", label: "البوت", icon: QrCode, color: "data-[state=active]:bg-blue-500" });
      items.push({ id: "chats", label: "المحادثات", icon: MessageSquare, color: "data-[state=active]:bg-green-500" });
    }
    items.push({ id: "myscope", label: "نطاق وصولي", icon: Eye, color: "data-[state=active]:bg-cyan-500" });
    if (isAdmin) {
      items.push({ id: "allowed", label: "الأرقام المسموحة", icon: ShieldCheck, color: "data-[state=active]:bg-orange-500" });
      items.push({ id: "users", label: "المستخدمون", icon: Users, color: "data-[state=active]:bg-purple-500" });
      items.push({ id: "permissions", label: "الصلاحيات", icon: Shield, color: "data-[state=active]:bg-indigo-500" });
    }
    items.push({ id: "protection", label: "الحماية", icon: Shield, color: "data-[state=active]:bg-amber-500" });
    items.push({ id: "stats", label: "إحصائيات", icon: BarChart3, color: "data-[state=active]:bg-teal-500" });
    if (isAdmin) {
      items.push({ id: "settings", label: "الإعدادات", icon: Settings, color: "data-[state=active]:bg-slate-500" });
    }
    return items;
  }, [isAdmin]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      <div className="flex-1 p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">

        <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-right font-black">{confirmDialog.title}</AlertDialogTitle>
              <AlertDialogDescription className="text-right">{confirmDialog.description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row-reverse gap-2">
              <AlertDialogAction
                data-testid="btn-confirm-action"
                className={cn(
                  "rounded-xl font-bold",
                  confirmDialog.variant === "destructive"
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                )}
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(prev => ({ ...prev, open: false }));
                }}
              >
                تأكيد
              </AlertDialogAction>
              <AlertDialogCancel data-testid="btn-cancel-action" className="rounded-xl font-bold">إلغاء</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={!!permissionsDialogLink} onOpenChange={(open) => { if (!open) setPermissionsDialogLink(null); }}>
          <DialogContent className="max-w-lg rounded-2xl" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-right font-black flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                  <Settings className="h-4 w-4 text-indigo-600" />
                </div>
                إدارة الصلاحيات
                {permissionsDialogLink && (
                  <Badge variant="secondary" className="text-[9px] font-black">
                    +{permissionsDialogLink.phoneNumber}
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>

            {(isLoadingPermissions || isLoadingLinkProjects) ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-indigo-500" />
                    <Label className="text-sm font-black text-slate-700 dark:text-slate-300">وضع الصلاحيات</Label>
                  </div>
                  <Select
                    data-testid="select-permissions-mode"
                    value={permForm.permissionsMode}
                    onValueChange={(val: string) => setPermForm(prev => ({ ...prev, permissionsMode: val }))}
                  >
                    <SelectTrigger data-testid="select-permissions-mode-trigger" className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inherit_user">وراثة من المستخدم</SelectItem>
                      <SelectItem value="custom">تخصيص</SelectItem>
                    </SelectContent>
                  </Select>

                  {permForm.permissionsMode === "custom" && (
                    <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                      {[
                        { key: "canRead" as const, label: "قراءة البيانات", icon: Eye },
                        { key: "canAdd" as const, label: "إضافة بيانات", icon: CheckCircle },
                        { key: "canEdit" as const, label: "تعديل البيانات", icon: Settings2 },
                        { key: "canDelete" as const, label: "حذف بيانات", icon: Trash2 },
                      ].map((perm) => (
                        <div key={perm.key} className="flex items-center justify-between p-2 rounded-lg">
                          <div className="flex items-center gap-2">
                            <perm.icon className="h-3.5 w-3.5 text-slate-500" />
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{perm.label}</span>
                          </div>
                          <Switch
                            data-testid={`switch-${perm.key}`}
                            checked={permForm[perm.key]}
                            onCheckedChange={(checked) => setPermForm(prev => ({ ...prev, [perm.key]: checked }))}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-teal-500" />
                    <Label className="text-sm font-black text-slate-700 dark:text-slate-300">نطاق المشاريع</Label>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">الوصول لجميع مشاريع المستخدم</span>
                    </div>
                    <Switch
                      data-testid="switch-scope-all-projects"
                      checked={permForm.scopeAllProjects}
                      onCheckedChange={(checked) => setPermForm(prev => ({ ...prev, scopeAllProjects: checked }))}
                    />
                  </div>

                  {!permForm.scopeAllProjects && (
                    <div className="space-y-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                      <Label className="text-xs font-black text-slate-500 uppercase tracking-wider">اختر المشاريع المحددة</Label>
                      <ScrollArea className="max-h-48">
                        <div className="space-y-2">
                          {Array.isArray(allProjects) && allProjects.length > 0 ? allProjects.map((project: any) => {
                            const projectId = project.id;
                            const isSelected = selectedProjectIds.includes(projectId);
                            return (
                              <div
                                key={projectId}
                                data-testid={`checkbox-project-${projectId}`}
                                className={cn(
                                  "flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors",
                                  isSelected
                                    ? "bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800"
                                    : "hover:bg-slate-100 dark:hover:bg-slate-700/50"
                                )}
                                onClick={() => {
                                  setSelectedProjectIds(prev =>
                                    isSelected
                                      ? prev.filter(id => id !== projectId)
                                      : [...prev, projectId]
                                  );
                                }}
                              >
                                <Checkbox checked={isSelected} />
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{project.name}</span>
                                {project.status && (
                                  <Badge variant="outline" className="text-[8px] font-bold mr-auto">
                                    {project.status === 'active' ? 'نشط' : project.status === 'completed' ? 'مكتمل' : project.status}
                                  </Badge>
                                )}
                              </div>
                            );
                          }) : (
                            <p className="text-xs text-slate-400 text-center py-4">لا توجد مشاريع</p>
                          )}
                        </div>
                      </ScrollArea>
                      {selectedProjectIds.length > 0 && (
                        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold mt-2">
                          تم اختيار {selectedProjectIds.length} مشروع
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    data-testid="btn-save-permissions"
                    className="flex-1 rounded-xl font-black bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                    onClick={handleSavePermissions}
                    disabled={isSavingPermissions}
                  >
                    {isSavingPermissions ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    حفظ الصلاحيات
                  </Button>
                  <Button
                    data-testid="btn-cancel-permissions"
                    variant="outline"
                    className="rounded-xl font-bold"
                    onClick={() => setPermissionsDialogLink(null)}
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Connection Status Strip */}
        <div className={cn(
          "flex items-center justify-between rounded-xl border px-3 py-2 transition-all duration-500",
          currentStatus.bg, currentStatus.border
        )}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn("relative w-8 h-8 rounded-lg flex items-center justify-center shrink-0", isConnected ? "bg-emerald-500" : isConnecting ? "bg-amber-500" : "bg-slate-400")}>
              <SiWhatsapp className="h-4 w-4 text-white" />
              <span className={cn("absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-900", currentStatus.pulse)} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={cn("text-sm font-black", currentStatus.color)}>
                  {currentStatus.label}
                </span>
                <Badge variant="outline" className={cn("text-[9px] font-bold px-1.5 py-0", currentStatus.color, currentStatus.border)}>
                  {isConnected ? "مباشر" : "غير نشط"}
                </Badge>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {isConnected ? "الاتصال مستقر" :
                 isConnecting ? "جاري الاتصال..." :
                 "يرجى ربط الجهاز"}
              </p>
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-1.5 shrink-0">
              {isConnected && (
                <Button
                  data-testid="btn-disconnect"
                  variant="outline"
                  size="sm"
                  className="rounded-lg text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30 font-bold h-7 px-2 text-[11px]"
                  onClick={() => showConfirm(
                    "فصل الاتصال",
                    "هل تريد فصل الاتصال بواتساب؟ سيتوقف البوت عن استقبال الرسائل.",
                    () => {
                      apiRequest("/api/whatsapp-ai/disconnect", "POST").then(() => {
                        toast({ title: "تم فصل الاتصال", description: "تم فصل واتساب بنجاح" });
                        setTimeout(() => queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-ai/status"] }), 1000);
                      }).catch(() => toast({ title: "خطأ", description: "فشل في فصل الاتصال", variant: "destructive" }));
                    }
                  )}
                >
                  <Power className="h-3 w-3" />
                </Button>
              )}
              <Button
                data-testid="btn-restart"
                variant={isConnected ? "outline" : "default"}
                size="sm"
                className={cn("rounded-lg font-bold gap-1 h-7 px-2.5 text-[11px]", !isConnected && "bg-emerald-600 hover:bg-emerald-700 text-white")}
                onClick={() => handleRestart()}
              >
                <RotateCcw className="h-3 w-3" /> تشغيل
              </Button>
            </div>
          )}
        </div>

        {isConnected && <UnifiedStats stats={stats} columns={2} hideHeader />}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={(val) => {
          setActiveTab(val);
          setTimeout(() => {
            const el = document.querySelector(`[data-testid="tab-${val}"]`);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
          }, 50);
        }} className="w-full">
          <div className="overflow-x-auto -mx-4 px-4 scrollbar-hide" style={{ WebkitOverflowScrolling: "touch" }}>
            <TabsList className={cn(
              "inline-flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-2xl shadow-sm h-12 gap-0.5 min-w-max"
            )}>
              {tabItems.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  data-testid={`tab-${tab.id}`}
                  value={tab.id}
                  className={cn("rounded-xl font-bold text-[11px] gap-1 transition-all data-[state=active]:text-white px-3 whitespace-nowrap", tab.color)}
                >
                  <tab.icon className="h-3.5 w-3.5 shrink-0" /> {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>


          {/* My Scope Tab */}
          <TabsContent value="myscope" className="mt-6 space-y-6" data-testid="tab-content-myscope">
            {!isConnected ? (
              <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-red-400 via-orange-500 to-amber-500" />
                <div className="flex flex-col items-center justify-center py-16 px-6">
                  <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950/30 flex items-center justify-center mb-4">
                    <WifiOff className="h-8 w-8 text-red-500" />
                  </div>
                  <p className="text-lg font-black text-slate-800 dark:text-slate-200">البوت غير متصل</p>
                  <p className="text-sm text-slate-500 mt-2 text-center max-w-md">لا يمكن عرض نطاق وصولك. يجب ربط البوت بواتساب أولاً.</p>
                  <Button data-testid="btn-scope-go-connect" className="mt-5 rounded-xl font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setActiveTab("connection")}>
                    <QrCode className="h-4 w-4" />
                    الذهاب لربط البوت
                  </Button>
                </div>
              </Card>
            ) : (
            <div className="space-y-6">
            <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500" />
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 font-black">
                  <div className="w-8 h-8 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                    <Eye className="h-4 w-4 text-cyan-600" />
                  </div>
                  نطاق وصولي عبر واتساب
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {isLoadingMyScope ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
                  </div>
                ) : (
                  <>
                    <div className={cn(
                      "p-4 rounded-xl border",
                      (myScope as any)?.isLinked
                        ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
                        : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                    )} data-testid="scope-link-status">
                      <div className="flex items-center gap-3">
                        {(myScope as any)?.isLinked ? (
                          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                        )}
                        <div>
                          <p className={cn(
                            "text-sm font-black",
                            (myScope as any)?.isLinked ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
                          )}>
                            {(myScope as any)?.isLinked ? "رقمك مربوط" : "رقمك غير مربوط"}
                          </p>
                          {(myScope as any)?.linkedPhone && (
                            <p className="text-xs font-mono text-emerald-600 dark:text-emerald-500 mt-0.5" dir="ltr" data-testid="scope-linked-phone">
                              +{(myScope as any).linkedPhone}
                            </p>
                          )}
                          {(myScope as any)?.linkedAt && (
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              تاريخ الربط: {formatDate((myScope as any).linkedAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                        <Shield className="h-4 w-4 text-cyan-600" />
                        المشاريع المسموح الوصول إليها
                        <Badge variant="secondary" className="text-[9px] font-black" data-testid="scope-projects-count">
                          {(myScope as any)?.projects?.length || 0} مشروع
                        </Badge>
                      </h3>

                      {(myScope as any)?.projects?.length > 0 ? (
                        <div className="space-y-3">
                          {(myScope as any).projects.map((project: any) => (
                            <div
                              key={project.projectId}
                              data-testid={`scope-project-${project.projectId}`}
                              className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30"
                            >
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center shrink-0">
                                    <Activity className="h-4 w-4 text-cyan-600" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate" data-testid={`scope-project-name-${project.projectId}`}>
                                      {project.projectName}
                                    </p>
                                    {project.isOwner && (
                                      <Badge className="text-[8px] font-black bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 mt-0.5">
                                        مالك المشروع
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 flex-wrap">
                                  {project.canView && (
                                    <Badge variant="outline" className="text-[9px] font-bold text-blue-600 border-blue-200 dark:border-blue-800" data-testid={`scope-perm-view-${project.projectId}`}>
                                      <Eye className="h-2.5 w-2.5 mr-0.5" /> عرض
                                    </Badge>
                                  )}
                                  {project.canAdd && (
                                    <Badge variant="outline" className="text-[9px] font-bold text-emerald-600 border-emerald-200 dark:border-emerald-800" data-testid={`scope-perm-add-${project.projectId}`}>
                                      <CheckCircle className="h-2.5 w-2.5 mr-0.5" /> إضافة
                                    </Badge>
                                  )}
                                  {project.canEdit && (
                                    <Badge variant="outline" className="text-[9px] font-bold text-amber-600 border-amber-200 dark:border-amber-800" data-testid={`scope-perm-edit-${project.projectId}`}>
                                      <Settings2 className="h-2.5 w-2.5 mr-0.5" /> تعديل
                                    </Badge>
                                  )}
                                  {project.canDelete && (
                                    <Badge variant="outline" className="text-[9px] font-bold text-red-600 border-red-200 dark:border-red-800" data-testid={`scope-perm-delete-${project.projectId}`}>
                                      <Trash2 className="h-2.5 w-2.5 mr-0.5" /> حذف
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                              <Lock className="h-7 w-7 text-slate-300" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-500">لا توجد مشاريع متاحة</p>
                              <p className="text-[11px] text-slate-400 mt-1">تواصل مع المسؤول لإضافتك إلى مشروع</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {!(myScope as any)?.isLinked && (
                      <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                        <div className="flex items-start gap-2">
                          <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-black text-blue-700 dark:text-blue-400">اربط رقمك أولاً</p>
                            <p className="text-[11px] text-blue-600 dark:text-blue-500 mt-1 leading-relaxed">
                              لتتمكن من استخدام واتساب مع النظام، اذهب لتبويب "ربط رقمي" واربط رقم واتساب الخاص بك.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {(myScope as any)?.isLinked && (
              <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden" data-testid="card-conversations">
                <div className="h-1.5 bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500" />
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 font-black">
                    <div className="w-8 h-8 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <MessageSquare className="h-4 w-4 text-green-600" />
                    </div>
                    آخر المحادثات
                    {(myMessages as any)?.total > 0 && (
                      <Badge variant="secondary" className="text-[9px] font-black" data-testid="badge-messages-count">
                        {(myMessages as any).total} رسالة
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingMessages ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-green-500" />
                    </div>
                  ) : (myMessages as any)?.messages?.length > 0 ? (
                    <ScrollArea className="h-80">
                      <div className="space-y-3 pr-3">
                        {(myMessages as any).messages.map((msg: any) => (
                          <div
                            key={msg.id}
                            data-testid={`message-${msg.id}`}
                            className={cn(
                              "p-3 rounded-xl max-w-[85%] text-sm leading-relaxed",
                              msg.sender === 'bot'
                                ? "bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 ml-auto"
                                : "bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mr-auto"
                            )}
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              {msg.sender === 'bot' ? (
                                <SiWhatsapp className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Smartphone className="h-3 w-3 text-slate-500" />
                              )}
                              <span className="text-[10px] font-bold text-slate-500">
                                {msg.sender === 'bot' ? 'البوت' : 'أنت'}
                              </span>
                              <span className="text-[9px] text-slate-400 mr-auto" dir="ltr">
                                {msg.timestamp ? new Date(msg.timestamp).toLocaleString('ar-SA', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) : ''}
                              </span>
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap text-xs">
                              {msg.content?.substring(0, 300)}{msg.content?.length > 300 ? '...' : ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <MessageSquare className="h-7 w-7 text-slate-300" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-500" data-testid="text-no-messages">لا توجد محادثات بعد</p>
                          <p className="text-[11px] text-slate-400 mt-1">أرسل رسالة عبر واتساب لبدء المحادثة</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            </div>
            )}
          </TabsContent>

          {/* Allowed Numbers Tab - Admin only */}
          {isAdmin && (
            <TabsContent value="allowed" className="mt-6">
              {!isConnected ? (
                <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
                  <div className="h-1.5 bg-gradient-to-r from-red-400 via-orange-500 to-amber-500" />
                  <div className="flex flex-col items-center justify-center py-16 px-6">
                    <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950/30 flex items-center justify-center mb-4">
                      <WifiOff className="h-8 w-8 text-red-500" />
                    </div>
                    <p className="text-lg font-black text-slate-800 dark:text-slate-200">البوت غير متصل</p>
                    <p className="text-sm text-slate-500 mt-2 text-center max-w-md">لا يمكن إدارة الأرقام المسموحة. يجب ربط البوت بواتساب أولاً.</p>
                    <Button data-testid="btn-allowed-go-connect" className="mt-5 rounded-xl font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setActiveTab("connection")}>
                      <QrCode className="h-4 w-4" />
                      الذهاب لربط البوت
                    </Button>
                  </div>
                </Card>
              ) : (
              <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-orange-400 via-amber-500 to-yellow-500" />
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 font-black">
                    <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                      <ShieldCheck className="h-4 w-4 text-orange-600" />
                    </div>
                    الأرقام المسموح لها بالتواصل مع البوت
                    <Badge variant="secondary" className="text-[9px] font-black">{Array.isArray(allowedNumbers) ? allowedNumbers.length : 0} رقم</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                        فقط الأرقام المضافة هنا يمكنها إرسال رسائل للبوت والحصول على رد. إذا كانت القائمة فارغة سيرد البوت على جميع الأرقام.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <div className="flex-1">
                      <Input
                        data-testid="input-allowed-phone"
                        placeholder="رقم الهاتف (مثل: 967777123456)"
                        value={newAllowedPhone}
                        onChange={(e) => setNewAllowedPhone(e.target.value.replace(/[^\d+]/g, ""))}
                        className="rounded-xl text-sm font-mono h-10"
                        dir="ltr"
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        data-testid="input-allowed-label"
                        placeholder="اسم تعريفي (اختياري)"
                        value={newAllowedLabel}
                        onChange={(e) => setNewAllowedLabel(e.target.value)}
                        className="rounded-xl text-sm h-10"
                      />
                    </div>
                    <Button
                      data-testid="btn-add-allowed"
                      className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold gap-1.5 h-10 px-6"
                      disabled={!newAllowedPhone || newAllowedPhone.length < 8 || addAllowedMutation.isPending}
                      onClick={() => addAllowedMutation.mutate({ phoneNumber: newAllowedPhone, label: newAllowedLabel })}
                    >
                      {addAllowedMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                      إضافة
                    </Button>
                  </div>

                  {isLoadingAllowed ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                    </div>
                  ) : Array.isArray(allowedNumbers) && allowedNumbers.length > 0 ? (
                    <div className="space-y-3">
                      {allowedNumbers.map((num: any) => {
                        const isExpanded = expandedAllowedId === num.id;
                        const link = num.linkInfo;
                        return (
                        <div
                          key={num.id}
                          data-testid={`row-allowed-${num.id}`}
                          className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 overflow-hidden transition-colors"
                        >
                          <div className="p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100" dir="ltr">+{num.phoneNumber}</span>
                                {num.label && (
                                  <Badge variant="outline" className="text-[10px] font-semibold shrink-0">{num.label}</Badge>
                                )}
                                {num.linkedUserId ? (
                                  <Badge className="text-[9px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
                                    <UserCheck className="h-2.5 w-2.5 ml-0.5" />
                                    {num.linkedUserName || "مستخدم مستقل"}
                                  </Badge>
                                ) : (
                                  <Badge className="text-[9px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">
                                    <AlertTriangle className="h-2.5 w-2.5 ml-0.5" />
                                    بدون مستخدم
                                  </Badge>
                                )}
                                {link && (
                                  <div className="flex gap-1">
                                    {link.canRead && <Badge className="text-[8px] bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border-0 px-1.5">قراءة</Badge>}
                                    {link.canAdd && <Badge className="text-[8px] bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 border-0 px-1.5">إضافة</Badge>}
                                    {link.canEdit && <Badge className="text-[8px] bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 border-0 px-1.5">تعديل</Badge>}
                                    {link.canDelete && <Badge className="text-[8px] bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 border-0 px-1.5">حذف</Badge>}
                                    {link.scopeAllProjects && <Badge className="text-[8px] bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 border-0 px-1.5">كل المشاريع</Badge>}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                                {num.addedByName && <span>أضافه: {num.addedByName}</span>}
                                {num.createdAt && <span>{formatDate(num.createdAt)}</span>}
                                {num.projectPermissions?.length > 0 && !link?.scopeAllProjects && (
                                  <span className="text-blue-500">{num.projectPermissions.length} مشروع</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {num.linkedUserId && (
                                <Button
                                  data-testid={`btn-perms-${num.id}`}
                                  variant="ghost"
                                  size="sm"
                                  className="text-slate-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded-lg h-8 w-8 p-0"
                                  onClick={() => setExpandedAllowedId(isExpanded ? null : num.id)}
                                >
                                  <Settings2 className={`h-3.5 w-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                </Button>
                              )}
                              <Switch
                                data-testid={`switch-allowed-${num.id}`}
                                checked={num.isActive}
                                onCheckedChange={(checked) => toggleAllowedMutation.mutate({ id: num.id, isActive: checked })}
                              />
                              <Button
                                data-testid={`btn-delete-allowed-${num.id}`}
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg h-8 w-8 p-0"
                                onClick={() => showConfirm(
                                  "حذف الرقم",
                                  `هل تريد حذف الرقم +${num.phoneNumber}${num.label ? ` (${num.label})` : ''} من القائمة المسموحة؟`,
                                  () => deleteAllowedMutation.mutate(num.id)
                                )}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          </div>

                          {isExpanded && link && (
                            <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-900/50 space-y-4">
                              <div className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                                <Shield className="h-3.5 w-3.5 text-orange-500" />
                                صلاحيات الواتساب
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {([
                                  { key: "canRead", label: "قراءة", icon: BookOpen, color: "blue" },
                                  { key: "canAdd", label: "إضافة", icon: Plus, color: "green" },
                                  { key: "canEdit", label: "تعديل", icon: Edit, color: "orange" },
                                  { key: "canDelete", label: "حذف", icon: Trash2, color: "red" },
                                ] as const).map(({ key, label, icon: Icon, color }) => (
                                  <button
                                    key={key}
                                    data-testid={`perm-${key}-${num.id}`}
                                    className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all text-xs font-semibold ${
                                      link[key]
                                        ? `border-${color}-300 bg-${color}-50 text-${color}-700 dark:border-${color}-700 dark:bg-${color}-950/30 dark:text-${color}-400`
                                        : 'border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-800/50'
                                    }`}
                                    onClick={() => updatePermsMutation.mutate({ id: num.id, [key]: !link[key] })}
                                    disabled={updatePermsMutation.isPending}
                                  >
                                    <Icon className="h-3.5 w-3.5" />
                                    {label}
                                    {link[key] ? <CheckCircle className="h-3 w-3 mr-auto" /> : <XCircle className="h-3 w-3 mr-auto opacity-30" />}
                                  </button>
                                ))}
                              </div>

                              <Separator />

                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                                    <FolderOpen className="h-3.5 w-3.5 text-purple-500" />
                                    نطاق المشاريع
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <Label className="text-[10px] text-slate-500">كل المشاريع</Label>
                                    <Switch
                                      data-testid={`switch-scope-${num.id}`}
                                      checked={link.scopeAllProjects}
                                      onCheckedChange={(checked) => updatePermsMutation.mutate({ id: num.id, scopeAllProjects: checked })}
                                      disabled={updatePermsMutation.isPending}
                                    />
                                  </div>
                                </div>

                                {!link.scopeAllProjects && (
                                  <div className="space-y-2">
                                    <div className="flex flex-wrap gap-1.5">
                                      {num.projectPermissions?.map((pp: any) => (
                                        <Badge key={pp.projectId} className="text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-0 gap-1">
                                          <FolderOpen className="h-2.5 w-2.5" />
                                          {pp.projectName || pp.projectId}
                                        </Badge>
                                      ))}
                                      {(!num.projectPermissions || num.projectPermissions.length === 0) && (
                                        <span className="text-[10px] text-slate-400">لا توجد مشاريع محددة</span>
                                      )}
                                    </div>
                                    <Select
                                      onValueChange={(projectId: string) => {
                                        const currentIds = (num.projectPermissions || []).map((p: any) => p.projectId);
                                        if (!currentIds.includes(projectId)) {
                                          updatePermsMutation.mutate({
                                            id: num.id,
                                            projectIds: [...currentIds, projectId],
                                            canRead: link.canRead,
                                            canAdd: link.canAdd,
                                            canEdit: link.canEdit,
                                            canDelete: link.canDelete,
                                          });
                                        }
                                      }}
                                    >
                                      <SelectTrigger className="h-8 text-xs rounded-lg" data-testid={`select-project-${num.id}`}>
                                        <SelectValue placeholder="إضافة مشروع..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {(allProjects as any[]).filter((p: any) =>
                                          !(num.projectPermissions || []).some((pp: any) => pp.projectId === p.id)
                                        ).map((p: any) => (
                                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <ShieldCheck className="h-8 w-8 text-slate-300" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-500">لا توجد أرقام مسموحة</p>
                          <p className="text-[11px] text-slate-400 mt-1">البوت يرد حالياً على جميع الأرقام. أضف أرقام لتقييد الوصول.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              )}
            </TabsContent>
          )}

          {/* Users Tab - Admin only */}
          {isAdmin && (
            <TabsContent value="users" className="mt-6">
              {!isConnected ? (
                <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
                  <div className="h-1.5 bg-gradient-to-r from-red-400 via-orange-500 to-amber-500" />
                  <div className="flex flex-col items-center justify-center py-16 px-6">
                    <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950/30 flex items-center justify-center mb-4">
                      <WifiOff className="h-8 w-8 text-red-500" />
                    </div>
                    <p className="text-lg font-black text-slate-800 dark:text-slate-200">البوت غير متصل</p>
                    <p className="text-sm text-slate-500 mt-2 text-center max-w-md">لا يمكن عرض المستخدمين المربوطين. يجب ربط البوت بواتساب أولاً.</p>
                    <Button data-testid="btn-users-go-connect" className="mt-5 rounded-xl font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setActiveTab("connection")}>
                      <QrCode className="h-4 w-4" />
                      الذهاب لربط البوت
                    </Button>
                  </div>
                </Card>
              ) : (
              <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-purple-400 via-violet-500 to-fuchsia-500" />
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 font-black">
                    <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <Users className="h-4 w-4 text-purple-600" />
                    </div>
                    المستخدمون المربوطون
                    <Badge variant="secondary" className="text-[9px] font-black">{Array.isArray(allLinks) ? allLinks.length : 0} مستخدم</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingAllLinks ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                    </div>
                  ) : (
                    <ScrollArea className="max-h-[500px]">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent border-b-2">
                            <TableHead className="font-black text-[11px]">المستخدم</TableHead>
                            <TableHead className="font-black text-[11px]">رقم الواتساب</TableHead>
                            <TableHead className="font-black text-[11px]">الحالة</TableHead>
                            <TableHead className="font-black text-[11px]">الصلاحيات</TableHead>
                            <TableHead className="font-black text-[11px]">الرسائل</TableHead>
                            <TableHead className="font-black text-[11px]">آخر رسالة</TableHead>
                            <TableHead className="font-black text-[11px]">إجراءات</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Array.isArray(allLinks) && allLinks.length > 0 ? allLinks.map((link: any) => (
                            <TableRow key={link.id} data-testid={`row-user-${link.user_id}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <TableCell>
                                <div>
                                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{link.userName || '—'}</p>
                                  <p className="text-[10px] text-slate-500">{link.userEmail}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs font-mono" dir="ltr">+{link.phoneNumber}</TableCell>
                              <TableCell>
                                <Badge className={cn(
                                  "text-[9px] font-black gap-1",
                                  link.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                )}>
                                  {link.isActive ? <CheckCircle className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
                                  {link.isActive ? 'نشط' : 'معطل'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  data-testid={`badge-permissions-mode-${link.id}`}
                                  variant="outline"
                                  className={cn(
                                    "text-[9px] font-black gap-1",
                                    link.permissionsMode === "custom"
                                      ? "text-indigo-600 border-indigo-200 dark:border-indigo-800"
                                      : "text-slate-500 border-slate-200 dark:border-slate-700"
                                  )}
                                >
                                  {link.permissionsMode === "custom" ? (
                                    <><Settings className="h-2.5 w-2.5" /> مخصص</>
                                  ) : (
                                    <><UserCheck className="h-2.5 w-2.5" /> وراثة</>
                                  )}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs font-bold">{link.totalMessages}</TableCell>
                              <TableCell className="text-xs text-slate-500">{link.lastMessageAt ? formatDate(link.lastMessageAt) : '—'}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button
                                    data-testid={`btn-manage-permissions-${link.id}`}
                                    variant="ghost"
                                    size="icon"
                                    className="text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg"
                                    onClick={() => handleOpenPermissionsDialog(link)}
                                  >
                                    <Settings className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    data-testid={`btn-admin-unlink-${link.user_id}`}
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
                                    onClick={() => showConfirm(
                                      "إلغاء ربط المستخدم",
                                      `هل تريد إلغاء ربط ${link.userName || link.userEmail}؟ لن يتمكن من استخدام البوت حتى يعيد الربط.`,
                                      () => adminUnlinkMutation.mutate(link.user_id)
                                    )}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )) : (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-16">
                                <div className="flex flex-col items-center gap-3">
                                  <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                    <Users className="h-8 w-8 text-slate-300" />
                                  </div>
                                  <p className="text-sm font-bold text-slate-400">لا يوجد مستخدمون مربوطون</p>
                                  <p className="text-xs text-slate-400">يمكن لكل مستخدم ربط رقمه من تبويب "ربط رقمي"</p>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
              )}
            </TabsContent>
          )}

          {/* Permissions Tab - Admin only - Full interactive */}
          {isAdmin && (
            <TabsContent value="permissions" className="mt-6" data-testid="tab-content-permissions">
              {!isConnected ? (
                <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
                  <div className="h-1.5 bg-gradient-to-r from-red-400 via-orange-500 to-amber-500" />
                  <div className="flex flex-col items-center justify-center py-16 px-6">
                    <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950/30 flex items-center justify-center mb-4">
                      <WifiOff className="h-8 w-8 text-red-500" />
                    </div>
                    <p className="text-lg font-black text-slate-800 dark:text-slate-200">البوت غير متصل</p>
                    <p className="text-sm text-slate-500 mt-2 text-center max-w-md">لا يمكن إدارة الصلاحيات. يجب ربط البوت بواتساب أولاً.</p>
                    <Button data-testid="btn-perms-go-connect" className="mt-5 rounded-xl font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setActiveTab("connection")}>
                      <QrCode className="h-4 w-4" />
                      الذهاب لربط البوت
                    </Button>
                  </div>
                </Card>
              ) : (
                <PermissionsTabContent
                  allLinks={allLinks as any[]}
                  isLoadingAllLinks={isLoadingAllLinks}
                  allProjects={allProjects as any[]}
                  toast={toast}
                />
              )}
            </TabsContent>
          )}

          {/* Chats Tab - Admin only - WhatsApp-style */}
          {isAdmin && (
            <TabsContent value="chats" className="mt-6" data-testid="tab-content-chats">
              {!isConnected ? (
                <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
                  <div className="h-1.5 bg-gradient-to-r from-red-400 via-orange-500 to-amber-500" />
                  <div className="flex flex-col items-center justify-center py-20 px-6">
                    <div className="w-20 h-20 rounded-2xl bg-red-100 dark:bg-red-950/30 flex items-center justify-center mb-5">
                      <WifiOff className="h-10 w-10 text-red-500" />
                    </div>
                    <p className="text-lg font-black text-slate-800 dark:text-slate-200">البوت غير متصل</p>
                    <p className="text-sm text-slate-500 mt-2 text-center max-w-md leading-relaxed">
                      يجب ربط البوت بواتساب أولاً لعرض المحادثات ومزامنة الرسائل. اذهب لتبويب "البوت" وقم بمسح رمز QR أو استخدم كود الاقتران.
                    </p>
                    <Button
                      data-testid="btn-go-to-bot-tab"
                      className="mt-6 rounded-xl font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => setActiveTab("connection")}
                    >
                      <QrCode className="h-4 w-4" />
                      الذهاب لربط البوت
                    </Button>
                  </div>
                </Card>
              ) : (
              <>
              <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700">
                <div className="flex h-[calc(100vh-220px)] min-h-[500px] max-h-[750px]" dir="rtl">

                  {/* قائمة المحادثات - يمين */}
                  <div className={cn(
                    "border-l border-slate-200 dark:border-slate-700 flex flex-col bg-white dark:bg-[#111b21]",
                    selectedConvPhone ? "hidden md:flex w-[300px] lg:w-[340px] flex-shrink-0" : "w-full md:w-[300px] lg:w-[340px] flex-shrink-0"
                  )}>
                    <div className="h-[60px] px-4 flex items-center bg-[#f0f2f5] dark:bg-[#202c33] border-b border-slate-200 dark:border-slate-700">
                      <h3 className="text-base font-bold text-[#111b21] dark:text-[#e9edef] flex items-center gap-2">
                        المحادثات
                        {(conversations as any[]).length > 0 && (
                          <span className="bg-[#25d366] text-white text-[11px] rounded-full h-5 min-w-[20px] flex items-center justify-center px-1.5 font-bold">
                            {(conversations as any[]).length}
                          </span>
                        )}
                      </h3>
                    </div>
                    <ScrollArea className="flex-1">
                      {isLoadingConversations ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader2 className="h-6 w-6 animate-spin text-[#25d366]" />
                        </div>
                      ) : (conversations as any[]).length === 0 ? (
                        <div className="text-center py-16 px-4">
                          <MessageSquare className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                          <p className="text-sm text-slate-400">لا توجد محادثات</p>
                        </div>
                      ) : (
                        (conversations as any[]).map((conv: any) => (
                          <button
                            key={conv.id}
                            data-testid={`conv-item-${conv.phoneNumber}`}
                            onClick={() => setSelectedConvPhone(conv.phoneNumber)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-3 hover:bg-[#f5f6f6] dark:hover:bg-[#202c33] transition-colors border-b border-slate-100 dark:border-slate-800",
                              selectedConvPhone === conv.phoneNumber && "bg-[#f0f2f5] dark:bg-[#2a3942]"
                            )}
                          >
                            <div className="w-[49px] h-[49px] rounded-full bg-[#dfe5e7] dark:bg-[#6b7b8d] flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                              {(conv.userName || conv.userEmail || conv.phoneNumber)?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                            <div className="flex-1 min-w-0 text-right">
                              <div className="flex items-center justify-between">
                                <p className="text-[15px] font-normal text-[#111b21] dark:text-[#e9edef] truncate">
                                  {conv.userName || conv.userEmail?.split("@")[0] || conv.phoneNumber}
                                </p>
                                <span className="text-[12px] text-[#667781] dark:text-[#8696a0] flex-shrink-0 mr-2">
                                  {conv.lastMessage?.timestamp ? new Date(conv.lastMessage.timestamp).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }) : ""}
                                </span>
                              </div>
                              <div className="flex items-center justify-between mt-0.5">
                                <p className="text-[13px] text-[#667781] dark:text-[#8696a0] truncate">
                                  {conv.lastMessage?.sender === "bot" ? "🤖 " : conv.lastMessage?.sender === "admin" ? "أنت: " : ""}
                                  {conv.lastMessage?.content?.startsWith("📷") ? "📷 صورة" : conv.lastMessage?.content?.substring(0, 45) || "لا توجد رسائل"}
                                </p>
                                {conv.unreadCount > 0 && (
                                  <span className="bg-[#25d366] text-white text-[11px] rounded-full h-[20px] min-w-[20px] flex items-center justify-center px-1 font-bold mr-1">
                                    {conv.unreadCount}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </ScrollArea>
                  </div>

                  {/* نافذة المحادثة - يسار */}
                  <div className={cn(
                    "flex-1 flex flex-col bg-[#efeae2] dark:bg-[#0b141a]",
                    !selectedConvPhone ? "hidden md:flex" : "flex"
                  )}>
                    {!selectedConvPhone ? (
                      <div className="flex-1 flex items-center justify-center bg-[#f0f2f5] dark:bg-[#222e35]">
                        <div className="text-center max-w-sm">
                          <div className="w-[200px] h-[200px] mx-auto mb-6 rounded-full bg-[#e4f4e0] dark:bg-[#1d3831] flex items-center justify-center">
                            <SiWhatsapp className="h-24 w-24 text-[#25d366]" />
                          </div>
                          <h2 className="text-[28px] font-light text-[#41525d] dark:text-[#e9edef]">واتساب ويب</h2>
                          <p className="text-[14px] text-[#667781] dark:text-[#8696a0] mt-2">اختر محادثة لعرض الرسائل</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* رأس المحادثة */}
                        <div className="h-[60px] px-4 flex items-center gap-3 bg-[#f0f2f5] dark:bg-[#202c33] border-b border-slate-200 dark:border-slate-700">
                          <button
                            data-testid="btn-back-to-list"
                            onClick={() => setSelectedConvPhone(null)}
                            className="md:hidden p-1.5 hover:bg-[#d9dbdf] dark:hover:bg-[#374a56] rounded-full"
                          >
                            <ChevronDown className="h-5 w-5 rotate-90 text-[#54656f] dark:text-[#aebac1]" />
                          </button>
                          <div className="w-[40px] h-[40px] rounded-full bg-[#dfe5e7] dark:bg-[#6b7b8d] flex items-center justify-center text-white font-bold flex-shrink-0">
                            {((convMessages as any)?.contact?.userName || selectedConvPhone)?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[16px] text-[#111b21] dark:text-[#e9edef] truncate">
                              {(convMessages as any)?.contact?.userName || (convMessages as any)?.contact?.userEmail?.split("@")[0] || selectedConvPhone}
                            </p>
                            <p className="text-[12px] text-[#667781] dark:text-[#8696a0]" dir="ltr">{selectedConvPhone && `+${selectedConvPhone}`}</p>
                          </div>
                        </div>

                        {/* منطقة الرسائل - خلفية واتساب */}
                        <div className="flex-1 overflow-y-auto" style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 303.1 295.6' opacity='0.04'%3E%3Cpath d='M55.8 71.4l-2.7.7c.4 1.5.9 3 1.4 4.5l2.6-1C56.6 74.1 56.2 72.7 55.8 71.4zM68 45.5l-2.1 1.8c1 1.2 2 2.4 2.9 3.7l2.2-1.7C70.1 48 69.1 46.7 68 45.5z'/%3E%3C/svg%3E")`,
                          backgroundColor: "#efeae2",
                        }}>
                          <div className="px-[5%] md:px-[8%] py-3 space-y-1" dir="rtl">
                            {isLoadingConvMessages ? (
                              <div className="flex items-center justify-center py-20">
                                <Loader2 className="h-8 w-8 animate-spin text-[#25d366]" />
                              </div>
                            ) : (
                              <>
                                {((convMessages as any)?.messages || []).map((msg: any, idx: number) => {
                                  const isOutgoing = msg.sender === "admin";
                                  const isAdminMsg = msg.sender === "admin";
                                  const isBotMsg = msg.sender === "bot";
                                  const hasImageData = msg.metadata?.type === "image" && msg.metadata?.imageBase64;
                                  const isImageMsg = msg.content?.startsWith("📷") || hasImageData;
                                  const timeStr = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }) : "";

                                  const prevMsg = ((convMessages as any)?.messages || [])[idx - 1];
                                  const showTail = !prevMsg || prevMsg.sender !== msg.sender;

                                  return (
                                    <div key={msg.id} className={cn("flex mb-[2px]", isOutgoing ? "justify-end" : "justify-start")} data-testid={`msg-${msg.id}`}>
                                      <div className={cn(
                                        "relative max-w-[65%] min-w-[100px] shadow-sm",
                                        showTail ? "mt-1" : "",
                                        isOutgoing
                                          ? cn("bg-[#d9fdd3] dark:bg-[#005c4b]", showTail ? "rounded-tl-lg rounded-tr-none rounded-b-lg" : "rounded-lg")
                                          : isBotMsg
                                            ? cn("bg-white dark:bg-[#202c33]", showTail ? "rounded-tr-lg rounded-tl-none rounded-b-lg" : "rounded-lg")
                                            : cn("bg-[#fff3e0] dark:bg-[#3d2e1f]", showTail ? "rounded-tr-lg rounded-tl-none rounded-b-lg" : "rounded-lg"),
                                      )}>
                                        {showTail && !isOutgoing && (
                                          <div className="absolute top-0 -right-2 w-2 h-3 overflow-hidden" style={{ right: "-8px" }}>
                                            <div className={cn(
                                              "w-4 h-4 rotate-45 origin-bottom-left",
                                              isBotMsg ? "bg-white dark:bg-[#202c33]" : "bg-[#fff3e0] dark:bg-[#3d2e1f]"
                                            )} />
                                          </div>
                                        )}
                                        {showTail && isOutgoing && (
                                          <div className="absolute top-0 w-2 h-3 overflow-hidden" style={{ left: "-8px" }}>
                                            <div className="w-4 h-4 rotate-45 origin-bottom-right bg-[#d9fdd3] dark:bg-[#005c4b]" />
                                          </div>
                                        )}

                                        <div className="px-2 pt-1 pb-1">
                                          {showTail && !isOutgoing && (
                                            <p className={cn(
                                              "text-[12.5px] font-medium mb-0.5",
                                              isBotMsg ? "text-[#06cf9c]" : "text-[#e67e22]"
                                            )}>
                                              {isBotMsg ? "🤖 البوت" : ((convMessages as any)?.contact?.userName || (convMessages as any)?.contact?.userEmail?.split("@")[0] || "العميل")}
                                            </p>
                                          )}

                                          {isImageMsg && hasImageData ? (
                                            <div className="-mx-2 -mt-1 mb-1">
                                              <img
                                                src={msg.metadata.imageBase64}
                                                alt="صورة"
                                                className="w-full max-w-[300px] rounded-t-lg cursor-pointer"
                                                style={{ minHeight: 120 }}
                                                onClick={() => setLightboxImage(msg.metadata.imageBase64)}
                                                data-testid={`img-msg-${msg.id}`}
                                              />
                                              {msg.content && msg.content !== "📷 صورة" && (
                                                <p className="text-[14.2px] leading-[19px] text-[#111b21] dark:text-[#e9edef] whitespace-pre-wrap break-words px-2 pt-1" dir="rtl">
                                                  {msg.content.replace(/^📷\s*/, "")}
                                                </p>
                                              )}
                                            </div>
                                          ) : isImageMsg ? (
                                            <div className="flex items-center gap-2 bg-[#f0f0f0] dark:bg-[#374a56] rounded-lg p-2.5 mb-1">
                                              <Image className="h-5 w-5 text-[#8696a0]" />
                                              <span className="text-[13px] text-[#667781]">{msg.content?.replace(/^📷\s*/, "") || "صورة"}</span>
                                            </div>
                                          ) : (
                                            <p className="text-[14.2px] leading-[19px] text-[#111b21] dark:text-[#e9edef] whitespace-pre-wrap break-words pr-1" dir="rtl">
                                              {msg.content}
                                            </p>
                                          )}

                                          <div className="flex items-center justify-start gap-1 mt-0.5 -mb-0.5" dir="ltr">
                                            {isOutgoing && (
                                              <svg viewBox="0 0 16 11" height="11" width="16" className="text-[#53bdeb] fill-current">
                                                <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 0 0-.336-.153.457.457 0 0 0-.336.153.457.457 0 0 0-.14.335c0 .127.046.237.14.335l2.355 2.46a.496.496 0 0 0 .348.153.467.467 0 0 0 .37-.178L11.21 1.14a.39.39 0 0 0 .102-.254.39.39 0 0 0-.102-.254l-.14-.178z" />
                                                <path d="M14.757.653a.457.457 0 0 0-.305-.102.493.493 0 0 0-.38.178l-6.19 7.636-0.576-.6-.722.888 1.017 1.063a.496.496 0 0 0 .348.153.467.467 0 0 0 .37-.178L14.896 1.14a.39.39 0 0 0 .102-.254.39.39 0 0 0-.102-.254l-.14-.178z" />
                                              </svg>
                                            )}
                                            <span className="text-[11px] text-[#667781] dark:text-[#8696a0]">{timeStr}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                                <div ref={(el) => { if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 100); }} />
                              </>
                            )}
                          </div>
                        </div>

                        {/* حقل الإرسال */}
                        <ChatInputBar phoneNumber={selectedConvPhone} />
                      </>
                    )}
                  </div>
                </div>
              </div>

              {lightboxImage && (
                <div
                  className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center"
                  onClick={() => setLightboxImage(null)}
                  data-testid="lightbox-overlay"
                >
                  <button
                    className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors z-10"
                    onClick={() => setLightboxImage(null)}
                    data-testid="lightbox-close"
                  >
                    <X className="h-7 w-7" />
                  </button>
                  <button
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/70 hover:text-white text-sm flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-full px-4 py-2 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      const a = document.createElement("a");
                      a.href = lightboxImage;
                      a.download = `whatsapp-image-${Date.now()}.jpg`;
                      a.click();
                    }}
                    data-testid="lightbox-download"
                  >
                    <ChevronDown className="h-4 w-4" />
                    تحميل
                  </button>
                  <img
                    src={lightboxImage}
                    alt="عرض الصورة"
                    className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                    data-testid="lightbox-image"
                  />
                </div>
              )}
              </>
              )}
            </TabsContent>
          )}

          {/* Bot Connection Tab - Admin only */}
          {isAdmin && (
            <TabsContent value="connection" className="mt-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5">
                  <Card className="border-0 shadow-lg overflow-hidden bg-white dark:bg-slate-900 rounded-2xl">
                    <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-green-500 to-teal-500" />
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 font-black">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                          <QrCode className="h-4 w-4 text-emerald-600" />
                        </div>
                        ربط بوت الشركة
                        <Badge variant="secondary" className="text-[9px] font-black bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 rounded-full px-2">
                          مسؤول فقط
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center py-6">
                      {isConnected ? (
                        <div className="text-center space-y-4 py-6">
                          <div className="relative">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-xl shadow-emerald-500/20">
                              <CheckCircle2 className="h-10 w-10 text-white" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center shadow-lg">
                              <SiWhatsapp className="h-3.5 w-3.5 text-emerald-500" />
                            </div>
                          </div>
                          <div>
                            <p className="font-black text-emerald-600 text-base">بوت الشركة متصل</p>
                            <p className="text-[11px] text-slate-500 mt-1">جاهز لاستقبال رسائل المستخدمين</p>
                          </div>
                        </div>
                      ) : needsRelink ? (
                        <div className="text-center space-y-4 py-4 w-full">
                          <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950/30 flex items-center justify-center mx-auto">
                            <WifiOff className="h-8 w-8 text-red-500" />
                          </div>
                          <div>
                            <p className="font-black text-red-600 text-sm">انتهت جلسة واتساب</p>
                            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed max-w-xs mx-auto">
                              يرجى إعادة ربط الجهاز عبر مسح QR جديد أو كود اقتران
                            </p>
                          </div>
                          <Button
                            data-testid="btn-relink"
                            className="rounded-xl font-bold gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                            disabled={isRelinking}
                            onClick={async () => {
                              setIsRelinking(true);
                              try {
                                await apiRequest("/api/whatsapp-ai/relink", "POST");
                                toast({ title: "تم", description: "جاري إنشاء جلسة جديدة..." });
                                queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-ai/status"] });
                              } catch {
                                toast({ title: "خطأ", description: "فشل في إعادة الربط", variant: "destructive" });
                              } finally {
                                setIsRelinking(false);
                              }
                            }}
                          >
                            {isRelinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                            إعادة ربط الجهاز
                          </Button>
                          {lastError && (
                            <p className="text-[10px] text-red-500/80 mt-1">{lastError}</p>
                          )}
                        </div>
                      ) : qrCode ? (
                        <div className="space-y-4">
                          <div className="relative p-3 bg-white rounded-2xl shadow-inner border-2 border-dashed border-emerald-200 dark:border-emerald-800">
                            {qrImageUrl ? (
                              <img
                                data-testid="img-qr-code"
                                src={qrImageUrl}
                                alt="WhatsApp QR"
                                className="w-48 h-48 sm:w-56 sm:h-56 rounded-xl"
                              />
                            ) : (
                              <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                              </div>
                            )}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-lg bg-white shadow-lg flex items-center justify-center">
                              <SiWhatsapp className="h-5 w-5 text-emerald-500" />
                            </div>
                          </div>
                          <p className="text-center text-[11px] text-slate-500 font-medium">
                            امسح هذا الرمز بهاتف بوت الشركة
                          </p>
                        </div>
                      ) : status === "close" && lastError ? (
                        <div className="text-center space-y-3 py-4 w-full">
                          <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center mx-auto">
                            <AlertTriangle className="h-7 w-7 text-amber-500" />
                          </div>
                          <div>
                            <p className="font-black text-amber-600 text-sm">فشل الاتصال</p>
                            <p className="text-[11px] text-slate-500 mt-1">{lastError}</p>
                          </div>
                          <Button
                            data-testid="btn-retry-connect"
                            variant="outline"
                            className="rounded-xl font-bold gap-2"
                            onClick={() => handleRestart()}
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> إعادة المحاولة
                          </Button>
                        </div>
                      ) : status === "connecting" ? (
                        <div className="text-center space-y-3 py-6">
                          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center mx-auto">
                            <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
                          </div>
                          <p className="text-sm font-medium text-slate-500">جاري الاتصال...</p>
                          <p className="text-[10px] text-slate-400">يرجى الانتظار، قد يستغرق بضع ثوانٍ</p>
                        </div>
                      ) : (
                        <div className="text-center space-y-3 py-6">
                          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto">
                            <WifiOff className="h-7 w-7 text-slate-400" />
                          </div>
                          <p className="text-sm font-medium text-slate-400">البوت غير نشط</p>
                          <Button
                            variant="outline"
                            className="rounded-xl font-bold gap-2"
                            onClick={() => handleRestart()}
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> تشغيل البوت
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="lg:col-span-7 space-y-6">
                  <Card className="border-0 shadow-lg overflow-hidden bg-white dark:bg-slate-900 rounded-2xl">
                    <div className="h-1.5 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500" />
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 font-black">
                        <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <PhoneCall className="h-4 w-4 text-blue-600" />
                        </div>
                        ربط بكود الاقتران
                        <Badge variant="secondary" className="text-[9px] font-black bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-full px-2">
                          بديل عن QR
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          رقم هاتف البوت (مع مفتاح الدولة)
                        </label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              data-testid="input-phone"
                              placeholder="967772293228"
                              value={phoneNumber}
                              onChange={(e) => handlePhoneChange(e.target.value)}
                              disabled={isConnected}
                              className="rounded-xl font-mono text-base h-12 pl-16 pr-4 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/30"
                              dir="ltr"
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                              {countryCode ? (
                                <img
                                  src={`https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`}
                                  alt={countryCode}
                                  className="w-6 h-4 rounded-sm shadow-sm object-cover"
                                  onError={(e) => (e.currentTarget.style.display = 'none')}
                                />
                              ) : (
                                <Smartphone className="h-4 w-4 text-slate-400" />
                              )}
                              {countryCode && <span className="text-[10px] font-bold text-slate-400">{countryCode}</span>}
                            </div>
                          </div>
                          <Button
                            data-testid="btn-request-code"
                            onClick={() => handleRestart(phoneNumber)}
                            disabled={!phoneNumber || phoneNumber.length < 8 || isConnected || isRequestingCode}
                            className="h-12 px-6 rounded-xl font-black bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-lg shadow-blue-500/20"
                          >
                            {isRequestingCode ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Send className="h-4 w-4" />
                                <span className="hidden sm:inline">طلب الكود</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      {pairingCode && (
                        <div className="relative p-5 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-700 text-center">
                          <div className="absolute top-2 right-3">
                            <Badge className={cn(
                              "text-[8px] font-black",
                              pairingCountdown > 20 ? "bg-indigo-600 text-white" :
                              pairingCountdown > 10 ? "bg-amber-500 text-white animate-pulse" :
                              "bg-red-600 text-white animate-pulse"
                            )}>
                              {pairingCountdown > 0 ? `ينتهي خلال ${pairingCountdown} ثانية` : "انتهت الصلاحية"}
                            </Badge>
                          </div>
                          <p className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 mb-3 uppercase tracking-wider">
                            كود الاقتران
                          </p>
                          <div
                            data-testid="text-pairing-code"
                            className="text-4xl font-mono font-black tracking-[0.4em] text-indigo-700 dark:text-indigo-300 cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => copyToClipboard(pairingCode)}
                            title="انقر للنسخ"
                          >
                            {pairingCode.split('').map((char, i) => (
                              <span key={i} className={i === 3 ? "mr-4" : ""}>{char}</span>
                            ))}
                          </div>
                          <div className="mt-3 mb-1">
                            <Progress
                              value={(pairingCountdown / 60) * 100}
                              className="h-1.5 bg-indigo-100 dark:bg-indigo-900/30"
                            />
                          </div>
                          <Button
                            data-testid="btn-copy-code"
                            variant="ghost"
                            size="sm"
                            className="mt-2 text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 font-bold gap-1.5 rounded-xl"
                            onClick={() => copyToClipboard(pairingCode)}
                          >
                            <Copy className="h-3.5 w-3.5" /> نسخ الكود
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-lg overflow-hidden bg-white dark:bg-slate-900 rounded-2xl">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2 font-black">
                        <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                          <Info className="h-3.5 w-3.5 text-amber-600" />
                        </div>
                        خطوات ربط بوت الشركة
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {CONNECTION_STEPS.map((s) => (
                          <div key={s.step} className="relative flex flex-col items-center text-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                              <span className="text-[9px] font-black text-slate-500">{s.step}</span>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center mb-2">
                              <s.icon className="h-5 w-5 text-emerald-600" />
                            </div>
                            <p className="text-[11px] font-black text-slate-700 dark:text-slate-300">{s.title}</p>
                            <p className="text-[9px] text-slate-500 mt-0.5 leading-relaxed">{s.desc}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          )}

          {/* Protection Tab */}
          <TabsContent value="protection" className="mt-6 space-y-6">
            {!isConnected ? (
              <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-red-400 via-orange-500 to-amber-500" />
                <div className="flex flex-col items-center justify-center py-16 px-6">
                  <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950/30 flex items-center justify-center mb-4">
                    <WifiOff className="h-8 w-8 text-red-500" />
                  </div>
                  <p className="text-lg font-black text-slate-800 dark:text-slate-200">البوت غير متصل</p>
                  <p className="text-sm text-slate-500 mt-2 text-center max-w-md">لا يمكن عرض حالة الحماية. يجب ربط البوت بواتساب أولاً.</p>
                  <Button data-testid="btn-protection-go-connect" className="mt-5 rounded-xl font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setActiveTab("connection")}>
                    <QrCode className="h-4 w-4" />
                    الذهاب لربط البوت
                  </Button>
                </div>
              </Card>
            ) : (
            <>
            <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500" />
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="relative">
                    <div className="w-36 h-36 rounded-full border-[6px] border-slate-100 dark:border-slate-800 flex items-center justify-center relative">
                      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 144 144">
                        <circle cx="72" cy="72" r="66" fill="none" strokeWidth="6" className="stroke-slate-100 dark:stroke-slate-800" />
                        <circle cx="72" cy="72" r="66" fill="none" strokeWidth="6"
                          strokeDasharray={`${protectionScore * 4.15} 415`}
                          className={cn(
                            "transition-all duration-1000",
                            protectionScore >= 80 ? "stroke-emerald-500" : protectionScore >= 60 ? "stroke-amber-500" : "stroke-red-500"
                          )}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="text-center z-10">
                        <span className={cn(
                          "text-3xl font-black",
                          protectionScore >= 80 ? "text-emerald-600" : protectionScore >= 60 ? "text-amber-600" : "text-red-600"
                        )}>
                          {protectionScore}%
                        </span>
                        <p className="text-[9px] font-bold text-slate-500 uppercase">مستوى الأمان</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-4">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">
                        نظام الحماية من حظر الرقم
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        يتضمن النظام طبقات حماية متعددة لتقليل مخاطر حظر الرقم من واتساب
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(["maximum", "balanced", "minimal"] as ProtectionLevel[]).map((level) => {
                        const configs: Record<ProtectionLevel, { label: string; color: string; bg: string }> = {
                          maximum: { label: "حماية قصوى", color: "text-emerald-700", bg: "bg-emerald-100 border-emerald-300 dark:bg-emerald-900/30 dark:border-emerald-700" },
                          balanced: { label: "متوازن", color: "text-amber-700", bg: "bg-amber-100 border-amber-300 dark:bg-amber-900/30 dark:border-amber-700" },
                          minimal: { label: "أدنى حماية", color: "text-red-700", bg: "bg-red-100 border-red-300 dark:bg-red-900/30 dark:border-red-700" },
                        };
                        const c = configs[level];
                        return (
                          <button
                            key={level}
                            data-testid={`btn-protection-${level}`}
                            onClick={() => setProtectionLevel(level)}
                            className={cn(
                              "px-4 py-2 rounded-xl text-xs font-black border-2 transition-all",
                              protectionLevel === level ? cn(c.bg, c.color, "ring-2 ring-offset-1", level === "maximum" ? "ring-emerald-400" : level === "balanced" ? "ring-amber-400" : "ring-red-400") : "border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300"
                            )}
                          >
                            {c.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Protection Features Grid - Dynamic badges */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ANTI_BAN_TIPS.map((tip, i) => {
                const isActive = getFeatureStatus(tip.key);
                return (
                  <Card key={i} className="border-0 shadow-md bg-white dark:bg-slate-900 rounded-2xl hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                          isActive
                            ? "bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30"
                            : "bg-slate-100 dark:bg-slate-800"
                        )}>
                          <tip.icon className={cn("h-5 w-5", isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400")} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className={cn("text-sm font-black", isActive ? "text-slate-900 dark:text-white" : "text-slate-400")}>{tip.title}</h4>
                            <Badge className={cn(
                              "text-[8px] font-black shrink-0",
                              isActive
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                            )}>
                              {isActive ? (
                                <><CheckCircle className="h-2.5 w-2.5 mr-0.5" /> مفعّل</>
                              ) : (
                                <><XCircle className="h-2.5 w-2.5 mr-0.5" /> معطّل</>
                              )}
                            </Badge>
                          </div>
                          <p className={cn("text-[11px] mt-1 leading-relaxed", isActive ? "text-slate-500 dark:text-slate-400" : "text-slate-400 line-through")}>{tip.desc}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Advanced Settings */}
            <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 rounded-2xl">
              <CardHeader className="cursor-pointer" onClick={() => setShowAdvanced(!showAdvanced)}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2 font-black">
                    <Settings2 className="h-4 w-4 text-slate-500" />
                    إعدادات متقدمة
                  </CardTitle>
                  {showAdvanced ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </div>
              </CardHeader>
              {showAdvanced && (
                <CardContent className="space-y-4 pt-0">
                  <Separator />
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <div className="flex items-center gap-3">
                        <Timer className="h-4 w-4 text-blue-500" />
                        <div>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">تأخير عشوائي للردود</p>
                          <p className="text-[10px] text-slate-500">2-5 ثوانٍ بين كل رسالة</p>
                        </div>
                      </div>
                      <Switch data-testid="switch-random-delay" checked={protectionLevel !== "minimal"} disabled />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <div className="flex items-center gap-3">
                        <EyeOff className="h-4 w-4 text-purple-500" />
                        <div>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">أحرف غير مرئية</p>
                          <p className="text-[10px] text-slate-500">إضافة أحرف Zero-Width لتنويع المحتوى</p>
                        </div>
                      </div>
                      <Switch data-testid="switch-zero-width" checked={protectionLevel !== "minimal"} disabled />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <div className="flex items-center gap-3">
                        <RefreshCw className="h-4 w-4 text-emerald-500" />
                        <div>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">تحديث الإصدار التلقائي</p>
                          <p className="text-[10px] text-slate-500">جلب أحدث إصدار عند كل اتصال</p>
                        </div>
                      </div>
                      <Switch data-testid="switch-auto-version" checked disabled />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <div className="flex items-center gap-3">
                        <Gauge className="h-4 w-4 text-amber-500" />
                        <div>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">حد الرسائل اليومي</p>
                          <p className="text-[10px] text-slate-500">الحد الأقصى: {protectionLevel === "maximum" ? "50" : protectionLevel === "balanced" ? "100" : "500"} رسالة/يوم</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="font-mono text-xs">
                        {protectionLevel === "maximum" ? "50" : protectionLevel === "balanced" ? "100" : "500"}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-black text-amber-700 dark:text-amber-400">تنبيه مهم</p>
                        <p className="text-[11px] text-amber-600 dark:text-amber-500 mt-1 leading-relaxed">
                          استخدام واتساب بطريقة آلية يخالف شروط الخدمة ويمكن أن يؤدي لحظر الرقم.
                          مستوى الحماية القصوى يقلل المخاطر لكن لا يمنعها تماماً.
                          يُنصح باستخدام رقم مخصص وليس رقمك الشخصي.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
            </>
            )}
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="mt-6" data-testid="tab-content-stats">
            {!isConnected ? (
              <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-red-400 via-orange-500 to-amber-500" />
                <div className="flex flex-col items-center justify-center py-16 px-6">
                  <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950/30 flex items-center justify-center mb-4">
                    <WifiOff className="h-8 w-8 text-red-500" />
                  </div>
                  <p className="text-lg font-black text-slate-800 dark:text-slate-200">البوت غير متصل</p>
                  <p className="text-sm text-slate-500 mt-2 text-center max-w-md">لا يمكن عرض الإحصائيات. يجب ربط البوت بواتساب أولاً.</p>
                  <Button data-testid="btn-stats-go-connect" className="mt-5 rounded-xl font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setActiveTab("connection")}>
                    <QrCode className="h-4 w-4" />
                    الذهاب لربط البوت
                  </Button>
                </div>
              </Card>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-blue-400 to-cyan-400" />
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 font-black">
                    <MessageSquare className="h-4 w-4 text-blue-600" />
                    {isAdmin ? "ملخص النشاط" : "إحصائياتي"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-center" data-testid="stat-total-messages">
                      <p className="text-2xl font-black text-blue-700 dark:text-blue-400">{(realStats as any)?.totalMessages || 0}</p>
                      <p className="text-[10px] font-bold text-blue-500 mt-1">{isAdmin ? "رسالة معالجة" : "رسائلي"}</p>
                    </div>
                    {isAdmin ? (
                      <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-center" data-testid="stat-accuracy">
                        <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{(realStats as any)?.accuracy || "0%"}</p>
                        <p className="text-[10px] font-bold text-emerald-500 mt-1">دقة التحليل</p>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-center" data-testid="stat-projects-count">
                        <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{(realStats as any)?.accessibleProjectsCount || 0}</p>
                        <p className="text-[10px] font-bold text-emerald-500 mt-1">مشاريعي</p>
                      </div>
                    )}
                    {isAdmin ? (
                      <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/20 text-center">
                        <p className="text-2xl font-black text-purple-700 dark:text-purple-400">
                          {(realStats as any)?.lastSync ? "نشط" : "—"}
                        </p>
                        <p className="text-[10px] font-bold text-purple-500 mt-1">آخر نشاط</p>
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/20 text-center" data-testid="stat-link-status">
                        <p className="text-2xl font-black text-purple-700 dark:text-purple-400">
                          {(realStats as any)?.isLinked ? "مربوط" : "غير مربوط"}
                        </p>
                        <p className="text-[10px] font-bold text-purple-500 mt-1">حالة الربط</p>
                      </div>
                    )}
                    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-center">
                      <p className="text-2xl font-black text-amber-700 dark:text-amber-400">
                        {protectionScore}%
                      </p>
                      <p className="text-[10px] font-bold text-amber-500 mt-1">نقاط الأمان</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-emerald-400 to-teal-400" />
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 font-black">
                    <Shield className="h-4 w-4 text-emerald-600" />
                    حالة الحماية
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "تأخير الردود", active: protectionLevel !== "minimal", desc: "2-5 ثوانٍ" },
                    { label: "تنويع المحتوى", active: protectionLevel !== "minimal", desc: "Zero-Width" },
                    { label: "تحديث الإصدار", active: true, desc: "تلقائي" },
                    { label: "إعادة الاتصال", active: true, desc: "Backoff" },
                    { label: "تصفية الأرقام", active: true, desc: "مصرح فقط" },
                    { label: "محاكاة المتصفح", active: true, desc: "Chrome 121" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2">
                        {item.active ? (
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-red-400" />
                        )}
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
                      </div>
                      <Badge variant="outline" className={cn(
                        "text-[9px] font-bold",
                        item.active ? "text-emerald-600 border-emerald-200" : "text-red-500 border-red-200"
                      )}>
                        {item.desc}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
            )}
          </TabsContent>

          {isAdmin && (
            <TabsContent value="settings" className="mt-6" data-testid="tab-content-settings">
              <BotSettingsTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
