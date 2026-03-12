import type { FastifyInstance } from "fastify";
import * as dashboardService from "../services/dashboard.js";
import type { CreateDashboardInput, UpdateDashboardInput } from "@obs/shared";

export async function dashboardRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/dashboards", async () => {
    const dashboards = await dashboardService.listDashboards();
    return { data: dashboards };
  });

  app.get<{ Params: { id: string } }>(
    "/api/v1/dashboards/:id",
    async (request, reply) => {
      const dashboard = await dashboardService.getDashboard(
        request.params.id
      );
      if (!dashboard) {
        return reply.status(404).send({ error: "Dashboard not found" });
      }
      return dashboard;
    }
  );

  app.post<{ Body: CreateDashboardInput }>(
    "/api/v1/dashboards",
    async (request, reply) => {
      const { title } = request.body;
      if (!title) {
        return reply.status(400).send({ error: "title is required" });
      }
      const dashboard = await dashboardService.createDashboard(request.body);
      return reply.status(201).send(dashboard);
    }
  );

  app.put<{ Params: { id: string }; Body: UpdateDashboardInput }>(
    "/api/v1/dashboards/:id",
    async (request, reply) => {
      const dashboard = await dashboardService.updateDashboard(
        request.params.id,
        request.body
      );
      if (!dashboard) {
        return reply.status(404).send({ error: "Dashboard not found" });
      }
      return dashboard;
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/api/v1/dashboards/:id",
    async (request, reply) => {
      await dashboardService.deleteDashboard(request.params.id);
      return reply.status(204).send();
    }
  );
}
