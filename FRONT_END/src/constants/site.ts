export const site = {
  name: "Furniro",
  address: ["12 Nguyễn Huệ, Quận 1", "TP. Hồ Chí Minh"],
  phone: "0901 234 567",
  hotline: "1900 1234",
  hours: ["Thứ 2 – Thứ 6: 9:00 – 22:00", "Thứ 7 – Chủ nhật: 9:00 – 21:00"],
};

export const navLinks = [
  { to: "/", label: "Trang chủ", end: true },
  { to: "/shop", label: "Cửa hàng" },
  { to: "/tro-ly", label: "Tư vấn" },
  { to: "/about", label: "Giới thiệu" },
  { to: "/contact", label: "Liên hệ" },
];

export const footerColumns = [
  {
    title: "Liên kết",
    links: [
      { to: "/", label: "Trang chủ" },
      { to: "/shop", label: "Cửa hàng" },
      { to: "/about", label: "Giới thiệu" },
      { to: "/contact", label: "Liên hệ" },
    ],
  },
  {
    title: "Hỗ trợ",
    links: [
      { to: "/checkout", label: "Thanh toán" },
      { to: "/orders", label: "Đổi trả" },
      { to: "/about", label: "Chính sách" },
    ],
  },
];

export const features = [
  { title: "Chất lượng cao", text: "Vật liệu chọn lọc", icon: "M8 4h8l2 4v3a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V8zm2 12h4" },
  { title: "Bảo hành", text: "Trên 2 năm", icon: "M12 3l7 3v6c0 4.2-2.8 7.4-7 9-4.2-1.6-7-4.8-7-9V6z" },
  { title: "Giao hàng", text: "Phí cố định 30.000đ", icon: "M3 7h11v8H3zm11 2h4l2 3v3h-6zM7 18a2 2 0 1 0 0.01 0M17 18a2 2 0 1 0 0.01 0" },
  { title: "Hỗ trợ", text: "Cả tuần", icon: "M4 13a8 8 0 0 1 16 0v5a2 2 0 0 1-2 2h-2v-7h4M4 13v5a2 2 0 0 0 2 2h2v-7H4" },
];
