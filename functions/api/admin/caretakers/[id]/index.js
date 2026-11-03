import { json, parseCaretaker, readJson, validId } from "../../../../_lib/util.js";
import { deleteCaretaker, updateCaretaker } from "../../../../_lib/store.js";

export async function onRequestPut({ request, env, params }) {
  if (!validId(params.id)) return json({ error: "Not found" }, 404);
  const { caretaker, error } = parseCaretaker(await readJson(request));
  if (error) return json({ error }, 400);
  return (await updateCaretaker(env, params.id, caretaker)) ? json({ ok: true }) : json({ error: "Not found" }, 404);
}

// Their dogs stay registered and fall back to admins for messages.
export async function onRequestDelete({ env, params }) {
  if (!validId(params.id)) return json({ error: "Not found" }, 404);
  await deleteCaretaker(env, params.id);
  return json({ ok: true });
}
