import { Link } from "react-router-dom";
import { Button, PageState, showToast, toastError } from "../../components/common/index.ts";
import { PageBanner } from "../../components/layout/PageBanner.tsx";
import { ProductGrid } from "../../components/product/ProductGrid.tsx";
import { useCart } from "../../contexts/useCart.ts";
import { useRequest } from "../../hooks/useRequest.ts";
import { wishlistService } from "../../services/wishlist.service.ts";
import type { Product, WishlistItem } from "../../types/api.ts";
import styles from "./WishlistPage.module.css";

function asProduct(item: WishlistItem): Product {
  return {
    id: item.productId,
    name: item.name,
    slug: item.slug,
    sku: item.slug,
    basePrice: item.basePrice,
    salePrice: item.salePrice,
    minPrice: item.minPrice,
    thumbnail: item.primaryImage,
    categoryId: null,
    brandId: null,
  };
}

export function WishlistPage() {
  const { refresh } = useCart();
  const { data: items = [], error, loading, reload } = useRequest(
    () => wishlistService.getWishlist().then((result) => result.data),
    [],
  );

  return (
    <>
      <PageBanner title="Yêu thích" />
      <div className="wrap section">
        <PageState
          loading={loading && items.length === 0}
          error={error}
          empty={!loading && items.length === 0 ? "Chưa có sản phẩm yêu thích." : undefined}
          emptyAction={<Link to="/shop">Xem cửa hàng</Link>}
        />
        {error ? null : (
        <ProductGrid
          products={items.map(asProduct)}
          action={(product) => {
            const item = items.find((entry) => entry.productId === product.id);
            if (!item) return null;
            return (
              <div className={styles.actions}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void wishlistService
                      .moveWishlistToCart(item.id)
                      .then(async () => {
                        showToast("Đã chuyển vào giỏ.", "success");
                        await refresh();
                        reload();
                      })
                      .catch(toastError)
                  }
                >
                  Vào giỏ
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={`Xóa ${item.name}`}
                  onClick={() => void wishlistService.removeWishlistItem(item.id).then(reload).catch(toastError)}
                >
                  ×
                </Button>
              </div>
            );
          }}
        />
        )}
      </div>
    </>
  );
}
