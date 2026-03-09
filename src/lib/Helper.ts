export const getCurrentUnix = () => Date.now();

let idCounter = 0;
export const defaultIdGenerator = (): string => String(++idCounter);

const ROUND_DIGITS = 10;
const ROUND_FACTOR = 10 ** ROUND_DIGITS;
export const roundFloat = (n: number): number => Math.round(n * ROUND_FACTOR) / ROUND_FACTOR;
