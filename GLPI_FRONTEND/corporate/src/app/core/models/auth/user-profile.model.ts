export interface UserProfileDto {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  avatarUrl: string;
  role: string;
  isInternal: boolean;
  companyId: string;
  companyName: string;
}
