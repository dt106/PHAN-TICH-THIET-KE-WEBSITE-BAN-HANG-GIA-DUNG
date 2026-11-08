/**
 * FILE: ADMIN/src/services/catalog/variantAttributes.service.ts
 *
 * Xử lý dữ liệu thuộc tính đã gán cho biến thể.
 *
 * Lưu ý:
 * Backend chưa có route CRUD riêng cho VariantAttribute.
 * Tạo/cập nhật/xóa việc gán thuộc tính phải thông qua
 * productVariantsService.create() và productVariantsService.update().
 */

import type {
  ProductVariant,
  VariantAttributeRecord,
} from '../../types/product-variant.types';

export interface VariantAttributeAssignment {
  variantId: string;
  variantSku: string;
  attributeId: string;
  attributeValueId: string;
  attributeName?: string;
  attributeValue?: string;
}

type PopulatedAttribute = {
  _id?: string;
  id?: string;
  name?: string;
  slug?: string;
};

type PopulatedAttributeValue = {
  _id?: string;
  id?: string;
  value?: string;
  slug?: string;
};

function getId(
  value: string | PopulatedAttribute | PopulatedAttributeValue,
): string {
  if (typeof value === 'string') {
    return value;
  }

  return value.id ?? value._id ?? '';
}

function getAttributeName(
  value: VariantAttributeRecord['attributeId'],
): string | undefined {
  if (typeof value === 'string') {
    return undefined;
  }

  return value.name;
}

function getAttributeValue(
  value: VariantAttributeRecord['attributeValueId'],
): string | undefined {
  if (typeof value === 'string') {
    return undefined;
  }

  return value.value;
}

export const variantAttributesService = {
  /**
   * Lấy các thuộc tính đã gán từ danh sách biến thể.
   * Không gọi API riêng.
   */
  getFromVariants(
    variants: ProductVariant[],
  ): VariantAttributeAssignment[] {
    return variants.flatMap((variant) => {
      const assignments = variant.attributes ?? [];

      return assignments
        .map((item) => ({
          variantId: item.variantId || variant.id || variant._id,
          variantSku: variant.sku,
          attributeId: getId(item.attributeId),
          attributeValueId: getId(item.attributeValueId),
          attributeName: getAttributeName(item.attributeId),
          attributeValue: getAttributeValue(item.attributeValueId),
        }))
        .filter(
          (item) => item.attributeId && item.attributeValueId,
        );
    });
  },

  /**
   * Lọc các lần gán thuộc tính theo ID thuộc tính.
   */
  filterByAttribute(
    assignments: VariantAttributeAssignment[],
    attributeId: string,
  ): VariantAttributeAssignment[] {
    if (!attributeId) {
      return assignments;
    }

    return assignments.filter(
      (item) => item.attributeId === attributeId,
    );
  },

  /**
   * Lọc các lần gán thuộc tính theo ID biến thể.
   */
  filterByVariant(
    assignments: VariantAttributeAssignment[],
    variantId: string,
  ): VariantAttributeAssignment[] {
    if (!variantId) {
      return assignments;
    }

    return assignments.filter(
      (item) => item.variantId === variantId,
    );
  },
};