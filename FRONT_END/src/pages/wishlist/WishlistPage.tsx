import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button, showToast } from "../../components/common/index.ts";
import { PageBanner } from "../../components/layout/PageBanner.tsx";
import { useCart } from "../../contexts/useCart.ts";
import { formatMoney } from "../../lib/money.ts";
import { sellingPrice } from "../../lib/productView.ts";
import { errorText } from "../../services/http.ts";
import { wishlistService } from "../../services/wishlist.service.ts";
import type { WishlistItem } from "../../types/api.ts";

export function WishlistPage() {
  const { refresh } = useCart();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [error, setError] = useState("");

  function load() {
    wishlistService.getWishlist()
      .then((result) => {
        setItems(result.data);
        setError("");
      })
      .catch((reason: unknown) => setError(errorText(reason)));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <PageBanner title="Wishlist" />
      <div className="wrap" style={{ padding: "64px 0", display: "grid", gap: 16 }}>
        {error ? <p>{error}</p> : null}
        {items.length === 0 ? (
          <p>Chưa có sản phẩm yêu thích. <Link to="/shop">Xem cửa hàng</Link></p>
        ) : (
          items.map((item) => (
            <article key={item.id} style={{ display: "flex", gap: 16, alignItems: "center" }}>
              {item.primaryImage ? <img src={item.primaryImage} alt="" width={80} height={80} /> : null}
              <div>
                <Link to={`/shop/${item.slug}`}>{item.name}</Link>
                <p>{formatMoney(sellingPrice(item))}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  wishlistService.moveWishlistToCart(item.id)
                    .then(async () => {
                      showToast("Đã chuyển vào giỏ.", "success");
                      await refresh();
                      load();
                    })
                    .catch((reason: unknown) => showToast(errorText(reason), "error"));
                }}
              >
                Vào giỏ
              </Button>
              <button
                type="button"
                onClick={() => wishlistService.removeWishlistItem(item.id).then(load).catch((reason: unknown) => showToast(errorText(reason), "error"))}
              >
                Xóa
              </button>
            </article>
          ))
        )}
      </div>
    </>
  );
}
