const router = require('express').Router();
const c = require('./controller');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { validate, validateQuery } = require('../../middleware/validate');
const { createProductSchema, updateProductSchema, productQuerySchema } = require('./validation');

router.get('/',                    requireAuth, validateQuery(productQuerySchema), c.list);
router.post('/',                   requireAuth, requireRole('manager'), validate(createProductSchema), c.create);
router.get('/categories',          requireAuth, c.listCats);
router.post('/categories',         requireAuth, requireRole('manager'), c.createCat);
router.get('/:id',                 requireAuth, c.getById);
router.put('/:id',                 requireAuth, requireRole('manager'), validate(updateProductSchema), c.update);
router.patch('/:id/toggle-active', requireAuth, requireRole('manager'), c.toggleActive);
router.get('/:id/stock',           requireAuth, c.getStock);

module.exports = router;
