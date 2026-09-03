import { createProxyMiddleware } from "http-proxy-middleware";

export const CLERK_PROXY_PATH = "/api/__clerk";

export function getClerkProxyHost(req: { headers: { host?: string } }): string | undefined {
  return req.headers.host;
}

export function clerkProxyMiddleware() {
  const proxyTarget = process.env.CLERK_PROXY_URL;
  if (!proxyTarget) {
    return (_req: unknown, _res: unknown, next: () => void) => next();
  }

  return createProxyMiddleware({
    target: proxyTarget,
    changeOrigin: true,
    secure: true,
    pathRewrite: { [`^${CLERK_PROXY_PATH}`]: "" },
  });
}