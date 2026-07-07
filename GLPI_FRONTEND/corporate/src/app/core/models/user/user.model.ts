export interface UserSummary {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  company: string;
  companyId: string;
  isActive: boolean;
  lastLoginAt: Date | string | null;
  createdAt: Date | string;
  avatarUrl?: string;
}

export interface UserDetails {
  id: string;
  companyId: string;
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
  isActive: boolean;
  avatarUrl?: string;
  roleIds: string[];
}

export interface UserCreateUpdateDto {
  id?: string;
  companyId: string;
  firstName: string;
  lastName: string;
  username: string; // email
  email?: string;   // frontend uses email for form
  phone: string;
  password?: string;
  avatarUrl?: string;
  roleIds: string[];
}

export interface StatusUpdateDto {
  isActive: boolean;
}
