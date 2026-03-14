const service = require('./service');
const { ok } = require('../../utils/response');

const list = async (req, res, next) => { try { return ok(res, await service.list(req.query)); } catch (e) { next(e); } };

module.exports = { list };
