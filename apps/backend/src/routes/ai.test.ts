import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import http from "node:http";

// These routes are tested against a stub OpenAI-compatible provider rather than a
// mocked SDK. The bug they cover was a request the *provider* rejected, so the
// assertion has to be about what actually goes on the wire.
vi.mock("../db.js", () => ({
  pool: { connect: vi.fn() },
  query: vi.fn(),
  isUuid: () => true,
  projectOfFile: vi.fn(),
  isFileMember: vi.fn(),
  isProjectMember: vi.fn(),
  projectOwner: vi.fn(),
}));

vi.mock("../files/text.js", () => ({ getFileText: vi.fn() }));

// the real middleware is covered in auth.test.ts; here we only need a signed-in user
vi.mock("../auth.js", () => ({
  verifyToken: vi.fn(),
  requireAuth: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = { id: "user-1", email: "t@x.com", name: "T" };
    next();
  },
}));

import { isFileMember, query } from "../db.js";
import { getFileText } from "../files/text.js";
import { createApp } from "../http.js";

const DOC = "export const add = (a, b) => a + b;\n";
const FID = "3f1a2b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b";

interface WireMessage {
  role: string;
  content: string;
}
interface WireRequest {
  messages: WireMessage[];
  stream?: boolean;
  response_format?: { type: string };
}

let provider: Server;
let providerUrl: string;
let api: Server;
let apiUrl: string;
let seen: WireRequest[] = [];
/** When set, the stub provider fails every call with this HTTP status. */
let failWith: number | null = null;

/** Google's OpenAI-compat layer rejects a request that carries no user turn. */
const NO_USER_TURN = {
  error: {
    code: 400,
    message: "* GenerateContentRequest.contents: contents is not specified\n",
    status: "INVALID_ARGUMENT",
  },
};

const EDITS = { edits: [{ op: "replace", range: { start: 13, end: 16 }, text: "sum" }] };

beforeAll(async () => {
  provider = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const parsed = JSON.parse(body) as WireRequest;
      seen.push(parsed);

      if (failWith !== null) {
        res.writeHead(failWith, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: { code: failWith, message: "stub failure", status: "STUB" } }));
        return;
      }

      if (!parsed.messages.some((m) => m.role === "user")) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify(NO_USER_TURN));
        return;
      }

      if (parsed.stream) {
        res.writeHead(200, { "content-type": "text/event-stream" });
        const chunk = {
          id: "c",
          object: "chat.completion.chunk",
          created: 0,
          model: "stub",
          choices: [{ index: 0, delta: { content: "hello" }, finish_reason: null }],
        };
        res.end(`data: ${JSON.stringify(chunk)}\n\ndata: [DONE]\n\n`);
        return;
      }

      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          id: "c",
          object: "chat.completion",
          created: 0,
          model: "stub",
          choices: [
            {
              index: 0,
              finish_reason: "stop",
              message: { role: "assistant", content: JSON.stringify(EDITS) },
            },
          ],
        }),
      );
    });
  });
  await new Promise<void>((r) => provider.listen(0, "127.0.0.1", () => r()));
  providerUrl = `http://127.0.0.1:${(provider.address() as AddressInfo).port}/v1`;

  api = createApp().listen(0);
  await new Promise<void>((r) => api.once("listening", () => r()));
  apiUrl = `http://127.0.0.1:${(api.address() as AddressInfo).port}`;
});

afterAll(() => {
  provider.close();
  api.close();
});

beforeEach(() => {
  seen = [];
  failWith = null;
  vi.mocked(isFileMember).mockResolvedValue(true);
  vi.mocked(getFileText).mockResolvedValue({ path: "hello.ts", text: DOC });
  vi.mocked(query).mockResolvedValue({
    rows: [{ ai_api_key: "k", ai_model: "stub-model", ai_base_url: providerUrl }],
  } as never);
});

const post = (path: string, body: unknown) =>
  fetch(`${apiUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /ai/apply", () => {
  // Regression: the instruction used to be folded into the system prompt, leaving a
  // messages array with no user turn. OpenAI accepts that; Google's compat endpoint
  // answers 400 "contents is not specified", which the route turned into a blanket
  // 502 - so Edit mode failed while Ask mode worked.
  it("sends a user turn, and returns the edits", async () => {
    const res = await post("/ai/apply", { documentId: FID, instruction: "rename add to sum" });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual(EDITS);

    const roles = seen[0].messages.map((m) => m.role);
    expect(roles).toContain("user");
    expect(roles).toContain("system");
  });

  it("carries the instruction as the user turn and the document as the system turn", async () => {
    await post("/ai/apply", { documentId: FID, instruction: "rename add to sum" });

    const user = seen[0].messages.find((m) => m.role === "user");
    const system = seen[0].messages.find((m) => m.role === "system");
    expect(user?.content).toBe("rename add to sum");
    expect(system?.content).toContain(DOC);
    expect(system?.content).toContain("hello.ts");
  });

  it("still asks the provider for structured output", async () => {
    await post("/ai/apply", { documentId: FID, instruction: "rename add to sum" });
    expect(seen[0].response_format?.type).toBe("json_schema");
  });
});

describe("POST /ai/chat", () => {
  it("also sends a user turn, and streams the answer", async () => {
    const res = await post("/ai/chat", { documentId: FID, question: "what does this do?" });

    expect(res.status).toBe(200);
    await expect(res.text()).resolves.toContain("hello");

    const roles = seen[0].messages.map((m) => m.role);
    expect(roles).toContain("user");
    expect(seen[0].messages.find((m) => m.role === "user")?.content).toBe("what does this do?");
  });
});

// A rate limit used to read as "check your key, model and base URL", which sent
// people chasing credentials for a problem that clears itself in 25 seconds.
describe("provider failure messages", () => {
  it("names a rate limit as a rate limit", async () => {
    failWith = 429;
    const res = await post("/ai/apply", { documentId: FID, instruction: "x" });
    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toEqual({ error: "AI rate limited. Retry shortly." });
  });

  it("names capacity as capacity", async () => {
    failWith = 503;
    const res = await post("/ai/apply", { documentId: FID, instruction: "x" });
    await expect(res.json()).resolves.toEqual({ error: "Model overloaded. Try again." });
  });

  it("still points at credentials when the key really is the problem", async () => {
    failWith = 401;
    const res = await post("/ai/apply", { documentId: FID, instruction: "x" });
    await expect(res.json()).resolves.toEqual({
      error: "ai request failed. Check your key, model and base URL in settings",
    });
  });

  it("streams the same distinctions on the chat route", async () => {
    failWith = 429;
    const res = await post("/ai/chat", { documentId: FID, question: "x" });
    await expect(res.text()).resolves.toContain("AI rate limited. Retry shortly.");
  });
});
