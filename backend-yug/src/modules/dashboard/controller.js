const service = require('./service');
const { ok } = require('../../utils/response');

const getSummary = async (req, res, next) => { try { return ok(res, await service.getSummary()); } catch (e) { next(e); } };

module.exports = { getSummary };
