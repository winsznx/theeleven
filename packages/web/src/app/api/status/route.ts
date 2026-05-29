import { loadStatus } from "@/lib/status";

/**
 * Judge-facing status JSON. Same data shape the /status page renders, exposed
 * separately so external monitors can poll without scraping HTML.
 */
export async function GET(): Promise<Response> {
  const payload = await loadStatus();
  // Convert bigints to strings for safe JSON serialization.
  const safe = JSON.parse(
    JSON.stringify(payload, (_key, value) =>
      typeof value === "bigint" ? value.toString() : value,
    ),
  );
  return Response.json(safe, {
    status: 200,
    headers: { "cache-control": "no-store" },
  });
}
