export const PRODUCTS_PER_PAGE = 48;

export type Page<T> = {
  items: T[];
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
};

export function paginate<T>(
  items: T[],
  rawPage: unknown,
  perPage: number = PRODUCTS_PER_PAGE,
): Page<T> {
  const requested = Number.parseInt(typeof rawPage === "string" ? rawPage : "1", 10);
  const page = Number.isFinite(requested) && requested > 0 ? requested : 1;
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * perPage;
  return {
    items: items.slice(start, start + perPage),
    page: safePage,
    totalPages,
    total: items.length,
    perPage,
  };
}
