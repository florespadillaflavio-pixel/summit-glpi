export interface TenantConfig {
  id: string;
  companyId: string;
  configGroup: string;
  configKey: string;
  configValue: string;
  valueType: string;
  description: string;
  isSensitive: boolean;
  updatedAt: string;
}
