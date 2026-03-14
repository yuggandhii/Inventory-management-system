const { z } = require('zod');

const createTransferSchema = z.object({
  from_location_id: z.string().uuid('Invalid location ID'),
  to_location_id:   z.string().uuid('Invalid location ID'),
  contact_name:     z.string().optional().nullable(),
  scheduled_date:   z.string().optional().nullable(),
  notes:            z.string().optional().nullable(),
  lines: z.array(z.object({
    product_id: z.string().uuid('Invalid product ID'),
    qty_demand: z.number().positive('Quantity must be greater than 0'),
  })).min(1, 'At least one product is required'),
}).refine((d) => d.from_location_id !== d.to_location_id, {
  message: 'Source and destination locations must be different',
  path: ['to_location_id'],
});

module.exports = { createTransferSchema };
