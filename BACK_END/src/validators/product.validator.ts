import { body, param, query } from "express-validator";

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const productIdParamValidator = [
  param("id").isMongoId().withMessage("ID sản phẩm không hợp lệ"),
];

export const productSlugParamValidator = [
  param("slug")
    .trim()
    .notEmpty()
    .withMessage("Slug sản phẩm không được để trống"),
];

export const featuredProductsQueryValidator = [
  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("limit từ 1 đến 50"),
];

const validateSalePriceNotGreaterThanBasePrice = (
  value: any,
  { req }: { req: any }
): boolean => {
  if (value === null || value === undefined) {
    return true;
  }

  const basePrice = req.body?.basePrice;
  if (basePrice !== undefined && Number(value) > Number(basePrice)) {
    throw new Error("Giá khuyến mãi không được lớn hơn giá gốc");
  }

  return true;
};

export const createProductValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Tên sản phẩm không được để trống")
    .isLength({ max: 255 })
    .withMessage("Tên sản phẩm không được vượt quá 255 ký tự"),
  body("sku")
    .trim()
    .notEmpty()
    .withMessage("Mã SKU không được để trống")
    .isLength({ max: 100 })
    .withMessage("Mã SKU không được vượt quá 100 ký tự"),
  body("categoryId").isMongoId().withMessage("Danh mục categoryId không hợp lệ"),
  body("brandId")
    .optional({ nullable: true })
    .isMongoId()
    .withMessage("Thương hiệu brandId không hợp lệ"),
  body("basePrice")
    .isFloat({ min: 0 })
    .withMessage("Giá gốc basePrice phải là số không âm")
    .toFloat(),
  body("salePrice")
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage("Giá khuyến mãi salePrice phải là số không âm")
    .toFloat()
    .custom(validateSalePriceNotGreaterThanBasePrice),
  body("slug")
    .optional()
    .trim()
    .matches(SLUG_REGEX)
    .withMessage("Slug chỉ bao gồm chữ thường, số và dấu gạch ngang"),
  body("description").optional({ nullable: true }).trim(),
  body("metaTitle")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage("metaTitle không được vượt quá 255 ký tự"),
  body("metaDescription").optional({ nullable: true }).trim(),
  body("isFeatured")
    .optional()
    .isBoolean()
    .withMessage("isFeatured phải là giá trị boolean")
    .toBoolean(),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive phải là giá trị boolean")
    .toBoolean(),
];

export const updateProductValidator = [
  ...productIdParamValidator,
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Tên sản phẩm không được để trống nếu truyền")
    .isLength({ max: 255 })
    .withMessage("Tên sản phẩm không được vượt quá 255 ký tự"),
  body("sku")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Mã SKU không được để trống nếu truyền")
    .isLength({ max: 100 })
    .withMessage("Mã SKU không được vượt quá 100 ký tự"),
  body("categoryId")
    .optional()
    .isMongoId()
    .withMessage("Danh mục categoryId không hợp lệ"),
  body("brandId")
    .optional({ nullable: true })
    .isMongoId()
    .withMessage("Thương hiệu brandId không hợp lệ"),
  body("basePrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Giá gốc basePrice phải là số không âm")
    .toFloat(),
  body("salePrice")
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage("Giá khuyến mãi salePrice phải là số không âm")
    .toFloat()
    .custom(validateSalePriceNotGreaterThanBasePrice),
  body("slug")
    .optional()
    .trim()
    .matches(SLUG_REGEX)
    .withMessage("Slug chỉ bao gồm chữ thường, số và dấu gạch ngang"),
  body("description").optional({ nullable: true }).trim(),
  body("metaTitle")
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage("metaTitle không được vượt quá 255 ký tự"),
  body("metaDescription").optional({ nullable: true }).trim(),
  body("isFeatured")
    .optional()
    .isBoolean()
    .withMessage("isFeatured phải là giá trị boolean")
    .toBoolean(),
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive phải là giá trị boolean")
    .toBoolean(),
];

export const toggleProductStatusValidator = [
  ...productIdParamValidator,
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive phải là giá trị boolean")
    .toBoolean(),
];

export const toggleProductFeaturedValidator = [
  ...productIdParamValidator,
  body("isFeatured")
    .optional()
    .isBoolean()
    .withMessage("isFeatured phải là giá trị boolean")
    .toBoolean(),
];

export const queryProductValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page phải là số nguyên >= 1")
    .toInt(),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("limit phải là số nguyên trong khoảng 1 - 100")
    .toInt(),
  query("categoryId")
    .optional()
    .isMongoId()
    .withMessage("categoryId không hợp lệ"),
  query("brandId").optional().isMongoId().withMessage("brandId không hợp lệ"),
  query("minPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("minPrice phải là số không âm")
    .toFloat(),
  query("maxPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("maxPrice phải là số không âm")
    .toFloat(),
  query("isFeatured")
    .optional()
    .isBoolean()
    .withMessage("isFeatured phải là giá trị boolean")
    .toBoolean(),
  query("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive phải là giá trị boolean")
    .toBoolean(),
  query("search").optional().trim(),
  query("sort")
    .optional()
    .isIn(["newest", "price_asc", "price_desc", "sales", "rating"])
    .withMessage(
      "sort chỉ chấp nhận: newest, price_asc, price_desc, sales, rating"
    ),
];
