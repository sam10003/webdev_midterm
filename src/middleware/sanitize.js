function stripKeys(obj) {
  if (typeof obj !== "object" || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(stripKeys);

  const clean = {};
  for (const [key, val] of Object.entries(obj)) {
    if (key.startsWith("$") || key.includes(".")) continue;
    clean[key] = stripKeys(val);
  }
  return clean;
}

export const sanitize = (req, res, next) => {
  if (req.body) req.body = stripKeys(req.body);
  if (req.params) req.params = stripKeys(req.params);
  next();
};
