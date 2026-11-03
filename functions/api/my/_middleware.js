import { caretakerFromRequest } from "../../_lib/session.js";
import { json, sameOrigin } from "../../_lib/util.js";

export async function onRequest({ request, env, next, data }) {
  if (!sameOrigin(request)) return json({ error: "Bad origin" }, 403);
  const me = await caretakerFromRequest(request, env);
  if (!me) return json({ error: "Unauthorized" }, 401);
  data.scope = { role: "caretaker", ...me };
  return next();
}
