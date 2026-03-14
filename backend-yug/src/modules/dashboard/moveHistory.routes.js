const router = require('express').Router();
const { requireAuth } = require('../../middleware/auth');
const { ok } = require('../../utils/response');
const service = require('./moveHistory.service');

router.get('/', requireAuth, async (req, res, next) => {
  try { return ok(res, await service.list(req.query)); } catch (e) { next(e); }
});

module.exports = router;
