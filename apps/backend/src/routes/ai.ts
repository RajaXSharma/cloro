import { Router } from "express";
import { z } from "zod";
import OpenAI from "openai";
import { getDocText } from "../ai/docContext.js";
import { chatSystem, applySystem } from "../ai/prompts.js";
import { isMember, query } from "../db.js";
import { EditOpsSchema } from "shared";

export const aiRouter = Router();

// ponytail: user API keys stored plaintext in DB — fine for a self-hosted demo;
// encrypt or move to a secrets store if this ever becomes multi-tenant SaaS.
async function getAiConfig(userId: string) {
  const { rows } = await query(
    "select ai_api_key, ai_model, ai_base_url from users where id = $1",
    [userId],
  );
  const r = rows[0];
  if (!r?.ai_api_key || !r?.ai_model) return null;
  return { apiKey: r.ai_api_key, model: r.ai_model, baseURL: r.ai_base_url || undefined };
}

const settingsSchema = z.object({
  api_key: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  base_url: z.string().optional(),
});

aiRouter.get("/settings", async (req, res) => {
  const { rows } = await query(
    `select ai_model, ai_base_url, (ai_api_key is not null) as has_key
     from users where id = $1`,
    [req.user!.id],
  );
  res.json(rows[0]);
});

aiRouter.put("/settings", async (req, res) => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid fields" });
  const { api_key, model, base_url } = parsed.data;
  await query(
    `update users set
       ai_api_key = coalesce($1, ai_api_key),
       ai_model = coalesce($2, ai_model),
       ai_base_url = coalesce($3, ai_base_url)
     where id = $4`,
    [api_key ?? null, model ?? null, base_url ?? null, req.user!.id],
  );
  res.json({ ok: true });
});

aiRouter.post("/chat", async (req, res) => {
  const chatSchema = z.object({
    documentId: z.string().min(1),
    question: z.string().min(1),
  });
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid fields" });
  if (!(await isMember(parsed.data.documentId, req.user!.id)))
    return res.status(403).json({ error: "forbidden" });

  const cfg = await getAiConfig(req.user!.id);
  if (!cfg)
    return res.status(400).json({ error: "set your API key and model in settings" });

  const doc = await getDocText(parsed.data.documentId);
  if (!doc) return res.status(404).json({ error: "document not found" });

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  try {
    const openai = new OpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseURL });
    const stream = await openai.chat.completions.create({
      model: cfg.model,
      stream: true,
      messages: [
        { role: "system", content: chatSystem(doc.name, doc.text) },
        { role: "user", content: parsed.data.question },
      ],
    });
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) res.write(`data: ${JSON.stringify({ delta })}\n\n`);
    }
    res.write("data: [DONE]\n\n");
  } catch {
    res.write(`data: ${JSON.stringify({ error: "ai request failed — check your key, model and base URL in settings" })}\n\n`);
  } finally {
    res.end();
  }
});

aiRouter.post("/apply", async (req, res) => {
  const applySchema = z.object({
    documentId: z.string().min(1),
    instruction: z.string().min(1),
  });
  const parsed = applySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "invalid fields" });
  if (!(await isMember(parsed.data.documentId, req.user!.id)))
    return res.status(403).json({ error: "forbidden" });

  const cfg = await getAiConfig(req.user!.id);
  if (!cfg)
    return res.status(400).json({ error: "set your API key and model in settings" });

  const doc = await getDocText(parsed.data.documentId);
  if (!doc) return res.status(404).json({ error: "document not found" });

  // backend never applies — returns edits, client validates + transacts
  try {
    const openai = new OpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseURL });
    const completion = await openai.chat.completions.create({
      model: cfg.model,
      messages: [
        { role: "system", content: applySystem(doc.name, doc.text, parsed.data.instruction) },
      ],
      response_format: {
        type: "json_schema",
        // OpenAI structured outputs require an object root
        json_schema: { name: "edit_ops", schema: z.toJSONSchema(EditOpsSchema) },
      },
    });
    const raw = completion.choices[0]?.message?.content ?? "";
    const result = EditOpsSchema.safeParse(JSON.parse(raw));
    if (!result.success) return res.status(502).json({ error: "ai returned invalid edits" });
    res.json(result.data);
  } catch {
    res.status(502).json({ error: "ai request failed — check your key, model and base URL in settings" });
  }
});
