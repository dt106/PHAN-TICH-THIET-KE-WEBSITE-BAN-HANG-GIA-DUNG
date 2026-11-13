
/**
 * FILE: BACK_END/src/controllers/admin/admin.review.controller.ts
 *
 * NHIỆM VỤ:
 * - Nhận request từ routes.
 * - Chuyển đổi query và body.
 * - Gọi service xử lý nghiệp vụ.
 * - Trả response JSON thống nhất.
 */

import type {
    Request,
    Response,
    NextFunction,
} from "express";

import {
    getAdminReviewsService,
    getAdminReviewByIdService,
    updateAdminReviewApprovalService,
    deleteAdminReviewService,
} from "../../services/admin/admin.review.service";

type ReviewSortField = "createdAt" | "rating";
type SortOrder = "asc" | "desc";

const getQueryString = (
    value: unknown
): string | undefined => {
    return typeof value === "string" ? value.trim() : undefined;
};

const getQueryNumber = (
    value: unknown
): number | undefined => {
    if (typeof value !== "string") return undefined;

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
};

const getQueryBoolean = (
    value: unknown
): boolean | undefined => {
    if (value === "true") return true;
    if (value === "false") return false;
    return undefined;
};

/**
 * GET /api/admin/reviews
 */
export const getAdminReviews = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const data = await getAdminReviewsService({
            keyword: getQueryString(req.query.keyword),
            rating: getQueryNumber(req.query.rating),
            isApproved: getQueryBoolean(req.query.isApproved),
            isVerifiedPurchase: getQueryBoolean(
                req.query.isVerifiedPurchase
            ),
            page: getQueryNumber(req.query.page) ?? 1,
            limit: getQueryNumber(req.query.limit) ?? 10,
            sortBy: getQueryString(req.query.sortBy) as
                | ReviewSortField
                | undefined,
            sortOrder: getQueryString(req.query.sortOrder) as
                | SortOrder
                | undefined,
        });

        res.status(200).json({
            success: true,
            message: "Lấy danh sách đánh giá thành công.",
            data: data.reviews,
            pagination: data.pagination,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/admin/reviews/:id
 */
export const getAdminReviewById = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const reviewId = req.params.id;

        if (typeof reviewId !== "string") {
            res.status(400).json({
                success: false,
                message: "ID đánh giá không hợp lệ.",
            });
            return;
        }

        const review = await getAdminReviewByIdService(reviewId);

        if (!review) {
            res.status(404).json({
                success: false,
                message: "Không tìm thấy đánh giá.",
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: "Lấy chi tiết đánh giá thành công.",
            data: review,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * PATCH /api/admin/reviews/:id/approval
 */
export const updateAdminReviewApproval = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const reviewId = req.params.id;

        if (typeof reviewId !== "string") {
            res.status(400).json({
                success: false,
                message: "ID đánh giá không hợp lệ.",
            });
            return;
        }

        const isApproved = req.body.isApproved as boolean;

        const review = await updateAdminReviewApprovalService(
            reviewId,
            isApproved
        );

        if (!review) {
            res.status(404).json({
                success: false,
                message: "Không tìm thấy đánh giá.",
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: isApproved
                ? "Duyệt đánh giá thành công."
                : "Ẩn đánh giá thành công.",
            data: review,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * DELETE /api/admin/reviews/:id
 */
export const deleteAdminReview = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const reviewId = req.params.id;

        if (typeof reviewId !== "string") {
            res.status(400).json({
                success: false,
                message: "ID đánh giá không hợp lệ.",
            });
            return;
        }

        const result = await deleteAdminReviewService(reviewId);

        if (!result) {
            res.status(404).json({
                success: false,
                message: "Không tìm thấy đánh giá.",
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: "Xóa đánh giá thành công.",
            data: result,
        });
    } catch (error) {
        next(error);
    }
};
