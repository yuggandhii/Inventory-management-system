const ok = (res, data, meta, status = 200) => {
  const payload = { success: true, data };
  if (meta) payload.meta = meta;
  return res.status(status).json(payload);
};

const created  = (res, data) => ok(res, data, undefined, 201);
const noContent = (res) => res.status(204).send();
const badRequest = (res, message, errors) => {
  const payload = { success: false, error: message };
  if (errors) payload.errors = errors;
  return res.status(400).json(payload);
};
const unauthorized = (res, message = 'Unauthorized') =>
  res.status(401).json({ success: false, error: message });
const forbidden = (res, message = 'Forbidden') =>
  res.status(403).json({ success: false, error: message });
const notFound = (res, message = 'Resource not found') =>
  res.status(404).json({ success: false, error: message });
const conflict = (res, message) =>
  res.status(409).json({ success: false, error: message });

module.exports = { ok, created, noContent, badRequest, unauthorized, forbidden, notFound, conflict };
