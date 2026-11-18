import { useSearchParams } from "react-router-dom";
import { PageState, Pagination, Select } from "../../components/common/index.ts";
import { FeatureBar } from "../../components/layout/FeatureBar.tsx";
import { PageBanner } from "../../components/layout/PageBanner.tsx";
import { ProductGrid } from "../../components/product/ProductGrid.tsx";
import { useRequest } from "../../hooks/useRequest.ts";
import { catalogService } from "../../services/catalog.service.ts";
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
  const sort = sorts.some((item) => item.value === params.get("sort"))
    ? (params.get("sort") as (typeof sorts)[number]["value"])
    : "newest";
  const page = Number(params.get("page") ?? "1") || 1;

  const { data: categories = [] } = useRequest(
    () => catalogService.getCategories({ limit: 50 }).then((result) => result.data).catch(() => []),
    [],
  );
  const { data: brands = [] } = useRequest(
    () => catalogService.getBrands({ limit: 50 }).then((result) => result.data).catch(() => []),
    [],
  );
  const { data, error, loading } = useRequest(async () => {
    const result = await catalogService.getProducts({
      page,
      limit: 12,
      search: query || undefined,
      categoryId: categoryId || undefined,
      brandId: brandId || undefined,
      sort,
    });
    return { products: result.data, pagination: result.pagination ?? null };
  }, [query, categoryId, brandId, sort, page]);

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (!value || value === "newest") next.delete(key);
    else next.set(key, value);
    if (key !== "page") next.delete("page");
    setParams(next);
  }

  const products = data?.products ?? [];
  const pagination = data?.pagination;
  const count = pagination ? `${pagination.total} sản phẩm` : `${products.length} sản phẩm`;

  return (
    <>
      <PageBanner title="Cửa hàng" />
      <div className={styles.toolbar}>
        <div className="wrap">
          <div className={styles.filters}>
            <Select
              label="Danh mục"
              value={categoryId}
              onChange={(value) => update("category", value)}
              options={[{ value: "", label: "Tất cả" }, ...categories.map((item) => ({ value: item.id, label: item.name }))]}
            />
            <Select
              label="Thương hiệu"
              value={brandId}
              onChange={(value) => update("brand", value)}
              options={[{ value: "", label: "Tất cả" }, ...brands.map((item) => ({ value: item.id, label: item.name }))]}
            />
            <span>
              {count}
              {query ? ` cho “${query}”` : ""}
            </span>
          </div>
          <Select label="Sắp xếp" value={sort} onChange={(value) => update("sort", value)} options={[...sorts]} />
        </div>
      </div>
      <div className={`wrap ${styles.grid}`}>
        <PageState
          error={error}
          empty={!loading && data && products.length === 0 ? "Không có sản phẩm phù hợp." : undefined}
        />
        {error ? null : loading && !data ? (
          <div className={styles.skeleton} aria-hidden="true">
            {Array.from({ length: 8 }, (_, index) => (
              <span key={index} />
            ))}
          </div>
        ) : (
          <ProductGrid products={products} />
        )}
      </div>
      <div className="wrap">
        <Pagination
          page={page}
          totalPages={pagination?.totalPages ?? 1}
          onChange={(nextPage) => update("page", String(nextPage))}
        />
      </div>
      <FeatureBar />
    </>
  );
}
