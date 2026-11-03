// Admin-only caretaker management.
import { createCaretaker, deleteCaretaker, listCaretakers, resetCaretakerLink, updateCaretaker } from "../lib/store.js";
import { json, parseCaretaker, readJson, validId } from "../lib/util.js";

const notFound = () => json({ error: "Not found" }, 404);

export const list = async ({ env }) => json(await listCaretakers(env));

// Returns the login token once; only its hash is stored.
export async function create({ request, env }) {
  const { caretaker, error } = parseCaretaker(await readJson(request));
  if (error) return json({ error }, 400);
  return json(await createCaretaker(env, caretaker), 201);
}

export async function update({ request, env, params }) {
  if (!validId(params.id)) return notFound();
  const { caretaker, error } = parseCaretaker(await readJson(request));
  if (error) return json({ error }, 400);
  return (await updateCaretaker(env, params.id, caretaker)) ? json({ ok: true }) : notFound();
}

// Their dogs stay registered and fall back to admins for messages.
export async function remove({ env, params }) {
  if (!validId(params.id)) return notFound();
  await deleteCaretaker(env, params.id);
  return json({ ok: true });
}

// Issues a new login link; the old one stops working.
export async function newLink({ env, params }) {
  if (!validId(params.id)) return notFound();
  const token = await resetCaretakerLink(env, params.id);
  return token ? json({ token }) : notFound();
}
