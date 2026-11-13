import type { AttributeValue } from './attribute.types';

export type { AttributeValue };

export interface AttributeOption {
  id: string;
  name: string;
  slug: string;
}

export interface AttributeValueFormData {
  attributeId: string;
  value: string;
}