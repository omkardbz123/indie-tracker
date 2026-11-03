import { json, validId } from "../../../../_lib/util.js";
import { resetCaretakerLink } from "../../../../_lib/store.js";

// Issues a new login link; the old one stops working.
export async function onRequestPost({ env, params }) {
  if (!validId(params.id)) return json({ error: "Not found" }, 404);
  const token = await resetCaretakerLink(env, params.id);
  return token ? json({ token }) : json({ error: "Not found" }, 404);
}
