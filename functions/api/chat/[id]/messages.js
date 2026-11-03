import { sendAsFinder } from "../../../_lib/chat.js";
import { json, parseMessage, readJson, validId } from "../../../_lib/util.js";

export async function onRequestPost({ request, env, params }) {
  if (!validId(params.id)) return json({ error: "Conversation not found" }, 404);
  const { body, error } = parseMessage((await readJson(request)).body);
  if (error) return json({ error }, 400);
  const r = await sendAsFinder(env, params.id, request.headers.get("X-Chat-Token"), body);
  return r.error ? json({ error: r.error }, r.status) : json({ ok: true }, 201);
}
