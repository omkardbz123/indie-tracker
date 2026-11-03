// Data access shared by the admin and caretaker dashboards.
// `scope` is { role: "admin" } or { role: "caretaker", id, name, phone }; caretakers only ever
// see and change their own dogs and the conversations about them.
import { newId, randomToken, sha256 } from "./util.js";

const isAdmin = (scope) => scope.role === "admin";

const DOG_FIELDS = [
  "name", "dog_type", "breed", "gender", "sterilized", "sterilized_date", "vaccinated", "vaccinated_date",
  "caretaker_id", "owner_name", "phone", "area", "address", "notes",
];

// ---------- dogs ----------

export async function listDogs(env, scope) {
  const stmt = env.DB.prepare(
    `SELECT d.*, c.name AS caretaker_name FROM dogs d LEFT JOIN caretakers c ON c.id = d.caretaker_id
     ${isAdmin(scope) ? "" : "WHERE d.caretaker_id = ?1"} ORDER BY d.created_at DESC`
  );
  const { results } = await (isAdmin(scope) ? stmt : stmt.bind(scope.id)).all();
  return results;
}

export async function getDog(env, scope, id) {
  const dog = await env.DB.prepare("SELECT * FROM dogs WHERE id = ?").bind(id).first();
  return dog && (isAdmin(scope) || dog.caretaker_id === scope.id) ? dog : null;
}

// Caretakers always own what they save; admins may assign a dog to an existing caretaker.
async function applyScope(env, scope, dog) {
  if (!isAdmin(scope)) return { ...dog, caretaker_id: scope.id, owner_name: scope.name, phone: scope.phone };
  if (dog.caretaker_id) {
    const exists = await env.DB.prepare("SELECT 1 FROM caretakers WHERE id = ?").bind(dog.caretaker_id).first();
    if (!exists) return { ...dog, caretaker_id: null };
  }
  return dog;
}

export async function createDog(env, scope, input) {
  const dog = await applyScope(env, scope, input);
  const id = newId();
  await env.DB.prepare(`INSERT INTO dogs (id, ${DOG_FIELDS.join(", ")}) VALUES (?${", ?".repeat(DOG_FIELDS.length)})`)
    .bind(id, ...DOG_FIELDS.map((f) => dog[f] ?? null))
    .run();
  return id;
}

export async function updateDog(env, scope, id, input) {
  const dog = await applyScope(env, scope, input);
  const r = await env.DB.prepare(
    `UPDATE dogs SET ${DOG_FIELDS.map((f) => `${f} = ?`).join(", ")}, updated_at = datetime('now')
     WHERE id = ? ${isAdmin(scope) ? "" : "AND caretaker_id = ?"}`
  )
    .bind(...DOG_FIELDS.map((f) => dog[f] ?? null), id, ...(isAdmin(scope) ? [] : [scope.id]))
    .run();
  return r.meta.changes > 0;
}

export async function deleteDog(env, scope, id) {
  if (!(await getDog(env, scope, id))) return false;
  if (env.PHOTOS) {
    const list = await env.PHOTOS.list({ prefix: `dogs/${id}/` });
    if (list.objects.length) await env.PHOTOS.delete(list.objects.map((o) => o.key));
  }
  await env.DB.batch([
    env.DB.prepare("DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE dog_id = ?)").bind(id),
    env.DB.prepare("DELETE FROM conversations WHERE dog_id = ?").bind(id),
    env.DB.prepare("DELETE FROM dogs WHERE id = ?").bind(id),
  ]);
  return true;
}

export async function setDogPhoto(env, id, version) {
  await env.DB.prepare("UPDATE dogs SET photo_key = ?, updated_at = datetime('now') WHERE id = ?").bind(version, id).run();
}

// ---------- inbox (staff side of conversations) ----------

export async function listConversations(env, scope) {
  const stmt = env.DB.prepare(
    `SELECT c.id, c.dog_id, d.name AS dog_name, c.finder_name, c.created_at, c.last_message_at, c.unread_staff,
       (SELECT body FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_body,
       (SELECT sender FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_sender
     FROM conversations c JOIN dogs d ON d.id = c.dog_id
     ${isAdmin(scope) ? "" : "WHERE d.caretaker_id = ?1"}
     ORDER BY c.last_message_at DESC LIMIT 200`
  );
  const { results } = await (isAdmin(scope) ? stmt : stmt.bind(scope.id)).all();
  return results;
}

async function staffConversation(env, scope, id) {
  const c = await env.DB.prepare(
    `SELECT c.*, d.name AS dog_name, d.caretaker_id FROM conversations c JOIN dogs d ON d.id = c.dog_id WHERE c.id = ?`
  ).bind(id).first();
  return c && (isAdmin(scope) || c.caretaker_id === scope.id) ? c : null;
}

export async function openConversation(env, scope, id) {
  const c = await staffConversation(env, scope, id);
  if (!c) return null;
  const { results } = await env.DB.prepare(
    "SELECT id, sender, body, created_at FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT 300"
  ).bind(id).all();
  // An admin glancing at a caretaker's conversation shouldn't clear the caretaker's unread marker.
  if (c.unread_staff && (!isAdmin(scope) || !c.caretaker_id)) {
    await env.DB.prepare("UPDATE conversations SET unread_staff = 0 WHERE id = ?").bind(id).run();
  }
  return {
    id: c.id, dog_id: c.dog_id, dog_name: c.dog_name, finder_name: c.finder_name,
    has_caretaker: !!c.caretaker_id, created_at: c.created_at, messages: results.reverse(),
  };
}

export async function staffReply(env, scope, id, body) {
  const c = await staffConversation(env, scope, id);
  if (!c) return false;
  await env.DB.batch([
    env.DB.prepare("INSERT INTO messages (conversation_id, sender, body) VALUES (?, ?, ?)").bind(id, scope.role, body),
    env.DB.prepare(
      "UPDATE conversations SET last_message_at = datetime('now'), unread_finder = unread_finder + 1 WHERE id = ?"
    ).bind(id),
  ]);
  return true;
}

// ---------- caretakers (admin only) ----------

export async function listCaretakers(env) {
  const { results } = await env.DB.prepare(
    `SELECT c.id, c.name, c.phone, c.area, c.created_at, c.last_login_at,
       (SELECT COUNT(*) FROM dogs d WHERE d.caretaker_id = c.id) AS dog_count
     FROM caretakers c ORDER BY c.name COLLATE NOCASE`
  ).all();
  return results;
}

export async function createCaretaker(env, { name, phone, area }) {
  const id = newId();
  const token = randomToken();
  await env.DB.prepare("INSERT INTO caretakers (id, name, phone, area, token_hash) VALUES (?, ?, ?, ?, ?)")
    .bind(id, name, phone, area, await sha256(token))
    .run();
  return { id, token };
}

export async function updateCaretaker(env, id, { name, phone, area }) {
  const [r] = await env.DB.batch([
    env.DB.prepare("UPDATE caretakers SET name = ?, phone = ?, area = ? WHERE id = ?").bind(name, phone, area, id),
    // Their dogs' private contact follows the caretaker profile.
    env.DB.prepare("UPDATE dogs SET owner_name = ?, phone = ? WHERE caretaker_id = ?").bind(name, phone, id),
  ]);
  return r.meta.changes > 0;
}

// Issues a new login link; the previous one stops working.
export async function resetCaretakerLink(env, id) {
  const token = randomToken();
  const r = await env.DB.prepare("UPDATE caretakers SET token_hash = ? WHERE id = ?").bind(await sha256(token), id).run();
  return r.meta.changes > 0 ? token : null;
}

export async function deleteCaretaker(env, id) {
  await env.DB.batch([
    env.DB.prepare("UPDATE dogs SET caretaker_id = NULL WHERE caretaker_id = ?").bind(id),
    env.DB.prepare("DELETE FROM caretakers WHERE id = ?").bind(id),
  ]);
}

export async function caretakerFromToken(env, token) {
  if (!token) return null;
  return env.DB.prepare("SELECT id, name, phone, area FROM caretakers WHERE token_hash = ?").bind(await sha256(token)).first();
}
