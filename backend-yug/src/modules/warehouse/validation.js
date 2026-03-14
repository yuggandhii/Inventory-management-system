const { z } = require('zod');

const warehouseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  short_code: z.string().min(1).max(10).toUpperCase(),
  address: z.string().optional().nullable(),
});

const locationSchema = z.object({
  warehouse_id: z.string().uuid('Invalid warehouse ID'),
  name: z.string().min(1, 'Name is required').max(100),
  short_code: z.string().min(1).max(20).toUpperCase(),
  type: z.enum(['internal', 'vendor', 'customer']).default('internal'),
});

module.exports = { warehouseSchema, locationSchema };
