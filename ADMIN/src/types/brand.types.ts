
export interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BrandCreatePayload {
  name: string;
  slug?: string;
  description?: string | null;
  logo?: string | null;
  isActive?: boolean;
}

export type BrandUpdatePayload = Partial<BrandCreatePayload>;

export interface BrandListParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}
