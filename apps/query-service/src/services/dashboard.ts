import { getClickHouse } from "./clickhouse.js";
import type { Dashboard, CreateDashboardInput, UpdateDashboardInput } from "@obs/shared";

function toClickHouseDateTime(iso?: string): string {
  const s = iso ?? new Date().toISOString();
  return s.replace("T", " ").replace("Z", "").replace(/\.\d+$/, "");
}

export async function listDashboards(): Promise<Dashboard[]> {
  const ch = getClickHouse();
  const result = await ch.query({
    query: "SELECT * FROM dashboards FINAL ORDER BY updated_at DESC",
    format: "JSONEachRow",
  });
  const rows = (await result.json()) as Record<string, unknown>[];
  return rows.map(mapRowToDashboard);
}

export async function getDashboard(id: string): Promise<Dashboard | null> {
  const ch = getClickHouse();
  const result = await ch.query({
    query: "SELECT * FROM dashboards FINAL WHERE id = {id:UUID}",
    query_params: { id },
    format: "JSONEachRow",
  });
  const rows = (await result.json()) as Record<string, unknown>[];
  if (rows.length === 0) return null;
  return mapRowToDashboard(rows[0]);
}

export async function createDashboard(input: CreateDashboardInput): Promise<Dashboard> {
  const ch = getClickHouse();
  const id = crypto.randomUUID();
  const now = toClickHouseDateTime();

  await ch.insert({
    table: "dashboards",
    values: [
      {
        id,
        title: input.title,
        description: input.description ?? "",
        widgets: JSON.stringify(input.widgets ?? []),
        created_at: now,
        updated_at: now,
      },
    ],
    format: "JSONEachRow",
  });

  return {
    id,
    title: input.title,
    description: input.description ?? "",
    widgets: input.widgets ?? [],
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateDashboard(
  id: string,
  input: UpdateDashboardInput
): Promise<Dashboard | null> {
  const existing = await getDashboard(id);
  if (!existing) return null;

  const ch = getClickHouse();
  const now = toClickHouseDateTime();

  const updated = {
    id,
    title: input.title ?? existing.title,
    description: input.description ?? existing.description,
    widgets: JSON.stringify(input.widgets ?? existing.widgets),
    created_at: toClickHouseDateTime(existing.createdAt),
    updated_at: now,
  };

  await ch.insert({
    table: "dashboards",
    values: [updated],
    format: "JSONEachRow",
  });

  return {
    ...existing,
    title: updated.title,
    description: updated.description,
    widgets: input.widgets ?? existing.widgets,
    updatedAt: now,
  };
}

export async function deleteDashboard(id: string): Promise<boolean> {
  const ch = getClickHouse();
  await ch.command({
    query: "DELETE FROM dashboards WHERE id = {id:UUID}",
    query_params: { id },
  });
  return true;
}

function mapRowToDashboard(row: Record<string, unknown>): Dashboard {
  let widgets = [];
  try {
    widgets =
      typeof row.widgets === "string" ? JSON.parse(row.widgets as string) : [];
  } catch {
    widgets = [];
  }

  return {
    id: String(row.id),
    title: String(row.title),
    description: String(row.description ?? ""),
    widgets,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
