import hexoid from "hexoid";

export const getCurrentUnix = () => Date.now()

export const getUniqueId = () => hexoid(10)();

export const getTxId = () => hexoid(25)();