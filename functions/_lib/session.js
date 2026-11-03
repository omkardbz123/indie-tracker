// Caretaker sessions: the login-link token itself is kept in an HttpOnly cookie scoped to the caretaker API.
import { caretakerFromToken } from "./store.js";

const COOKIE = "dogid_session";
const PATH = "/api/my";

function readCookie(request, name) {
  for (const part of (request.headers.get("Cookie") || "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

export const caretakerFromRequest = (request, env) => caretakerFromToken(env, readCookie(request, COOKIE));

const secure = (request) => (new URL(request.url).protocol === "https:" ? "; Secure" : "");

export const sessionCookie = (token, request) =>
  `${COOKIE}=${token}; Path=${PATH}; HttpOnly; SameSite=Lax; Max-Age=31536000${secure(request)}`;

export const clearSessionCookie = (request) => `${COOKIE}=; Path=${PATH}; HttpOnly; SameSite=Lax; Max-Age=0${secure(request)}`;
