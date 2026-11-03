import { startConversation } from "../../_lib/chat.js";
import { json, parseMessage, readJson, validId } from "../../_lib/util.js";

// Public: a finder starts an anonymous conversation about a dog. Returns the conversation's secret token once.
export async function onRequestPost({ request, env }) {
  const b = await readJson(request);
  if (!validId(b.dog_id)) return json({ error: "Unknown dog" }, 404);
  const { body, error } = parseMessage(b.body);
  if (error) return json({ error }, 400);
  const r = await startConversation(env, request, { dogId: b.dog_id, finderName: b.name, body });
  return r.error ? json({ error: r.error }, r.status) : json(r, 201);
}
