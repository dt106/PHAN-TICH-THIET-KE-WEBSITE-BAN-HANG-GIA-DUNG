
/**
 * FILE: BACK_END/src/services/admin/admin.review.service.ts
 *
 * NHIỆM VỤ:
 * - Lấy danh sách đánh giá có tìm kiếm, lọc và phân trang.
 * - Lấy chi tiết một đánh giá.
 * - Duyệt hoặc ẩn đánh giá.
 * - Xóa đánh giá.
 * - Đồng bộ averageRating và totalReviews của sản phẩm.
 */

import { Types } from "mongoose";

import { AppError } from "../../utils/appError";
import { Product, ProductReview, User } from "../../models";

type ReviewSortField = "createdAt" | "rating";
type SortOrder = "asc" | "desc";

interface GetAdminReviewsParams {
    keyword?: string;
    rating?: number;
    isApproved?: boolean;
    isVerifiedPurchase?: boolean;
    page?: number;
    limit?: number;
    sortBy?: ReviewSortField;
    sortOrder?: SortOrder;
}

const escapeRegex = (value: string): string =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizePositiveInteger = (
    value: number | undefined,
    defaultValue: number,
    maxValue?: number
): number => {
    if (
        value === undefined ||
        !Number.isFinite(value) ||
        !Number.isInteger(value) ||
        value < 1
    ) {
        return defaultValue;
    }

    return maxValue === undefined
        ? value
        : Math.min(value, maxValue);
};

/**
 * Tính lại điểm trung bình và tổng số đánh giá đã duyệt
 * của một sản phẩm.
 */
const syncProductReviewStatistics = async (
    productId: Types.ObjectId
): Promise<void> => {
    const [statistics] = await ProductReview.aggregate<{
        totalReviews: number;
        averageRating: number;
    }>([
        {
            $match: {
                productId,
                isApproved: true,
            },
        },
        {
            $group: {
                _id: "$productId",
                totalReviews: { $sum: 1 },
                averageRating: { $avg: "$rating" },
            },
        },
    ]);

    const totalReviews = statistics?.totalReviews ?? 0;
    const averageRating = statistics
        ? Math.round(statistics.averageRating * 100) / 100
        : 0;

    await Product.updateOne(
        { _id: productId },
        {
            $set: {
                totalReviews,
                averageRating,
            },
        }
    );
};

/**
 * LẤY DANH SÁCH ĐÁNH GIÁ
 *
 * GET /api/admin/reviews
 */
export const getAdminReviewsService = async (
    params: GetAdminReviewsParams
) => {
    const {
        keyword,
        rating,
        isApproved,
        isVerifiedPurchase,
        sortBy = "createdAt",
        sortOrder = "desc",
    } = params;

    const page = normalizePositiveInteger(params.page, 1);
    const limit = normalizePositiveInteger(params.limit, 10, 100);

    const filter: Record<string, unknown> = {};

    if (rating !== undefined) {
        filter.rating = rating;
    }

    if (isApproved !== undefined) {
        filter.isApproved = isApproved;
    }

    if (isVerifiedPurchase !== undefined) {
        filter.isVerifiedPurchase = isVerifiedPurchase;
    }

    const normalizedKeyword = keyword?.trim();

    if (normalizedKeyword) {
        const regex = new RegExp(escapeRegex(normalizedKeyword), "i");

        const [products, users] = await Promise.all([
            Product.find({ name: regex }).select("_id").lean(),
            User.find({
                role: "customer",
                $or: [
                    { name: regex },
                    { email: regex },
                ],
            })
                .select("_id")
                .lean(),
        ]);

        const productIds = products.map((item) => item._id);
        const userIds = users.map((item) => item._id);

        filter.$or = [
            { title: regex },
            { content: regex },
            ...(productIds.length > 0
                ? [{ productId: { $in: productIds } }]
                : []),
            ...(userIds.length > 0
                ? [{ userId: { $in: userIds } }]
                : []),
        ];
    }

    const safeSortBy: ReviewSortField =
        sortBy === "rating" ? "rating" : "createdAt";

    const sortDirection = sortOrder === "asc" ? 1 : -1;
    const skip = (page - 1) * limit;

    const [reviews, totalReviews] = await Promise.all([
        ProductReview.find(filter)
            .populate("productId", "name slug")
            .populate("userId", "name email avatar")
            .populate("orderId", "_id")
            .sort({ [safeSortBy]: sortDirection })
            .skip(skip)
            .limit(limit)
            .lean(),

        ProductReview.countDocuments(filter),
    ]);

    return {
        reviews,
        pagination: {
            page,
            limit,
            total: totalReviews,
            totalPages: Math.ceil(totalReviews / limit),
        },
    };
};

/**
 * LẤY CHI TIẾT ĐÁNH GIÁ
 *
 * GET /api/admin/reviews/:id
 */
export const getAdminReviewByIdService = async (
    reviewId: string
) => {
    if (!Types.ObjectId.isValid(reviewId)) {
        return null;
    }

    return ProductReview.findById(reviewId)
        .populate("productId", "name slug")
        .populate("userId", "name email phone avatar")
        .populate("orderId", "_id")
        .lean();
};

/**
 * DUYỆT HOẶC ẨN ĐÁNH GIÁ
 *
 * PATCH /api/admin/reviews/:id/approval
 */
export const updateAdminReviewApprovalService = async (
    reviewId: string,
    isApproved: boolean
) => {
    if (!Types.ObjectId.isValid(reviewId)) {
        return null;
    }

    if (typeof isApproved !== "boolean") {
        throw new AppError(400, "Trạng thái duyệt đánh giá không hợp lệ.");
    }

    const review = await ProductReview.findByIdAndUpdate(
        reviewId,
        {
            $set: { isApproved },
        },
        {
            new: true,
            runValidators: true,
        }
    );

    if (!review) {
        return null;
    }

    await syncProductReviewStatistics(review.productId);

    return ProductReview.findById(reviewId)
        .populate("productId", "name slug")
        .populate("userId", "name email avatar")
        .lean();
};

/**
 * XÓA ĐÁNH GIÁ
 *
 * DELETE /api/admin/reviews/:id
 */
export const deleteAdminReviewService = async (
    reviewId: string
) => {
    if (!Types.ObjectId.isValid(reviewId)) {
        return null;
    }

    const review = await ProductReview.findById(reviewId);

    if (!review) {
        return null;
    }

    const productId = review.productId;

    await ProductReview.deleteOne({ _id: review._id });

    await syncProductReviewStatistics(productId);

    return {
        _id: review._id,
        productId,
    };
};
