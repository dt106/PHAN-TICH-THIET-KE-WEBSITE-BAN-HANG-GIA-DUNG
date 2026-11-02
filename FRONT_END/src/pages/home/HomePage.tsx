import { useEffect, useState } from "react";
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
import { ProductCard } from "../../components/product/ProductCard.tsx";
import { catalogApi } from "../../services/api.ts";
import { errorMessage } from "../../services/http.ts";
import type { Category } from "../../types/api.ts";
import { toStoreProduct } from "../../utils/product.ts";
import styles from "./HomePage.module.css";
import panels from "../../styles/panels.module.css";

const fallbackImages = [dining, living, bedroom];
const rooms = [
  { image: room1, index: "01", label: "Phòng ngủ", title: "Bình yên" },
  { image: room2, index: "02", label: "Phòng khách", title: "Không gian sống" },
  { image: room3, index: "03", label: "Phòng ăn", title: "Bàn ăn" },
];
const gallery = [share1, share2, share3, share4, share5, share6, share7, share8, share9];

export function HomePage() {
  const [roomIndex, setRoomIndex] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ReturnType<typeof toStoreProduct>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const visibleRooms = [0, 1].map((offset) => rooms[(roomIndex + offset) % rooms.length]);

  useEffect(() => {
    let active = true;
    Promise.all([catalogApi.categories({ limit: 6 }), catalogApi.featured(8)])
      .then(([categoryPage, featured]) => {
        if (!active) return;
        setCategories(categoryPage.items);
        setProducts(featured.items.map(toStoreProduct));
      })
      .catch((reason) => {
        if (active) setError(errorMessage(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.panel}>
          <p className={styles.kicker}>Hàng mới về</p>
          <h1>
            Khám phá
            <br />
            bộ sưu tập mới
          </h1>
          <p>Nội thất cho phòng ăn, phòng khách và phòng ngủ — chọn từ danh mục đang kinh doanh.</p>
          <Link to="/shop" className={styles.buy}>
            Mua ngay
          </Link>
        </div>
      </section>

      <section className={`wrap ${styles.section}`}>
        <h2>Danh mục</h2>
        <p className={styles.lead}>Chọn không gian bạn muốn bài trí.</p>
        {loading ? <p className={panels.state}>Đang tải danh mục...</p> : null}
        {error ? <p className={panels.alert}>{error}</p> : null}
        {!loading && !error && categories.length === 0 ? (
          <p className={panels.state}>Chưa có danh mục nào.</p>
        ) : null}
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
        <h2>Sản phẩm nổi bật</h2>
        {loading ? <p className={panels.state}>Đang tải sản phẩm...</p> : null}
        {!loading && !error && products.length === 0 ? (
          <p className={panels.state}>Chưa có sản phẩm nổi bật.</p>
        ) : null}
        <div className={styles.grid}>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        <Link to="/shop" className={styles.more}>
          Xem thêm
        </Link>
      </section>

      <section className={styles.inspire}>
        <div className={styles.inspireCopy}>
          <h2>
            Hơn 50 phòng
            <br />
            truyền cảm hứng
          </h2>
          <p>Gợi ý bố trí từ bộ sưu tập nội thất của cửa hàng.</p>
          <Link to="/shop" className={styles.buy}>
            Khám phá
          </Link>
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
        <h2>#FuniroFurniture</h2>
        <div className={styles.collage}>
          {gallery.map((image) => (
            <img key={image} src={image} alt="" />
          ))}
        </div>
      </section>
    </>
  );
}
