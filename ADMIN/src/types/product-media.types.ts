export type MediaType = 'image' | 'video';

export interface ProductMedia {
  _id: string;
  productId: string;
  mediaType: MediaType;
  mediaUrl: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: string;
}

export interface ProductMediaPayload {
  mediaType: MediaType;
  mediaUrl: string;
  altText?: string | null;
  sortOrder?: number;
  isPrimary?: boolean;
}