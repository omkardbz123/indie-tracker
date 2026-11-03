// Finder side of anonymous conversations. Finders never log in: a random token kept in their
// browser proves which conversation is theirs. Neither side ever sees the other's phone number.
import { clip, newId, randomToken, sha256 } from "./util.js";

const NEW_CONVERSATIONS_PER_HOUR = 5;
const FINDER_MESSAGES_PER_MINUTE = 6;

export async function startConversation(env, request, { dogId, finderName, body }) {
  const dog = await env.DB.prepare("SELECT id FROM dogs WHERE id = ?").bind(dogId).first();
  if (!dog) return { status: 404, error: "This dog is no longer registered" };

  const ipHash = await sha256(`ip:${request.headers.get("CF-Connecting-IP") || "local"}`);
  const recent = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM conversations WHERE ip_hash = ? AND created_at > datetime('now', '-1 hour')"
  ).bind(ipHash).first();
  if (recent.n >= NEW_CONVERSATIONS_PER_HOUR) {
    return { status: 429, error: "Too many new conversations from this connection. Please try again later." };
  }

  const id = newId(12);
  const token = randomToken();
  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO conversations (id, dog_id, finder_token_hash, finder_name, ip_hash, unread_staff) VALUES (?, ?, ?, ?, ?, 1)"
    ).bind(id, dogId, await sha256(token), clip(finderName, 40), ipHash),
    env.DB.prepare("INSERT INTO messages (conversation_id, sender, body) VALUES (?, 'finder', ?)").bind(id, body),
  ]);
  return { id, token };
}

async function finderConversation(env, id, token) {
  if (!token) return null;
  const c = await env.DB.prepare(
    "SELECT c.id, c.dog_id, c.finder_token_hash, c.unread_finder, d.name AS dog_name, d.dog_type FROM conversations c JOIN dogs d ON d.id = c.dog_id WHERE c.id = ?"
  ).bind(id).first();
  return c && c.finder_token_hash === (await sha256(token)) ? c : null;
}

export async function readAsFinder(env, id, token) {
  const c = await finderConversation(env, id, token);
  if (!c) return null;
  const { results } = await env.DB.prepare(
    "SELECT id, sender, body, created_at FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT 300"
  ).bind(id).all();
  if (c.unread_finder) await env.DB.prepare("UPDATE conversations SET unread_finder = 0 WHERE id = ?").bind(id).run();
  return { id: c.id, dog: { id: c.dog_id, name: c.dog_name, dog_type: c.dog_type }, messages: results.reverse() };
}

export async function sendAsFinder(env, id, token, body) {
  const c = await finderConversation(env, id, token);
  if (!c) return { status: 404, error: "Conversation not found" };
  const recent = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM messages WHERE conversation_id = ? AND sender = 'finder' AND created_at > datetime('now', '-1 minute')"
  ).bind(id).first();
  if (recent.n >= FINDER_MESSAGES_PER_MINUTE) return { status: 429, error: "You're sending messages too quickly. Wait a minute." };
  await env.DB.batch([
    env.DB.prepare("INSERT INTO messages (conversation_id, sender, body) VALUES (?, 'finder', ?)").bind(id, body),
    env.DB.prepare(
      "UPDATE conversations SET last_message_at = datetime('now'), unread_staff = unread_staff + 1 WHERE id = ?"
    ).bind(id),
  ]);
  return { ok: true };
}
