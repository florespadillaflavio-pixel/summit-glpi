export interface ReturnValue<T = unknown> {
  success: boolean;
  message: string;
  code: string;
  argument: string;
  id: string;
  data: T | null;
}

export interface PagedResult<T = unknown> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
