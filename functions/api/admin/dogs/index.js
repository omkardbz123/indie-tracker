import { dogs } from "../../../_lib/handlers.js";

export const onRequestGet = dogs.list;
export const onRequestPost = dogs.create;
