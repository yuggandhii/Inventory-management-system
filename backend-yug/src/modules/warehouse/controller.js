const s = require('./service');
const { ok, created } = require('../../utils/response');

const listWarehouses  = async (req, res, next) => { try { return ok(res, await s.listWarehouses()); } catch (e) { next(e); } };
const getWarehouse    = async (req, res, next) => { try { return ok(res, await s.getWarehouse(req.params.id)); } catch (e) { next(e); } };
const createWarehouse = async (req, res, next) => { try { return created(res, await s.createWarehouse(req.body)); } catch (e) { next(e); } };
const updateWarehouse = async (req, res, next) => { try { return ok(res, await s.updateWarehouse(req.params.id, req.body)); } catch (e) { next(e); } };
const listLocations   = async (req, res, next) => { try { return ok(res, await s.listLocations(req.query.warehouse_id)); } catch (e) { next(e); } };
const createLocation  = async (req, res, next) => { try { return created(res, await s.createLocation(req.body)); } catch (e) { next(e); } };
const updateLocation  = async (req, res, next) => { try { return ok(res, await s.updateLocation(req.params.id, req.body)); } catch (e) { next(e); } };

module.exports = { listWarehouses, getWarehouse, createWarehouse, updateWarehouse, listLocations, createLocation, updateLocation };
