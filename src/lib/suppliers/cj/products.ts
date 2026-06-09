import { cjAuthenticatedFetch } from "./client";
import { cjConfig, defaultCjShippingEstimate, usdToStoreCurrency } from "@/lib/config";
import { landedSupplierCost } from "@/lib/automation/pricing";
import { normalizeCjProduct } from "@/lib/product-normalize";
import { estimateCjShipping } from "./shipping";

export type CjProductForImport = {
  title: string;
  description: string;
  image_url: string;
  category: string;
  supplier_cost: number;
  supplier_product_cost: number;
  supplier_shipping_cost: number;
  trend_score: number;
  supplier_sku: string;
  supplier_pid: string;
  supplier_vid: string;
  stock: number;
};

type ListProduct = {
  pid?: string;
  productId?: string;
  productName?: string;
  productNameEn?: string;
  productSku?: string;
  sellPrice?: string | number;
  productImage?: string;
  productImageSet?: string[];
  bigImage?: string;
  categoryName?: string;
  categoryNameEn?: string;
  listedNum?: number;
  description?: string;
  variants?: Array<{
    vid?: string;
    variantId?: string;
    variantSku?: string;
    variantSellPrice?: number;
    variantImage?: string;
    inventory?: number;
  }>;
};

type ListV2Product = {
  id?: string;
  nameEn?: string;
  sku?: string;
  bigImage?: string;
  sellPrice?: string | number;
  nowPrice?: string | number;
  listedNum?: number;
  threeCategoryName?: string;
  twoCategoryName?: string;
  oneCategoryName?: string;
  description?: string;
};

type CjVariant = {
  vid?: string;
  variantSku?: string;
  variantSellPrice?: number;
  variantImage?: string;
  inventoryNum?: number;
  countryInventory?: Record<string, number>;
  inventories?: Array<{
    countryCode?: string;
    totalInventory?: number;
  }>;
};

type ProductQueryData = {
  pid: string;
  productNameEn: string;
  productSku: string;
  description: string;
  productImageSet?: string[];
  bigImage?: string;
  categoryName?: string;
  categoryNameEn?: string;
  listedNum?: number;
  sellPrice?: string | number;
  /** Current CJ API */
  variants?: CjVariant[];
  /** Legacy field name */
  variantList?: CjVariant[];
};

type ListStrategy = {
  name: string;
  path: string;
  parse: (data: unknown) => { pid: string; seed?: ListProduct | ListV2Product }[];
};

const TRENDING_KEYWORDS = ["phone", "kitchen", "led", "pet", "beauty", "home"];

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function attachShippingEstimate(product: CjProductForImport): Promise<CjProductForImport> {
  const productCost = product.supplier_product_cost;
  let shippingCost = defaultCjShippingEstimate();

  if (product.supplier_vid) {
    try {
      const estimate = await estimateCjShipping([{ vid: product.supplier_vid, quantity: 1 }]);
      if (estimate) shippingCost = estimate.shippingCost;
    } catch {
      /* use fallback */
    }
    await sleep(300);
  }

  return {
    ...product,
    supplier_product_cost: productCost,
    supplier_shipping_cost: shippingCost,
    supplier_cost: landedSupplierCost(productCost, shippingCost),
  };
}

function getVariants(p: ProductQueryData): CjVariant[] {
  return p.variants ?? p.variantList ?? [];
}

function countryStock(variant: CjVariant, country: string): number {
  if (variant.countryInventory?.[country] != null) {
    return variant.countryInventory[country] ?? 0;
  }
  const row = variant.inventories?.find((i) => i.countryCode === country);
  return row?.totalInventory ?? 0;
}

function totalStock(variant: CjVariant): number {
  if (variant.inventoryNum != null) return variant.inventoryNum;
  return (
    variant.inventories?.reduce((sum, row) => sum + (row.totalInventory ?? 0), 0) ?? 0
  );
}

function parseListV1(data: unknown): { pid: string; seed?: ListProduct }[] {
  const list = (data as { list?: ListProduct[] })?.list ?? [];
  return list
    .map((item) => {
      const pid = item.pid ?? item.productId;
      return pid ? { pid, seed: item } : null;
    })
    .filter((x): x is { pid: string; seed: ListProduct } => x !== null);
}

function parseListV2(data: unknown): { pid: string; seed?: ListV2Product }[] {
  const content = (data as { content?: Array<{ productList?: ListV2Product[] }> })?.content ?? [];
  const products = content.flatMap((block) => block.productList ?? []);
  return products
    .map((item) => (item.id ? { pid: item.id, seed: item } : null))
    .filter((x): x is { pid: string; seed: ListV2Product } => x !== null);
}

async function fetchWithStrategies(limit: number): Promise<{ pid: string; seed?: ListProduct | ListV2Product }[]> {
  const pageSize = String(Math.min(limit, 50));
  const strategies: ListStrategy[] = [
    {
      name: "all-v1",
      path: `/product/list?${new URLSearchParams({
        pageNum: "1",
        pageSize,
        searchType: "0",
        orderBy: "listedNum",
        sort: "desc",
      })}`,
      parse: parseListV1,
    },
    {
      name: "trending-v1",
      path: `/product/list?${new URLSearchParams({
        pageNum: "1",
        pageSize,
        searchType: "2",
        orderBy: "listedNum",
        sort: "desc",
      })}`,
      parse: parseListV1,
    },
    {
      name: "keyword-v2",
      path: `/product/listV2?${new URLSearchParams({
        page: "1",
        size: pageSize,
        keyWord: "phone",
        orderBy: "1",
        sort: "desc",
      })}`,
      parse: parseListV2,
    },
    {
      name: "trending-v2",
      path: `/product/listV2?${new URLSearchParams({
        page: "1",
        size: pageSize,
        productFlag: "0",
        orderBy: "1",
        sort: "desc",
      })}`,
      parse: parseListV2,
    },
  ];

  for (const keyword of TRENDING_KEYWORDS.slice(1)) {
    strategies.push({
      name: `keyword-${keyword}`,
      path: `/product/listV2?${new URLSearchParams({
        page: "1",
        size: pageSize,
        keyWord: keyword,
        orderBy: "1",
        sort: "desc",
      })}`,
      parse: parseListV2,
    });
  }

  const seen = new Set<string>();
  const results: { pid: string; seed?: ListProduct | ListV2Product }[] = [];

  for (const strategy of strategies) {
    if (results.length >= limit) break;

    try {
      const res = await cjAuthenticatedFetch<unknown>(strategy.path);
      const items = strategy.parse(res.data);
      for (const item of items) {
        if (seen.has(item.pid)) continue;
        seen.add(item.pid);
        results.push(item);
        if (results.length >= limit) break;
      }
    } catch {
      /* try next strategy */
    }

    await sleep(200);
  }

  return results;
}

function pickVariant(variantList: CjVariant[]) {
  const withGbStock = variantList.find(
    (v) => countryStock(v, cjConfig.countryCode) > 0 && v.vid
  );
  if (withGbStock) return withGbStock;

  const withAnyStock = variantList.find((v) => totalStock(v) > 0 && v.vid);
  if (withAnyStock) return withAnyStock;

  return variantList.find((v) => v.vid) ?? null;
}

async function fetchCjProductDetail(pid: string): Promise<CjProductForImport | null> {
  const attempts = [
    new URLSearchParams({ pid }),
    new URLSearchParams({ pid, countryCode: cjConfig.countryCode }),
  ];

  for (const params of attempts) {
    try {
      const res = await cjAuthenticatedFetch<ProductQueryData>(`/product/query?${params}`);
      const mapped = mapQueryProduct(res.data);
      if (mapped) return mapped;
    } catch {
      /* try next params */
    }
  }

  return null;
}

function mapQueryProduct(p: ProductQueryData | null | undefined): CjProductForImport | null {
  const variantList = p ? getVariants(p) : [];
  if (!p || variantList.length === 0) return null;

  const variant = pickVariant(variantList);
  if (!variant?.vid) return null;

  const costUsd =
    variant.variantSellPrice ??
    parseFloat(String(p.sellPrice ?? "0"));
  const stock =
    countryStock(variant, cjConfig.countryCode) || totalStock(variant) || 50;
  const image =
    variant.variantImage ??
    p.productImageSet?.[0] ??
    p.bigImage ??
    "https://via.placeholder.com/400";

  const productCost = usdToStoreCurrency(costUsd);
  const listedNum = p.listedNum ?? 50;
  const trendScore = Math.min(99, 60 + Math.log10(listedNum + 1) * 15);

  return normalizeCjProduct({
    title: p.productNameEn || "Product",
    description: stripHtml(p.description || p.productNameEn),
    image_url: image,
    category: p.categoryNameEn ?? p.categoryName ?? "Trending",
    supplier_product_cost: productCost,
    supplier_shipping_cost: 0,
    supplier_cost: productCost,
    trend_score: Math.round(trendScore),
    supplier_sku: variant.variantSku || p.productSku,
    supplier_pid: p.pid,
    supplier_vid: variant.vid,
    stock: Math.max(stock, 0),
  });
}

function mapListItem(item: ListProduct): CjProductForImport | null {
  const pid = item.pid ?? item.productId;
  const variant = item.variants?.[0];
  const vid = variant?.vid ?? variant?.variantId;
  if (!pid || !vid) return null;

  const costUsd = parseFloat(String(variant?.variantSellPrice ?? item.sellPrice ?? "0"));
  const image =
    variant?.variantImage ??
    item.productImage ??
    item.bigImage ??
    item.productImageSet?.[0] ??
    "https://via.placeholder.com/400";

  const productCost = usdToStoreCurrency(costUsd);
  return normalizeCjProduct({
    title: item.productNameEn ?? item.productName ?? "Product",
    description: stripHtml(item.description ?? item.productNameEn ?? ""),
    image_url: image,
    category: item.categoryNameEn ?? item.categoryName ?? "Trending",
    supplier_product_cost: productCost,
    supplier_shipping_cost: 0,
    supplier_cost: productCost,
    trend_score: Math.min(99, 60 + Math.log10((item.listedNum ?? 10) + 1) * 15),
    supplier_sku: variant?.variantSku ?? item.productSku ?? pid,
    supplier_pid: pid,
    supplier_vid: vid,
    stock: variant?.inventory ?? 50,
  });
}

export type FetchCjResult = {
  products: CjProductForImport[];
  candidatesFound: number;
};

export async function fetchCjTrendingProducts(limit = 24): Promise<CjProductForImport[]> {
  const { products } = await fetchCjTrendingProductsWithMeta(limit);
  return products;
}

export async function fetchCjTrendingProductsWithMeta(limit = 24): Promise<FetchCjResult> {
  const candidates = await fetchWithStrategies(limit);
  const products: CjProductForImport[] = [];

  for (const { pid, seed } of candidates.slice(0, limit)) {
    try {
      const detail = await fetchCjProductDetail(pid);
      if (detail) {
        products.push(await attachShippingEstimate(detail));
        await sleep(600);
        continue;
      }
    } catch {
      /* fall through */
    }

    if (seed && "productNameEn" in seed) {
      const fallback = mapListItem(seed);
      if (fallback) products.push(await attachShippingEstimate(fallback));
    }

    await sleep(600);
  }

  return {
    products: products.filter((p) => p.supplier_pid && p.supplier_vid),
    candidatesFound: candidates.length,
  };
}
