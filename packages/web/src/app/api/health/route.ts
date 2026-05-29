import { WEB_DEPLOYMENT } from "@/lib/deployment";

/**
 * Operator-facing deploy health check.
 *
 * Returns enough state for Tim's monitor / a Vercel uptime check to know
 * the dApp is ready to serve real markets. Intentionally does NOT return
 * the relayer wallet's address (the Day-0 burner is a PII surface — we
 * say only "configured" / "missing"). Same for the relayer key itself.
 */
export async function GET(): Promise<Response> {
  const hasFactory = WEB_DEPLOYMENT.factory != null;
  const hasRelayer = Boolean(process.env.RELAYER_PRIVATE_KEY);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? null;

  const body = {
    status: hasFactory && hasRelayer ? "ok" : "partial",
    version: process.env.npm_package_version ?? "unknown",
    chainId: 196,
    factory: WEB_DEPLOYMENT.factory,
    relayer: hasRelayer ? "configured" : "missing",
    appUrl,
    timestamp: new Date().toISOString(),
  };

  return Response.json(body, {
    status: 200,
    headers: { "cache-control": "no-store" },
  });
}
