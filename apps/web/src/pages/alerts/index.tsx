import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchAlertRules, fetchFiringAlerts, deleteAlertRule } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface AlertRule {
  id: string;
  name: string;
  queryType: string;
  query: string;
  condition: string;
  threshold: number;
  severity: string;
  enabled: boolean;
}

export default function AlertsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: rulesData, isLoading } = useQuery({
    queryKey: ["alert-rules"],
    queryFn: fetchAlertRules,
  });

  const { data: firingData } = useQuery({
    queryKey: ["firing-alerts"],
    queryFn: fetchFiringAlerts,
    refetchInterval: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAlertRule,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alert-rules"] }),
  });

  const rules = (rulesData?.data ?? []) as AlertRule[];
  const firing = (firingData?.data ?? []) as Array<Record<string, unknown>>;

  return (
    <div className="flex flex-col h-full">
      <header className="h-14 border-b border-gray-800 bg-gray-900/50 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Alerts</h2>
          {firing.length > 0 && (
            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
              {firing.length} firing
            </span>
          )}
        </div>
        <button
          onClick={() => navigate("/alerts/create")}
          className="px-4 py-1.5 bg-brand-600 text-white rounded-md text-sm hover:bg-brand-700"
        >
          Create Rule
        </button>
      </header>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading rules...</div>
        ) : rules.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No alert rules configured. Click "Create Rule" to get started.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-900 border-b border-gray-800">
              <tr className="text-left text-gray-500">
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Condition</th>
                <th className="px-4 py-2">Severity</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr
                  key={rule.id}
                  className="border-b border-gray-800/50 hover:bg-gray-800/30"
                >
                  <td className="px-4 py-2 text-gray-300">{rule.name}</td>
                  <td className="px-4 py-2 text-gray-400">{rule.queryType}</td>
                  <td className="px-4 py-2 text-gray-400 font-mono text-xs">
                    {rule.condition} {rule.threshold}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={cn(
                        "px-2 py-0.5 text-xs rounded-full",
                        rule.severity === "critical"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-yellow-500/20 text-yellow-400"
                      )}
                    >
                      {rule.severity}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={cn(
                        "text-xs",
                        rule.enabled ? "text-green-400" : "text-gray-500"
                      )}
                    >
                      {rule.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => deleteMutation.mutate(rule.id)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
