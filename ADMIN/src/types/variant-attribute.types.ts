/**
 * Thông tin thuộc tính được hiển thị trong trang quản lý
 * thuộc tính của biến thể sản phẩm.
 *
 * Các trường productName, variantSku, attributeName,
 * attributeValue là dữ liệu phục vụ hiển thị trên Frontend.
 */

export interface VariantAttribute {
  id: string;
  variantId: string;
  attributeId: string;
  attributeValueId: string;

  productName: string;
  variantSku: string;
  attributeName: string;
  attributeValue: string;
}

export interface VariantAttributeFormData {
  variantId: string;
  attributeId: string;
  attributeValueId: string;
}

export interface VariantAttributeFilters {
  keyword: string;
  attributeId: string;
  status: 'all' | 'assigned' | 'unassigned';
}

export type VariantAttributeStatus = 'assigned' | 'unassigned'; 