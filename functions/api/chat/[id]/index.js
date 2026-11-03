import { readAsFinder } from "../../../_lib/chat.js";
import { json, validId } from "../../../_lib/util.js";

// Public: the finder reads their conversation. The token travels in a header, never in the URL.
export async function onRequestGet({ request, env, params }) {
  const c = validId(params.id) && (await readAsFinder(env, params.id, request.headers.get("X-Chat-Token")));
  return c ? json(c) : json({ error: "Conversation not found" }, 404);
}
