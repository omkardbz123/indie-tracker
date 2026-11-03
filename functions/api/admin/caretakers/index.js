import { json, parseCaretaker, readJson } from "../../../_lib/util.js";
import { createCaretaker, listCaretakers } from "../../../_lib/store.js";

export async function onRequestGet({ env }) {
  return json(await listCaretakers(env));
}

// Returns the login token once; only its hash is stored.
export async function onRequestPost({ request, env }) {
  const { caretaker, error } = parseCaretaker(await readJson(request));
  if (error) return json({ error }, 400);
  return json(await createCaretaker(env, caretaker), 201);
}
