import { NextResponse } from "next/server";
import { getActiveProducts, getCategories } from "@/lib/products";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const limit = searchParams.get("limit");

  let products = getActiveProducts(limit ? parseInt(limit, 10) : undefined);

  if (category) {
    products = products.filter((p) => p.category.toLowerCase() === category.toLowerCase());
  }

  return NextResponse.json({
    products,
    categories: getCategories(),
  });
}
