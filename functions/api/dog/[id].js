import { json, validId } from "../../_lib/util.js";

// Public JSON. Only dog details: never owner/caretaker name, phone or address.
export async function onRequestGet({ env, params }) {
  if (!validId(params.id)) return json({ error: "Not found" }, 404);
  const dog = await env.DB.prepare(
    `SELECT id, name, dog_type, photo_key, breed, gender, sterilized, sterilized_date, vaccinated,
       vaccinated_date, area, notes FROM dogs WHERE id = ?`
  ).bind(params.id).first();
  return dog ? json(dog, 200, { "cache-control": "public, max-age=60" }) : json({ error: "Not found" }, 404);
}
