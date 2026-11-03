import { clearSessionCookie } from "../../_lib/session.js";
import { json } from "../../_lib/util.js";

export function onRequestPost({ request }) {
  return json({ ok: true }, 200, { "set-cookie": clearSessionCookie(request) });
}
