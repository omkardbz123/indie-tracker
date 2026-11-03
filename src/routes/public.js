// Public endpoints: no login. Finders only ever get dog details and their own conversation.
import { readAsFinder, sendAsFinder, startConversation } from "../lib/chat.js";
import { sessionCookie } from "../lib/session.js";
import { caretakerFromToken } from "../lib/store.js";
import { json, parseMessage, readJson, sameOrigin, validId } from "../lib/util.js";

// Dog details as JSON. Never owner/caretaker name, phone or address.
export async function dogJson({ env, params }) {
  if (!validId(params.id)) return json({ error: "Not found" }, 404);
  const dog = await env.DB.prepare(
    `SELECT id, name, dog_type, photo_key, breed, gender, sterilized, sterilized_date, vaccinated,
       vaccinated_date, area, notes FROM dogs WHERE id = ?`
  ).bind(params.id).first();
  return dog ? json(dog, 200, { "cache-control": "public, max-age=60" }) : json({ error: "Not found" }, 404);
}

// The version in the URL changes on every upload, so responses are immutable.
export async function photo({ env, params }) {
  if (!env.PHOTOS || !validId(params.id) || !/^[a-z0-9]{1,16}$/.test(params.v)) return new Response("Not found", { status: 404 });
  const obj = await env.PHOTOS.get(`dogs/${params.id}/${params.v}`);
  if (!obj) return new Response("Not found", { status: 404 });
  return new Response(obj.body, {
    headers: {
      "content-type": obj.httpMetadata?.contentType || "image/jpeg",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}

// A finder starts an anonymous conversation. Returns the conversation's secret token once.
export async function chatStart({ request, env }) {
  const b = await readJson(request);
  if (!validId(b.dog_id)) return json({ error: "Unknown dog" }, 404);
  const { body, error } = parseMessage(b.body);
  if (error) return json({ error }, 400);
  const r = await startConversation(env, request, { dogId: b.dog_id, finderName: b.name, body });
  return r.error ? json({ error: r.error }, r.status) : json(r, 201);
}

// The token travels in a header, never in the URL.
export async function chatRead({ request, env, params }) {
  const c = validId(params.id) && (await readAsFinder(env, params.id, request.headers.get("X-Chat-Token")));
  return c ? json(c) : json({ error: "Conversation not found" }, 404);
}

export async function chatSend({ request, env, params }) {
  if (!validId(params.id)) return json({ error: "Conversation not found" }, 404);
  const { body, error } = parseMessage((await readJson(request)).body);
  if (error) return json({ error }, 400);
  const r = await sendAsFinder(env, params.id, request.headers.get("X-Chat-Token"), body);
  return r.error ? json({ error: r.error }, r.status) : json({ ok: true }, 201);
}

// Exchanges the token from a caretaker's login link for a session cookie.
export async function login({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "Bad origin" }, 403);
  const { token } = await readJson(request);
  const me = typeof token === "string" && token.length >= 20 ? await caretakerFromToken(env, token) : null;
  if (!me) return json({ error: "This login link is invalid or has been replaced. Ask an admin for a new one." }, 401);
  await env.DB.prepare("UPDATE caretakers SET last_login_at = datetime('now') WHERE id = ?").bind(me.id).run();
  return json({ ok: true, name: me.name }, 200, { "set-cookie": sessionCookie(token, request) });
}
