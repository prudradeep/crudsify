'use strict'
/**
 * This file contains a list of permissions that only a Super Admin can assign.
 */

module.exports = [
  // User permissions
  'createUser',
  'deleteUser',
  // Role permissions
  'addRolePermissions',
  'addRoleUsers',
  'createRole',
  'deleteRole',
  'removeRolePermissions',
  'removeRoleUsers',
  'updateRole',
  // Group permissions
  'deleteGroup',
  // Permission permissions
  'addPermissionRoles',
  'createPermission',
  'deletePermission',
  'removePermissionRoles',
  'updatePermission',
  // AuthAttempt permissions
  'associateAuthAttempt',
  'createAuthAttempt',
  'deleteAuthAttempt',
  'readAuthAttempt',
  'updateAuthAttempt',
  // Session permissions
  'createSession',
  'deleteSession',
  'readSession',
  'updateSession'
]