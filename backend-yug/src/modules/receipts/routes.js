const router = require('express').Router();
const c = require('./controller');
const { requireAuth } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { createReceiptSchema, receiptQuerySchema } = require('./validation');
const { validateQuery } = require('../../middleware/validate');

router.get('/',              requireAuth, validateQuery(receiptQuerySchema), c.list);
router.post('/',             requireAuth, validate(createReceiptSchema),     c.create);
router.get('/:id',           requireAuth, c.getById);
router.post('/:id/todo',     requireAuth, c.todo);
router.post('/:id/validate', requireAuth, c.validate);
router.post('/:id/cancel',   requireAuth, c.cancel);

module.exports = router;
