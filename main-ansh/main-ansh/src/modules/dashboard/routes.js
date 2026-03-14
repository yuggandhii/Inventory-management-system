import { Router } from 'express';
import { query } from 'express-validator';
import { validate } from '../../middleware/validate.js';
import * as ctrl from './controller.js';

const router = Router();

router.get('/kpis', ctrl.getKpis);

router.get(
  '/operations',
  [
    query('documentType').optional().isIn(['receipts', 'deliveries', 'internal', 'transfers', 'adjustments']),
    query('status').optional().isIn(['draft', 'waiting', 'ready', 'done', 'canceled']),
    query('warehouseId').optional().isString(),
    query('categoryId').optional().isString(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validate,
  ctrl.getOperations
);

export const dashboardRoutes = router;
