const ID_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"; // no look-alikes (i, l, o, 0, 1)

export function newId(len = 8) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => ID_ALPHABET[b % ID_ALPHABET.length]).join("");
}

export const validId = (id) => /^[A-Za-z0-9]{4,16}$/.test(id || "");

// URL-safe random secret for login links and chat access.
export function randomToken(bytes = 32) {
  const b = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function sha256(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...headers },
  });
}

export const readJson = (request) => request.json().catch(() => ({}));

// Blocks cross-site form posts to cookie/Access-authenticated APIs.
export function sameOrigin(request) {
  if (request.method === "GET" || request.method === "HEAD") return true;
  const origin = request.headers.get("Origin");
  return !origin || origin === new URL(request.url).origin;
}

// Digits only, country code included. 10-digit numbers are assumed Indian (+91).
export function normalizePhone(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (d.length === 10) d = "91" + d;
  return d.length >= 11 && d.length <= 15 ? d : null;
}

export const clip = (v, n) => (v == null ? null : String(v).trim().slice(0, n) || null);

// Optional phone: empty is fine, anything else must be a valid number.
function optionalPhone(raw) {
  if (!String(raw ?? "").trim()) return { phone: null };
  const phone = normalizePhone(raw);
  return phone ? { phone } : { error: "Enter a valid phone number" };
}

// Validates and shapes a dog payload from the dashboard. Returns { error } or { dog }.
export function parseDog(b) {
  const name = clip(b.name, 80);
  if (!name) return { error: "Dog name is required" };
  const { phone, error } = optionalPhone(b.phone);
  if (error) return { error };
  const date = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v || "") ? v : null);
  return {
    dog: {
      name,
      dog_type: b.dog_type === "community" ? "community" : "pet",
      breed: clip(b.breed, 80),
      gender: ["male", "female"].includes(b.gender) ? b.gender : null,
      sterilized: b.sterilized ? 1 : 0,
      sterilized_date: b.sterilized ? date(b.sterilized_date) : null,
      vaccinated: b.vaccinated ? 1 : 0,
      vaccinated_date: b.vaccinated ? date(b.vaccinated_date) : null,
      caretaker_id: validId(b.caretaker_id) ? b.caretaker_id : null,
      owner_name: clip(b.owner_name, 80),
      phone,
      area: clip(b.area, 120),
      address: clip(b.address, 400),
      notes: clip(b.notes, 1000),
    },
  };
}

export function parseCaretaker(b) {
  const name = clip(b.name, 80);
  if (!name) return { error: "Name is required" };
  const { phone, error } = optionalPhone(b.phone);
  if (error) return { error };
  return { caretaker: { name, phone, area: clip(b.area, 120) } };
}

export function parseMessage(raw) {
  const body = String(raw ?? "").trim().slice(0, 1000);
  return body ? { body } : { error: "Write a message first" };
}
