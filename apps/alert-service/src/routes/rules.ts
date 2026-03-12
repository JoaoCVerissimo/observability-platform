import type { FastifyInstance } from "fastify";
import * as ruleStore from "../services/rule-store.js";
import type { CreateAlertRuleInput } from "@obs/shared";

export async function ruleRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/v1/rules", async () => {
    const rules = await ruleStore.listRules();
    return { data: rules };
  });

  app.get<{ Params: { id: string } }>(
    "/api/v1/rules/:id",
    async (request, reply) => {
      const rule = await ruleStore.getRule(request.params.id);
      if (!rule) {
        return reply.status(404).send({ error: "Rule not found" });
      }
      return rule;
    }
  );

  app.post<{ Body: CreateAlertRuleInput }>(
    "/api/v1/rules",
    async (request, reply) => {
      const { name, queryType, query, condition, threshold, severity } =
        request.body;
      if (!name || !queryType || !query || !condition || threshold === undefined || !severity) {
        return reply.status(400).send({ error: "Missing required fields" });
      }
      const rule = await ruleStore.createRule(request.body);
      return reply.status(201).send(rule);
    }
  );

  app.put<{ Params: { id: string }; Body: Partial<CreateAlertRuleInput> }>(
    "/api/v1/rules/:id",
    async (request, reply) => {
      const rule = await ruleStore.updateRule(
        request.params.id,
        request.body
      );
      if (!rule) {
        return reply.status(404).send({ error: "Rule not found" });
      }
      return rule;
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/api/v1/rules/:id",
    async (request, reply) => {
      await ruleStore.deleteRule(request.params.id);
      return reply.status(204).send();
    }
  );

  app.get<{ Params: { id: string } }>(
    "/api/v1/rules/:id/history",
    async (request) => {
      const history = await ruleStore.getRuleHistory(request.params.id);
      return { data: history };
    }
  );
}
