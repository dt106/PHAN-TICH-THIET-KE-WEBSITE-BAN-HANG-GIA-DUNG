import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FeatureBar } from "../../components/layout/FeatureBar.tsx";
import { PageBanner } from "../../components/layout/PageBanner.tsx";
import { ProductCard } from "../../components/product/ProductCard.tsx";
import { toCard } from "../../lib/productView.ts";
import { catalogService } from "../../services/catalog.service.ts";
import { errorText } from "../../services/http.ts";
import type { Pagination } from "../../services/http.ts";
import type { Brand, Category, Product } from "../../types/api.ts";
import styles from "./ProductsPage.module.css";

const sorts = [
  { value: "newest", label: "Mới nhất" },
  { value: "price_asc", label: "Giá tăng" },
  { value: "price_desc", label: "Giá giảm" },
  { value: "sales", label: "Bán chạy" },
  { value: "rating", label: "Đánh giá" },
] as const;

export function ProductsPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const categoryId = params.get("category") ?? "";
  const brandId = params.get("brand") ?? "";
  const sort = (params.get("sort") ?? "newest") as (typeof sorts)[number]["value"];
  const page = Number(params.get("page") ?? "1") || 1;
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    catalogService.getCategories({ limit: 50 }).then((result) => setCategories(result.data)).catch(() => undefined);
    catalogService.getBrands({ limit: 50 }).then((result) => setBrands(result.data)).catch(() => undefined);
  }, []);

  useEffect(() => {
    catalogService.getProducts({
      page,
      limit: 12,
      search: query || undefined,
      categoryId: categoryId || undefined,
      brandId: brandId || undefined,
      sort: sorts.some((item) => item.value === sort) ? sort : "newest",
    })
      .then((result) => {
        setProducts(result.data);
        setPagination(result.pagination ?? null);
        setError("");
      })
      .catch((reason: unknown) => setError(errorText(reason)));
  }, [query, categoryId, brandId, sort, page]);

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (!value || value === "newest") next.delete(key);
    else next.set(key, value);
    if (key !== "page") next.delete("page");
    setParams(next);
  }

  return (
    <>
      <PageBanner title="Shop" />
      <div className={styles.toolbar}>
        <div className="wrap">
          <div className={styles.filters}>
            <label>
              Danh mục{" "}
              <select value={categoryId} onChange={(event) => update("category", event.target.value)}>
                <option value="">Tất cả</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>
            <label>
              Thương hiệu{" "}
              <select value={brandId} onChange={(event) => update("brand", event.target.value)}>
                <option value="">Tất cả</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>{brand.name}</option>
                ))}
              </select>
            </label>
            <span>
              {pagination ? `${pagination.total} sản phẩm` : `${products.length} sản phẩm`}
              {query ? ` cho “${query}”` : ""}
            </span>
          </div>
          <label>
            Sắp xếp{" "}
            <select value={sort} onChange={(event) => update("sort", event.target.value)}>
              {sorts.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
      {error ? <p className="wrap">{error}</p> : null}
      <div className={`wrap ${styles.grid}`}>
        {products.map((product) => (
          <ProductCard key={product.id} product={toCard(product)} />
        ))}
      </div>
      {pagination && pagination.totalPages > 1 ? (
        <div className="wrap" style={{ display: "flex", gap: 12, paddingBottom: 48 }}>
          <button type="button" disabled={page <= 1} onClick={() => update("page", String(page - 1))}>
            Trước
          </button>
          <span>
            {page} / {pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= pagination.totalPages}
            onClick={() => update("page", String(page + 1))}
          >
            Sau
          </button>
        </div>
      ) : null}
      <FeatureBar />
    </>
  );
}
