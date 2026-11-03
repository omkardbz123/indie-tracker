// Defence in depth: Cloudflare Access already blocks unauthenticated requests to
// /admin and /api/admin, but we also verify the JWT it attaches so the API stays
// safe even if the Access policy is misconfigured or removed.

const b64 = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const parse = (s) => JSON.parse(new TextDecoder().decode(b64(s)));

export async function verifyAccess(request, env) {
  if (env.DEV_BYPASS === "1") return { email: "dev@localhost" };
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token || !env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return null;
  try {
    const [h, p, s] = token.split(".");
    const header = parse(h);
    const payload = parse(p);
    const now = Math.floor(Date.now() / 1000);
    const aud = [].concat(payload.aud || []);
    if (header.alg !== "RS256") return null;
    if (payload.exp < now || payload.iss !== `https://${env.ACCESS_TEAM_DOMAIN}`) return null;
    if (!aud.includes(env.ACCESS_AUD)) return null;

    const res = await fetch(`https://${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`, {
      cf: { cacheTtl: 3600, cacheEverything: true },
    });
    const { keys } = await res.json();
    const jwk = keys.find((k) => k.kid === header.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey(
      "jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]
    );
    const ok = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5", key, b64(s), new TextEncoder().encode(`${h}.${p}`)
    );
    return ok ? { email: payload.email } : null;
  } catch {
    return null;
  }
}
