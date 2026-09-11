import { describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import express from "express";
import { verifyToken, requireAuth } from "./auth.js";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

async function mint(expires: string) {
  return new SignJWT({ email: "t@x.com", name: "T" })
    .setSubject("user-1")
    .setIssuedAt()
    .setExpirationTime(expires)
    .setProtectedHeader({ alg: "HS256" })
    .sign(secret);
}

describe("verifyToken", () => {
  it("resolves a valid token to its claims", async () => {
    const user = await verifyToken(await mint("15m"));
    expect(user).toEqual({ id: "user-1", email: "t@x.com", name: "T" });
  });

  it("rejects garbage tokens", async () => {
    expect(await verifyToken("not-a-jwt")).toBeNull();
  });

  it("rejects expired tokens", async () => {
    expect(await verifyToken(await mint("-1s"))).toBeNull();
  });

  it("rejects tokens signed with a different secret", async () => {
    const forged = await new SignJWT({ sub: "user-1" })
      .setIssuedAt().setExpirationTime("15m").setProtectedHeader({ alg: "HS256" })
      .sign(new TextEncoder().encode("wrong-secret"));
    expect(await verifyToken(forged)).toBeNull();
  });
});

describe("requireAuth", () => {
  const app = express();
  app.use(requireAuth);
  app.get("/who", (req, res) => res.json(req.user));

  async function call(header?: string) {
    const server = app.listen(0);
    try {
      const port = (server.address() as { port: number }).port;
      const res = await fetch(`http://localhost:${port}/who`, {
        headers: header ? { authorization: header } : {},
      });
      return res.status;
    } finally {
      server.close();
    }
  }

  it("401s on missing/garbage/expired Bearer", async () => {
    expect(await call()).toBe(401);
    expect(await call("Bearer garbage")).toBe(401);
    expect(await call(`Bearer ${await mint("-1s")}`)).toBe(401);
  });

  it("passes a valid Bearer through with req.user set", async () => {
    const res = await call(`Bearer ${await mint("15m")}`);
    expect(res).toBe(200);
  });
});
