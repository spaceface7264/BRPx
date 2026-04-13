import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  title?: string;
  description?: string;
  actions?: ReactNode;
};

export function Card({ title, description, actions, className = "", children, ...props }: CardProps) {
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white ${className}`}
      {...props}
    >
      {title || description || actions ? (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            {title ? <h2 className="text-base font-semibold text-slate-900">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-sm text-slate-500">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}
