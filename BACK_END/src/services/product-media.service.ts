import ProductMedia from "../models/ProductMedia.model";
import Product from "../models/Product.model";
import { AppError } from "../utils/appError";

interface MediaPayload {
  mediaType: "image" | "video";
  mediaUrl: string;
  altText?: string | null;
  sortOrder?: number;
  isPrimary?: boolean;
}

export const getMediaByProduct = async (productId: string) => {
  return ProductMedia.find({ productId }).sort({
    isPrimary: -1,
    sortOrder: 1,
    createdAt: 1,
  });
};

export const createMedia = async (productId: string, payload: MediaPayload) => {
  const product = await Product.findById(productId);
  if (!product) throw new AppError(404, "Sản phẩm không tồn tại.");

  const currentCount = await ProductMedia.countDocuments({ productId });

  let isPrimary = payload.isPrimary ?? false;
  if (currentCount === 0 && payload.mediaType === "image") {
    isPrimary = true;
  }

  if (isPrimary) {
    await ProductMedia.updateMany({ productId }, { isPrimary: false });
  }

  return ProductMedia.create({
    productId,
    mediaType: payload.mediaType,
    mediaUrl: payload.mediaUrl,
    altText: payload.altText || null,
    sortOrder: payload.sortOrder || currentCount,
    isPrimary,
  });
};

export const createBatchMedia = async (
  productId: string,
  mediaList: MediaPayload[]
) => {
  const product = await Product.findById(productId);
  if (!product) throw new AppError(404, "Sản phẩm không tồn tại.");

  const currentCount = await ProductMedia.countDocuments({ productId });
  const hasPrimaryInBatch = mediaList.some((media) => media.isPrimary);

  if (hasPrimaryInBatch) {
    await ProductMedia.updateMany({ productId }, { isPrimary: false });
  }

  const docs = mediaList.map((media, index) => ({
    productId,
    mediaType: media.mediaType,
    mediaUrl: media.mediaUrl,
    altText: media.altText || null,
    sortOrder: media.sortOrder !== undefined ? media.sortOrder : currentCount + index,
    isPrimary:
      media.isPrimary ??
      (currentCount === 0 && index === 0 && media.mediaType === "image"),
  }));

  return ProductMedia.insertMany(docs);
};

export const updateMedia = async (
  id: string,
  payload: {
    altText?: string | null;
    sortOrder?: number;
    isPrimary?: boolean;
  }
) => {
  const media = await ProductMedia.findById(id);
  if (!media) throw new AppError(404, "Media không tồn tại.");

  if (payload.isPrimary === true && !media.isPrimary) {
    await ProductMedia.updateMany(
      { productId: media.productId },
      { isPrimary: false }
    );
    media.isPrimary = true;
  } else if (payload.isPrimary === false && media.isPrimary) {
    media.isPrimary = false;
  }

  if (payload.altText !== undefined) media.altText = payload.altText;
  if (payload.sortOrder !== undefined) media.sortOrder = payload.sortOrder;

  await media.save();

  return media;
};

export const setPrimaryMedia = async (id: string) => {
  const media = await ProductMedia.findById(id);
  if (!media) throw new AppError(404, "Media không tồn tại.");

  if (media.mediaType !== "image") {
    throw new AppError(400, "Chỉ có thể đặt hình ảnh làm ảnh chính (Primary).");
  }

  await ProductMedia.updateMany(
    { productId: media.productId },
    { isPrimary: false }
  );

  media.isPrimary = true;
  await media.save();

  return media;
};

export const updateMediaSortOrder = async (
  productId: string,
  sortOrders: Array<{ id: string; sortOrder: number }>
) => {
  const updates = sortOrders.map((item) =>
    ProductMedia.updateOne(
      { _id: item.id, productId },
      { sortOrder: item.sortOrder }
    )
  );

  await Promise.all(updates);

  return { message: "Cập nhật thứ tự hiển thị media thành công." };
};

export const deleteMedia = async (id: string) => {
  const media = await ProductMedia.findById(id);
  if (!media) throw new AppError(404, "Media không tồn tại.");

  const { productId, isPrimary } = media;
  await ProductMedia.findByIdAndDelete(id);

  if (isPrimary) {
    const nextMedia = await ProductMedia.findOne({
      productId,
      mediaType: "image",
    }).sort({ sortOrder: 1, createdAt: 1 });

    if (nextMedia) {
      nextMedia.isPrimary = true;
      await nextMedia.save();
    }
  }

  return { message: "Đã xóa media thành công." };
};

export const deleteBatchMedia = async (
  productId: string,
  mediaIds: string[]
) => {
  await ProductMedia.deleteMany({
    _id: { $in: mediaIds },
    productId,
  });

  const hasPrimary = await ProductMedia.exists({ productId, isPrimary: true });
  if (!hasPrimary) {
    const nextMedia = await ProductMedia.findOne({
      productId,
      mediaType: "image",
    }).sort({ sortOrder: 1 });

    if (nextMedia) {
      nextMedia.isPrimary = true;
      await nextMedia.save();
    }
  }

  return { message: "Đã xóa danh sách media thành công." };
};
