import { PageBanner } from "../../components/layout/PageBanner.tsx";
import { FeatureBar } from "../../components/layout/FeatureBar.tsx";
import hero from "../../assets/images/hero.png";

export function AboutPage() {
  return (
    <>
      <PageBanner title="Giới thiệu" />
      <section className="wrap" style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 40, padding: "64px 0", alignItems: "center" }}>
        <img src={hero} alt="Furniro showroom" style={{ width: "100%", height: 420, objectFit: "cover" }} />
        <div>
          <h2>Furniro</h2>
          <p>
            Furniro bán nội thất cho phòng ăn, phòng khách và phòng ngủ. Sản phẩm trên website lấy từ danh mục đang kinh doanh của cửa hàng.
          </p>
          <p>
            Xem cửa hàng để chọn sản phẩm, hoặc nhắn trợ lý AI nếu bạn cần gợi ý.
          </p>
        </div>
      </section>
      <FeatureBar />
    </>
  );
}
