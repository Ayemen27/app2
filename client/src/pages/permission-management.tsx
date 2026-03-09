import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient as qc } from "@/lib/queryClient";
import {
  KeyRound, Shield, Eye, Plus, Edit, Trash2, Users, Building2,
  Clock, UserPlus, UserMinus, History, CheckCircle2, XCircle, AlertTriangle
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

function PermissionBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    "مالك": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
    "مسؤول": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    "كامل": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    "تعديل": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    "إضافة": "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
    "قراءة فقط": "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  };
  return (
    <Badge className={colors[level] || colors["قراءة فقط"]} data-testid={`badge-permission-${level}`}>
      {level}
    </Badge>
  );
}

function getPermLevel(u: UserInfo): string {
  if (u.isOwner) return "مالك";
  if (u.canDelete) return "كامل";
  if (u.canEdit) return "تعديل";
  if (u.canAdd) return "إضافة";
  if (u.canView) return "قراءة فقط";
  return "لا صلاحيات";
}

export default function PermissionManagementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  const [grantUserId, setGrantUserId] = useState("");
  const [grantPreset, setGrantPreset] = useState("view");

  const { data: projectsData } = useQuery<any>({
    queryKey: ["/api/projects"],
  });
  const projects = projectsData?.data || projectsData || [];

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

  const formatActionLabel = (action: string) => {
    switch (action) {
      case "assign": return "منح صلاحيات";
      case "unassign": return "سحب صلاحيات";
      case "update_permissions": return "تحديث صلاحيات";
      default: return action;
    }
  };

  const formatActionIcon = (action: string) => {
    switch (action) {
      case "assign": return <UserPlus className="h-4 w-4 text-emerald-500" />;
      case "unassign": return <UserMinus className="h-4 w-4 text-red-500" />;
      case "update_permissions": return <Edit className="h-4 w-4 text-amber-500" />;
      default: return <History className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="p-4 space-y-6 max-w-6xl mx-auto" dir="rtl" data-testid="permission-management-page">
      <div className="flex items-center gap-3 mb-6">
        <KeyRound className="h-7 w-7 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">إدارة الصلاحيات</h1>
          <p className="text-sm text-muted-foreground">إدارة صلاحيات المستخدمين على المشاريع - منح وتعديل وسحب الصلاحيات</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5" />
            اختر المشروع
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger data-testid="select-project">
              <SelectValue placeholder="اختر مشروع لإدارة صلاحياته" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p: any) => (
                <SelectItem key={p.id} value={p.id} data-testid={`option-project-${p.id}`}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedProjectId && (
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users" data-testid="tab-users">
              <Users className="h-4 w-4 ml-2" />
              المستخدمون ({projectUsers.length})
            </TabsTrigger>
            <TabsTrigger value="audit" data-testid="tab-audit">
              <History className="h-4 w-4 ml-2" />
              سجل التدقيق
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">المستخدمون ذوو الصلاحيات</h3>
              <Button
                onClick={() => setGrantDialogOpen(true)}
                className="gap-2"
                data-testid="button-grant-permission"
              >
                <UserPlus className="h-4 w-4" />
                منح صلاحيات
              </Button>
            </div>

            {usersLoading ? (
              <div className="text-center py-10 text-muted-foreground">جاري التحميل...</div>
            ) : projectUsers.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>لا يوجد مستخدمون لديهم صلاحيات على هذا المشروع</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {projectUsers.map((u) => (
                  <Card key={u.userId} data-testid={`card-user-${u.userId}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                            <Users className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold" data-testid={`text-username-${u.userId}`}>{u.userName || u.userEmail}</p>
                            <p className="text-sm text-muted-foreground">{u.userEmail}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <PermissionBadge level={getPermLevel(u)} />
                          <div className="flex gap-1">
                            {u.canView && <Eye className="h-4 w-4 text-green-500" />}
                            {u.canAdd && <Plus className="h-4 w-4 text-blue-500" />}
                            {u.canEdit && <Edit className="h-4 w-4 text-amber-500" />}
                            {u.canDelete && <Trash2 className="h-4 w-4 text-red-500" />}
                          </div>
                          {!u.isOwner && (
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser({ ...u });
                                  setEditDialogOpen(true);
                                }}
                                data-testid={`button-edit-${u.userId}`}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => {
                                  setSelectedUser(u);
                                  setRevokeDialogOpen(true);
                                }}
                                data-testid={`button-revoke-${u.userId}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <h3 className="text-lg font-semibold">سجل تغييرات الصلاحيات</h3>
            {auditLogs.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>لا توجد سجلات تدقيق</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <Card key={log.id} data-testid={`card-audit-${log.id}`}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        {formatActionIcon(log.action)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{formatActionLabel(log.action)}</span>
                            <Badge variant="outline" className="text-xs">{log.projectName}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            <span className="font-medium">{log.actorName || "مسؤول"}</span>
                            {log.action === "assign" && <> منح <span className="font-medium">{log.targetName}</span> صلاحيات</>}
                            {log.action === "unassign" && <> سحب صلاحيات <span className="font-medium">{log.targetName}</span></>}
                            {log.action === "update_permissions" && <> حدّث صلاحيات <span className="font-medium">{log.targetName}</span></>}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(log.createdAt).toLocaleString("ar-SA")}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
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
                  onValueChange={(val) => {
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
