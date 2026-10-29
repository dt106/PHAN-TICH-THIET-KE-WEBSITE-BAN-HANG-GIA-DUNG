import Attribute, { IAttribute } from "../models/Attribute.model";
import AttributeValue, { IAttributeValue } from "../models/AttributeValue.model";
import VariantAttribute from "../models/VariantAttribute.model";
import { generateSlug } from "./brand.service";
import { AppError } from "../utils/appError";

interface CreateAttributePayload {
  name: string;
  slug?: string;
}

interface UpdateAttributePayload {
  name?: string;
  slug?: string;
}

interface CreateAttributeValuePayload {
  value: string;
  slug?: string;
}

interface UpdateAttributeValuePayload {
  value?: string;
  slug?: string;
}

export const getAllAttributesWithValues = async () => {
  const attributes = await Attribute.find().sort({ createdAt: 1 });
  const attributeIds = attributes.map((attribute) => attribute._id);

  const values = await AttributeValue.find({
    attributeId: { $in: attributeIds },
  }).sort({ value: 1 });

  return attributes.map((attribute) => ({
    ...attribute.toObject(),
    values: values
      .filter(
        (value) => value.attributeId.toString() === attribute._id.toString()
      )
      .map((value) => value.toObject()),
  }));
};

export const getAttributeById = async (id: string) => {
  const attribute = await Attribute.findById(id);
  if (!attribute) {
    throw new AppError(404, "Thuộc tính không tồn tại.");
  }

  const values = await AttributeValue.find({ attributeId: id }).sort({ value: 1 });

  return { ...attribute.toObject(), values: values.map((value) => value.toObject()) };
};

export const createAttribute = async (
  payload: CreateAttributePayload
): Promise<IAttribute> => {
  const slug = payload.slug || generateSlug(payload.name);

  const existing = await Attribute.findOne({ slug });
  if (existing) {
    throw new AppError(400, `Slug thuộc tính '${slug}' đã tồn tại.`);
  }

  return Attribute.create({ name: payload.name, slug });
};

export const updateAttribute = async (
  id: string,
  payload: UpdateAttributePayload
): Promise<IAttribute> => {
  const attribute = await Attribute.findById(id);
  if (!attribute) {
    throw new AppError(404, "Thuộc tính không tồn tại.");
  }

  if (payload.slug && payload.slug !== attribute.slug) {
    const existing = await Attribute.findOne({ slug: payload.slug });
    if (existing) {
      throw new AppError(400, `Slug thuộc tính '${payload.slug}' đã tồn tại.`);
    }
    attribute.slug = payload.slug;
  }

  if (payload.name !== undefined) attribute.name = payload.name;

  await attribute.save();
  return attribute;
};

export const deleteAttribute = async (
  id: string
): Promise<{ message: string }> => {
  const attribute = await Attribute.findById(id);
  if (!attribute) {
    throw new AppError(404, "Thuộc tính không tồn tại.");
  }

  const inUse = await VariantAttribute.countDocuments({ attributeId: id });
  if (inUse > 0) {
    throw new AppError(
      400,
      `Không thể xóa thuộc tính này vì đang có ${inUse} biến thể sản phẩm sử dụng.`
    );
  }

  await AttributeValue.deleteMany({ attributeId: id });
  await Attribute.findByIdAndDelete(id);

  return { message: "Đã xóa thuộc tính và các giá trị liên quan thành công." };
};

export const createAttributeValue = async (
  attributeId: string,
  payload: CreateAttributeValuePayload
): Promise<IAttributeValue> => {
  const attribute = await Attribute.findById(attributeId);
  if (!attribute) {
    throw new AppError(404, "Thuộc tính cha không tồn tại.");
  }

  const slug = payload.slug || generateSlug(payload.value);

  const existing = await AttributeValue.findOne({
    attributeId,
    value: payload.value,
  });
  if (existing) {
    throw new AppError(
      400,
      `Giá trị '${payload.value}' đã tồn tại trong thuộc tính này.`
    );
  }

  return AttributeValue.create({
    attributeId,
    value: payload.value,
    slug,
  });
};

export const updateAttributeValue = async (
  valueId: string,
  payload: UpdateAttributeValuePayload
): Promise<IAttributeValue> => {
  const attributeValue = await AttributeValue.findById(valueId);
  if (!attributeValue) {
    throw new AppError(404, "Giá trị thuộc tính không tồn tại.");
  }

  if (payload.value && payload.value !== attributeValue.value) {
    const existing = await AttributeValue.findOne({
      attributeId: attributeValue.attributeId,
      value: payload.value,
      _id: { $ne: valueId },
    });
    if (existing) {
      throw new AppError(
        400,
        `Giá trị '${payload.value}' đã tồn tại trong thuộc tính này.`
      );
    }
    attributeValue.value = payload.value;
  }

  if (payload.slug) {
    attributeValue.slug = payload.slug;
  } else if (payload.value) {
    attributeValue.slug = generateSlug(payload.value);
  }

  await attributeValue.save();
  return attributeValue;
};

export const deleteAttributeValue = async (
  valueId: string
): Promise<{ message: string }> => {
  const attributeValue = await AttributeValue.findById(valueId);
  if (!attributeValue) {
    throw new AppError(404, "Giá trị thuộc tính không tồn tại.");
  }

  const inUse = await VariantAttribute.countDocuments({ attributeValueId: valueId });
  if (inUse > 0) {
    throw new AppError(
      400,
      `Không thể xóa giá trị này vì đang có ${inUse} biến thể sản phẩm sử dụng.`
    );
  }

  await AttributeValue.findByIdAndDelete(valueId);
  return { message: "Đã xóa giá trị thuộc tính thành công." };
};
