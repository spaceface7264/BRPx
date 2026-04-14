import type { BrpBusinessUnit } from "../api/types.ts";

type BusinessUnitStepProps = {
  units: BrpBusinessUnit[];
  isLoading: boolean;
  error: string | null;
  onSelect: (unit: BrpBusinessUnit) => void;
  title: string;
  subtitle: string;
};

export function BusinessUnitStep({
  units,
  isLoading,
  error,
  onSelect,
  title,
  subtitle
}: BusinessUnitStepProps) {
  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>
      {error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="grid gap-3">
        {units.map((unit) => (
          <li key={unit.id}>
            <button
              type="button"
              onClick={() => onSelect(unit)}
              className="flex w-full flex-col items-start rounded-xl border border-slate-200 bg-[var(--checkout-surface,#fff)] p-4 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md active:scale-[0.99]"
            >
              <span className="font-medium text-slate-900">{unit.name}</span>
              <span className="mt-1 text-sm text-slate-500">{unit.mailaddress}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
