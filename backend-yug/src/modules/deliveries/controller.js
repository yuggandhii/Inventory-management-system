const service = require('./service');
const { ok, created } = require('../../utils/response');

const list     = async (req, res, next) => { try { return ok(res, await service.list(req.query)); } catch (e) { next(e); } };
const getById  = async (req, res, next) => { try { return ok(res, await service.getById(req.params.id)); } catch (e) { next(e); } };
const create   = async (req, res, next) => { try { return created(res, await service.create(req.body, req.user.id)); } catch (e) { next(e); } };
const todo     = async (req, res, next) => { try { return ok(res, await service.todo(req.params.id, req.user.id)); } catch (e) { next(e); } };
const validate = async (req, res, next) => { try { return ok(res, await service.validate(req.params.id, req.user.id)); } catch (e) { next(e); } };
const cancel   = async (req, res, next) => { try { return ok(res, await service.cancel(req.params.id)); } catch (e) { next(e); } };

module.exports = { list, getById, create, todo, validate, cancel };
