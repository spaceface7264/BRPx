type WizardProgressProps = {
  current: number;
  total?: number;
  labels: string[];
};

export function WizardProgress({ current, total = 4, labels }: WizardProgressProps) {
  return (
    <div className="mb-8">
      <div className="flex justify-between gap-2 text-xs font-medium text-slate-500">
        {labels.map((label, i) => (
          <span
            key={label}
            className={`flex-1 text-center ${i + 1 === current ? "text-slate-900" : ""}`}
          >
            {label}
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-1">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full ${i < current ? "bg-slate-900" : "bg-slate-200"}`}
          />
        ))}
      </div>
    </div>
  );
}
