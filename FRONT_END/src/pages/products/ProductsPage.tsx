import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button, TextInput } from "../../components/common/index.ts";
import { FeatureBar } from "../../components/layout/FeatureBar.tsx";
import { PageBanner } from "../../components/layout/PageBanner.tsx";
import { ProductCard } from "../../components/product/ProductCard.tsx";
import { aiApi, catalogApi } from "../../services/api.ts";
import { errorMessage } from "../../services/http.ts";
import type { AiSearchProduct, Brand, Category, Pagination } from "../../types/api.ts";
import { toStoreProduct, type StoreProduct } from "../../utils/product.ts";
import panels from "../../styles/panels.module.css";
import styles from "./ProductsPage.module.css";

const sorts = [
  { value: "newest", label: "Mới nhất" },
  { value: "price_asc", label: "Giá tăng dần" },
  { value: "price_desc", label: "Giá giảm dần" },
  { value: "sales", label: "Bán chạy" },
  { value: "rating", label: "Đánh giá cao" },
];

function aiToStore(product: AiSearchProduct): StoreProduct {
  const media = product.media?.find((item) => item.isPrimary) ?? product.media?.[0];
  const price =
    product.salePrice ??
    product.availableVariantPriceRange?.min ??
    product.minPrice ??
    product.basePrice;
  const categoryName = product.category && typeof product.category === "object" ? product.category.name : "";
  return {
    id: String(product._id),
    slug: product.slug,
    name: product.name,
    subtitle: categoryName || product.sku || "",
    price,
    originalPrice:
      product.salePrice != null && product.salePrice < product.basePrice ? product.basePrice : undefined,
    image: media?.mediaUrl ?? null,
  };
}

export function ProductsPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const categoryId = params.get("category") ?? "";
  const brandId = params.get("brand") ?? "";
  const sort = params.get("sort") ?? "newest";
  const page = Number(params.get("page") ?? "1") || 1;
  const minPrice = params.get("min") ?? "";
  const maxPrice = params.get("max") ?? "";
  const aiMode = params.get("ai") === "1";

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [aiReply, setAiReply] = useState("");
  const [loadedKey, setLoadedKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const requestKey = JSON.stringify({ aiMode, query, categoryId, brandId, sort, page, minPrice, maxPrice });
  const pendingAi = aiMode && !query.trim();
  const loading = !pendingAi && loadedKey !== requestKey;
  const [aiQuery, setAiQuery] = useState(query);

  useEffect(() => {
    catalogApi.categories({ limit: 50 }).then((result) => setCategories(result.items)).catch(() => undefined);
    catalogApi.brands({ limit: 50 }).then((result) => setBrands(result.items)).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (pendingAi) return;
    let active = true;
    const task = aiMode
      ? aiApi.search(query, page, 8).then((result) => {
          if (!active) return;
          setAiReply(result.data.reply);
          setProducts(result.data.products.map(aiToStore));
          const info = result.data.pagination;
          setPagination({
            page: info.page,
            limit: info.limit,
            total: info.totalProducts,
            totalPages: info.totalPages,
          });
        })
      : catalogApi
          .products({
            page,
            limit: 12,
            search: query || undefined,
            categoryId: categoryId || undefined,
            brandId: brandId || undefined,
            sort,
            minPrice: minPrice || undefined,
            maxPrice: maxPrice || undefined,
          })
          .then((result) => {
            if (!active) return;
            setAiReply("");
            setProducts(result.items.map(toStoreProduct));
            setPagination(result.pagination ?? null);
          });
    task
      .catch((reason) => {
        if (!active) return;
        setProducts([]);
        setError(errorMessage(reason));
      })
      .finally(() => {
        if (active) setLoadedKey(requestKey);
      });
    return () => {
      active = false;
    };
  }, [aiMode, brandId, categoryId, maxPrice, minPrice, page, pendingAi, query, requestKey, sort]);

  function update(next: Record<string, string | null>) {
    const paramsNext = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (!value) paramsNext.delete(key);
      else paramsNext.set(key, value);
    }
    if (!("page" in next)) paramsNext.delete("page");
    setParams(paramsNext);
  }

  return (
    <>
      <PageBanner title="Cửa hàng" />
      <div className={styles.toolbar}>
        <div className="wrap">
          <div className={styles.filters}>
            <label>
              Danh mục{" "}
              <select value={categoryId} onChange={(event) => update({ category: event.target.value || null })}>
                <option value="">Tất cả</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Thương hiệu{" "}
              <select value={brandId} onChange={(event) => update({ brand: event.target.value || null })}>
                <option value="">Tất cả</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Giá từ{" "}
              <input
                inputMode="numeric"
                value={minPrice}
                onChange={(event) => update({ min: event.target.value.replace(/[^\d]/g, "") || null })}
                style={{ width: 100, height: 40, border: "1px solid #9f9f9f", padding: "0 8px" }}
              />
            </label>
            <label>
              đến{" "}
              <input
                inputMode="numeric"
                value={maxPrice}
                onChange={(event) => update({ max: event.target.value.replace(/[^\d]/g, "") || null })}
                style={{ width: 100, height: 40, border: "1px solid #9f9f9f", padding: "0 8px" }}
              />
            </label>
            <span>
              {pagination ? `${pagination.total} sản phẩm` : ""}
              {query ? ` cho “${query}”` : ""}
            </span>
          </div>
          <label>
            Sắp xếp{" "}
            <select value={sort} onChange={(event) => update({ sort: event.target.value })}>
              {sorts.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="wrap" style={{ paddingTop: 24 }}>
        <form
          className={panels.row}
          onSubmit={(event) => {
            event.preventDefault();
            update({ ai: "1", q: aiQuery || null });
          }}
        >
          <TextInput
            label="Tìm bằng mô tả (AI)"
            value={aiQuery}
            onChange={(event) => setAiQuery(event.target.value)}
            placeholder="Ví dụ: bàn ăn gỗ cho 4 người, dưới 5 triệu"
            fullWidth
          />
          <Button type="submit" variant="outline">
            Tìm AI
          </Button>
          {aiMode ? (
            <Button type="button" variant="ghost" onClick={() => update({ ai: null })}>
              Bộ lọc thường
            </Button>
          ) : null}
        </form>
        {pendingAi ? <p>Nhập mô tả sản phẩm rồi bấm Tìm AI.</p> : null}
        {aiReply ? <p>{aiReply}</p> : null}
      </div>
      {loading ? <p className={panels.state}>Đang tải sản phẩm...</p> : null}
      {error ? <p className={`wrap ${panels.alert}`}>{error}</p> : null}
      {!loading && !error && products.length === 0 ? (
        <p className={panels.state}>Không có sản phẩm phù hợp.</p>
      ) : null}
      <div className={`wrap ${styles.grid}`}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      {pagination && pagination.totalPages > 1 ? (
        <div className={panels.pager}>
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => update({ page: String(page - 1) })}
          >
            Trước
          </Button>
          <span>
            Trang {pagination.page}/{pagination.totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= pagination.totalPages}
            onClick={() => update({ page: String(page + 1) })}
          >
            Sau
          </Button>
        </div>
      ) : null}
      <FeatureBar />
    </>
  );
}
