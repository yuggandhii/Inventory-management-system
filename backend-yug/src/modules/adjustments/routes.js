const router = require('express').Router();
const c = require('./controller');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { createAdjustmentSchema } = require('./validation');

router.get('/',  requireAuth, c.list);
router.post('/', requireAuth, requireRole('manager'), validate(createAdjustmentSchema), c.create);

module.exports = router;
