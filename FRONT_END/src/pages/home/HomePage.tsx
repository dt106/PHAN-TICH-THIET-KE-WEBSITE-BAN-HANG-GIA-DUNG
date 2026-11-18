import { useState } from "react";
import { Link } from "react-router-dom";
import room1 from "../../assets/images/gallery/room-1.png";
import room2 from "../../assets/images/gallery/room-2.png";
import room3 from "../../assets/images/gallery/room-3.png";
import share1 from "../../assets/images/gallery/share-1.png";
import share2 from "../../assets/images/gallery/share-2.png";
import share3 from "../../assets/images/gallery/share-3.png";
import share4 from "../../assets/images/gallery/share-4.png";
import share5 from "../../assets/images/gallery/share-5.png";
import share6 from "../../assets/images/gallery/share-6.png";
import share7 from "../../assets/images/gallery/share-7.png";
import share8 from "../../assets/images/gallery/share-8.png";
import share9 from "../../assets/images/gallery/share-9.png";
import bedroom from "../../assets/images/bedroom.png";
import dining from "../../assets/images/dining.png";
import living from "../../assets/images/living.png";
import { ButtonLink } from "../../components/common/index.ts";
import { ProductGrid } from "../../components/product/ProductGrid.tsx";
import { useRequest } from "../../hooks/useRequest.ts";
import { catalogService } from "../../services/catalog.service.ts";
import styles from "./HomePage.module.css";

const rooms = [
  { image: room1, index: "01", label: "Phòng ngủ", title: "Bình yên" },
  { image: room2, index: "02", label: "Phòng khách", title: "Phòng khách" },
  { image: room3, index: "03", label: "Phòng ăn", title: "Phòng ăn" },
];
const gallery = [share1, share2, share3, share4, share5, share6, share7, share8, share9];
const fallbackImages = [dining, living, bedroom];

export function HomePage() {
  const [roomIndex, setRoomIndex] = useState(0);
  const visibleRooms = [0, 1].map((offset) => rooms[(roomIndex + offset) % rooms.length]);
  const { data, error } = useRequest(async () => {
    const [categoryResult, productResult] = await Promise.all([
      catalogService.getCategories({ parentId: "null", limit: 12 }),
      catalogService.getFeaturedProducts(8),
    ]);
    return { categories: categoryResult.data, products: productResult.data };
  }, []);
  const categories = data?.categories ?? [];
  const products = data?.products ?? [];

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.panel}>
          <p className={styles.kicker}>Hàng mới</p>
          <h1>
            Bộ sưu tập
            <br />
            mới của Furniro
          </h1>
          <p>Sản phẩm nổi bật và danh mục lấy từ cửa hàng.</p>
          <ButtonLink to="/shop" size="lg">Mua ngay</ButtonLink>
        </div>
      </section>

      <section className={`wrap ${styles.section}`}>
        <h2>Danh mục</h2>
        {error ? <p>{error}</p> : null}
        <div className={styles.ranges}>
          {categories.map((category, index) => (
            <Link key={category.id} to={`/shop?category=${category.id}`}>
              <img src={category.image || fallbackImages[index % fallbackImages.length]} alt="" />
              {category.name}
            </Link>
          ))}
        </div>
      </section>

      <section className={`wrap ${styles.section}`}>
        <h2>Sản phẩm</h2>
        <ProductGrid products={products} />
        <ButtonLink to="/shop" variant="outline">Xem thêm</ButtonLink>
      </section>

      <section className={styles.inspire}>
        <div className={styles.inspireCopy}>
          <h2>
            Hơn 50 góc phòng
            <br />
            để bạn tham khảo
          </h2>
          <p>Bộ sưu tập hình ảnh trưng bày.</p>
          <ButtonLink to="/shop" size="lg">Khám phá</ButtonLink>
        </div>
        <div className={styles.rooms}>
          {visibleRooms.map((room, index) => (
            <article key={room.image} className={index === 0 ? styles.roomMain : styles.roomNext}>
              <img src={room.image} alt="" />
              {index === 0 ? (
                <>
                  <div className={styles.caption}>
                    <span>
                      {room.index} — {room.label}
                    </span>
                    <strong>{room.title}</strong>
                  </div>
                  <button
                    type="button"
                    className={styles.nextRoom}
                    aria-label="Phòng tiếp theo"
                    onClick={() => setRoomIndex((current) => (current + 1) % rooms.length)}
                  >
                    →
                  </button>
                </>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className={styles.share}>
        <p>Chia sẻ góc nhà của bạn với</p>
        <h2>#Furniro</h2>
        <div className={styles.collage}>
          {gallery.map((image) => (
            <img key={image} src={image} alt="" />
          ))}
        </div>
      </section>
    </>
  );
}
