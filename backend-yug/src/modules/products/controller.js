const service = require('./service');
const { ok, created } = require('../../utils/response');

const list         = async (req, res, next) => { try { return ok(res, await service.list(req.query), { query: req.query }); } catch (e) { next(e); } };
const getById      = async (req, res, next) => { try { return ok(res, await service.getById(req.params.id)); } catch (e) { next(e); } };
const create       = async (req, res, next) => { try { return created(res, await service.create(req.body)); } catch (e) { next(e); } };
const update       = async (req, res, next) => { try { return ok(res, await service.update(req.params.id, req.body)); } catch (e) { next(e); } };
const toggleActive = async (req, res, next) => { try { return ok(res, await service.toggleActive(req.params.id)); } catch (e) { next(e); } };
const getStock     = async (req, res, next) => { try { return ok(res, await service.getStock(req.params.id)); } catch (e) { next(e); } };
const listCats     = async (req, res, next) => { try { return ok(res, await service.listCategories()); } catch (e) { next(e); } };
const createCat    = async (req, res, next) => { try { return created(res, await service.createCategory(req.body)); } catch (e) { next(e); } };

module.exports = { list, getById, create, update, toggleActive, getStock, listCats, createCat };
