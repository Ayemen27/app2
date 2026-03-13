import { db } from "../../db";
import { whatsappUserLinks, users, userProjectPermissions, projects } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { projectAccessService, type ProjectPermissionInfo } from "../ProjectAccessService";

export class WhatsAppSecurityContext {
  userId: string | null;
  role: string;
  accessibleProjectIds: string[];
  isAdmin: boolean;
  phoneNumber: string;
  userName: string;
  private _permissions: ProjectPermissionInfo[] | null = null;

  private constructor(
    phoneNumber: string,
    userId: string | null,
    role: string,
    accessibleProjectIds: string[],
    userName: string
  ) {
    this.phoneNumber = phoneNumber;
    this.userId = userId;
    this.role = role;
    this.accessibleProjectIds = accessibleProjectIds;
    this.isAdmin = role === "admin" || role === "super_admin";
    this.userName = userName;
  }

  static async fromPhone(phone: string): Promise<WhatsAppSecurityContext> {
    const cleanPhone = phone.replace(/\D/g, "");

    const link = await db
      .select()
      .from(whatsappUserLinks)
      .where(
        and(
          eq(whatsappUserLinks.isActive, true),
          eq(whatsappUserLinks.phoneNumber, cleanPhone)
        )
      )
      .limit(1);

    if (link.length === 0) {
      return new WhatsAppSecurityContext(cleanPhone, null, "unknown", [], "");
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, link[0].user_id))
      .limit(1);

    if (user.length === 0) {
      return new WhatsAppSecurityContext(cleanPhone, null, "unknown", [], "");
    }

    const userId = user[0].id;
    const role = user[0].role || "user";
    const userName =
      user[0].full_name || user[0].first_name || user[0].email;

    const accessibleProjectIds = await projectAccessService.getAccessibleProjectIds(
      userId,
      role
    );

    return new WhatsAppSecurityContext(
      cleanPhone,
      userId,
      role,
      accessibleProjectIds,
      userName
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
    if (this.isAdmin) return true;
    if (!this.userId) return false;
    return projectAccessService.checkProjectAccess(
      this.userId,
      this.role,
      projectId,
      "add"
    );
  }
}
