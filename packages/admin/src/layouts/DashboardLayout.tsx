import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.tsx";

const navCls = ({ isActive }: { isActive: boolean }): string =>
  `block rounded-lg px-3 py-2 text-sm font-medium ${isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800/80"}`;

export function DashboardLayout() {
  const { logout, tenant } = useAuth();

  return (
    <div className="flex min-h-dvh bg-slate-50">
      <aside className="flex w-56 shrink-0 flex-col border-r border-slate-800 bg-slate-900 text-slate-100">
        <div className="border-b border-slate-800 px-4 py-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">BRP Front</p>
          <p className="mt-1 truncate text-sm font-medium text-white">{tenant?.businessName ?? "Admin"}</p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-3">
          <NavLink to="/dashboard" className={navCls} end>
            Overblik
          </NavLink>
        </nav>
        <div className="border-t border-slate-800 p-3">
          <button
            type="button"
            onClick={() => logout()}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            Log ud
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  );
}
