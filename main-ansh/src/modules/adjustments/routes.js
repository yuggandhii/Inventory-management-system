import { Router } from 'express';
import { body, query } from 'express-validator';
import { validate } from '../../middleware/validate.js';
import * as ctrl from './controller.js';

const router = Router();

router.get(
  '/',
  [
    query('status').optional().isIn(['draft', 'waiting', 'ready', 'done', 'canceled']),
    query('warehouseId').optional().isString(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validate,
  ctrl.list
);

router.get('/:id', ctrl.getOne);

router.post(
  '/',
  [
    body('warehouseId').isString(),
    body('reason').optional().trim(),
    body('notes').optional().trim(),
    body('lines').optional().isArray(),
    body('lines.*.productId').optional().isString(),
    body('lines.*.countedQuantity').optional().isFloat({ min: 0 }),
  ],
  validate,
  ctrl.create
);

router.patch(
  '/:id',
  [
    body('warehouseId').optional().isString(),
    body('reason').optional().trim(),
    body('notes').optional().trim(),
    body('lines').optional().isArray(),
  ],
  validate,
  ctrl.update
);

router.post('/:id/validate', ctrl.validateAdjustment);
router.post('/:id/cancel', ctrl.cancel);

export const adjustmentRoutes = router;
