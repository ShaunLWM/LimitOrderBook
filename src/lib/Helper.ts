import { randomBytes } from "node:crypto";

export const getCurrentUnix = () => Date.now();

export const getUniqueId = () => randomBytes(5).toString("hex");

export const getTxId = () => randomBytes(13).toString("hex");
