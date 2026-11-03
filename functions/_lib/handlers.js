// Request handlers shared by /api/admin/* (Cloudflare Access) and /api/my/* (caretaker login link).
// The route files re-export these; middleware puts the caller's scope in `data.scope`.
import { json, parseDog, parseMessage, readJson, validId } from "./util.js";
import * as store from "./store.js";

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const notFound = () => json({ error: "Not found" }, 404);

export const dogs = {
  list: async ({ env, data }) => json(await store.listDogs(env, data.scope)),

  create: async ({ request, env, data }) => {
    const { dog, error } = parseDog(await readJson(request));
    if (error) return json({ error }, 400);
    return json({ id: await store.createDog(env, data.scope, dog) }, 201);
  },

  get: async ({ env, data, params }) => {
    if (!validId(params.id)) return notFound();
    const dog = await store.getDog(env, data.scope, params.id);
    return dog ? json(dog) : notFound();
  },

  update: async ({ request, env, data, params }) => {
    if (!validId(params.id)) return notFound();
    const { dog, error } = parseDog(await readJson(request));
    if (error) return json({ error }, 400);
    return (await store.updateDog(env, data.scope, params.id, dog)) ? json({ ok: true }) : notFound();
  },

  remove: async ({ env, data, params }) => {
    if (!validId(params.id)) return notFound();
    return (await store.deleteDog(env, data.scope, params.id)) ? json({ ok: true }) : notFound();
  },

  // PUT raw image bytes (the dashboard resizes to JPEG before sending).
  photo: async ({ request, env, data, params }) => {
    if (!env.PHOTOS) return json({ error: "Photo storage isn't set up yet" }, 501);
    if (!validId(params.id)) return notFound();
    const dog = await store.getDog(env, data.scope, params.id);
    if (!dog) return notFound();
    const type = request.headers.get("content-type") || "";
    if (!/^image\/(jpeg|png|webp)$/.test(type)) return json({ error: "JPEG, PNG or WebP only" }, 415);
    const body = await request.arrayBuffer();
    if (body.byteLength > MAX_PHOTO_BYTES) return json({ error: "Photo too large (max 2 MB)" }, 413);

    const version = Date.now().toString(36);
    await env.PHOTOS.put(`dogs/${dog.id}/${version}`, body, { httpMetadata: { contentType: type } });
    await store.setDogPhoto(env, dog.id, version);
    if (dog.photo_key) await env.PHOTOS.delete(`dogs/${dog.id}/${dog.photo_key}`);
    return json({ ok: true, photo_key: version });
  },
};

export const inbox = {
  list: async ({ env, data }) => json(await store.listConversations(env, data.scope)),

  open: async ({ env, data, params }) => {
    const c = validId(params.id) && (await store.openConversation(env, data.scope, params.id));
    return c ? json(c) : notFound();
  },

  reply: async ({ request, env, data, params }) => {
    if (!validId(params.id)) return notFound();
    const { body, error } = parseMessage((await readJson(request)).body);
    if (error) return json({ error }, 400);
    return (await store.staffReply(env, data.scope, params.id, body)) ? json({ ok: true }, 201) : notFound();
  },
};

export const config = ({ env, data }) =>
  json({
    role: data.scope.role,
    photos: !!env.PHOTOS,
    me: data.scope.role === "admin" ? { email: data.scope.email } : { name: data.scope.name },
  });
