const { z } = require('zod');

const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200),
  sku: z.string().min(1, 'SKU is required').max(50),
  category_id: z.string().uuid('Invalid category ID').optional().nullable(),
  unit_of_measure: z.string().min(1).max(20).default('pcs'),
  cost_per_unit: z.number().min(0, 'Cost must be 0 or greater'),
  notes: z.string().optional().nullable(),
});

const updateProductSchema = createProductSchema.partial();

const productQuerySchema = z.object({
  search: z.string().optional(),
  category_id: z.string().uuid().optional(),
  is_active: z.enum(['true', 'false']).optional(),
  page: z.string().regex(/^\d+$/).optional().default('1'),
  limit: z.string().regex(/^\d+$/).optional().default('20'),
});

module.exports = { createProductSchema, updateProductSchema, productQuerySchema };
