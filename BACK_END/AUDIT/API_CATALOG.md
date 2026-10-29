# DANH MỤC API — PHASE 1 AUDIT

> **CẬP NHẬT 2026-10-24 (chuẩn hóa lỗi + vệ sinh):** toàn bộ API non-auth/AI-chat đã đồng nhất **một quy tắc xử lý lỗi**: service ném `AppError(statusCode, message)` (`src/utils/appError.ts`) → `error.middleware.ts` trả `{success:false, message}` với đúng status (kèm map ValidationError/CastError/E11000 → 400). Controller chỉ `next(error)`. Thay đổi mã lỗi theo ngữ nghĩa: truy cập tài nguyên người khác hoặc không tồn tại → **404** (trước là 400 cứng — cross-user cart/wishlist, mã coupon không tồn tại, sản phẩm inactive khi thêm wishlist); các quy tắc nghiệp vụ (hết hạn, vượt tồn kho, trùng mã) vẫn **400**. Guard admin/customer tự viết trong 3 route file đã thay bằng `roleMiddleware`. `GET /api/products/featured` nay có validator `limit` 1–50. Gateway IPN (vnpay/momo/zalopay) giữ nguyên protocol riêng (luôn HTTP 200).
> **CẬP NHẬT 2026-10-22 (refactor sau audit):** đã đồng nhất quy ước — mọi API admin nằm dưới prefix **`/api/admin`**. Các path cũ `/api/brands/admin*`, `/api/categories/admin*`, `/api/attributes/admin*`, `/api/products/admin*`, `/api/coupons/admin*` **đã gỡ bỏ** và thay bằng `/api/admin/<resource>/*` (5 file mới `src/routes/admin/admin.<resource>.routes.ts`). Đã verify runtime 18/18 PASS (path mới chặn 401 đúng, path cũ trả 404, public nguyên vẹn, `/all` không bị `/:id` nuốt). 8 test script đã cập nhật theo. Danh mục dưới đây phản ánh path mới.

> Nguồn: đọc trực tiếp toàn bộ route files + `app.ts` của BACK_END (ngày 2026-10-22).
> Mọi dòng đều VERIFIED từ source. Không có endpoint nào bị suy diễn từ tên file.
>
> Quy ước cột **Auth**: `Public` = không cần JWT · `User` = JWT role `customer` (hoặc mọi user đã đăng nhập) · `Admin` = JWT role `admin` · `Admin*` = JWT + guard `requireAdmin` định nghĩa nội bộ trong route file.
>
> Quy ước cột **Xác minh**: `V` = VERIFIED (đọc code đầy đủ) · `V/T` = VERIFIED code + có test script/EVIDENCE chạy qua · `V/M` = VERIFIED code, chỉ test trong môi trường mock.

Prefix mount gốc nằm trong `BACK_END/app.ts` (dòng 82–201). Tổng cộng **119 endpoint** (118 API + 1 health check).

---

## 0. Health check

| # | Method | Path | Auth | Controller | Service | Validator | Entity | Xác minh |
|---|--------|------|------|-----------|---------|-----------|--------|----------|
| 1 | GET | `/` | Public | inline `app.ts:82` | — | — | — | V |

## 1. Customer Auth — `/api/customer` (`src/routes/customer.routes.ts`)

| # | Method | Path | Auth | Controller | Service | Validator | Entity | Xác minh |
|---|--------|------|------|-----------|---------|-----------|--------|----------|
| 1 | POST | `/register/request-otp` | Public | `customerRequestRegisterOtp` | `customer.service` → `otp.service.sendOtp` (type `register`) | `customerRequestRegisterOtpValidator` | User (check trùng email), OTP (RAM) | V |
| 2 | POST | `/register/verify-otp` | Public | `customerVerifyRegisterOtp` | `otp.service.verifyOtpService` | `customerVerifyRegisterOtpValidator` | OTP (RAM) | V |
| 3 | POST | `/register` | Public | `customerRegister` | `customerRegisterService` (bcrypt 12, tạo JWT) | `customerRegisterValidator` | User | V |
| 4 | POST | `/login` | Public | `customerLogin` | `customerLoginService` | `customerLoginValidator` | User | V |
| 5 | POST | `/forgot-password` | Public | `customerForgotPassword` | `customerForgotPasswordService` → OTP `reset_password` | `customerForgotPasswordValidator` | User, OTP (RAM) | V |
| 6 | POST | `/reset-password` | Public | `customerResetPassword` | `customerResetPasswordService` | `customerResetPasswordValidator` | User, OTP | V |
| 7 | GET | `/me` | User | `customerGetCurrentUser` | `customerGetCurrentUserService` | — | User | V |
| 8 | POST | `/change-password` | User | `customerChangePassword` | `customerChangePasswordService` | `customerChangePasswordValidator` | User | V |
| 9 | PATCH | `/profile` | User | `customerUpdateProfile` | `uploadImageService` (Cloudinary) + `customerUpdateProfileService` | `customerUpdateProfileValidator` + multer `single("avatar")` | User | V |
| 10 | POST | `/logout` | User | `customerLogout` | — (stateless) | — | — | V |

## 2. Admin Auth — `/api/admin` (`src/routes/admin.routes.ts`)

| # | Method | Path | Auth | Controller | Service | Validator | Entity | Xác minh |
|---|--------|------|------|-----------|---------|-----------|--------|----------|
| 1 | POST | `/login` | Public | `adminLogin` | `adminLoginService` | `adminLoginValidator` | User (role admin) | V |
| 2 | POST | `/forgot-password` | Public | `adminForgotPassword` | `adminForgotPasswordService` | `adminForgotPasswordValidator` | User, OTP | V |
| 3 | POST | `/reset-password` | Public | `adminResetPassword` | `adminResetPasswordService` | `adminResetPasswordValidator` | User, OTP | V |
| 4 | POST | `/change-password` | Admin | `adminChangePassword` | `adminChangePasswordService` | `adminChangePasswordValidator` | User | V |
| 5 | GET | `/me` | Admin | `adminGetCurrentUser` | `adminGetCurrentUserService` | — | User | V |
| 6 | POST | `/change-email/request-otp` | Admin | `adminRequestChangeEmail` | `adminRequestChangeEmailService` → OTP `change_email` (gửi tới email MỚI, bind userId) | `adminRequestChangeEmailValidator` | User, OTP | V |
| 7 | POST | `/change-email/verify` | Admin | `adminVerifyChangeEmail` | `adminVerifyChangeEmailService` | `adminVerifyChangeEmailValidator` | User, OTP | V |
| 8 | PATCH | `/profile` | Admin | `adminUpdateProfile` | `uploadImageService` (Cloudinary) + `adminUpdateProfileService` | `adminUpdateProfileValidator` + multer | User | V |
| 9 | POST | `/logout` | Admin | `adminLogout` | — | — | — | V |

## 3. Admin quản lý khách hàng — `/api/admin/customers` (`src/routes/admin/admin.customer.routes.ts`)

Toàn router: `router.use(authMiddleware)` + guard `requireAdmin` nội bộ (dòng 40–66).

| # | Method | Path | Auth | Controller | Service | Validator | Entity | Xác minh |
|---|--------|------|------|-----------|---------|-----------|--------|----------|
| 1 | GET | `/` | Admin* | `getAdminCustomers` | `getAdminCustomersService` | `getAdminCustomersValidator` | User | V |
| 2 | GET | `/:id` | Admin* | `getAdminCustomerById` | `getAdminCustomerByIdService` | `getAdminCustomerByIdValidator` | User | V |
| 3 | PATCH | `/:id/status` | Admin* | `updateAdminCustomerStatus` | `updateAdminCustomerStatusService` (active/inactive/blocked) | `updateAdminCustomerStatusValidator` | User | V |

## 4. Statistics

### 4a. Customer — `/api/customer/statistics` (`src/routes/statistics/customer.statistics.routes.ts`)
Router: `authMiddleware` + guard `requireCustomer` (chặn role admin, dòng 27–55).

| # | Method | Path | Auth | Controller | Service | Entity | Xác minh |
|---|--------|------|------|-----------|---------|--------|----------|
| 1 | GET | `/overview` | User (customer) | `getCustomerStatistics` | `getCustomerStatisticsService` | Order, ProductReview, Wishlist | V |
| 2 | GET | `/orders` | User (customer) | `getCustomerOrderStatistics` | `getCustomerOrderStatisticsService` | Order | V |
| 3 | GET | `/reviews` | User (customer) | `getCustomerReviewStatistics` | `getCustomerReviewStatisticsService` | ProductReview | V |

### 4b. Admin — `/api/admin/statistics` (`src/routes/statistics/admin.statistics.routes.ts`)
Router: `authMiddleware` + guard `requireAdmin`. ⚠️ Mount 2 lần trong `app.ts` (dòng 108–121 và dòng 188).

| # | Method | Path | Auth | Controller | Service | Entity | Xác minh |
|---|--------|------|------|-----------|---------|--------|----------|
| 1 | GET | `/users` | Admin* | `getAdminUserStatistics` | `getAdminUserStatisticsService` | User | V |

## 5. Brand

**Public** — `/api/brands` (`src/routes/brand.routes.ts`):

| # | Method | Path | Auth | Controller | Service | Validator | Entity | Xác minh |
|---|--------|------|------|-----------|---------|-----------|--------|----------|
| 1 | GET | `/` | Public | `getPublicBrands` | `getPublicBrands` (page 1/limit 20) | `queryBrandValidator` | Brand | V/T |
| 2 | GET | `/slug/:slug` | Public | `getPublicBrandBySlug` | `getPublicBrandBySlug` | `brandSlugParamValidator` | Brand | V/T |
| 3 | GET | `/:id` | Public | `getPublicBrandById` | `getPublicBrandById` | `brandIdParamValidator` | Brand | V/T |

**Admin** — `/api/admin/brands` (`src/routes/admin/admin.brand.routes.ts`, `router.use(auth, role("admin"))` áp một lần):

| # | Method | Path | Auth | Controller | Service | Validator | Entity | Xác minh |
|---|--------|------|------|-----------|---------|-----------|--------|----------|
| 4 | GET | `/all` | Admin | `getAdminBrands` | `getAdminBrands` | `queryBrandValidator` | Brand | V/T |
| 5 | POST | `/` | Admin | `createBrand` | `createBrand` | `createBrandValidator` | Brand | V/T |
| 6 | GET | `/:id` | Admin | `getAdminBrandById` | `getAdminBrandById` | `brandIdParamValidator` | Brand | V/T |
| 7 | PUT | `/:id` | Admin | `updateBrand` | `updateBrand` | `updateBrandValidator` | Brand | V/T |
| 8 | PATCH | `/:id/status` | Admin | `toggleBrandStatus` | `toggleBrandStatus` | `toggleBrandStatusValidator` | Brand | V/T |
| 9 | DELETE | `/:id` | Admin | `deleteBrand` | `deleteBrand` (chặn khi còn Product) | `brandIdParamValidator` | Brand, Product | V/T |

> Path cũ đã gỡ: `/api/brands/admin`, `/api/brands/admin/all`, `/api/brands/admin/:id`, `/api/brands/admin/:id/status`.

## 6. Category

**Public** — `/api/categories` (`src/routes/category.routes.ts`):

| # | Method | Path | Auth | Controller | Service | Validator | Entity | Xác minh |
|---|--------|------|------|-----------|---------|-----------|--------|----------|
| 1 | GET | `/` | Public | `getPublicCategories` | `getPublicCategories` (page 1/limit 50) | `queryCategoryValidator` | Category | V/T |
| 2 | GET | `/tree` | Public | `getPublicCategoryTree` | `getPublicCategoryTree` | — (không validator) | Category | V/T |
| 3 | GET | `/slug/:slug` | Public | `getPublicCategoryBySlug` | `getPublicCategoryBySlug` | `categorySlugParamValidator` | Category | V/T |
| 4 | GET | `/:id` | Public | `getPublicCategoryById` | `getPublicCategoryById` | `categoryIdParamValidator` | Category | V/T |

**Admin** — `/api/admin/categories` (`src/routes/admin/admin.category.routes.ts`):

| # | Method | Path | Auth | Controller | Service | Validator | Entity | Xác minh |
|---|--------|------|------|-----------|---------|-----------|--------|----------|
| 5 | GET | `/all` | Admin | `getAdminCategories` | `getAdminCategories` | `queryCategoryValidator` | Category | V/T |
| 6 | POST | `/` | Admin | `createCategory` | `createCategory` (chống vòng lặp cha–con) | `createCategoryValidator` | Category | V/T |
| 7 | PUT | `/sort-order` | Admin | `updateSortOrder` | `updateSortOrder` (bulkWrite) | `updateSortOrderValidator` | Category | V/T |
| 8 | GET | `/:id` | Admin | `getAdminCategoryById` | `getAdminCategoryById` | `categoryIdParamValidator` | Category | V/T |
| 9 | PUT | `/:id` | Admin | `updateCategory` | `updateCategory` | `updateCategoryValidator` | Category | V/T |
| 10 | PATCH | `/:id/status` | Admin | `toggleCategoryStatus` | `toggleCategoryStatus` | `toggleCategoryStatusValidator` | Category | V/T |
| 11 | DELETE | `/:id` | Admin | `deleteCategory` | `deleteCategory` (chặn khi có con / có Product) | `categoryIdParamValidator` | Category, Product | V/T |

> Path cũ đã gỡ: `/api/categories/admin`, `/api/categories/admin/all`, `/api/categories/admin/sort-order`, `/api/categories/admin/:id`, `/api/categories/admin/:id/status`.

## 7. Attribute

**Public** — `/api/attributes` (`src/routes/attribute.routes.ts`):

| # | Method | Path | Auth | Controller | Service | Validator | Entity | Xác minh |
|---|--------|------|------|-----------|---------|-----------|--------|----------|
| 1 | GET | `/` | Public | `getAllAttributes` | `getAllAttributesWithValues` | — | Attribute, AttributeValue | V/T |
| 2 | GET | `/:id` | Public | `getAttributeById` | `getAttributeById` | `attributeIdParamValidator` | Attribute, AttributeValue | V/T |

**Admin** — `/api/admin/attributes` (`src/routes/admin/admin.attribute.routes.ts`):

| # | Method | Path | Auth | Controller | Service | Validator | Entity | Xác minh |
|---|--------|------|------|-----------|---------|-----------|--------|----------|
| 3 | POST | `/` | Admin | `createAttribute` | `createAttribute` | `createAttributeValidator` | Attribute | V/T |
| 4 | PUT | `/:id` | Admin | `updateAttribute` | `updateAttribute` | `updateAttributeValidator` | Attribute | V/T |
| 5 | DELETE | `/:id` | Admin | `deleteAttribute` | `deleteAttribute` (chặn khi VariantAttribute dùng; cascade AttributeValue) | `attributeIdParamValidator` | Attribute, AttributeValue, VariantAttribute | V/T |
| 6 | POST | `/:id/values` | Admin | `createAttributeValue` | `createAttributeValue` | `createAttributeValueValidator` | AttributeValue | V/T |
| 7 | PUT | `/values/:valueId` | Admin | `updateAttributeValue` | `updateAttributeValue` | `updateAttributeValueValidator` | AttributeValue | V/T |
| 8 | DELETE | `/values/:valueId` | Admin | `deleteAttributeValue` | `deleteAttributeValue` (chặn khi VariantAttribute dùng) | `attributeValueIdParamValidator` | AttributeValue, VariantAttribute | V/T |

> Path cũ đã gỡ: `/api/attributes/admin`, `/api/attributes/admin/:id`, `/api/attributes/admin/:id/values`, `/api/attributes/admin/values/:valueId`.

## 8. Product

**Public** — `/api/products` (`src/routes/product.routes.ts`):

| # | Method | Path | Auth | Controller | Service | Validator | Entity | Xác minh |
|---|--------|------|------|-----------|---------|-----------|--------|----------|
| 1 | GET | `/` | Public | `getPublicProducts` | `getPublicProducts` (page 1/limit 20) | `queryProductValidator` | Product, Category, Brand | V/T |
| 2 | GET | `/featured` | Public | `getFeaturedProducts` | `getFeaturedProducts` (limit 8) | — | Product | V/T |
| 3 | GET | `/related/:id` | Public | `getRelatedProducts` | `getRelatedProducts` (limit 4) | `productIdParamValidator` | Product | V/T |
| 4 | GET | `/slug/:slug` | Public | `getPublicProductBySlug` | `getPublicProductDetail({slug})` | `productSlugParamValidator` | Product, ProductMedia, ProductVariant | V/T |
| 5 | GET | `/:id` | Public | `getPublicProductDetail` | `getPublicProductDetail({id})` | `productIdParamValidator` | Product, ProductMedia, ProductVariant | V/T |

**Admin** — `/api/admin/products` (`src/routes/admin/admin.product.routes.ts`):

| # | Method | Path | Auth | Controller | Service | Validator | Entity | Xác minh |
|---|--------|------|------|-----------|---------|-----------|--------|----------|
| 6 | GET | `/all` | Admin | `getAdminProducts` | `getAdminProducts` (+stats) | `queryProductValidator` | Product | V/T |
| 7 | POST | `/` | Admin | `createProduct` | `createProduct` (salePrice ≤ basePrice) | `createProductValidator` | Product | V/T |
| 8 | GET | `/:id` | Admin | `getAdminProductById` | `getAdminProductById` | `productIdParamValidator` | Product | V/T |
| 9 | PUT | `/:id` | Admin | `updateProduct` | `updateProduct` | `updateProductValidator` | Product | V/T |
| 10 | PATCH | `/:id/status` | Admin | `toggleProductStatus` | `toggleProductStatus` | `toggleProductStatusValidator` | Product | V/T |
| 11 | PATCH | `/:id/featured` | Admin | `toggleProductFeatured` | `toggleProductFeatured` | `toggleProductFeaturedValidator` | Product | V/T |
| 12 | DELETE | `/:id` | Admin | `deleteProduct` | `deleteProduct` (chặn khi có OrderItem; cascade variant/media) | `productIdParamValidator` | Product, ProductVariant, ProductMedia, VariantAttribute, OrderItem | V/T |

> Path cũ đã gỡ: `/api/products/admin`, `/api/products/admin/all`, `/api/products/admin/:id`, `/api/products/admin/:id/status`, `/api/products/admin/:id/featured`.
> Lưu ý: variant/media của sản phẩm vẫn định tuyến tại `/api/admin/products/:productId/variants` và `/api/admin/products/:productId/media` (mục 9, 10) — hai router này mount tại `/api`, đăng ký trước mount `/api/admin/products` nên không xung đột.

## 9. Product Variant — mount `/api` (`src/routes/product-variant.routes.ts`)

| # | Method | Path | Auth | Controller | Service | Validator | Entity | Xác minh |
|---|--------|------|------|-----------|---------|-----------|--------|----------|
| 1 | GET | `/products/:productId/variants` | Public | `getPublicVariantsByProduct` | `getPublicVariantsByProduct` | `productIdParamValidator` | ProductVariant, VariantAttribute | V/T |
| 2 | GET | `/variants/:id` | Public | `getPublicVariantById` | `getPublicVariantById` | `variantIdParamValidator` | ProductVariant | V/T |
| 3 | GET | `/admin/products/:productId/variants` | Admin | `getAdminVariantsByProduct` | `getAdminVariantsByProduct` | `productIdParamValidator` | ProductVariant | V/T |
| 4 | POST | `/admin/products/:productId/variants` | Admin | `createVariant` | `createVariant` (+sync min/max price) | `createVariantValidator` | ProductVariant, VariantAttribute | V/T |
| 5 | PUT | `/admin/variants/:id` | Admin | `updateVariant` | `updateVariant` (+sync) | `updateVariantValidator` | ProductVariant, VariantAttribute | V/T |
| 6 | PATCH | `/admin/variants/:id/stock` | Admin | `updateVariantStock` | `updateVariantStock` (ghi đè trực tiếp) | `updateStockValidator` | ProductVariant | V/T |
| 7 | PATCH | `/admin/variants/:id/status` | Admin | `toggleVariantStatus` | `toggleVariantStatus` (+sync) | `variantIdParamValidator` | ProductVariant | V/T |
| 8 | DELETE | `/admin/variants/:id` | Admin | `deleteVariant` | `deleteVariant` (chặn khi có OrderItem) | `variantIdParamValidator` | ProductVariant, VariantAttribute, OrderItem | V/T |

## 10. Product Media — mount `/api` (`src/routes/product-media.routes.ts`)

| # | Method | Path | Auth | Controller | Service | Validator | Entity | Xác minh |
|---|--------|------|------|-----------|---------|-----------|--------|----------|
| 1 | GET | `/products/:productId/media` | Public | `getMediaByProduct` | `getMediaByProduct` | `productIdParamValidator` | ProductMedia | V/T |
| 2 | GET | `/admin/products/:productId/media` | Admin | `getMediaByProduct` (dùng lại handler public) | `getMediaByProduct` | `productIdParamValidator` | ProductMedia | V/T |
| 3 | POST | `/admin/products/:productId/media` | Admin | `createMedia` | `createMedia` (JSON URL, không upload file) | `createMediaValidator` | ProductMedia | V/T |
| 4 | POST | `/admin/products/:productId/media/batch` | Admin | `createBatchMedia` | `createBatchMedia` | `createBatchMediaValidator` | ProductMedia | V/T |
| 5 | PUT | `/admin/media/:id` | Admin | `updateMedia` | `updateMedia` | `updateMediaValidator` | ProductMedia | V/T |
| 6 | PATCH | `/admin/media/:id/primary` | Admin | `setPrimaryMedia` | `setPrimaryMedia` (chỉ image được làm primary) | `mediaIdParamValidator` | ProductMedia | V/T |
| 7 | PUT | `/admin/products/:productId/media/sort-order` | Admin | `updateMediaSortOrder` | `updateMediaSortOrder` | `updateSortOrderValidator` | ProductMedia | V/T |
| 8 | DELETE | `/admin/media/:id` | Admin | `deleteMedia` | `deleteMedia` (tự thăng cấp primary mới) | `mediaIdParamValidator` | ProductMedia | V/T |
| 9 | DELETE | `/admin/products/:productId/media` | Admin | `deleteBatchMedia` | `deleteBatchMedia` | `deleteBatchMediaValidator` | ProductMedia | V/T |

## 11. Cart — `/api/cart` (`src/routes/cart.routes.ts`) — toàn router cần JWT

| # | Method | Path | Auth | Controller | Service | Validator | Entity | Xác minh |
|---|--------|------|------|-----------|---------|-----------|--------|----------|
| 1 | GET | `/` | User | `getCart` | `getUserCart` | — | Cart, Product, ProductVariant | V/T |
| 2 | POST | `/` | User | `addToCart` | `addToCart` (check tồn kho, merge cùng biến thể) | `addToCartValidator` | Cart, Product, ProductVariant | V/T |
| 3 | PUT | `/:id` | User | `updateCartItem` | `updateCartItemQuantity` | `updateCartQuantityValidator` | Cart, ProductVariant | V/T |
| 4 | DELETE | `/:id` | User | `removeCartItem` | `removeCartItem` | `cartIdParamValidator` | Cart | V/T |
| 5 | DELETE | `/` | User | `clearCart` | `clearUserCart` | — | Cart | V/T |

## 12. Wishlist — `/api/wishlist` (`src/routes/wishlist.routes.ts`) — toàn router cần JWT

| # | Method | Path | Auth | Controller | Service | Validator | Entity | Xác minh |
|---|--------|------|------|-----------|---------|-----------|--------|----------|
| 1 | GET | `/` | User | `getWishlist` | `getUserWishlist` | — | Wishlist, Product, ProductMedia | V/T |
| 2 | POST | `/` | User | `addToWishlist` | `addToWishlist` (idempotent) | `addToWishlistValidator` | Wishlist, Product | V/T |
| 3 | GET | `/check/:productId` | User | `checkWishlistStatus` | `checkProductInWishlist` | `productIdParamValidator` | Wishlist | V/T |
| 4 | POST | `/:id/move-to-cart` | User | `moveToCart` | `moveWishlistItemToCart` | `moveToCartValidator` | Wishlist, Cart, Product, ProductVariant | V/T |
| 5 | DELETE | `/product/:productId` | User | `removeByProductId` | `removeByProductId` | `productIdParamValidator` | Wishlist | V/T |
| 6 | DELETE | `/:id` | User | `removeFromWishlist` | `removeFromWishlist` | `wishlistIdParamValidator` | Wishlist | V/T |
| 7 | DELETE | `/` | User | `clearWishlist` | `clearUserWishlist` | — | Wishlist | V/T |

## 13. Coupon

**Public + Customer** — `/api/coupons` (`src/routes/coupon.routes.ts`):

| # | Method | Path | Auth | Controller | Service | Validator | Entity | Xác minh |
|---|--------|------|------|-----------|---------|-----------|--------|----------|
| 1 | GET | `/public` | Public | `getPublicCoupons` | `getPublicCoupons` | — | Coupon | V/T |
| 2 | POST | `/check` | User | `checkCoupon` | `validateAndCalculateCoupon` | `checkCouponValidator` | Coupon, CouponUsage | V/T |

**Admin** — `/api/admin/coupons` (`src/routes/admin/admin.coupon.routes.ts`):

| # | Method | Path | Auth | Controller | Service | Validator | Entity | Xác minh |
|---|--------|------|------|-----------|---------|-----------|--------|----------|
| 3 | GET | `/` | Admin | `getAllCouponsAdmin` | `getAllCouponsAdmin` (page 1/limit 10) | `adminCouponsQueryValidator` | Coupon | V/T |
| 4 | GET | `/:id` | Admin | `getCouponByIdAdmin` | `getCouponByIdAdmin` (+tổng discount đã cấp) | `couponIdParamValidator` | Coupon, CouponUsage | V/T |
| 5 | POST | `/` | Admin | `createCoupon` | `createCoupon` | `createCouponValidator` | Coupon | V/T |
| 6 | PUT | `/:id` | Admin | `updateCoupon` | `updateCoupon` | `updateCouponValidator` | Coupon | V/T |
| 7 | PATCH | `/:id/status` | Admin | `toggleCouponStatus` | `toggleCouponStatus` (đảo isActive) | `couponIdParamValidator` | Coupon | V/T |
| 8 | DELETE | `/:id` | Admin | `deleteCoupon` | `deleteCoupon` (chặn khi có CouponUsage) | `couponIdParamValidator` | Coupon, CouponUsage | V/T |
| 9 | GET | `/:id/usages` | Admin | `getCouponUsages` | `getCouponUsages` (page 1/limit 10) | `couponIdParamValidator` | CouponUsage, User, Order | V/T |

> Path cũ đã gỡ: `/api/coupons/admin`, `/api/coupons/admin/:id`, `/api/coupons/admin/:id/status`, `/api/coupons/admin/:id/usages`.

## 14. User Address — `/api/user-addresses` (`src/routes/userAddress.routes.ts`) — toàn router cần JWT

| # | Method | Path | Auth | Controller | Service | Validator | Entity | Xác minh |
|---|--------|------|------|-----------|---------|-----------|--------|----------|
| 1 | GET | `/` | User | `getUserAddresses` | `getUserAddressesService` | — | UserAddress | V |
| 2 | POST | `/` | User | `createUserAddress` | `createUserAddressService` (địa chỉ đầu auto-default) | `validateCreateUserAddress` | UserAddress | V |
| 3 | GET | `/:id` | User | `getUserAddressById` | `getUserAddressByIdService` | `validateAddressId` | UserAddress | V |
| 4 | PATCH | `/:id` | User | `updateUserAddress` | `updateUserAddressService` | `validateUpdateUserAddress` | UserAddress | V |
| 5 | PATCH | `/:id/default` | User | `setDefaultUserAddress` | `setDefaultUserAddressService` | `validateSetDefaultUserAddress` | UserAddress | V |
| 6 | DELETE | `/` `/:id` | User | `deleteUserAddress` | `deleteUserAddressService` (default mới = địa chỉ mới nhất còn lại) | `validateAddressId` | UserAddress | V |

## 15. AI Product Search — `/api/ai/products` (`src/routes/aiProductSearch.routes.ts`)

| # | Method | Path | Auth | Controller | Service | Validator | Entity | Xác minh |
|---|--------|------|------|-----------|---------|-----------|--------|----------|
| 1 | POST | `/search` | Public (không JWT) | `aiProductSearchController` | `aiProductSearchService` (Gemini) + `aiProductFilter.service` | `aiProductSearchValidator` | Product, ProductVariant, Category, Brand, Attribute, AttributeValue, VariantAttribute, ProductMedia | V (không có test) |

## 16. AI Chat — `/api/ai` (`src/routes/aiChat.routes.ts`) — hỗ trợ khách (sessionId) và user đăng nhập

| # | Method | Path | Auth | Controller | Service | Validator | Entity | Xác minh |
|---|--------|------|------|-----------|---------|-----------|--------|----------|
| 1 | POST | `/chat` | Public (userId nếu có JWT) | `sendAIChatController` | `sendAIChatMessage` (Gemini + `findProductsForAIChat`) | `sendAIChatValidator` | AIConversation, Product, ProductVariant | V (không có test) |
| 2 | POST | `/chat/conversations` | Public | `createAIConversationController` | `createAIConversation` | `createAIConversationValidator` | AIConversation | V |
| 3 | GET | `/chat/conversations` | Public | `getAIConversationsController` | `getAIConversations` (limit 50) | `conversationSessionQueryValidator` | AIConversation | V |
| 4 | GET | `/chat/conversations/:id` | Public | `getAIConversationByIdController` | `getAIConversationById` | `conversationIdParamValidator` | AIConversation | V |
| 5 | DELETE | `/chat/conversations/:id` | Public | `deleteAIConversationController` | `deleteAIConversation` | `conversationIdParamValidator` | AIConversation | V |

## 17. Checkout — `/api/checkout` (`src/routes/checkout.routes.ts`) — toàn router cần JWT

| # | Method | Path | Auth | Controller | Service | Validator | Entity | Xác minh |
|---|--------|------|------|-----------|---------|-----------|--------|----------|
| 1 | POST | `/preview` | User | `previewCheckout` | `reviewCheckout` (tính subtotal/discount/shipping/total) | `checkoutPreviewValidator` | Cart, UserAddress, Coupon, Product, ProductVariant | V/T |
| 2 | POST | `/` | User | `submitCheckout` | `placeOrder` → 201 | `checkoutValidator` | Order, OrderItem, ProductVariant (trừ kho), Coupon, CouponUsage, Cart | V/T |

## 18. Order — `/api/orders` (`src/routes/order.routes.ts`) — toàn router cần JWT

| # | Method | Path | Auth | Controller | Service | Validator | Entity | Xác minh |
|---|--------|------|------|-----------|---------|-----------|--------|----------|
| 1 | GET | `/my-orders` | User | `getMyOrders` | `getMyOrders` (page 1/limit 10) | `myOrdersQueryValidator` | Order | V/T |
| 2 | GET | `/:id` | User | `getOrderDetail` | `getOrderDetailForUser` (ownership) | `orderIdParamValidator` | Order | V/T |
| 3 | PUT | `/:id/cancel` | User | `cancelMyOrder` | `cancelMyOrder` (chỉ pending/confirmed và chưa paid; hoàn kho + rollback coupon) | `orderIdParamValidator` | Order, ProductVariant, Coupon, CouponUsage | V/T |

## 19. Order Item — mount `/api/orders` (`src/routes/order-item.routes.ts`) — toàn router cần JWT

| # | Method | Path | Auth | Controller | Service | Validator | Entity | Xác minh |
|---|--------|------|------|-----------|---------|-----------|--------|----------|
| 1 | GET | `/:id/items` | User (owner) hoặc Admin | `getOrderItems` | `getOrderItems` | `orderIdParamValidator` | OrderItem, Order | V/T |

## 20. Admin Order — `/api/admin/orders` (`src/routes/admin/admin.order.routes.ts`) — `authMiddleware` + `roleMiddleware("admin")`

| # | Method | Path | Auth | Controller | Service | Validator | Entity | Xác minh |
|---|--------|------|------|-----------|---------|-----------|--------|----------|
| 1 | GET | `/` | Admin | `getAllOrdersAdmin` | `getAllOrdersAdmin` (page 1/limit 10) | `adminOrdersQueryValidator` | Order | V/T |
| 2 | GET | `/:id` | Admin | `getOrderDetailAdmin` | `getOrderByIdAdmin` | `orderIdParamValidator` | Order, OrderItem | V/T |
| 3 | PUT | `/:id/status` | Admin | `updateOrderStatusAdmin` | `updateOrderStatusAdmin` (state machine; completed+COD tự ghi payment) | `updateOrderStatusValidator` | Order, ProductVariant, Coupon, CouponUsage, Payment | V/T |

## 21. Admin Order Item — `/api/admin/order-items` (`src/routes/admin/admin.order-item.routes.ts`)

| # | Method | Path | Auth | Controller | Service | Validator | Entity | Xác minh |
|---|--------|------|------|-----------|---------|-----------|--------|----------|
| 1 | GET | `/` | Admin | `getAllOrderItemsAdmin` | `getAllOrderItemsAdmin` (page 1/limit 10 + tổng hợp) | `adminOrderItemsQueryValidator` | OrderItem | V/T |

## 22. Payment — `/api/payments` (`src/routes/payment.routes.ts`)

| # | Method | Path | Auth | Controller | Service | Validator | Entity | Xác minh |
|---|--------|------|------|-----------|---------|-----------|--------|----------|
| 1 | POST | `/` | User | `createPayment` | `createPayment` (điều kiện order; session 15 phút; chỉ VNPAY/mock có URL thật) | `createPaymentValidator` | Payment, Order | V/M |
| 2 | GET | `/my-payments` | User | `getMyPayments` | `getMyPayments` (không phân trang) | — | Payment, Order | V/T |
| 3 | GET | `/vnpay/return` | Public (gateway) | `vnpayReturn` | `verifyVnpayCallback` + `applyGatewayResult` → redirect 302 | — | Payment, Order | V/M (302 tới `CLIENT_URL/payment/result`) |
| 4 | GET | `/vnpay/ipn` | Public (gateway) | `vnpayIpn` | như trên; trả JSON chuẩn VNPay `{RspCode, Message}` | — | Payment, Order | V/M |
| 5 | POST | `/momo/ipn` | Public (gateway) | `momoIpn` | `verifyMomoCallback` + `applyGatewayResult`; trả `{resultCode, message}` | — | Payment, Order | V/M (verify có, nhưng MoMo không bao giờ gọi vì thiếu bước tạo đơn) |
| 6 | POST | `/zalopay/callback` | Public (gateway) | `zalopayCallback` | `verifyZalopayCallback` + `applyGatewayResult`; trả `{return_code, return_message}` | — | Payment, Order | V/M (như MoMo) |
| 7 | POST | `/mock/complete` | Public khi `PAYMENT_ENV=mock`, 404 nếu không | `mockComplete` | `applyGatewayResult` (gateway "VNPAY", txn `MOCK-...`) | `mockCompleteValidator` | Payment, Order | V/T (mock) |

## 23. Admin Payment — `/api/admin/payments` (`src/routes/admin/admin.payment.routes.ts`)

| # | Method | Path | Auth | Controller | Service | Validator | Entity | Xác minh |
|---|--------|------|------|-----------|---------|-----------|--------|----------|
| 1 | GET | `/` | Admin | `getAllPaymentsAdmin` | `getAllPaymentsAdmin` (page 1/limit 10 + tổng hợp doanh thu) | `adminPaymentsQueryValidator` | Payment | V/T |
| 2 | POST | `/:id/refund` | Admin | `refundPaymentAdmin` | `refundPaymentAdmin` (chỉ ghi DB, không gọi gateway) | `refundValidator` | Payment, Order | V/T (mock) |

---

## Phụ lục A — Endpoint KHÔNG tồn tại nhưng dễ nhầm

| Nguồn nhầm lẫn | Thực tế |
|---|---|
| `POST /api/auth/register`, `GET /api/auth/me` (KE_HOACH mục II; comment trong `otp.controller.ts`) | Không tồn tại. Thực tế là `/api/customer/*` và `/api/admin/*` |
| Toàn bộ 5 handler trong `src/controllers/otp.controller.ts` | **Dead code** — không route nào import file này (VERIFIED bằng grep, 2026-10-22) |
| `POST /api/admin/dashboard/overview` (KE_HOACH mục XX) | Chưa triển khai |
| Mục XVIII Product Review / XIX Admin Management / XXI AI (theo kế hoạch) | Review & Admin Mgmt: chưa có API. AI: ĐÃ có API (mục 15, 16) nhưng không nằm trong kế hoạch mục V–XVII |

## Phụ lục B — Response envelope chuẩn (VERIFIED từ controllers)

> **2026-10-24 — quy tắc lỗi duy nhất:** mọi lỗi của API non-auth/AI-chat đều đi qua `src/middlewares/error.middleware.ts`. Service ném `AppError(statusCode, message)`; các lỗi Mongoose (ValidationError / CastError / E11000) tự map về 400; lỗi không xác định → 500 với message chung. Controller không tự gán status lỗi nữa.

- Thành công: `{ "success": true, "message": "...", "data": ... }` · một số list thêm `pagination` ở top-level (brand/category/product) hoặc nhúng trong `data` (order/payment/coupon/customer-admin).
- Lỗi validation (400 từ express-validator): `{ "success": false, "message": "Dữ liệu không hợp lệ", "errors": [{field, message}] }` (`src/middlewares/validate.middleware.ts`).
- Lỗi khác: `{ "success": false, "message": "..." }`; lỗi 500 che message gốc (`src/middlewares/error.middleware.ts`).
- Giá trị `id` trả về là bản sao của `_id` (plugin `toJSON`), không có `__v`, không lộ `password`.
- Ngoại lệ đặc biệt: `vnpay/return` trả redirect 302 (không JSON); `vnpay/ipn`, `momo/ipn`, `zalopay/callback` trả đúng protocol của từng gateway (luôn HTTP 200).
- Phạm vi chưa chuyển (theo giới hạn chủ dự án): controllers/services auth (`customer`, `admin`, `otp`) và AI (`aiChat`, `aiProductSearch`) vẫn dùng pattern try/catch cũ — mã lỗi của các API đó xem trong từng mục tương ứng.
