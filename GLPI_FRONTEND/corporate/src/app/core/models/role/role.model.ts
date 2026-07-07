export interface UserPermission {
  permission_Id: string;
  module_Id: string;
  permission_Code: string;
  permission_Name: string;
  permission_Icon: string;
  module_Name: string;
}

export interface Role {
  id: string;
  companyId: string;
  name: string;
  description: string;
  isSystem: boolean;
  roleType: string;
  userCount?: number;
}

export interface RolePermissionMatrix {
  permissionId: string;
  permissionCode: string;
  permissionName: string;
  moduleName: string;
  moduleIcon: string;
  granted: boolean;
}

export interface Permission {
  code: string;
  name: string;
  granted: boolean;
}

export interface PermissionModule {
  module: string;
  icon: string;
  permissions: Permission[];
}

export interface PermissionUpdateDto {
  permissionIds: string[];
}
