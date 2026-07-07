export interface Contract {
  id: string;
  contractNumber: string;
  name: string;
  vendorName: string;
  startDate: string;
  endDate: string;
  statusName: string;
  statusColor: string;
  value: number;
  currency: string;
  // Optional fields — populated depending on the endpoint.
  // The list returns display names (statusName); getById returns the raw
  // catalog references (statusItemId / typeItemId) used to pre-fill the form.
  statusItemId?: string;
  typeItemId?: string;
  // Only present if the API decides to expose them on the list payload;
  // consumers must fall back to graceful defaults when they are missing.
  type?: string;
  assetCount?: number;
}
