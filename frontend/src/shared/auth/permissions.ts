export type AppRole = "super_admin" | "admin" | "candidate" | "client";

export type Permission =
  | "dashboard:view"
  | "candidate:list"
  | "candidate:read"
  | "candidate:create"
  | "candidate:update"
  | "candidate:delete"
  | "candidate:skill-evaluate"
  | "skill:list"
  | "skill:read"
  | "skill:create"
  | "skill:update"
  | "skill:delete"
  | "share:create"
  | "share:read"
  | "share:update"
  | "share:delete"
  | "share:copy-link"
  | "public-share:read"
  | "audit:read"
  | "settings:view"
  | "settings:update"
  | "user:read"
  | "user:create"
  | "user:update"
  | "user:delete"
  | "user:reset-password";

export const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  super_admin: [
    "dashboard:view",
    "candidate:list",
    "candidate:read",
    "candidate:create",
    "candidate:update",
    "candidate:delete",
    "candidate:skill-evaluate",
    "skill:list",
    "skill:read",
    "skill:create",
    "skill:update",
    "skill:delete",
    "share:create",
    "share:read",
    "share:update",
    "share:delete",
    "share:copy-link",
    "public-share:read",
    "audit:read",
    "settings:view",
    "settings:update",
    "user:read",
    "user:create",
    "user:update",
    "user:delete",
    "user:reset-password"
  ],
  admin: [
    "dashboard:view",
    "candidate:list",
    "candidate:read",
    "candidate:create",
    "candidate:update",
    "candidate:delete",
    "candidate:skill-evaluate",
    "skill:list",
    "skill:read",
    "skill:create",
    "skill:update",
    "skill:delete",
    "share:create",
    "share:read",
    "share:update",
    "share:delete",
    "share:copy-link",
    "public-share:read",
    "settings:view",
    "settings:update"
  ],
  candidate: [
    "candidate:read",
    "candidate:update",
    "candidate:skill-evaluate",
    "skill:list",
    "skill:read",
    "public-share:read"
  ],
  client: [
    "candidate:read",
    "skill:list",
    "skill:read",
    "public-share:read"
  ]
};

export function hasPermission(role: AppRole, permission: Permission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function canManageCandidates(role: AppRole) {
  return hasPermission(role, "candidate:create") && hasPermission(role, "candidate:update");
}

export function canManageSkills(role: AppRole) {
  return hasPermission(role, "skill:create") && hasPermission(role, "skill:update") && hasPermission(role, "skill:delete");
}

export function canManageShareLinks(role: AppRole) {
  return hasPermission(role, "share:create") && hasPermission(role, "share:update");
}

export function canManageUsers(role: AppRole) {
  return hasPermission(role, "user:read") && hasPermission(role, "user:update");
}
