import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, showToast } from "../../components/common/index.ts";
import { PageBanner } from "../../components/layout/PageBanner.tsx";
import { useCart } from "../../contexts/useCart.ts";
import { catalogApi, wishlistApi } from "../../services/api.ts";
import { errorMessage } from "../../services/http.ts";
import type { WishlistItem } from "../../types/api.ts";
import { formatPrice } from "../../utils/money.ts";
import panels from "../../styles/panels.module.css";

export function WishlistPage() {
  const { refresh } = useCart();
  const navigate = useNavigate();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    wishlistApi
      .list()
      .then((result) => {
        if (!active) return;
        setItems(result.data ?? []);
        setError(null);
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

  async function remove(id: string) {
    try {
      await wishlistApi.remove(id);
      setItems((current) => current.filter((item) => item.id !== id));
      showToast("Đã xóa khỏi danh sách yêu thích.", "success");
    } catch (reason) {
      showToast(errorMessage(reason), "error");
    }
  }

  async function move(item: WishlistItem) {
    try {
      const detail = await catalogApi.productById(item.productId);
      if ((detail.data.variants ?? []).length > 0) {
        navigate(`/shop/${item.slug}`);
        showToast("Hãy chọn phân loại trước khi chuyển vào giỏ.", "warning");
        return;
      }
      await wishlistApi.moveToCart(item.id, { quantity: 1 });
      await refresh();
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      showToast("Đã chuyển vào giỏ hàng.", "success");
    } catch (reason) {
      showToast(errorMessage(reason), "error");
    }
  }

  return (
    <>
      <PageBanner title="Yêu thích" />
      <div className={`wrap ${panels.stack}`}>
        {loading ? <p>Đang tải danh sách yêu thích...</p> : null}
        {error ? <p className={panels.alert}>{error}</p> : null}
        {!loading && !error && items.length === 0 ? (
          <p>
            Danh sách đang trống. <Link to="/shop">Xem cửa hàng</Link>
          </p>
        ) : null}
        {items.map((item) => {
          const price = item.salePrice ?? item.minPrice ?? item.basePrice;
          return (
            <article key={item.id} className={panels.card}>
              <div className={panels.row}>
                {item.primaryImage ? <img src={item.primaryImage} alt="" width={72} height={72} style={{ objectFit: "cover" }} /> : null}
                <div>
                  <Link to={`/shop/${item.slug}`}>{item.name}</Link>
                  <p>{formatPrice(price)}</p>
                  {!item.isActive ? <p>Sản phẩm đã ngừng kinh doanh.</p> : null}
                </div>
              </div>
              <div className={panels.row}>
                <Button size="sm" variant="outline" onClick={() => void move(item)}>
                  Chuyển vào giỏ
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void remove(item.id)}>
                  Xóa
                </Button>
              </div>
            </article>
          );
        })}
        {items.length > 0 ? (
          <Button
            variant="ghost"
            onClick={() =>
              void wishlistApi
                .clear()
                .then(() => {
                  setItems([]);
                  showToast("Đã xóa toàn bộ danh sách.", "success");
                })
                .catch((reason) => showToast(errorMessage(reason), "error"))
            }
          >
            Xóa tất cả
          </Button>
        ) : null}
      </div>
    </>
  );
}
