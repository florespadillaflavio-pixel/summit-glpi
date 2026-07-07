import { UserPermission } from '../role/role.model';
import { UserProfileDto } from './user-profile.model';

export enum UserRoleType {
  ADMIN = 'ADMIN',
  TECHNICIAN = 'TECHNICIAN',
  CLIENT = 'CLIENT',
  SUPERVISOR = 'SUPERVISOR'
}

export interface UserSession {
  userId: string;
  companyId: string;
  companyName: string;
  username: string;
  token: string;
  role: string;
  isInternal: boolean;
  firstName: string;
  lastName: string;
  avatarUrl: string;
  permissions: UserPermission[];
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface LoginResponse {
  userId: string;
  companyId: string;
  username: string;
  token: string;
  mustChangePassword?: boolean;
  profile: UserProfileDto | null;
  permissions: UserPermission[];
}
