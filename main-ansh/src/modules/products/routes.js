import { Router } from 'express';
import { body, query } from 'express-validator';
import { validate } from '../../middleware/validate.js';
import * as ctrl from './controller.js';

const router = Router();

router.get(
  '/',
  [
    query('categoryId').optional().isString(),
    query('warehouseId').optional().isString(),
    query('sku').optional().trim(),
    query('lowStock').optional().isIn(['true', 'false']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validate,
  ctrl.list
);

router.get('/:id', ctrl.getOne);
router.get('/:id/stock', ctrl.getStockByLocation);

router.post(
  '/',
  [
    body('name').trim().notEmpty(),
    body('sku').trim().notEmpty(),
    body('code').optional().trim(),
    body('categoryId').optional().isString(),
    body('unitOfMeasure').optional().trim(),
    body('description').optional().trim(),
    body('initialStock').optional().isFloat({ min: 0 }),
    body('warehouseId').optional().isString(),
  ],
  validate,
  ctrl.create
);

router.patch(
  '/:id',
  [
    body('name').optional().trim().notEmpty(),
    body('code').optional().trim(),
    body('categoryId').optional().isString(),
    body('unitOfMeasure').optional().trim(),
    body('description').optional().trim(),
  ],
  validate,
  ctrl.update
);

router.delete('/:id', ctrl.remove);

router.put(
  '/:id/reorder-rule',
  [
    body('minQuantity').optional().isFloat({ min: 0 }),
    body('maxQuantity').optional().isFloat({ min: 0 }),
    body('reorderPoint').optional().isFloat({ min: 0 }),
    body('warehouseId').optional().isString(),
  ],
  validate,
  ctrl.setReorderRule
);

export const productRoutes = router;
