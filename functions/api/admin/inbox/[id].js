import { inbox } from "../../../_lib/handlers.js";

export const onRequestGet = inbox.open;
export const onRequestPost = inbox.reply;
