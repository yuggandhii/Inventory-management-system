const { z } = require('zod');

const createAdjustmentSchema = z.object({
  product_id:  z.string().uuid('Invalid product ID'),
  location_id: z.string().uuid('Invalid location ID'),
  qty_counted: z.number().min(0, 'Counted quantity cannot be negative'),
  reason:      z.string().max(255).optional().nullable(),
});

module.exports = { createAdjustmentSchema };
