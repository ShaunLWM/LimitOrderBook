import hexoid from "hexoid";

const generateId = hexoid(10);

export const getCurrentUnix = () => Date.now()

export const getUniqueId = () => generateId();