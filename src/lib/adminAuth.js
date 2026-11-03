// Admin sign-in with a password stored as the Worker secret ADMIN_PASSWORD.
// The session cookie holds a hash derived from the password, never the password itself,
// so changing the password signs every admin out.
import { json, readJson, sameOrigin, sha256 } from "./util.js";

const COOKIE = "dogid_admin";
const PATH = "/api/admin";
const MIN_PASSWORD_LENGTH = 12;
const MAX_FAILURES = 10; // per connection per 15 minutes

const sessionToken = (env) => sha256(`admin-session-v1:${env.ADMIN_PASSWORD}`);
const passwordConfigured = (env) => typeof env.ADMIN_PASSWORD === "string" && env.ADMIN_PASSWORD.length >= MIN_PASSWORD_LENGTH;
const secure = (request) => (new URL(request.url).protocol === "https:" ? "; Secure" : "");

async function sameSecret(a, b) {
  const [x, y] = await Promise.all([sha256(a), sha256(b)]);
  return crypto.subtle.timingSafeEqual(new TextEncoder().encode(x), new TextEncoder().encode(y));
}

function readCookie(request, name) {
  for (const part of (request.headers.get("Cookie") || "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

export async function adminFromCookie(request, env) {
  const cookie = readCookie(request, COOKIE);
  if (!cookie || !passwordConfigured(env)) return null;
  return (await sameSecret(cookie, await sessionToken(env))) ? { email: "Admin" } : null;
}

export async function adminLogin({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Bad origin" }, 403);
  if (!passwordConfigured(env)) {
    return json({ error: "No admin password is set yet. Run: npx wrangler secret put ADMIN_PASSWORD" }, 503);
  }
  const ipHash = await sha256(`admin-ip:${request.headers.get("CF-Connecting-IP") || "local"}`);
  const recent = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM admin_login_failures WHERE ip_hash = ? AND created_at > datetime('now', '-15 minutes')"
  ).bind(ipHash).first();
  if (recent.n >= MAX_FAILURES) return json({ error: "Too many wrong attempts. Try again in 15 minutes." }, 429);

  const { password } = await readJson(request);
  if (typeof password !== "string" || !(await sameSecret(password, env.ADMIN_PASSWORD))) {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO admin_login_failures (ip_hash) VALUES (?)").bind(ipHash),
      env.DB.prepare("DELETE FROM admin_login_failures WHERE created_at < datetime('now', '-1 day')"),
    ]);
    return json({ error: "Wrong password." }, 401);
  }
  const cookie = `${COOKIE}=${await sessionToken(env)}; Path=${PATH}; HttpOnly; SameSite=Strict; Max-Age=2592000${secure(request)}`;
  return json({ ok: true }, 200, { "set-cookie": cookie });
}

export const adminLogout = ({ request }) =>
  json({ ok: true }, 200, { "set-cookie": `${COOKIE}=; Path=${PATH}; HttpOnly; SameSite=Strict; Max-Age=0${secure(request)}` });
