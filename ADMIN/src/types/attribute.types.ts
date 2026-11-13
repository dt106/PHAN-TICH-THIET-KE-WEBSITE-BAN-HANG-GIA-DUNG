export interface AttributeValue {
  id: string;
  attributeId: string;
  value: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductAttribute {
  id: string;
  name: string;
  slug: string;
  values: AttributeValue[];
  createdAt: string;
  updatedAt: string;
}

export interface AttributeFormData {
  name: string;
  slug: string;
  values: string[];
}