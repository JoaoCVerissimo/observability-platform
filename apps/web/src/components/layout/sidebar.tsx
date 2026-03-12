import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/logs", label: "Logs", icon: "📋" },
  { to: "/traces", label: "Traces", icon: "🔗" },
  { to: "/metrics", label: "Metrics", icon: "📈" },
  { to: "/alerts", label: "Alerts", icon: "🔔" },
  { to: "/dashboards", label: "Dashboards", icon: "📊" },
];

export function Sidebar() {
  return (
    <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-lg font-bold text-brand-500">ObsLens</h1>
        <p className="text-xs text-gray-500">Observability Platform</p>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-brand-600/20 text-brand-200"
                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
              )
            }
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-800 text-xs text-gray-600">
        v0.1.0
      </div>
    </aside>
  );
}
