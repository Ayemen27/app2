import { db } from "../../db";
import { whatsappUserLinks, whatsappLinkProjects, whatsappAllowedNumbers, users, userProjectPermissions, projects } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";
import { projectAccessService, type ProjectPermissionInfo } from "../ProjectAccessService";

export class WhatsAppSecurityContext {
  userId: string | null;
  role: string;
  accessibleProjectIds: string[];
  isAdmin: boolean;
  phoneNumber: string;
  userName: string;
  canRead: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  permissionsMode: string;
  private _permissions: ProjectPermissionInfo[] | null = null;

  private constructor(
    phoneNumber: string,
    userId: string | null,
    role: string,
    accessibleProjectIds: string[],
    userName: string,
    canRead: boolean = true,
    canAdd: boolean = true,
    canEdit: boolean = true,
    canDelete: boolean = true,
    permissionsMode: string = "inherit_user"
  ) {
    this.phoneNumber = phoneNumber;
    this.userId = userId;
    this.role = role;
    this.accessibleProjectIds = accessibleProjectIds;
    this.isAdmin = role === "admin" || role === "super_admin";
    this.userName = userName;
    this.canRead = canRead;
    this.canAdd = canAdd;
    this.canEdit = canEdit;
    this.canDelete = canDelete;
    this.permissionsMode = permissionsMode;
  }

  static async fromPhone(phone: string): Promise<WhatsAppSecurityContext> {
    const cleanPhone = phone.replace(/\D/g, "");
    console.log(`[WhatsAppSecurityContext] fromPhone: بحث عن الرقم ${cleanPhone}`);

    let link = await db
      .select()
      .from(whatsappUserLinks)
      .where(
        and(
          eq(whatsappUserLinks.isActive, true),
          eq(whatsappUserLinks.phoneNumber, cleanPhone)
        )
      )
      .limit(1);

    if (link.length > 0) {
      const allowedCheck = await db
        .select({ linkedUserId: whatsappAllowedNumbers.linkedUserId })
        .from(whatsappAllowedNumbers)
        .where(
          and(
            eq(whatsappAllowedNumbers.isActive, true),
            eq(whatsappAllowedNumbers.phoneNumber, cleanPhone)
          )
        )
        .limit(1);

      if (allowedCheck.length > 0) {
        if (!allowedCheck[0].linkedUserId) {
          console.log(`[WhatsAppSecurityContext] ⛔ الرقم ${cleanPhone} في allowed_numbers لكن بدون linkedUserId (سجل قديم) — رفض أي ربط legacy لمنع تصعيد الصلاحيات`);
          link = [];
        } else if (allowedCheck[0].linkedUserId !== link[0].user_id) {
          console.log(`[WhatsAppSecurityContext] ⛔ الرقم ${cleanPhone} مربوط بمستخدم ${link[0].user_id} لكن allowed_numbers يحدد المستخدم المستقل ${allowedCheck[0].linkedUserId} — رفض الربط القديم`);
          link = [];
        }
      }
    }

    if (link.length === 0) {
      console.log(`[WhatsAppSecurityContext] الرقم ${cleanPhone} غير موجود في user_links — البحث في allowed_numbers...`);

      const allowedEntry = await db
        .select()
        .from(whatsappAllowedNumbers)
        .where(
          and(
            eq(whatsappAllowedNumbers.isActive, true),
            eq(whatsappAllowedNumbers.phoneNumber, cleanPhone)
          )
        )
        .limit(1);

      if (allowedEntry.length > 0) {
        const linkedUserId = allowedEntry[0].linkedUserId;
        if (linkedUserId) {
          console.log(`[WhatsAppSecurityContext] وُجد في allowed_numbers مع مستخدم مستقل (linkedUserId: ${linkedUserId})`);
          const existingLink = await db
            .select()
            .from(whatsappUserLinks)
            .where(
              and(
                eq(whatsappUserLinks.user_id, linkedUserId),
                eq(whatsappUserLinks.phoneNumber, cleanPhone)
              )
            )
            .limit(1);

          if (existingLink.length > 0) {
            link.push(existingLink[0]);
            console.log(`[WhatsAppSecurityContext] ✅ ربط موجود بالمستخدم المستقل ${linkedUserId}`);
          } else {
            console.log(`[WhatsAppSecurityContext] ⚠️ linkedUserId موجود لكن لا يوجد whatsapp_user_link — الرقم يحتاج إعادة تهيئة`);
            return new WhatsAppSecurityContext(cleanPhone, null, "allowed_no_link", [], allowedEntry[0].label || "");
          }
        } else {
          console.log(`[WhatsAppSecurityContext] ⚠️ الرقم ${cleanPhone} مسموح لكن بدون مستخدم مستقل — يحتاج تهيئة من لوحة التحكم`);
          return new WhatsAppSecurityContext(cleanPhone, null, "allowed_no_user", [], allowedEntry[0].label || "", false, false, false, false, "custom");
        }
      } else {
        console.log(`[WhatsAppSecurityContext] الرقم ${cleanPhone} غير موجود في allowed_numbers`);
      }

      if (link.length === 0) {
        console.log(`[WhatsAppSecurityContext] ❌ الرقم ${cleanPhone} غير مصرح — userId=null`);
        return new WhatsAppSecurityContext(cleanPhone, null, "unknown", [], "");
      }
    }

    const linkData = link[0];

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, linkData.user_id))
      .limit(1);

    if (user.length === 0) {
      return new WhatsAppSecurityContext(cleanPhone, null, "unknown", [], "");
    }

    const userId = user[0].id;
    const role = user[0].role || "user";
    const userName =
      user[0].full_name || user[0].first_name || user[0].email;

    let accessibleProjectIds = await projectAccessService.getAccessibleProjectIds(
      userId,
      role
    );

    let canRead = true;
    let canAdd = true;
    let canEdit = true;
    let canDelete = true;
    const permissionsMode = linkData.permissionsMode || "inherit_user";

    if (permissionsMode === "custom") {
      canRead = linkData.canRead;
      canAdd = linkData.canAdd;
      canEdit = linkData.canEdit;
      canDelete = linkData.canDelete;

      if (!linkData.scopeAllProjects) {
        const linkProjects = await db
          .select()
          .from(whatsappLinkProjects)
          .where(
            and(
              eq(whatsappLinkProjects.linkId, linkData.id),
              eq(whatsappLinkProjects.isActive, true)
            )
          );

        const allowedProjectIds = linkProjects.map((lp: { project_id: string }) => lp.project_id);
        accessibleProjectIds = accessibleProjectIds.filter((id) =>
          allowedProjectIds.includes(id)
        );
      }
    } else if (permissionsMode === "inherit_user") {
      const isAdminRole = role === "admin" || role === "super_admin";

      if (isAdminRole) {
        canRead = true;
        canAdd = true;
        canEdit = true;
        canDelete = true;
      } else {
        const userPerms = await db
          .select()
          .from(userProjectPermissions)
          .where(eq(userProjectPermissions.user_id, userId));

        if (userPerms.length > 0) {
          canRead = userPerms.some((p: { canView: boolean }) => p.canView === true);
          canAdd = userPerms.some((p: { canAdd: boolean }) => p.canAdd === true);
          canEdit = userPerms.some((p: { canEdit: boolean }) => p.canEdit === true);
          canDelete = userPerms.some((p: { canDelete: boolean }) => p.canDelete === true);
        } else {
          const ownedProjects = await db
            .select({ id: projects.id })
            .from(projects)
            .where(eq(projects.engineerId, userId));

          if (ownedProjects.length > 0) {
            canRead = true;
            canAdd = true;
            canEdit = true;
            canDelete = true;
          } else {
            canRead = false;
            canAdd = false;
            canEdit = false;
            canDelete = false;
          }
        }
      }
    }

    return new WhatsAppSecurityContext(
      cleanPhone,
      userId,
      role,
      accessibleProjectIds,
      userName,
      canRead,
      canAdd,
      canEdit,
      canDelete,
      permissionsMode
    );
  }

  canAccessProject(projectId: string): boolean {
    if (this.isAdmin) return true;
    return this.accessibleProjectIds.includes(projectId);
  }

  filterProjectIds(ids: string[]): string[] {
    if (this.isAdmin) return ids;
    return ids.filter((id) => this.accessibleProjectIds.includes(id));
  }

  async getPermissions(): Promise<ProjectPermissionInfo[]> {
    if (this._permissions) return this._permissions;
    if (!this.userId) {
      this._permissions = [];
      return this._permissions;
    }
    this._permissions = await projectAccessService.getUserPermissionsForAllProjects(
      this.userId,
      this.role
    );
    return this._permissions;
  }

  async canAddToProject(projectId: string): Promise<boolean> {
    if (!this.canAdd) return false;
    if (this.isAdmin) return true;
    if (!this.userId) return false;
    return projectAccessService.checkProjectAccess(
      this.userId,
      this.role,
      projectId,
      "add"
    );
  }

  async canReadProject(projectId: string): Promise<boolean> {
    if (!this.canRead) return false;
    if (this.isAdmin) return true;
    if (!this.userId) return false;
    return projectAccessService.checkProjectAccess(
      this.userId,
      this.role,
      projectId,
      "view"
    );
  }

  async canPerformAction(action: 'read' | 'add' | 'edit' | 'delete', projectId?: string): Promise<boolean> {
    switch (action) {
      case 'read':
        if (!this.canRead) return false;
        if (projectId) return this.canReadProject(projectId);
        return true;
      case 'add':
        if (!this.canAdd) return false;
        if (projectId) return this.canAddToProject(projectId);
        return true;
      case 'edit':
        if (!this.canEdit) return false;
        if (this.isAdmin) return true;
        if (!this.userId) return false;
        if (projectId) {
          return projectAccessService.checkProjectAccess(this.userId, this.role, projectId, "edit");
        }
        return true;
      case 'delete':
        if (!this.canDelete) return false;
        if (this.isAdmin) return true;
        if (!this.userId) return false;
        if (projectId) {
          return projectAccessService.checkProjectAccess(this.userId, this.role, projectId, "delete");
        }
        return true;
      default:
        return false;
    }
  }
}
