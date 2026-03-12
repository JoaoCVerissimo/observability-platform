import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "./components/layout/app-shell";
import LogsPage from "./pages/logs";
import TracesPage from "./pages/traces";
import TraceDetailPage from "./pages/traces/trace-detail";
import MetricsPage from "./pages/metrics";
import AlertsPage from "./pages/alerts";
import AlertCreatePage from "./pages/alerts/create";
import DashboardsPage from "./pages/dashboards";
import DashboardViewPage from "./pages/dashboards/view";

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/logs" replace />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="/traces" element={<TracesPage />} />
        <Route path="/traces/:traceId" element={<TraceDetailPage />} />
        <Route path="/metrics" element={<MetricsPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/alerts/create" element={<AlertCreatePage />} />
        <Route path="/dashboards" element={<DashboardsPage />} />
        <Route path="/dashboards/:id" element={<DashboardViewPage />} />
      </Routes>
    </AppShell>
  );
}
