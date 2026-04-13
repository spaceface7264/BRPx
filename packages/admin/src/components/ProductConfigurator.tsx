import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, Card } from "@brp/ui";
import { api } from "../api/client.ts";
import type { BrpProduct, BrpWebCategory, CatalogResponse, ProductSettings, Tenant } from "../api/types.ts";
import { useTenant } from "../context/TenantContext.tsx";
import { useToast } from "../context/ToastContext.tsx";

function defaultSettings(base: ProductSettings): ProductSettings {
  return {
    displayMode: base.displayMode ?? "cards",
    showDescriptions: base.showDescriptions ?? true,
    showPrices: base.showPrices ?? true,
    categoryOrder: [...(base.categoryOrder ?? [])],
    productOrder: [...(base.productOrder ?? [])],
    hiddenProducts: [...(base.hiddenProducts ?? [])],
    featuredProducts: [...(base.featuredProducts ?? [])],
    hiddenCategories: [...(base.hiddenCategories ?? [])]
  };
}

function SortableCategory({
  id,
  title,
  count,
  headerRight,
  body
}: {
  id: number;
  title: string;
  count: number;
  headerRight: ReactNode;
  body: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.85 : 1
  };
  return (
    <div ref={setNodeRef} style={style} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80">
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-3 py-2">
        <button
          type="button"
          className="cursor-grab touch-none rounded px-1 text-slate-400 hover:bg-slate-100 active:cursor-grabbing"
          aria-label="Træk for at flytte kategori"
          {...attributes}
          {...listeners}
        >
          ⋮⋮
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
          <p className="text-xs text-slate-500">{count} produkter</p>
        </div>
        {headerRight}
      </div>
      {body}
    </div>
  );
}

function productTypeDa(t: string): string {
  switch (t) {
    case "subscription":
      return "Abonnement";
    case "valueCard":
      return "Klippekort";
    case "entry":
      return "Entré";
    case "event":
      return "Event";
    default:
      return t;
  }
}

export function ProductConfigurator({ tenant }: { tenant: Tenant }) {
  const { refresh, updateLocal } = useTenant();
  const { push } = useToast();
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [settings, setSettings] = useState<ProductSettings>(() => defaultSettings(tenant.productSettings));
  const [unitId, setUnitId] = useState<number | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setSettings(defaultSettings(tenant.productSettings));
    });
  }, [tenant.productSettings]);

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const data = await api<CatalogResponse>("/admin/brp/catalog");
        if (!c) {
          setCatalog(data);
          if (data.businessunits.length > 0) {
            setUnitId((id) => id ?? data.businessunits[0].id);
          }
        }
      } catch {
        if (!c) setCatalog(null);
      }
    })();
    return () => {
      c = true;
    };
  }, [tenant.brpLastSync]);

  const orderedCategories = useMemo(() => {
    const categories = unitId && catalog ? catalog.categoriesByUnit[unitId] ?? [] : [];
    const byId = new Map(categories.map((c) => [c.id, c]));
    const order = settings.categoryOrder.length
      ? [...settings.categoryOrder]
      : categories.map((c) => c.id).sort((a, b) => (byId.get(a)?.sortorder ?? 0) - (byId.get(b)?.sortorder ?? 0));
    const seen = new Set(order);
    for (const c of categories) {
      if (!seen.has(c.id)) order.push(c.id);
    }
    return order.map((id) => byId.get(id)).filter(Boolean) as BrpWebCategory[];
  }, [catalog, unitId, settings.categoryOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const productsByCategory = useCallback(
    (catId: number): BrpProduct[] => {
      const products = unitId && catalog ? catalog.productsByUnit[unitId] ?? [] : [];
      const list = products.filter((p) => p.webcategoryid === catId);
      const order = settings.productOrder;
      const idx = new Map(order.map((id, i) => [id, i]));
      const feat = new Set(settings.featuredProducts);
      return [...list].sort((a, b) => {
        const af = feat.has(a.id) ? 0 : 1;
        const bf = feat.has(b.id) ? 0 : 1;
        if (af !== bf) return af - bf;
        if (order.length) return (idx.get(a.id) ?? 9999) - (idx.get(b.id) ?? 9999);
        return a.name.localeCompare(b.name, "da");
      });
    },
    [catalog, unitId, settings.productOrder, settings.featuredProducts]
  );

  const moveProduct = (catId: number, productId: number, dir: -1 | 1): void => {
    const list = productsByCategory(catId).map((p) => p.id);
    const i = list.indexOf(productId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    const nextList = arrayMove(list, i, j);
    const others = settings.productOrder.filter((id) => !list.includes(id));
    setSettings((s) => ({ ...s, productOrder: [...others, ...nextList] }));
  };

  const onDragEnd = (e: DragEndEvent): void => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = orderedCategories.map((c) => c.id);
    const oldI = ids.indexOf(Number(active.id));
    const newI = ids.indexOf(Number(over.id));
    if (oldI < 0 || newI < 0) return;
    const next = arrayMove(ids, oldI, newI);
    setSettings((s) => ({ ...s, categoryOrder: next }));
  };

  const toggleHiddenProduct = (id: number): void => {
    setSettings((s) => {
      const set = new Set(s.hiddenProducts);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...s, hiddenProducts: [...set] };
    });
  };

  const toggleFeatured = (id: number): void => {
    setSettings((s) => {
      const fp = [...s.featuredProducts];
      const i = fp.indexOf(id);
      if (i >= 0) fp.splice(i, 1);
      else fp.unshift(id);
      return { ...s, featuredProducts: fp };
    });
  };

  const toggleHiddenCategory = (id: number): void => {
    setSettings((s) => {
      const set = new Set(s.hiddenCategories);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...s, hiddenCategories: [...set] };
    });
  };

  const save = async (): Promise<void> => {
    try {
      const res = await api<{ tenant: Tenant }>("/admin/tenant/products", {
        method: "PUT",
        body: JSON.stringify({ productSettings: settings })
      });
      updateLocal(res.tenant);
      await refresh();
      push("Produktindstillinger gemt", "success");
    } catch {
      push("Kunne ikke gemme", "error");
    }
  };

  const formatPrice = (cents: number): string =>
    new Intl.NumberFormat("da-DK", { style: "currency", currency: "DKK" }).format(cents / 100);

  return (
    <Card
      title="Produkter"
      description="Synlighed, fremhævet og rækkefølge"
      actions={
        <Button type="button" className="text-xs" onClick={() => void save()}>
          Gem
        </Button>
      }
    >
      {!catalog ? (
        <p className="text-sm text-slate-500">Indlæser katalog…</p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              <span className="text-slate-600">Visning</span>
              <select
                className="rounded-lg border border-slate-200 px-2 py-1"
                value={settings.displayMode}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, displayMode: e.target.value === "list" ? "list" : "cards" }))
                }
              >
                <option value="cards">Kort</option>
                <option value="list">Liste</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.showDescriptions}
                onChange={(e) => setSettings((s) => ({ ...s, showDescriptions: e.target.checked }))}
              />
              Beskrivelser
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.showPrices}
                onChange={(e) => setSettings((s) => ({ ...s, showPrices: e.target.checked }))}
              />
              Priser
            </label>
          </div>
          {catalog.businessunits.length > 1 ? (
            <label className="block text-sm">
              <span className="text-slate-600">Sted</span>
              <select
                className="mt-1 w-full max-w-xs rounded-lg border border-slate-200 px-2 py-1"
                value={unitId ?? ""}
                onChange={(e) => setUnitId(Number(e.target.value))}
              >
                {catalog.businessunits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={orderedCategories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {orderedCategories.map((cat) => {
                  const hiddenCat = settings.hiddenCategories.includes(cat.id);
                  const prods = productsByCategory(cat.id);
                  return (
                    <SortableCategory
                      key={cat.id}
                      id={cat.id}
                      title={cat.name}
                      count={prods.length}
                      headerRight={
                        <label className="flex items-center gap-2 text-xs text-slate-600">
                          <input
                            type="checkbox"
                            checked={!hiddenCat}
                            onChange={() => toggleHiddenCategory(cat.id)}
                          />
                          Synlig
                        </label>
                      }
                      body={
                        <ul className="divide-y divide-slate-200 bg-white">
                          {prods.map((p) => {
                            const hidden = settings.hiddenProducts.includes(p.id);
                            const featured = settings.featuredProducts.includes(p.id);
                            return (
                              <li key={p.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                                <div className="flex min-w-[160px] flex-1 flex-col gap-0.5">
                                  <span className="font-medium text-slate-900">{p.name}</span>
                                  <span className="text-xs text-slate-500">
                                    {productTypeDa(p.producttype)}
                                    {settings.showPrices ? ` · ${formatPrice(p.priceincvat)}` : ""}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="px-2 py-1 text-xs"
                                    onClick={() => moveProduct(cat.id, p.id, -1)}
                                  >
                                    Op
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="px-2 py-1 text-xs"
                                    onClick={() => moveProduct(cat.id, p.id, 1)}
                                  >
                                    Ned
                                  </Button>
                                  <button
                                    type="button"
                                    className={`rounded px-2 py-1 text-xs ${featured ? "bg-amber-100 text-amber-900" : "text-slate-500"}`}
                                    onClick={() => toggleFeatured(p.id)}
                                    aria-label="Fremhæv"
                                  >
                                    ★
                                  </button>
                                  <label className="flex items-center gap-1 text-xs text-slate-600">
                                    <input
                                      type="checkbox"
                                      checked={!hidden}
                                      onChange={() => toggleHiddenProduct(p.id)}
                                    />
                                    Vises
                                  </label>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      }
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </Card>
  );
}
