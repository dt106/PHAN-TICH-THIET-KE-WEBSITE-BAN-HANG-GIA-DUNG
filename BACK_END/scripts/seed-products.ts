/**
 * Nạp dữ liệu mẫu cửa hàng gia dụng. Chạy lại thì cập nhật theo slug/sku/code, không tạo bản trùng.
 *
 *   npm run seed:store
 *
 * Cần MONGO_URI (mặc định xem .env.example). Ảnh dùng picsum để có URL thật, đổi mediaUrl khi có ảnh sản phẩm.
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDatabase from "../src/config/database";
import Attribute from "../src/models/Attribute.model";
import AttributeValue from "../src/models/AttributeValue.model";
import Brand from "../src/models/Brand.model";
import Category from "../src/models/Category.model";
import Coupon from "../src/models/Coupon.model";
import Product from "../src/models/Product.model";
import ProductMedia from "../src/models/ProductMedia.model";
import ProductVariant from "../src/models/ProductVariant.model";
import VariantAttribute from "../src/models/VariantAttribute.model";

dotenv.config();

const photo = (id: number) => `https://picsum.photos/id/${id}/800/800`;

const categories: {
  name: string;
  slug: string;
  parent: string | null;
  sortOrder: number;
  image: number;
  description: string;
}[] = [
  { name: "Nồi & chảo", slug: "noi-chao", parent: null, sortOrder: 1, image: 292, description: "Nồi, chảo và bộ nồi dùng mỗi ngày." },
  { name: "Nồi", slug: "noi", parent: "noi-chao", sortOrder: 1, image: 312, description: "Nồi inox, nồi chống dính, nồi áp suất." },
  { name: "Chảo", slug: "chao", parent: "noi-chao", sortOrder: 2, image: 488, description: "Chảo chống dính, chảo gang, chảo sâu lòng." },
  { name: "Đồ điện", slug: "do-dien", parent: null, sortOrder: 2, image: 225, description: "Thiết bị điện nhà bếp." },
  { name: "Bếp và nồi điện", slug: "bep-nau", parent: "do-dien", sortOrder: 1, image: 1060, description: "Nồi cơm, bếp từ, ấm siêu tốc, lò vi sóng." },
  { name: "Máy xay & pha chế", slug: "may-xay", parent: "do-dien", sortOrder: 2, image: 835, description: "Máy xay sinh tố, ép chậm, xay thịt." },
  { name: "Nhà bếp", slug: "nha-bep", parent: null, sortOrder: 3, image: 429, description: "Hộp bảo quản và dụng cụ bếp." },
  { name: "Hộp bảo quản", slug: "hop-dung", parent: "nha-bep", sortOrder: 1, image: 674, description: "Hộp thủy tinh và hộp nhựa." },
  { name: "Dụng cụ bếp", slug: "dung-cu", parent: "nha-bep", sortOrder: 2, image: 30, description: "Thớt, dao, giá úp." },
  { name: "Phòng ăn", slug: "phong-an", parent: null, sortOrder: 4, image: 106, description: "Ly, bình và chén dĩa." },
  { name: "Ly tách", slug: "ly-tach", parent: "phong-an", sortOrder: 1, image: 133, description: "Ly thủy tinh, bình giữ nhiệt, chén sứ." },
];

const brands = [
  { name: "Sunhouse", slug: "sunhouse", description: "Đồ gia dụng Sunhouse." },
  { name: "Lock&Lock", slug: "locknlock", description: "Hộp và nồi chảo Lock&Lock." },
  { name: "Kangaroo", slug: "kangaroo", description: "Thiết bị nhà bếp Kangaroo." },
  { name: "Philips", slug: "philips", description: "Đồ điện Philips." },
  { name: "Elmich", slug: "elmich", description: "Nồi chảo và dụng cụ Elmich." },
  { name: "Tefal", slug: "tefal", description: "Nồi chảo và dao Tefal." },
];

type AttrRef = { attribute: string; value: string };

type VariantSeed = {
  sku: string;
  price: number;
  compareAtPrice?: number | null;
  stock: number;
  image?: number;
  attrs?: AttrRef[];
};

type ProductSeed = {
  name: string;
  slug: string;
  sku: string;
  category: string;
  brand: string;
  basePrice: number;
  salePrice: number | null;
  featured: boolean;
  rating: number;
  reviews: number;
  sales: number;
  description: string;
  images: number[];
  variants: VariantSeed[];
};

const products: ProductSeed[] = [
  {
    name: "Nồi inox 3 đáy Sunhouse",
    slug: "noi-inox-3-day-sunhouse",
    sku: "GD-NOI-INOX",
    category: "noi",
    brand: "sunhouse",
    basePrice: 890000,
    salePrice: 690000,
    featured: true,
    rating: 4.6,
    reviews: 28,
    sales: 140,
    description: "Nồi inox 3 đáy, nắp kính, dùng được bếp từ. Có các cỡ 20cm, 24cm và 28cm.",
    images: [292, 312],
    variants: [
      { sku: "GD-NOI-INOX-20", price: 490000, compareAtPrice: 590000, stock: 24, image: 292, attrs: [{ attribute: "kich-thuoc", value: "20cm" }] },
      { sku: "GD-NOI-INOX-24", price: 690000, compareAtPrice: 890000, stock: 18, image: 312, attrs: [{ attribute: "kich-thuoc", value: "24cm" }] },
      { sku: "GD-NOI-INOX-28", price: 890000, compareAtPrice: 1090000, stock: 9, image: 326, attrs: [{ attribute: "kich-thuoc", value: "28cm" }] },
    ],
  },
  {
    name: "Nồi nhôm chống dính Elmich 24cm",
    slug: "noi-nhom-chong-dinh-elmich-24cm",
    sku: "GD-NOI-EL-24",
    category: "noi",
    brand: "elmich",
    basePrice: 650000,
    salePrice: 529000,
    featured: false,
    rating: 4.2,
    reviews: 11,
    sales: 46,
    description: "Nồi nhôm chống dính đáy từ, lòng phủ chống dính, cỡ 24cm.",
    images: [367],
    variants: [{ sku: "GD-NOI-EL-24-01", price: 529000, compareAtPrice: 650000, stock: 30 }],
  },
  {
    name: "Nồi áp suất 6L Kangaroo",
    slug: "noi-ap-suat-6l-kangaroo",
    sku: "GD-NAS-6",
    category: "noi",
    brand: "kangaroo",
    basePrice: 1590000,
    salePrice: null,
    featured: true,
    rating: 4.8,
    reviews: 19,
    sales: 33,
    description: "Nồi áp suất dung tích 6 lít, khóa an toàn hai tầng, phù hợp gia đình 4–6 người.",
    images: [452, 488],
    variants: [{ sku: "GD-NAS-6-01", price: 1590000, stock: 12 }],
  },
  {
    name: "Bộ nồi 5 món Tefal",
    slug: "bo-noi-5-mon-tefal",
    sku: "GD-BONOI-5",
    category: "noi",
    brand: "tefal",
    basePrice: 2490000,
    salePrice: 1990000,
    featured: true,
    rating: 4.7,
    reviews: 22,
    sales: 18,
    description: "Bộ nồi 5 món đáy từ, tay cầm cách nhiệt, dùng bếp gas và bếp từ.",
    images: [514],
    variants: [{ sku: "GD-BONOI-5-01", price: 1990000, compareAtPrice: 2490000, stock: 8 }],
  },
  {
    name: "Chảo chống dính 26cm Lock&Lock",
    slug: "chao-chong-dinh-26cm-locknlock",
    sku: "GD-CHAO-26",
    category: "chao",
    brand: "locknlock",
    basePrice: 450000,
    salePrice: 359000,
    featured: true,
    rating: 4.4,
    reviews: 41,
    sales: 210,
    description: "Chảo chống dính 26cm, có lựa chọn màu đen hoặc đỏ.",
    images: [488, 535],
    variants: [
      { sku: "GD-CHAO-26-DEN", price: 359000, compareAtPrice: 450000, stock: 40, image: 488, attrs: [{ attribute: "mau-sac", value: "Đen" }] },
      { sku: "GD-CHAO-26-DO", price: 379000, compareAtPrice: 450000, stock: 15, image: 535, attrs: [{ attribute: "mau-sac", value: "Đỏ" }] },
    ],
  },
  {
    name: "Chảo gang 22cm Tefal",
    slug: "chao-gang-22cm-tefal",
    sku: "GD-CHAO-GANG",
    category: "chao",
    brand: "tefal",
    basePrice: 720000,
    salePrice: null,
    featured: false,
    rating: 4.5,
    reviews: 9,
    sales: 14,
    description: "Chảo gang dày, giữ nhiệt đều, thích hợp áp chảo thịt.",
    images: [564],
    variants: [{ sku: "GD-CHAO-GANG-01", price: 720000, stock: 11 }],
  },
  {
    name: "Chảo sâu lòng 28cm Sunhouse",
    slug: "chao-sau-long-28cm-sunhouse",
    sku: "GD-CHAO-SAU",
    category: "chao",
    brand: "sunhouse",
    basePrice: 390000,
    salePrice: 299000,
    featured: false,
    rating: 4.1,
    reviews: 16,
    sales: 77,
    description: "Chảo sâu lòng 28cm có nắp kính, xào nấu lượng lớn.",
    images: [593],
    variants: [{ sku: "GD-CHAO-SAU-01", price: 299000, compareAtPrice: 390000, stock: 22 }],
  },
  {
    name: "Nồi cơm điện 1.8L Sunhouse",
    slug: "noi-com-dien-1-8l-sunhouse",
    sku: "GD-NCD-18",
    category: "bep-nau",
    brand: "sunhouse",
    basePrice: 1890000,
    salePrice: 1490000,
    featured: true,
    rating: 4.6,
    reviews: 63,
    sales: 188,
    description: "Nồi cơm điện 1.8 lít, lòng chống dính, nấu và hâm nóng.",
    images: [225, 250],
    variants: [{ sku: "GD-NCD-18-01", price: 1490000, compareAtPrice: 1890000, stock: 20 }],
  },
  {
    name: "Nồi cơm điện cao tần 1.5L Philips",
    slug: "noi-com-dien-cao-tan-philips",
    sku: "GD-NCD-CT",
    category: "bep-nau",
    brand: "philips",
    basePrice: 3290000,
    salePrice: null,
    featured: true,
    rating: 4.9,
    reviews: 14,
    sales: 9,
    description: "Nồi cơm điện cao tần 1.5 lít, nhiều chương trình nấu.",
    images: [628],
    variants: [{ sku: "GD-NCD-CT-01", price: 3290000, stock: 6 }],
  },
  {
    name: "Bếp từ đơn Kangaroo",
    slug: "bep-tu-don-kangaroo",
    sku: "GD-BTD-01",
    category: "bep-nau",
    brand: "kangaroo",
    basePrice: 990000,
    salePrice: 849000,
    featured: false,
    rating: 4.3,
    reviews: 27,
    sales: 54,
    description: "Bếp từ đơn mặt kính, nhiều mức nhiệt, khóa trẻ em.",
    images: [659],
    variants: [{ sku: "GD-BTD-01-01", price: 849000, compareAtPrice: 990000, stock: 17 }],
  },
  {
    name: "Ấm siêu tốc Kangaroo",
    slug: "am-sieu-toc-kangaroo",
    sku: "GD-AST",
    category: "bep-nau",
    brand: "kangaroo",
    basePrice: 390000,
    salePrice: 320000,
    featured: true,
    rating: 4.2,
    reviews: 35,
    sales: 96,
    description: "Ấm siêu tốc ruột inox, có hai dung tích 1.5L và 1.8L.",
    images: [1060, 680],
    variants: [
      { sku: "GD-AST-15", price: 299000, compareAtPrice: 350000, stock: 28, image: 680, attrs: [{ attribute: "kich-thuoc", value: "1.5L" }] },
      { sku: "GD-AST-18", price: 349000, compareAtPrice: 390000, stock: 21, image: 1060, attrs: [{ attribute: "kich-thuoc", value: "1.8L" }] },
    ],
  },
  {
    name: "Lò vi sóng 20L Sunhouse",
    slug: "lo-vi-song-20l-sunhouse",
    sku: "GD-LVS-20",
    category: "bep-nau",
    brand: "sunhouse",
    basePrice: 1790000,
    salePrice: 1590000,
    featured: false,
    rating: 4.4,
    reviews: 12,
    sales: 21,
    description: "Lò vi sóng 20 lít, rã đông và hâm nóng, cửa kính.",
    images: [718],
    variants: [{ sku: "GD-LVS-20-01", price: 1590000, compareAtPrice: 1790000, stock: 7 }],
  },
  {
    name: "Máy xay sinh tố Philips",
    slug: "may-xay-sinh-to-philips",
    sku: "GD-MXST",
    category: "may-xay",
    brand: "philips",
    basePrice: 750000,
    salePrice: 620000,
    featured: true,
    rating: 4.5,
    reviews: 38,
    sales: 120,
    description: "Máy xay sinh tố cối thủy tinh, nhiều tốc độ, lưỡi thép.",
    images: [835],
    variants: [{ sku: "GD-MXST-01", price: 620000, compareAtPrice: 750000, stock: 19 }],
  },
  {
    name: "Máy ép chậm Kangaroo",
    slug: "may-ep-cham-kangaroo",
    sku: "GD-MEC",
    category: "may-xay",
    brand: "kangaroo",
    basePrice: 2190000,
    salePrice: null,
    featured: false,
    rating: 4.7,
    reviews: 8,
    sales: 11,
    description: "Máy ép chậm giữ vitamin, khe cho trái cây nguyên quả nhỏ.",
    images: [755],
    variants: [{ sku: "GD-MEC-01", price: 2190000, stock: 5 }],
  },
  {
    name: "Máy xay thịt Elmich",
    slug: "may-xay-thit-elmich",
    sku: "GD-MXT",
    category: "may-xay",
    brand: "elmich",
    basePrice: 890000,
    salePrice: 749000,
    featured: true,
    rating: 4.3,
    reviews: 17,
    sales: 44,
    description: "Máy xay thịt cối inox 2 lít, hai tốc độ.",
    images: [823],
    variants: [{ sku: "GD-MXT-01", price: 749000, compareAtPrice: 890000, stock: 13 }],
  },
  {
    name: "Hộp thủy tinh Lock&Lock",
    slug: "hop-thuy-tinh-locknlock",
    sku: "GD-HOP-TT",
    category: "hop-dung",
    brand: "locknlock",
    basePrice: 189000,
    salePrice: 149000,
    featured: true,
    rating: 4.8,
    reviews: 52,
    sales: 260,
    description: "Hộp thủy tinh chịu nhiệt, có bản 2 ngăn và 3 ngăn.",
    images: [429, 866],
    variants: [
      { sku: "GD-HOP-TT-2", price: 129000, compareAtPrice: 159000, stock: 50, image: 866, attrs: [{ attribute: "kich-thuoc", value: "2 ngăn" }] },
      { sku: "GD-HOP-TT-3", price: 149000, compareAtPrice: 189000, stock: 36, image: 429, attrs: [{ attribute: "kich-thuoc", value: "3 ngăn" }] },
    ],
  },
  {
    name: "Bộ hộp nhựa 4 món Lock&Lock",
    slug: "bo-hop-nhua-4-mon-locknlock",
    sku: "GD-HOP-NHUA",
    category: "hop-dung",
    brand: "locknlock",
    basePrice: 259000,
    salePrice: null,
    featured: false,
    rating: 4.1,
    reviews: 20,
    sales: 70,
    description: "Bộ 4 hộp nhựa nắp khóa, dùng tủ lạnh.",
    images: [903],
    variants: [{ sku: "GD-HOP-NHUA-01", price: 259000, stock: 40 }],
  },
  {
    name: "Thớt gỗ tre Elmich",
    slug: "thot-go-tre-elmich",
    sku: "GD-THOT",
    category: "dung-cu",
    brand: "elmich",
    basePrice: 259000,
    salePrice: 219000,
    featured: false,
    rating: 4,
    reviews: 6,
    sales: 25,
    description: "Thớt gỗ tre ép, có rãnh hứng nước.",
    images: [674],
    variants: [{ sku: "GD-THOT-01", price: 219000, compareAtPrice: 259000, stock: 33 }],
  },
  {
    name: "Bộ dao nhà bếp 5 món Tefal",
    slug: "bo-dao-5-mon-tefal",
    sku: "GD-DAO-5",
    category: "dung-cu",
    brand: "tefal",
    basePrice: 690000,
    salePrice: 549000,
    featured: true,
    rating: 4.6,
    reviews: 15,
    sales: 39,
    description: "Bộ dao 5 món lưỡi thép không gỉ, kèm kéo.",
    images: [1015],
    variants: [{ sku: "GD-DAO-5-01", price: 549000, compareAtPrice: 690000, stock: 14 }],
  },
  {
    name: "Giá úp bát inox Sunhouse",
    slug: "gia-up-bat-inox-sunhouse",
    sku: "GD-GIA-UP",
    category: "dung-cu",
    brand: "sunhouse",
    basePrice: 420000,
    salePrice: null,
    featured: false,
    rating: 3.9,
    reviews: 4,
    sales: 8,
    description: "Giá úp bát hai tầng, inox 304, có khay hứng nước.",
    images: [1025],
    variants: [{ sku: "GD-GIA-UP-01", price: 420000, stock: 10 }],
  },
  {
    name: "Bộ ly thủy tinh",
    slug: "bo-ly-thuy-tinh",
    sku: "GD-LY",
    category: "ly-tach",
    brand: "locknlock",
    basePrice: 189000,
    salePrice: 149000,
    featured: false,
    rating: 4.4,
    reviews: 18,
    sales: 61,
    description: "Bộ ly thủy tinh thành dày, chọn bộ 4 hoặc 6 cái.",
    images: [133, 160],
    variants: [
      { sku: "GD-LY-4", price: 119000, compareAtPrice: 149000, stock: 26, image: 160, attrs: [{ attribute: "kich-thuoc", value: "4 cái" }] },
      { sku: "GD-LY-6", price: 149000, compareAtPrice: 189000, stock: 2, image: 133, attrs: [{ attribute: "kich-thuoc", value: "6 cái" }] },
    ],
  },
  {
    name: "Bình giữ nhiệt 500ml Lock&Lock",
    slug: "binh-giu-nhiet-500ml-locknlock",
    sku: "GD-BINH-500",
    category: "ly-tach",
    brand: "locknlock",
    basePrice: 350000,
    salePrice: 279000,
    featured: true,
    rating: 4.7,
    reviews: 44,
    sales: 150,
    description: "Bình giữ nhiệt 500ml, giữ nóng lạnh, nắp chống tràn. Có màu bạc và đen.",
    images: [201, 30],
    variants: [
      { sku: "GD-BINH-500-BAC", price: 279000, compareAtPrice: 350000, stock: 24, image: 201, attrs: [{ attribute: "mau-sac", value: "Bạc" }] },
      { sku: "GD-BINH-500-DEN", price: 279000, compareAtPrice: 350000, stock: 0, image: 30, attrs: [{ attribute: "mau-sac", value: "Đen" }] },
    ],
  },
  {
    name: "Chén sứ trắng 10 cái Sunhouse",
    slug: "chen-su-trang-10-cai",
    sku: "GD-CHEN-10",
    category: "ly-tach",
    brand: "sunhouse",
    basePrice: 220000,
    salePrice: 179000,
    featured: false,
    rating: 4,
    reviews: 7,
    sales: 29,
    description: "Bộ 10 chén sứ trắng tráng men, dùng lò vi sóng.",
    images: [106],
    variants: [{ sku: "GD-CHEN-10-01", price: 179000, compareAtPrice: 220000, stock: 18 }],
  },
];

const coupons = [
  {
    code: "GIADUNG10",
    name: "Giảm 10% đồ gia dụng",
    description: "Giảm 10% đơn từ 300.000đ, tối đa 150.000đ.",
    discountType: "percentage" as const,
    discountValue: 10,
    minimumOrderAmount: 300000,
    maximumDiscountAmount: 150000,
    usageLimit: 500,
    perUserLimit: 3,
  },
  {
    code: "GIAM50K",
    name: "Giảm 50.000đ",
    description: "Giảm thẳng 50.000đ cho đơn từ 200.000đ.",
    discountType: "fixed" as const,
    discountValue: 50000,
    minimumOrderAmount: 200000,
    maximumDiscountAmount: null,
    usageLimit: 300,
    perUserLimit: 2,
  },
  {
    code: "FREESHIP",
    name: "Hỗ trợ phí ship 30.000đ",
    description: "Giảm 30.000đ, tương đương phí vận chuyển cố định trên website.",
    discountType: "fixed" as const,
    discountValue: 30000,
    minimumOrderAmount: 0,
    maximumDiscountAmount: null,
    usageLimit: null,
    perUserLimit: 5,
  },
];

const attributeDefs = [
  {
    name: "Kích thước",
    slug: "kich-thuoc",
    values: ["20cm", "24cm", "28cm", "1.5L", "1.8L", "2 ngăn", "3 ngăn", "4 cái", "6 cái"],
  },
  {
    name: "Màu sắc",
    slug: "mau-sac",
    values: ["Đen", "Đỏ", "Bạc"],
  },
];

function valueSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  await connectDatabase();
  if (mongoose.connection.readyState !== 1) {
    throw new Error("MongoDB chưa kết nối. Kiểm tra MONGO_URI.");
  }

  const categoryId = new Map<string, mongoose.Types.ObjectId>();
  for (const item of categories.filter((category) => category.parent === null)) {
    const doc = await Category.findOneAndUpdate(
      { slug: item.slug },
      {
        $set: {
          name: item.name,
          slug: item.slug,
          parentId: null,
          description: item.description,
          image: photo(item.image),
          sortOrder: item.sortOrder,
          isActive: true,
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
    categoryId.set(item.slug, doc._id);
  }
  for (const item of categories.filter((category) => category.parent !== null)) {
    const doc = await Category.findOneAndUpdate(
      { slug: item.slug },
      {
        $set: {
          name: item.name,
          slug: item.slug,
          parentId: categoryId.get(item.parent as string),
          description: item.description,
          image: photo(item.image),
          sortOrder: item.sortOrder,
          isActive: true,
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
    categoryId.set(item.slug, doc._id);
  }

  const brandId = new Map<string, mongoose.Types.ObjectId>();
  for (const item of brands) {
    const doc = await Brand.findOneAndUpdate(
      { slug: item.slug },
      { $set: { name: item.name, slug: item.slug, description: item.description, isActive: true } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
    brandId.set(item.slug, doc._id);
  }

  const attributeId = new Map<string, mongoose.Types.ObjectId>();
  const valueId = new Map<string, mongoose.Types.ObjectId>();
  for (const attribute of attributeDefs) {
    const doc = await Attribute.findOneAndUpdate(
      { slug: attribute.slug },
      { $set: { name: attribute.name, slug: attribute.slug } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
    attributeId.set(attribute.slug, doc._id);
    for (const value of attribute.values) {
      const saved = await AttributeValue.findOneAndUpdate(
        { attributeId: doc._id, value },
        { $set: { attributeId: doc._id, value, slug: valueSlug(value) } },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
      );
      valueId.set(`${attribute.slug}:${value}`, saved._id);
    }
  }

  for (const item of products) {
    const prices = item.variants.map((variant) => variant.price);
    const product = await Product.findOneAndUpdate(
      { slug: item.slug },
      {
        $set: {
          categoryId: categoryId.get(item.category),
          brandId: brandId.get(item.brand),
          name: item.name,
          slug: item.slug,
          sku: item.sku,
          description: item.description,
          basePrice: item.basePrice,
          salePrice: item.salePrice,
          minPrice: Math.min(...prices),
          maxPrice: Math.max(...prices),
          averageRating: item.rating,
          totalReviews: item.reviews,
          totalSales: item.sales,
          isFeatured: item.featured,
          isActive: true,
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );

    await ProductMedia.deleteMany({ productId: product._id });
    await ProductMedia.insertMany(
      item.images.map((imageId, index) => ({
        productId: product._id,
        mediaType: "image",
        mediaUrl: photo(imageId),
        altText: item.name,
        sortOrder: index,
        isPrimary: index === 0,
      })),
    );

    const keepSkus = item.variants.map((variant) => variant.sku);
    const stale = await ProductVariant.find({
      productId: product._id,
      sku: { $nin: keepSkus },
    }).select("_id");
    if (stale.length > 0) {
      const staleIds = stale.map((variant) => variant._id);
      await VariantAttribute.deleteMany({ variantId: { $in: staleIds } });
      await ProductVariant.deleteMany({ _id: { $in: staleIds } });
    }

    for (const variant of item.variants) {
      const saved = await ProductVariant.findOneAndUpdate(
        { sku: variant.sku },
        {
          $set: {
            productId: product._id,
            sku: variant.sku,
            price: variant.price,
            compareAtPrice: variant.compareAtPrice ?? null,
            stockQuantity: variant.stock,
            image: variant.image ? photo(variant.image) : null,
            isActive: true,
          },
        },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
      );

      await VariantAttribute.deleteMany({ variantId: saved._id });
      if (variant.attrs?.length) {
        await VariantAttribute.insertMany(
          variant.attrs.map((attr) => ({
            variantId: saved._id,
            attributeId: attributeId.get(attr.attribute),
            attributeValueId: valueId.get(`${attr.attribute}:${attr.value}`),
          })),
        );
      }
    }
  }

  const startsAt = new Date("2024-01-01T00:00:00.000Z");
  const expiresAt = new Date("2027-12-31T23:59:59.000Z");
  for (const coupon of coupons) {
    await Coupon.findOneAndUpdate(
      { code: coupon.code },
      {
        $set: {
          ...coupon,
          startsAt,
          expiresAt,
          isActive: true,
        },
        $setOnInsert: { usedCount: 0 },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
  }

  console.log(
    `Đã nạp ${categories.length} danh mục, ${brands.length} thương hiệu, ${products.length} sản phẩm, ${coupons.length} mã giảm giá.`,
  );
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
