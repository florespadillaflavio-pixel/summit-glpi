export interface CatalogGroup {
  id: string;
  code: string;
  name: string;
  description: string;
  module?: string;
  isSystem: boolean;
  isActive: boolean;
}

export interface CatalogItem {
  id: string;
  groupId: string;
  code: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  sortOrder: number;
  isDefault: boolean;
  isSystem: boolean;
  isActive: boolean;
}
