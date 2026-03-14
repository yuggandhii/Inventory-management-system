const { z } = require('zod');

const createReceiptSchema = z.object({
  from_location_id: z.string().uuid('Invalid location ID'),
  to_location_id:   z.string().uuid('Invalid location ID'),
  contact_name:     z.string().min(1, 'Contact name is required').max(200),
  scheduled_date:   z.string().optional().nullable(),
  notes:            z.string().optional().nullable(),
  lines: z.array(z.object({
    product_id: z.string().uuid('Invalid product ID'),
    qty_demand: z.number().positive('Quantity must be greater than 0'),
  })).min(1, 'At least one product is required'),
});

const updateReceiptSchema = z.object({
  contact_name:   z.string().max(200).optional(),
  scheduled_date: z.string().optional().nullable(),
  notes:          z.string().optional().nullable(),
});

const receiptQuerySchema = z.object({
  status:     z.enum(['draft','ready','done','cancelled']).optional(),
  search:     z.string().optional(),
  from_date:  z.string().optional(),
  to_date:    z.string().optional(),
  page:       z.string().regex(/^\d+$/).optional().default('1'),
  limit:      z.string().regex(/^\d+$/).optional().default('20'),
});

module.exports = { createReceiptSchema, updateReceiptSchema, receiptQuerySchema };
