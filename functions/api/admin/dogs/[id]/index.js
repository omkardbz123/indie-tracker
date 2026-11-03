import { dogs } from "../../../../_lib/handlers.js";

export const onRequestGet = dogs.get;
export const onRequestPut = dogs.update;
export const onRequestDelete = dogs.remove;
