import type { Request, Response, NextFunction } from "express";
import * as jose from "jose";
import { supabase } from "../lib/supabase";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string | null;
        email?: string;
        user?: any;
      };
    }
  }
}

let remoteJWKS: ReturnType<typeof jose.createRemoteJWKSet> | null = null;
if (process.env.SUPABASE_JWKS_URL) {
  try {
    remoteJWKS = jose.createRemoteJWKSet(new URL(process.env.SUPABASE_JWKS_URL));
  } catch (err) {
    console.warn("Failed to initialize remote JWKS set from SUPABASE_JWKS_URL", err);
  }
}

export async function authMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    req.auth = { userId: null };
    next();
    return;
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    req.auth = { userId: null };
    next();
    return;
  }

  try {
    // 1. Try fast local verification via JWKS if available
    if (remoteJWKS) {
      try {
        const { payload } = await jose.jwtVerify(token, remoteJWKS);
        if (payload && payload.sub) {
          req.auth = {
            userId: payload.sub,
            email: payload.email as string | undefined,
            user: payload,
          };
          next();
          return;
        }
      } catch {
        // Fall back to supabase.auth.getUser
      }
    }

    // 2. Fallback to Supabase client verification
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (!error && user) {
      req.auth = {
        userId: user.id,
        email: user.email,
        user,
      };
      next();
      return;
    }

    req.auth = { userId: null };
    next();
  } catch (error) {
    req.auth = { userId: null };
    next();
  }
}

export function getAuth(req: Request) {
  const claims = (req.auth?.user ?? {}) as Record<string, unknown>;
  const userMetadata = (claims.user_metadata || claims.metadata || {}) as Record<string, unknown>;
  return {
    userId: req.auth?.userId ?? null,
    email: req.auth?.email ?? (typeof claims.email === "string" ? claims.email : null),
    user: req.auth?.user ?? null,
    sessionClaims: {
      ...claims,
      email: req.auth?.email ?? claims.email,
      metadata: userMetadata,
      publicMetadata: userMetadata,
    } as Record<string, unknown>,
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}
