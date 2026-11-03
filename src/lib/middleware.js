// Guards for the two dashboard APIs. Each sets `data.scope`, which the shared handlers use
// to limit what the caller can see and change.
import { verifyAccess } from "./access.js";
import { adminFromCookie } from "./adminAuth.js";
import { caretakerFromRequest, clearSessionCookie } from "./session.js";
import { json, sameOrigin } from "./util.js";

// /api/admin/*: admin password session, or a Cloudflare Access login if Access is set up.
export async function requireAdmin({ request, env, next, data }) {
  if (!sameOrigin(request)) return json({ error: "Bad origin" }, 403);
  const viaPassword = await adminFromCookie(request, env);
  const user = viaPassword || (await verifyAccess(request, env));
  if (!user) return json({ error: "Unauthorized" }, 401);
  data.scope = { role: "admin", email: user.email, signOut: !!viaPassword };
  return next();
}

// /api/my/*: caretaker session cookie from their login link.
export async function requireCaretaker({ request, env, next, data }) {
  if (!sameOrigin(request)) return json({ error: "Bad origin" }, 403);
  const me = await caretakerFromRequest(request, env);
  if (!me) return json({ error: "Unauthorized" }, 401);
  data.scope = { role: "caretaker", ...me };
  return next();
}

export const logout = ({ request }) => json({ ok: true }, 200, { "set-cookie": clearSessionCookie(request) });
