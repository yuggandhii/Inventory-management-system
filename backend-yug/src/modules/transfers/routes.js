const router = require('express').Router();
const c = require('./controller');
const { requireAuth } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { createTransferSchema } = require('./validation');

router.get('/',              requireAuth, c.list);
router.post('/',             requireAuth, validate(createTransferSchema), c.create);
router.get('/:id',           requireAuth, c.getById);
router.post('/:id/validate', requireAuth, c.validate);
router.post('/:id/cancel',   requireAuth, c.cancel);

module.exports = router;
