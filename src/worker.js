// Worker entry. Static files in /public are served by Cloudflare before this runs;
// everything else (profile pages and the API) is routed here.
import { config, dogs, inbox } from "./lib/handlers.js";
import { logout, requireAdmin, requireCaretaker } from "./lib/middleware.js";
import { json } from "./lib/util.js";
import * as caretakers from "./routes/caretakers.js";
import { onRequestGet as profile } from "./routes/profile.js";
import * as pub from "./routes/public.js";

// Dog, inbox and config routes are shared by admins and caretakers; the guard decides the scope.
const dashboardRoutes = (prefix, guard) =>
  [
    ["GET", "/config", config],
    ["GET", "/dogs", dogs.list],
    ["POST", "/dogs", dogs.create],
    ["GET", "/dogs/:id", dogs.get],
    ["PUT", "/dogs/:id", dogs.update],
    ["DELETE", "/dogs/:id", dogs.remove],
    ["PUT", "/dogs/:id/photo", dogs.photo],
    ["GET", "/inbox", inbox.list],
    ["GET", "/inbox/:id", inbox.open],
    ["POST", "/inbox/:id", inbox.reply],
  ].map(([method, path, handler]) => [method, prefix + path, handler, guard]);

const ROUTES = [
  ["GET", "/d/:id", profile],
  ["GET", "/api/dog/:id", pub.dogJson],
  ["GET", "/api/photo/:id/:v", pub.photo],
  ["POST", "/api/chat", pub.chatStart],
  ["GET", "/api/chat/:id", pub.chatRead],
  ["POST", "/api/chat/:id/messages", pub.chatSend],
  ["POST", "/api/auth/login", pub.login],

  ...dashboardRoutes("/api/admin", requireAdmin),
  ["GET", "/api/admin/caretakers", caretakers.list, requireAdmin],
  ["POST", "/api/admin/caretakers", caretakers.create, requireAdmin],
  ["PUT", "/api/admin/caretakers/:id", caretakers.update, requireAdmin],
  ["DELETE", "/api/admin/caretakers/:id", caretakers.remove, requireAdmin],
  ["POST", "/api/admin/caretakers/:id/link", caretakers.newLink, requireAdmin],

  ...dashboardRoutes("/api/my", requireCaretaker),
  ["POST", "/api/my/logout", logout, requireCaretaker],
];

function match(pattern, path) {
  const want = pattern.split("/");
  const got = path.split("/");
  if (want.length !== got.length) return null;
  const params = {};
  for (let i = 0; i < want.length; i++) {
    if (want[i].startsWith(":")) {
      if (!got[i]) return null;
      params[want[i].slice(1)] = decodeURIComponent(got[i]);
    } else if (want[i] !== got[i]) {
      return null;
    }
  }
  return params;
}

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/";
    const method = request.method === "HEAD" ? "GET" : request.method;
    let pathMatched = false;

    for (const [routeMethod, pattern, handler, guard] of ROUTES) {
      const params = match(pattern, path);
      if (!params) continue;
      pathMatched = true;
      if (routeMethod !== method) continue;
      const context = { request, env, params, data: {}, waitUntil: (p) => ctx.waitUntil(p) };
      context.next = () => handler(context);
      try {
        return await (guard ? guard(context) : handler(context));
      } catch (err) {
        console.error(err);
        return json({ error: "Something went wrong. Please try again." }, 500);
      }
    }

    if (pathMatched) return json({ error: "Method not allowed" }, 405);
    if (path.startsWith("/api/")) return json({ error: "Not found" }, 404);
    return env.ASSETS.fetch(request);
  },
};
