import { body } from "express-validator";

const checkoutCommonRules = [
  body("addressId")
    .optional({ nullable: true })
    .isMongoId()
    .withMessage("addressId không đúng định dạng"),
  body("customerName")
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ min: 2, max: 150 })
    .withMessage("Tên người nhận từ 2 đến 150 ký tự"),
  body("customerPhone")
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ min: 7, max: 20 })
    .withMessage("Số điện thoại không hợp lệ"),
  body("shippingAddress")
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage("Địa chỉ giao hàng từ 5 đến 255 ký tự"),
  body("shippingWard")
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Phường/xã tối đa 100 ký tự"),
  body("shippingDistrict")
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Quận/huyện tối đa 100 ký tự"),
  body("shippingProvince")
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage("Tỉnh/thành tối đa 100 ký tự"),
  body("selectedCartItemIds")
    .optional({ nullable: true })
    .isArray({ min: 1 })
    .withMessage("selectedCartItemIds phải là mảng chứa ít nhất 1 phần tử"),
  body("selectedCartItemIds.*")
    .optional()
    .isMongoId()
    .withMessage("ID mục giỏ hàng không hợp lệ"),
  body("couponCode")
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Mã giảm giá tối đa 50 ký tự"),
  body("shippingFee")
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage("Phí vận chuyển phải là số không âm"),
  body("note")
    .optional({ nullable: true })
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Ghi chú tối đa 1000 ký tự"),
];

export const checkoutPreviewValidator = [...checkoutCommonRules];

export const checkoutValidator = [
  ...checkoutCommonRules,
  body("paymentMethod")
    .notEmpty()
    .withMessage("Phương thức thanh toán là bắt buộc")
    .isIn(["COD", "MOMO"])
    .withMessage("Phương thức thanh toán không hợp lệ"),
];
