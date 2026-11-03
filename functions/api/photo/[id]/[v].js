import { validId } from "../../../_lib/util.js";

// Public. The version in the URL changes on every upload, so responses are immutable.
export async function onRequestGet({ env, params }) {
  if (!env.PHOTOS || !validId(params.id) || !/^[a-z0-9]{1,16}$/.test(params.v)) return new Response("Not found", { status: 404 });
  const obj = await env.PHOTOS.get(`dogs/${params.id}/${params.v}`);
  if (!obj) return new Response("Not found", { status: 404 });
  return new Response(obj.body, {
    headers: {
      "content-type": obj.httpMetadata?.contentType || "image/jpeg",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
