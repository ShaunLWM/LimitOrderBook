import { randomBytes } from "node:crypto";

export const getCurrentUnix = () => Date.now();

export const getUniqueId = () => randomBytes(5).toString("hex");

export const getTxId = () => randomBytes(13).toString("hex");

const ROUND_DIGITS = 10;
const ROUND_FACTOR = 10 ** ROUND_DIGITS;
export const roundFloat = (n: number): number => Math.round(n * ROUND_FACTOR) / ROUND_FACTOR;
