export interface Asset {
  id: string;
  companyId?: string;
  companyName?: string;
  assetTag: string;
  serialNumber: string;
  assetTypeName: string;
  assetTypeItemId: string;
  statusName: string;
  statusColor: string;
  statusItemId: string;
  assignedToName?: string;
  locationName?: string;
  photoUrl?: string;
  purchaseDate?: string;
  warrantyExpiresAt?: string;
  isActive: boolean;
  notes?: string;
  createdAt?: string | Date;
}

export interface AssetSummary {
  id: string;
  companyId?: string;
  companyName?: string;
  assetTag: string;
  serialNumber: string;
  modelName?: string;
  typeName: string;
  typeCode: string;
  statusName: string;
  statusCode: string;
  statusColor: string;
  assignedToName: string;
  locationName?: string;
  photoUrl?: string;
  createdAt: string | Date;
  isActive: boolean;
}

export interface AssetAssignment {
  id: string;
  assetId: string;
  userId: string;
  userName: string;
  assignedAt: string;
  returnedAt?: string;
  notes?: string;
}

export interface AssetCreateUpdateDto {
  id?: string;
  companyId?: string;
  assetTag: string;
  serialNumber: string;
  assetTypeItemId: string;
  statusItemId: string;
  photoUrl?: string;
  notes?: string;
}

export interface AssetMaintenance {
  id: string;
  assetId: string;
  type: string;
  description: string;
  technicianName?: string;
  performedAt?: string;
  cost: number;
  notes?: string;
}
