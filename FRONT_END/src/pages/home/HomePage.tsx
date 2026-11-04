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
import { toCard } from "../../lib/productView.ts";
import { catalogService } from "../../services/catalog.service.ts";
import { errorText } from "../../services/http.ts";
import type { Category, Product } from "../../types/api.ts";
import styles from "./HomePage.module.css";

const rooms = [
  { image: room1, index: "01", label: "Bed Room", title: "Inner Peace" },
  { image: room2, index: "02", label: "Living", title: "Living Room" },
  { image: room3, index: "03", label: "Dining", title: "Dining Room" },
];
const gallery = [share1, share2, share3, share4, share5, share6, share7, share8, share9];
const fallbackImages = [dining, living, bedroom];

export function HomePage() {
  const [roomIndex, setRoomIndex] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState("");
  const visibleRooms = [0, 1].map((offset) => rooms[(roomIndex + offset) % rooms.length]);

  useEffect(() => {
    Promise.all([
      catalogService.getCategories({ parentId: "null", limit: 12 }),
      catalogService.getFeaturedProducts(8),
    ])
      .then(([categoryResult, productResult]) => {
        setCategories(categoryResult.data);
        setProducts(productResult.data);
      })
      .catch((reason: unknown) => setError(errorText(reason)));
  }, []);

  return (
    <>
      <section className={styles.hero}>
        <div className={styles.panel}>
          <p className={styles.kicker}>New Arrival</p>
          <h1>
            Discover Our
            <br />
            New Collection
          </h1>
          <p>Sản phẩm nổi bật và danh mục lấy từ cửa hàng.</p>
          <Link to="/shop" className={styles.buy}>
            Buy Now
          </Link>
        </div>
      </section>

      <section className={`wrap ${styles.section}`}>
        <h2>Browse The Range</h2>
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
        <h2>Our Products</h2>
        <div className={styles.grid}>
          {products.map((product) => (
            <ProductCard key={product.id} product={toCard(product)} />
          ))}
        </div>
        <Link to="/shop" className={styles.more}>
          Show More
        </Link>
      </section>

      <section className={styles.inspire}>
        <div className={styles.inspireCopy}>
          <h2>
            50+ Beautiful rooms
            <br />
            inspiration
          </h2>
          <p>Bộ sưu tập hình ảnh trưng bày, không lấy từ API.</p>
          <Link to="/shop" className={styles.buy}>
            Explore More
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
                    aria-label="Next room"
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
        <p>Share your setup with</p>
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
