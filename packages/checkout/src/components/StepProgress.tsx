const STEPS = [
  { id: 1, label: "Facility" },
  { id: 2, label: "Products" },
  { id: 3, label: "Email" },
  { id: 4, label: "Payment" }
] as const;

type StepProgressProps = {
  currentStep: number;
};

export function StepProgress({ currentStep }: StepProgressProps) {
  return (
    <nav aria-label="Checkout progress" className="w-full">
      <ol className="flex w-full gap-2 sm:gap-3">
        {STEPS.map((step) => {
          const active = currentStep >= step.id;
          return (
            <li key={step.id} className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div
                className={`h-1.5 rounded-full transition-colors duration-300 ${
                  active ? "" : "bg-slate-200"
                }`}
                style={
                  active
                    ? { backgroundColor: "var(--brand-primary, #111827)" }
                    : undefined
                }
              />
              <span
                className={`truncate text-center text-[10px] font-medium uppercase tracking-wide sm:text-xs ${
                  active ? "text-slate-900" : "text-slate-400"
                }`}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
