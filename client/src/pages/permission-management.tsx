import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { UnifiedFilterDashboard } from "@/components/ui/unified-filter-dashboard";
import type { StatsRowConfig, FilterConfig } from "@/components/ui/unified-filter-dashboard/types";
import { UnifiedCard, UnifiedCardGrid } from "@/components/ui/unified-card";
import { useSelectedProject, ALL_PROJECTS_ID } from "@/hooks/use-selected-project";
import {
  Shield, Eye, Plus, Edit, Trash2, Users, 
  Clock, UserPlus, UserMinus, History, AlertTriangle,
  KeyRound, Lock, CheckCircle2
} from "lucide-react";

interface UserInfo {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isOwner: boolean;
  assignedBy?: string | null;
  assignedAt?: string | null;
}

interface AuditLog {
  id: string;
  action: string;
  actorId: string;
  targetUserId: string;
  projectId: string;
  oldPermissions: any;
  newPermissions: any;
  actorName: string;
  targetName: string;
  projectName: string;
  createdAt: string;
}

const PRESET_LEVELS = [
  { label: "قراءة فقط", value: "view", canView: true, canAdd: false, canEdit: false, canDelete: false },
  { label: "قراءة + إضافة", value: "add", canView: true, canAdd: true, canEdit: false, canDelete: false },
  { label: "قراءة + إضافة + تعديل", value: "edit", canView: true, canAdd: true, canEdit: true, canDelete: false },
  { label: "صلاحيات كاملة", value: "full", canView: true, canAdd: true, canEdit: true, canDelete: true },
];

function getPresetFromPermissions(p: { canView: boolean; canAdd: boolean; canEdit: boolean; canDelete: boolean }) {
  if (p.canDelete && p.canEdit && p.canAdd && p.canView) return "full";
  if (p.canEdit && p.canAdd && p.canView) return "edit";
  if (p.canAdd && p.canView) return "add";
  if (p.canView) return "view";
  return "view";
}

function getPermLevel(u: UserInfo): string {
  if (u.isOwner) return "مالك";
  if (u.canDelete) return "كامل";
  if (u.canEdit) return "تعديل";
  if (u.canAdd) return "إضافة";
  if (u.canView) return "قراءة فقط";
  return "لا صلاحيات";
}

function getPermHeaderColor(u: UserInfo): string {
  if (u.isOwner) return "#10b981";
  if (u.canDelete) return "#8b5cf6";
  if (u.canEdit) return "#f59e0b";
  if (u.canAdd) return "#06b6d4";
  if (u.canView) return "#6b7280";
  return "#9ca3af";
}

export default function PermissionManagementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedProjectId: globalProjectId } = useSelectedProject();
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  const [grantUserId, setGrantUserId] = useState("");
  const [grantPreset, setGrantPreset] = useState("view");
  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<"users" | "audit">("users");

  const selectedProjectId = globalProjectId === ALL_PROJECTS_ID ? "" : (globalProjectId || "");

  const { data: usersData } = useQuery<any>({
    queryKey: ["/api/users/list"],
  });
  const allUsers = usersData?.data || usersData || [];

  const { data: projectUsersData, isLoading: usersLoading } = useQuery<any>({
    queryKey: ["/api/permissions/project", selectedProjectId],
    enabled: !!selectedProjectId,
  });
  const projectUsers: UserInfo[] = projectUsersData?.data || [];

  const auditUrl = selectedProjectId
    ? `/api/permissions/audit-logs?projectId=${selectedProjectId}`
    : "/api/permissions/audit-logs";
  const { data: auditData } = useQuery<any>({
    queryKey: ["/api/permissions/audit-logs", selectedProjectId || "all"],
    queryFn: () => apiRequest(auditUrl),
    enabled: true,
  });
  const auditLogs: AuditLog[] = auditData?.data || [];

  const grantMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/permissions/grant", "POST", data);
    },
    onSuccess: () => {
      toast({ title: "تم منح الصلاحيات بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["/api/permissions/project", selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/permissions/audit-logs"] });
      setGrantDialogOpen(false);
      setGrantUserId("");
      setGrantPreset("view");
    },
    onError: (err: any) => {
      toast({ title: "فشل في منح الصلاحيات", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/permissions/update", "PATCH", data);
    },
    onSuccess: () => {
      toast({ title: "تم تحديث الصلاحيات بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["/api/permissions/project", selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/permissions/audit-logs"] });
      setEditDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (err: any) => {
      toast({ title: "فشل في تحديث الصلاحيات", description: err.message, variant: "destructive" });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/permissions/revoke", "DELETE", data);
    },
    onSuccess: () => {
      toast({ title: "تم سحب الصلاحيات بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["/api/permissions/project", selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ["/api/permissions/audit-logs"] });
      setRevokeDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (err: any) => {
      toast({ title: "فشل في سحب الصلاحيات", description: err.message, variant: "destructive" });
    },
  });

  const handleGrant = () => {
    const preset = PRESET_LEVELS.find((p) => p.value === grantPreset);
    if (!preset || !grantUserId || !selectedProjectId) return;
    grantMutation.mutate({
      targetUserId: grantUserId,
      projectId: selectedProjectId,
      canView: preset.canView,
      canAdd: preset.canAdd,
      canEdit: preset.canEdit,
      canDelete: preset.canDelete,
    });
  };

  const handleUpdate = () => {
    if (!selectedUser || !selectedProjectId) return;
    updateMutation.mutate({
      targetUserId: selectedUser.userId,
      projectId: selectedProjectId,
      canView: selectedUser.canView,
      canAdd: selectedUser.canAdd,
      canEdit: selectedUser.canEdit,
      canDelete: selectedUser.canDelete,
    });
  };

  const handleRevoke = () => {
    if (!selectedUser || !selectedProjectId) return;
    revokeMutation.mutate({
      targetUserId: selectedUser.userId,
      projectId: selectedProjectId,
    });
  };

  const availableUsersToGrant = allUsers.filter(
    (u: any) => !projectUsers.find((pu) => pu.userId === u.id)
  );

  const filteredUsers = useMemo(() => {
    let result = projectUsers;
    if (searchValue) {
      const s = searchValue.toLowerCase();
      result = result.filter(u =>
        (u.userName || "").toLowerCase().includes(s) ||
        (u.userEmail || "").toLowerCase().includes(s)
      );
    }
    const permFilter = filterValues.permLevel;
    if (permFilter && permFilter !== "all") {
      result = result.filter(u => getPermLevel(u) === permFilter);
    }
    return result;
  }, [projectUsers, searchValue, filterValues]);

  const stats = useMemo(() => {
    const owners = projectUsers.filter(u => u.isOwner).length;
    const fullAccess = projectUsers.filter(u => !u.isOwner && u.canDelete).length;
    const editAccess = projectUsers.filter(u => !u.isOwner && u.canEdit && !u.canDelete).length;
    const viewOnly = projectUsers.filter(u => !u.isOwner && u.canView && !u.canEdit && !u.canAdd).length;
    return { total: projectUsers.length, owners, fullAccess, editAccess, viewOnly };
  }, [projectUsers]);

  const statsRowsConfig: StatsRowConfig[] = useMemo(() => [
    {
      columns: 4,
      gap: 'sm',
      items: [
        { key: 'total', label: 'إجمالي المستخدمين', value: stats.total, icon: Users, color: 'blue' },
        { key: 'owners', label: 'مالكون', value: stats.owners, icon: Shield, color: 'green', showDot: true, dotColor: 'bg-emerald-500' },
        { key: 'fullAccess', label: 'صلاحيات كاملة', value: stats.fullAccess, icon: KeyRound, color: 'purple' },
        { key: 'auditCount', label: 'سجل التدقيق', value: auditLogs.length, icon: History, color: 'orange' },
      ]
    }
  ], [stats, auditLogs]);

  const filtersConfig: FilterConfig[] = useMemo(() => [
    {
      key: 'permLevel',
      label: 'مستوى الصلاحية',
      type: 'select',
      defaultValue: 'all',
      options: [
        { value: 'all', label: 'جميع المستويات' },
        { value: 'مالك', label: 'مالك' },
        { value: 'كامل', label: 'صلاحيات كاملة' },
        { value: 'تعديل', label: 'تعديل' },
        { value: 'إضافة', label: 'إضافة' },
        { value: 'قراءة فقط', label: 'قراءة فقط' },
      ],
    },
    {
      key: 'tab',
      label: 'العرض',
      type: 'select',
      defaultValue: 'users',
      options: [
        { value: 'users', label: 'المستخدمون' },
        { value: 'audit', label: 'سجل التدقيق' },
      ],
    },
  ], []);

  const handleFilterChange = (key: string, value: any) => {
    if (key === 'tab') {
      setActiveTab(value as "users" | "audit");
    } else {
      setFilterValues(prev => ({ ...prev, [key]: value }));
    }
  };

  const handleResetFilters = () => {
    setSearchValue("");
    setFilterValues({});
    setActiveTab("users");
  };

  const formatActionLabel = (action: string) => {
    switch (action) {
      case "assign": return "منح صلاحيات";
      case "unassign": return "سحب صلاحيات";
      case "update_permissions": return "تحديث صلاحيات";
      default: return action;
    }
  };

  const getAuditActionColor = (action: string) => {
    switch (action) {
      case "assign": return "#10b981";
      case "unassign": return "#ef4444";
      case "update_permissions": return "#f59e0b";
      default: return "#6b7280";
    }
  };

  const getAuditActionIcon = (action: string) => {
    switch (action) {
      case "assign": return UserPlus;
      case "unassign": return UserMinus;
      case "update_permissions": return Edit;
      default: return History;
    }
  };

  if (!selectedProjectId) {
    return (
      <div className="container mx-auto p-4 space-y-4" data-testid="permission-management-page">
        <UnifiedFilterDashboard
          hideHeader={true}
          title=""
          subtitle=""
          statsRows={[]}
        />
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4 text-muted-foreground">
            <Shield className="h-12 w-12 opacity-20" />
            <p className="text-lg" data-testid="text-select-project-hint">اختر مشروعاً من الشريط العلوي لإدارة صلاحياته</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-4" data-testid="permission-management-page">
      <UnifiedFilterDashboard
        hideHeader={true}
        title=""
        subtitle=""
        statsRows={statsRowsConfig}
        filters={filtersConfig}
        onFilterChange={handleFilterChange}
        onSearchChange={setSearchValue}
        searchValue={searchValue}
        onReset={handleResetFilters}
        searchPlaceholder="بحث بالاسم أو البريد..."
        actions={[
          {
            key: 'grant',
            icon: UserPlus,
            label: 'منح صلاحيات',
            onClick: () => setGrantDialogOpen(true),
            variant: 'default',
          }
        ]}
      />

      {activeTab === "users" && (
        <>
          {usersLoading ? (
            <UnifiedCardGrid columns={3}>
              {Array.from({ length: 6 }).map((_, i) => (
                <UnifiedCard key={i} title="" fields={[]} isLoading={true} compact />
              ))}
            </UnifiedCardGrid>
          ) : filteredUsers.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center gap-4 text-muted-foreground">
                <Users className="h-12 w-12 opacity-20" />
                <p className="text-lg">لا يوجد مستخدمون يطابقون خيارات البحث</p>
                <Button variant="outline" onClick={handleResetFilters} data-testid="button-reset-filters">مسح الفلاتر</Button>
              </div>
            </Card>
          ) : (
            <UnifiedCardGrid columns={3}>
              {filteredUsers.map((u) => (
                <UnifiedCard
                  key={u.userId}
                  title={u.userName || u.userEmail}
                  subtitle={u.userEmail}
                  titleIcon={Users}
                  headerColor={getPermHeaderColor(u)}
                  badges={[
                    {
                      label: getPermLevel(u),
                      variant: u.isOwner ? "success" : u.canDelete ? "default" : u.canEdit ? "warning" : "secondary",
                    }
                  ]}
                  fields={[
                    { label: "الدور", value: u.userRole || "مستخدم", icon: Shield, color: "info" },
                    { label: "عرض", value: u.canView ? "✓" : "✗", icon: Eye, color: u.canView ? "success" : "danger" },
                    { label: "إضافة", value: u.canAdd ? "✓" : "✗", icon: Plus, color: u.canAdd ? "success" : "danger" },
                    { label: "تعديل", value: u.canEdit ? "✓" : "✗", icon: Edit, color: u.canEdit ? "success" : "danger" },
                    { label: "حذف", value: u.canDelete ? "✓" : "✗", icon: Trash2, color: u.canDelete ? "success" : "danger" },
                    { label: "مُعيّن بواسطة", value: u.assignedBy || "النظام", icon: UserPlus, color: "muted", hidden: u.isOwner },
                  ]}
                  actions={u.isOwner ? [] : [
                    {
                      icon: Edit,
                      label: "تعديل الصلاحيات",
                      onClick: () => {
                        setSelectedUser({ ...u });
                        setEditDialogOpen(true);
                      },
                      color: "blue",
                    },
                    {
                      icon: Trash2,
                      label: "سحب الصلاحيات",
                      onClick: () => {
                        setSelectedUser(u);
                        setRevokeDialogOpen(true);
                      },
                      color: "red",
                      variant: "destructive",
                    },
                  ]}
                  compact
                  data-testid={`card-user-${u.userId}`}
                />
              ))}
            </UnifiedCardGrid>
          )}
        </>
      )}

      {activeTab === "audit" && (
        <>
          {auditLogs.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center gap-4 text-muted-foreground">
                <History className="h-12 w-12 opacity-20" />
                <p className="text-lg">لا توجد سجلات تدقيق</p>
              </div>
            </Card>
          ) : (
            <UnifiedCardGrid columns={2}>
              {auditLogs.map((log) => (
                <UnifiedCard
                  key={log.id}
                  title={formatActionLabel(log.action)}
                  subtitle={log.projectName}
                  titleIcon={getAuditActionIcon(log.action)}
                  headerColor={getAuditActionColor(log.action)}
                  fields={[
                    { label: "بواسطة", value: log.actorName || "مسؤول", icon: Users, color: "info" },
                    { label: "المستخدم المستهدف", value: log.targetName, icon: Shield, color: "default" },
                    { label: "التاريخ", value: new Date(log.createdAt).toLocaleString("en-GB"), icon: Clock, color: "muted" },
                  ]}
                  compact
                  data-testid={`card-audit-${log.id}`}
                />
              ))}
            </UnifiedCardGrid>
          )}
        </>
      )}

      <Dialog open={grantDialogOpen} onOpenChange={setGrantDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              منح صلاحيات جديدة
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>المستخدم</Label>
              <Select value={grantUserId} onValueChange={setGrantUserId}>
                <SelectTrigger data-testid="select-grant-user">
                  <SelectValue placeholder="اختر مستخدم" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsersToGrant.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.full_name || u.email} ({u.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>مستوى الصلاحيات</Label>
              <Select value={grantPreset} onValueChange={setGrantPreset}>
                <SelectTrigger data-testid="select-grant-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_LEVELS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-semibold mb-2">الصلاحيات المختارة:</p>
              <div className="flex gap-2 flex-wrap">
                {PRESET_LEVELS.find((p) => p.value === grantPreset)?.canView && (
                  <Badge variant="secondary"><Eye className="h-3 w-3 ml-1" /> عرض</Badge>
                )}
                {PRESET_LEVELS.find((p) => p.value === grantPreset)?.canAdd && (
                  <Badge variant="secondary"><Plus className="h-3 w-3 ml-1" /> إضافة</Badge>
                )}
                {PRESET_LEVELS.find((p) => p.value === grantPreset)?.canEdit && (
                  <Badge variant="secondary"><Edit className="h-3 w-3 ml-1" /> تعديل</Badge>
                )}
                {PRESET_LEVELS.find((p) => p.value === grantPreset)?.canDelete && (
                  <Badge variant="secondary"><Trash2 className="h-3 w-3 ml-1" /> حذف</Badge>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setGrantDialogOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={handleGrant}
              disabled={!grantUserId || grantMutation.isPending}
              data-testid="button-confirm-grant"
            >
              {grantMutation.isPending ? "جاري المنح..." : "منح الصلاحيات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              تعديل صلاحيات {selectedUser?.userName}
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>مستوى الصلاحيات</Label>
                <Select
                  value={getPresetFromPermissions(selectedUser)}
                  onValueChange={(val: string) => {
                    const preset = PRESET_LEVELS.find((p) => p.value === val);
                    if (preset) {
                      setSelectedUser({
                        ...selectedUser,
                        canView: preset.canView,
                        canAdd: preset.canAdd,
                        canEdit: preset.canEdit,
                        canDelete: preset.canDelete,
                      });
                    }
                  }}
                >
                  <SelectTrigger data-testid="select-edit-level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_LEVELS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3 p-3 bg-muted rounded-lg">
                <p className="font-semibold text-sm">تفصيل الصلاحيات:</p>
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2"><Eye className="h-4 w-4" /> عرض</Label>
                  <Switch checked={selectedUser.canView} onCheckedChange={(v) => setSelectedUser({ ...selectedUser, canView: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2"><Plus className="h-4 w-4" /> إضافة</Label>
                  <Switch checked={selectedUser.canAdd} onCheckedChange={(v) => setSelectedUser({ ...selectedUser, canAdd: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2"><Edit className="h-4 w-4" /> تعديل</Label>
                  <Switch checked={selectedUser.canEdit} onCheckedChange={(v) => setSelectedUser({ ...selectedUser, canEdit: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2"><Trash2 className="h-4 w-4" /> حذف</Label>
                  <Switch checked={selectedUser.canDelete} onCheckedChange={(v) => setSelectedUser({ ...selectedUser, canDelete: v })} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updateMutation.isPending}
              data-testid="button-confirm-update"
            >
              {updateMutation.isPending ? "جاري التحديث..." : "حفظ التغييرات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              تأكيد سحب الصلاحيات
            </AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من سحب جميع صلاحيات <span className="font-semibold">{selectedUser?.userName}</span> من هذا المشروع؟ لن يتمكن من الوصول إلى أي بيانات في المشروع.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-revoke"
            >
              {revokeMutation.isPending ? "جاري السحب..." : "سحب الصلاحيات"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
