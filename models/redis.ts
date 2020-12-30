import { createClient } from "redis";
import Redlock from "redlock";

export const client = createClient();

export const locks = new Redlock([client]);
