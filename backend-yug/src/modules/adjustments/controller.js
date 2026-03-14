const service = require('./service');
const { ok, created } = require('../../utils/response');

const list   = async (req, res, next) => { try { return ok(res, await service.list(req.query)); } catch (e) { next(e); } };
const create = async (req, res, next) => { try { return created(res, await service.create(req.body, req.user.id)); } catch (e) { next(e); } };

module.exports = { list, create };
