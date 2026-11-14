
/**
 * FILE: BACK_END/src/validators/admin/admin.review.validator.ts
 *
 * NHIỆM VỤ:
 * - Validate query danh sách đánh giá.
 * - Validate ID đánh giá.
 * - Validate trạng thái duyệt đánh giá.
 * - Trả lỗi validation thống nhất.
 */

import {
    param,
    query,
    body,
    validationResult,
} from "express-validator";

import type {
    Request,
    Response,
    NextFunction,
} from "express";

export const getAdminReviewsValidator = [
    query("keyword")
        .optional()
        .isString()
        .withMessage("Từ khóa tìm kiếm phải là chuỗi.")
        .bail()
        .trim()
        .isLength({ max: 100 })
        .withMessage("Từ khóa không được vượt quá 100 ký tự."),

    query("rating")
        .optional()
        .isInt({ min: 1, max: 5 })
        .withMessage("Điểm đánh giá phải từ 1 đến 5."),

    query("isApproved")
        .optional()
        .isBoolean()
        .withMessage("Trạng thái duyệt không hợp lệ."),

    query("isVerifiedPurchase")
        .optional()
        .isBoolean()
        .withMessage("Trạng thái mua hàng không hợp lệ."),

    query("page")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Page phải là số nguyên lớn hơn hoặc bằng 1."),

    query("limit")
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage("Limit phải nằm trong khoảng 1 đến 100."),

    query("sortBy")
        .optional()
        .isIn(["createdAt", "rating"])
        .withMessage("Trường sắp xếp không hợp lệ."),

    query("sortOrder")
        .optional()
        .isIn(["asc", "desc"])
        .withMessage("SortOrder chỉ được là asc hoặc desc."),
];

export const adminReviewIdValidator = [
    param("id")
        .isMongoId()
        .withMessage("ID đánh giá không đúng định dạng MongoDB."),
];

export const updateAdminReviewApprovalValidator = [
    ...adminReviewIdValidator,

    body("isApproved")
        .exists()
        .withMessage("Vui lòng cung cấp trạng thái duyệt.")
        .bail()
        .isBoolean()
        .withMessage("isApproved phải là true hoặc false."),
];

export const validateAdminReviewRequest = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        res.status(400).json({
            success: false,
            message: "Dữ liệu yêu cầu không hợp lệ.",
            errors: errors.array().map((error) => ({
                field: error.type === "field" ? error.path : undefined,
                message: error.msg,
            })),
        });

        return;
    }

    next();
};
