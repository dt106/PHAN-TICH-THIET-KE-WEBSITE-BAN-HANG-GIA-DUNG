import { FeatureBar } from "../../components/layout/FeatureBar.tsx";
import { PageBanner } from "../../components/layout/PageBanner.tsx";
import { site } from "../../constants/site.ts";
import hero from "../../assets/images/hero.png";

export function AboutPage() {
  return (
    <>
      <PageBanner title="Giới thiệu" />
      <section className="wrap section split">
        <img src={hero} alt={`Showroom ${site.name}`} className="cover" />
        <div className="stack">
          <h2>{site.name}</h2>
          <p>
            {site.name} bán đồ gia dụng cho phòng ăn, phòng khách và phòng ngủ. Sản phẩm làm từ vật liệu chắc, hoàn thiện để dùng hằng ngày và có bảo hành.
          </p>
          <p>
            Vào cửa hàng để xem bộ sưu tập hiện tại, hoặc liên hệ nếu bạn cần chọn kích thước.
          </p>
        </div>
      </section>
      <FeatureBar />
    </>
  );
}
