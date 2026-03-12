import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createAlertRule } from "@/lib/api-client";

export default function AlertCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: "",
    description: "",
    queryType: "metric" as const,
    query: "",
    condition: "gt" as const,
    threshold: 0,
    severity: "warning" as const,
    evaluationIntervalS: 60,
    forDurationS: 0,
  });

  const mutation = useMutation({
    mutationFn: createAlertRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-rules"] });
      navigate("/alerts");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  const update = (field: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="flex flex-col h-full">
      <header className="h-14 border-b border-gray-800 bg-gray-900/50 flex items-center px-6 gap-4">
        <button
          onClick={() => navigate("/alerts")}
          className="text-gray-400 hover:text-gray-200 text-sm"
        >
          &larr; Back
        </button>
        <h2 className="text-lg font-semibold">Create Alert Rule</h2>
      </header>

      <div className="flex-1 overflow-auto p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-200 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-200 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Query Type
              </label>
              <select
                value={form.queryType}
                onChange={(e) => update("queryType", e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-300 text-sm"
              >
                <option value="metric">Metric (PromQL)</option>
                <option value="log">Log (ClickHouse)</option>
                <option value="trace">Trace (ClickHouse)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Severity
              </label>
              <select
                value={form.severity}
                onChange={(e) => update("severity", e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-300 text-sm"
              >
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Query</label>
            <input
              type="text"
              value={form.query}
              onChange={(e) => update("query", e.target.value)}
              required
              placeholder={
                form.queryType === "metric"
                  ? "rate(http_requests_total[5m])"
                  : "severity = 'ERROR'"
              }
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-200 font-mono text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Condition
              </label>
              <select
                value={form.condition}
                onChange={(e) => update("condition", e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-300 text-sm"
              >
                <option value="gt">Greater than</option>
                <option value="lt">Less than</option>
                <option value="gte">Greater or equal</option>
                <option value="lte">Less or equal</option>
                <option value="eq">Equal to</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Threshold
              </label>
              <input
                type="number"
                value={form.threshold}
                onChange={(e) => update("threshold", parseFloat(e.target.value))}
                step="any"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                For Duration (s)
              </label>
              <input
                type="number"
                value={form.forDurationS}
                onChange={(e) =>
                  update("forDurationS", parseInt(e.target.value, 10))
                }
                min={0}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-200 text-sm"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 bg-brand-600 text-white rounded-md text-sm hover:bg-brand-700 disabled:opacity-50"
            >
              {mutation.isPending ? "Creating..." : "Create Rule"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/alerts")}
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md text-sm hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>

          {mutation.isError && (
            <p className="text-red-400 text-sm">
              Error: {(mutation.error as Error).message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
