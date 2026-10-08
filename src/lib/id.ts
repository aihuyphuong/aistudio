export const uid = (prefix = '') => `${prefix}${crypto.randomUUID().slice(0, 8)}`;
