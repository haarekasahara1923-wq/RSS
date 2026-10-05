/**
 * Role-based permission utility for UDBA admin portals
 *
 * Permission levels:
 * - SUPER_ADMIN / COACHING_ADMIN: Full CRUD access
 * - ADMIN_OPERATION: View + Add only (no edit/delete/block)
 * - ADMIN_LIBRARY: Library view + add students to library only
 * - ADMIN_SPORTS: Sports view + add students to sports only
 * - ADMIN_TRANSPORT: Transport view + add vehicles/drivers/assign students only
 * - TEACHER, STAFF: Limited academic access
 */

export type UserRole =
  | 'SUPER_ADMIN'
  | 'COACHING_ADMIN'
  | 'ADMIN_OPERATION'
  | 'ADMIN_LIBRARY'
  | 'ADMIN_SPORTS'
  | 'ADMIN_TRANSPORT'
  | 'TEACHER'
  | 'STAFF'
  | 'STUDENT'
  | 'PARENT'
  | 'DRIVER'

const FULL_ACCESS_ROLES: UserRole[] = ['SUPER_ADMIN', 'COACHING_ADMIN']
const READ_ONLY_ADD_ROLES: UserRole[] = ['ADMIN_OPERATION', 'ADMIN_LIBRARY', 'ADMIN_SPORTS', 'ADMIN_TRANSPORT']

export function canCreate(role: UserRole): boolean {
  return [...FULL_ACCESS_ROLES, ...READ_ONLY_ADD_ROLES].includes(role)
}

export function canEdit(role: UserRole): boolean {
  return FULL_ACCESS_ROLES.includes(role)
}

export function canDelete(role: UserRole): boolean {
  return FULL_ACCESS_ROLES.includes(role)
}

export function canBlock(role: UserRole): boolean {
  return FULL_ACCESS_ROLES.includes(role)
}

export function canViewFinance(role: UserRole): boolean {
  return role === 'SUPER_ADMIN' || role === 'COACHING_ADMIN' || role === 'ADMIN_OPERATION'
}

export function canManageLibrary(role: UserRole): boolean {
  return role === 'SUPER_ADMIN' || role === 'COACHING_ADMIN' || role === 'ADMIN_LIBRARY'
}

export function canManageSports(role: UserRole): boolean {
  return role === 'SUPER_ADMIN' || role === 'COACHING_ADMIN' || role === 'ADMIN_SPORTS'
}

export function canManageTransport(role: UserRole): boolean {
  return role === 'SUPER_ADMIN' || role === 'COACHING_ADMIN' || role === 'ADMIN_TRANSPORT'
}

export function canManageAdmins(role: UserRole): boolean {
  return FULL_ACCESS_ROLES.includes(role)
}

export function isSubAdmin(role: UserRole): boolean {
  return READ_ONLY_ADD_ROLES.includes(role)
}

/**
 * Returns a human-readable label for any role
 */
export function getRoleLabel(role: string): string {
  const map: Record<string, string> = {
    SUPER_ADMIN: '👑 Super Admin',
    COACHING_ADMIN: '🏫 School Admin',
    ADMIN_OPERATION: '⚙️ Admin Operation',
    ADMIN_LIBRARY: '📚 Admin Library',
    ADMIN_SPORTS: '🏆 Admin Sports',
    ADMIN_TRANSPORT: '🚌 Admin Transport',
    TEACHER: '👩‍🏫 Teacher',
    STAFF: '🧑‍💼 Staff',
    STUDENT: '👨‍🎓 Student',
    PARENT: '👨‍👩‍👧 Parent',
    DRIVER: '🚌 Driver',
  }
  return map[role] || role
}
