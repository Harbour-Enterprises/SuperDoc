import type { SuperDoc } from '../types/index';

/**
 * Available permission types for SuperDoc operations
 */
export const PERMISSIONS = Object.freeze({
  RESOLVE_OWN: 'RESOLVE_OWN',
  RESOLVE_OTHER: 'RESOLVE_OTHER',
  REJECT_OWN: 'REJECT_OWN',
  REJECT_OTHER: 'REJECT_OTHER',
  COMMENTS_OVERFLOW_OWN: 'COMMENTS_OVERFLOW',
  COMMENTS_OVERFLOW_OTHER: 'COMMENTS_OVERFLOW_OTHER',
  COMMENTS_DELETE_OWN: 'COMMENTS_DELETE_OWN',
  COMMENTS_DELETE_OTHER: 'COMMENTS_DELETE_OTHER',
  UPLOAD_VERSION: 'UPLOAD_VERSION',
  VERSION_HISTORY: 'VERSION_HISTORY',
} as const);

/**
 * Permission key type derived from PERMISSIONS object
 */
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Available user roles
 */
const ROLES = Object.freeze({
  EDITOR: 'editor',
  SUGGESTER: 'suggester',
  VIEWER: 'viewer',
} as const);

/**
 * Role type derived from ROLES object
 */
export type Role = (typeof ROLES)[keyof typeof ROLES];

/**
 * Internal/External context type
 */
type InternalExternalKey = 'internal' | 'external';

/**
 * Permission matrix entry structure
 */
interface PermissionMatrixEntry {
  internal: ReadonlyArray<Role>;
  external: ReadonlyArray<Role>;
}

/**
 * Permission matrix mapping permissions to allowed roles by context
 */
type PermissionMatrix = Readonly<Record<Permission, PermissionMatrixEntry>>;

/**
 * The permission matrix defining which roles can perform which permissions
 * in internal vs external contexts
 */
const PERMISSION_MATRIX: PermissionMatrix = Object.freeze({
  [PERMISSIONS.RESOLVE_OWN]: {
    internal: [ROLES.EDITOR],
    external: [ROLES.EDITOR],
  },
  [PERMISSIONS.RESOLVE_OTHER]: {
    internal: [ROLES.EDITOR],
    external: [],
  },
  [PERMISSIONS.REJECT_OWN]: {
    internal: [ROLES.EDITOR, ROLES.SUGGESTER],
    external: [ROLES.EDITOR, ROLES.SUGGESTER],
  },
  [PERMISSIONS.REJECT_OTHER]: {
    internal: [ROLES.EDITOR],
    external: [],
  },
  [PERMISSIONS.COMMENTS_OVERFLOW_OWN]: {
    internal: [ROLES.EDITOR, ROLES.SUGGESTER],
    external: [ROLES.EDITOR, ROLES.SUGGESTER],
  },
  [PERMISSIONS.COMMENTS_OVERFLOW_OTHER]: {
    internal: [ROLES.EDITOR],
    external: [],
  },
  [PERMISSIONS.COMMENTS_DELETE_OWN]: {
    internal: [ROLES.EDITOR, ROLES.SUGGESTER],
    external: [ROLES.EDITOR, ROLES.SUGGESTER],
  },
  [PERMISSIONS.COMMENTS_DELETE_OTHER]: {
    internal: [ROLES.EDITOR],
    external: [],
  },
  [PERMISSIONS.UPLOAD_VERSION]: {
    internal: [ROLES.EDITOR],
    external: [],
  },
  [PERMISSIONS.VERSION_HISTORY]: {
    internal: [ROLES.EDITOR],
    external: [],
  },
});

/**
 * User object structure
 */
export interface User {
  name: string;
  email: string | null;
  image?: string | null;
}

/**
 * Comment object structure (minimal definition)
 */
export interface Comment {
  commentId?: string;
  [key: string]: unknown;
}

/**
 * Tracked change object structure (minimal definition)
 */
export interface TrackedChange {
  [key: string]: unknown;
}

/**
 * Permission resolver function signature
 */
export interface PermissionResolverParams {
  permission: Permission;
  role: Role;
  isInternal: boolean;
  defaultDecision: boolean;
  comment: Comment | null;
  currentUser: User | null;
  superdoc: SuperDoc | null;
  trackedChange: TrackedChange | null;
}

/**
 * Custom permission resolver function type
 */
export type PermissionResolver = (params: PermissionResolverParams) => boolean | undefined;

/**
 * Context object for permission checking
 */
export interface PermissionContext {
  comment?: Comment;
  superdoc?: SuperDoc;
  currentUser?: User;
  permissionResolver?: PermissionResolver;
  trackedChange?: TrackedChange;
}

/**
 * Pick the appropriate permission resolver from the context
 *
 * @param context - The context object containing potential resolvers
 * @returns The permission resolver function or null if none found
 */
const pickResolver = (context: PermissionContext = {}): PermissionResolver | null => {
  if (typeof context.permissionResolver === 'function') return context.permissionResolver;
  if (context.superdoc?.config?.modules?.comments?.permissionResolver) {
    const resolver = context.superdoc.config.modules.comments.permissionResolver;
    if (typeof resolver === 'function') return resolver;
  }
  if (typeof context.superdoc?.config?.permissionResolver === 'function') {
    return context.superdoc.config.permissionResolver;
  }
  return null;
};

/**
 * Get the default decision for a permission based on the permission matrix
 *
 * @param permission - The permission to check
 * @param role - The role to check
 * @param isInternal - Whether this is an internal or external context
 * @returns True if the role is allowed by default, false otherwise
 */
const defaultDecisionFor = (permission: Permission, role: Role, isInternal: boolean): boolean => {
  const internalExternal: InternalExternalKey = isInternal ? 'internal' : 'external';
  return PERMISSION_MATRIX[permission]?.[internalExternal]?.includes(role) ?? false;
};

/**
 * Check if a role is allowed to perform a permission
 *
 * @param permission - The permission to check
 * @param role - The role to check
 * @param isInternal - The internal/external flag
 * @param context - Optional context used by the permission resolver
 * @returns True if the role is allowed to perform the permission
 */
export const isAllowed = (
  permission: Permission,
  role: Role,
  isInternal: boolean,
  context: PermissionContext = {},
): boolean => {
  const defaultDecision = defaultDecisionFor(permission, role, isInternal);
  const resolver = pickResolver(context);

  if (typeof resolver !== 'function') return defaultDecision;

  const decision = resolver({
    permission,
    role,
    isInternal,
    defaultDecision,
    comment: context.comment ?? null,
    currentUser: context.currentUser ?? context.superdoc?.config?.user ?? null,
    superdoc: context.superdoc ?? null,
    trackedChange: context.trackedChange ?? null,
  });

  return typeof decision === 'boolean' ? decision : defaultDecision;
};
