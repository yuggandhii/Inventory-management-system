const router = require('express').Router();
const c = require('./controller');
const { requireAuth } = require('../../middleware/auth');

router.get('/', requireAuth, c.getSummary);

module.exports = router;
