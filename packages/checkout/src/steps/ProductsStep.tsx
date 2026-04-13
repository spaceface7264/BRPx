import { formatPriceIncVat } from "../api/brp.ts";
import type { BrpBusinessUnit, BrpProduct, BrpWebCategory } from "../api/types.ts";

type ProductsStepProps = {
  businessUnit: BrpBusinessUnit;
  categories: BrpWebCategory[];
  products: BrpProduct[];
  isLoading: boolean;
  error: string | null;
  onSelect: (product: BrpProduct) => void;
  onBack: () => void;
};

function groupProductsByWebCategory(
  categories: BrpWebCategory[],
  products: BrpProduct[]
): { category: BrpWebCategory | null; name: string; items: BrpProduct[] }[] {
  const sorted = [...categories].sort((a, b) => a.sortorder - b.sortorder);
  const blocks: { category: BrpWebCategory | null; name: string; items: BrpProduct[] }[] = [];
  const used = new Set<number>();

  for (const cat of sorted) {
    const items = products.filter((p) => p.webcategoryid === cat.id);
    if (items.length === 0) continue;
    items.forEach((p) => used.add(p.id));
    blocks.push({ category: cat, name: cat.name, items });
  }

  const other = products.filter((p) => !used.has(p.id));
  if (other.length > 0) {
    blocks.push({ category: null, name: "Other", items: other });
  }

  return blocks;
}

export function ProductsStep({
  businessUnit,
  categories,
  products,
  isLoading,
  error,
  onSelect,
  onBack
}: ProductsStepProps) {
  const grouped = groupProductsByWebCategory(categories, products);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Products</h2>
          <p className="mt-1 text-sm text-slate-500">{businessUnit.name}</p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Back
        </button>
      </div>
      {error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">
          {error}
        </p>
      ) : null}
      {isLoading ? (
        <div className="space-y-6" aria-busy="true">
          <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
          <div className="grid gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        </div>
      ) : grouped.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
          No bookable products for this location. Try another facility.
        </p>
      ) : (
        <div className="space-y-8">
          {grouped.map((block) => (
            <section
              key={block.category ? String(block.category.id) : "other"}
              aria-labelledby={`cat-${block.category ? block.category.id : "other"}`}
            >
              <h3
                id={`cat-${block.category ? block.category.id : "other"}`}
                className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                {block.name}
              </h3>
              <ul className="grid gap-3">
                {block.items.map((product) => (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(product)}
                      className="flex w-full flex-col items-start rounded-xl border border-slate-200 bg-[var(--checkout-surface,#fff)] p-4 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md active:scale-[0.99]"
                    >
                      <span className="font-medium text-slate-900">{product.name}</span>
                      {product.description ? (
                        <span className="mt-1 line-clamp-2 text-sm text-slate-500">{product.description}</span>
                      ) : null}
                      <div className="mt-3 flex w-full flex-wrap items-center justify-between gap-2">
                        <span className="text-base font-semibold text-slate-900">
                          {formatPriceIncVat(product.priceincvat)}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          {product.producttype}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
