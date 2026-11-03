import { verifyAccess } from "../../_lib/access.js";
import { json, sameOrigin } from "../../_lib/util.js";

export async function onRequest({ request, env, next, data }) {
  if (!sameOrigin(request)) return json({ error: "Bad origin" }, 403);
  const user = await verifyAccess(request, env);
  if (!user) return json({ error: "Unauthorized" }, 401);
  data.scope = { role: "admin", email: user.email };
  return next();
}
