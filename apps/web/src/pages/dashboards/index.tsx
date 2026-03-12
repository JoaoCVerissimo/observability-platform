import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  fetchDashboards,
  createDashboard,
  deleteDashboard,
} from "@/lib/api-client";

interface DashboardItem {
  id: string;
  title: string;
  description: string;
  updatedAt: string;
}

export default function DashboardsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["dashboards"],
    queryFn: fetchDashboards,
  });

  const createMutation = useMutation({
    mutationFn: createDashboard,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["dashboards"] });
      setShowCreate(false);
      setTitle("");
      navigate(`/dashboards/${(result as { id: string }).id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDashboard,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["dashboards"] }),
  });

  const dashboards = (data?.data ?? []) as DashboardItem[];

  return (
    <div className="flex flex-col h-full">
      <header className="h-14 border-b border-gray-800 bg-gray-900/50 flex items-center justify-between px-6">
        <h2 className="text-lg font-semibold">Dashboards</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-1.5 bg-brand-600 text-white rounded-md text-sm hover:bg-brand-700"
        >
          New Dashboard
        </button>
      </header>

      <div className="flex-1 overflow-auto p-6">
        {showCreate && (
          <div className="mb-6 p-4 bg-gray-900 border border-gray-800 rounded-lg">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate({ title });
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Dashboard title..."
                required
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-200 text-sm"
                autoFocus
              />
              <button
                type="submit"
                className="px-4 py-2 bg-brand-600 text-white rounded-md text-sm"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md text-sm"
              >
                Cancel
              </button>
            </form>
          </div>
        )}

        {isLoading ? (
          <div className="p-8 text-center text-gray-500">
            Loading dashboards...
          </div>
        ) : dashboards.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No dashboards yet. Click "New Dashboard" to create one.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboards.map((d) => (
              <div
                key={d.id}
                className="p-4 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-700 cursor-pointer transition-colors"
                onClick={() => navigate(`/dashboards/${d.id}`)}
              >
                <h3 className="font-medium text-gray-200">{d.title}</h3>
                {d.description && (
                  <p className="text-sm text-gray-500 mt-1">{d.description}</p>
                )}
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs text-gray-600">
                    Updated {new Date(d.updatedAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMutation.mutate(d.id);
                    }}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
