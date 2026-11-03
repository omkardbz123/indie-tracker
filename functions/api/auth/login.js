import { caretakerFromToken } from "../../_lib/store.js";
import { sessionCookie } from "../../_lib/session.js";
import { json, readJson, sameOrigin } from "../../_lib/util.js";

// Exchanges the token from a caretaker's login link for a session cookie.
export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Bad origin" }, 403);
  const { token } = await readJson(request);
  const me = typeof token === "string" && token.length >= 20 ? await caretakerFromToken(env, token) : null;
  if (!me) return json({ error: "This login link is invalid or has been replaced. Ask an admin for a new one." }, 401);
  await env.DB.prepare("UPDATE caretakers SET last_login_at = datetime('now') WHERE id = ?").bind(me.id).run();
  return json({ ok: true, name: me.name }, 200, { "set-cookie": sessionCookie(token, request) });
}
