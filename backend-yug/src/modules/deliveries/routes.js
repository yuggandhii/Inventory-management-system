const router = require('express').Router();
const c = require('./controller');
const { requireAuth } = require('../../middleware/auth');
const { validate, validateQuery } = require('../../middleware/validate');
const { createDeliverySchema, deliveryQuerySchema } = require('./validation');

router.get('/',              requireAuth, validateQuery(deliveryQuerySchema), c.list);
router.post('/',             requireAuth, validate(createDeliverySchema),     c.create);
router.get('/:id',           requireAuth, c.getById);
router.post('/:id/todo',     requireAuth, c.todo);
router.post('/:id/validate', requireAuth, c.validate);
router.post('/:id/cancel',   requireAuth, c.cancel);

module.exports = router;
