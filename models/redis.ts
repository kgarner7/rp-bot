import bluebird from "bluebird";
import { createClient } from "redis";

export const client = createClient();
