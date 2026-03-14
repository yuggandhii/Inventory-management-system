import { Router } from 'express';
import { body, query } from 'express-validator';
import { validate } from '../../middleware/validate.js';
import * as ctrl from './controller.js';

const router = Router();

router.get(
  '/',
  [
    query('status').optional().isIn(['draft', 'waiting', 'ready', 'done', 'canceled']),
    query('fromWarehouseId').optional().isString(),
    query('toWarehouseId').optional().isString(),
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
    body('fromWarehouseId').isString(),
    body('toWarehouseId').isString(),
    body('scheduledAt').optional().isISO8601(),
    body('notes').optional().trim(),
    body('lines').optional().isArray(),
    body('lines.*.productId').optional().isString(),
    body('lines.*.quantity').optional().isFloat({ min: 0.001 }),
  ],
  validate,
  ctrl.create
);

router.patch(
  '/:id',
  [
    body('fromWarehouseId').optional().isString(),
    body('toWarehouseId').optional().isString(),
    body('scheduledAt').optional().isISO8601(),
    body('notes').optional().trim(),
    body('status').optional().isIn(['draft', 'waiting', 'ready', 'done', 'canceled']),
    body('lines').optional().isArray(),
  ],
  validate,
  ctrl.update
);

router.post('/:id/validate', ctrl.validateTransfer);
router.post('/:id/cancel', ctrl.cancel);

export const transferRoutes = router;
