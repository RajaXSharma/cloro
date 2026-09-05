import type { NextFunction, Request, Response } from "express";
import { jwtVerify } from "jose";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; name: string };
    }
  }
}

const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      id: String(payload.sub ?? ""),
      email: String(payload.email ?? ""),
      name: String(payload.name ?? ""),
    };
  } catch {
    return null;
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  const user = token ? await verifyToken(token) : null;
  if (!user) return res.status(401).json({ error: "unauthorized" });
  req.user = user;
  next();
}
