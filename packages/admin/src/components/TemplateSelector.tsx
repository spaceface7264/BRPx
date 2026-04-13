import { Button } from "@brp/ui";

export type TemplateId = "minimal" | "bold" | "branded";

const options: { id: TemplateId; title: string; blurb: string; swatch: string }[] = [
  {
    id: "minimal",
    title: "Minimal",
    blurb: "Lyst, rent, én kolonne",
    swatch: "bg-white border-slate-200"
  },
  {
    id: "bold",
    title: "Bold",
    blurb: "Mørk header, mere vægt",
    swatch: "bg-slate-900 border-slate-700"
  },
  {
    id: "branded",
    title: "Branded",
    blurb: "Hero og mere visuel dybde",
    swatch: "bg-gradient-to-br from-indigo-600 to-violet-700 border-indigo-500"
  }
];

type TemplateSelectorProps = {
  value: string;
  onChange: (id: TemplateId) => void;
  onSave?: () => void;
  showSave?: boolean;
};

export function TemplateSelector({ value, onChange, onSave, showSave }: TemplateSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {options.map((o) => {
          const selected = value === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(o.id)}
              className={`rounded-xl border-2 p-3 text-left transition ${
                selected ? "border-slate-900 ring-2 ring-slate-900/10" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className={`mb-3 h-16 w-full rounded-lg border ${o.swatch}`} aria-hidden />
              <p className="font-semibold text-slate-900">{o.title}</p>
              <p className="mt-1 text-xs text-slate-500">{o.blurb}</p>
            </button>
          );
        })}
      </div>
      {showSave && onSave ? (
        <Button type="button" onClick={onSave}>
          Gem skabelon
        </Button>
      ) : null}
    </div>
  );
}
