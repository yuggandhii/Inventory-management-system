const router = require('express').Router();
const c = require('./controller');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { warehouseSchema, locationSchema } = require('./validation');

router.get('/',              requireAuth, c.listWarehouses);
router.post('/',             requireAuth, requireRole('manager'), validate(warehouseSchema), c.createWarehouse);
router.get('/:id',           requireAuth, c.getWarehouse);
router.put('/:id',           requireAuth, requireRole('manager'), validate(warehouseSchema), c.updateWarehouse);
router.get('/locations',     requireAuth, c.listLocations);
router.post('/locations',    requireAuth, requireRole('manager'), validate(locationSchema), c.createLocation);
router.put('/locations/:id', requireAuth, requireRole('manager'), c.updateLocation);

module.exports = router;
