const db = require('../../db');

const getSummary = async () => {
  const today = new Date().toISOString().split('T')[0];

  const [pendingReceipts] = await db('stock_moves').count('* as count')
    .where('move_type', 'receipt').whereIn('status', ['draft', 'ready']);

  const [pendingDeliveries] = await db('stock_moves').count('* as count')
    .where('move_type', 'delivery').whereIn('status', ['draft', 'waiting', 'ready']);

  const [lateReceipts] = await db('stock_moves').count('* as count')
    .where('move_type', 'receipt')
    .whereIn('status', ['draft', 'ready'])
    .where('scheduled_date', '<', today);

  const [lateDeliveries] = await db('stock_moves').count('* as count')
    .where('move_type', 'delivery')
    .whereIn('status', ['draft', 'waiting', 'ready'])
    .where('scheduled_date', '<', today);

  const [waitingDeliveries] = await db('stock_moves').count('* as count')
    .where('move_type', 'delivery').where('status', 'waiting');

  const LOW_STOCK_THRESHOLD = 10;
  const lowStockItems = await db('stock_quant')
    .select('products.name', 'products.sku', 'stock_quant.qty_on_hand', 'locations.name as location_name')
    .join('products',  'stock_quant.product_id',  'products.id')
    .join('locations', 'stock_quant.location_id', 'locations.id')
    .where('stock_quant.qty_on_hand', '<', LOW_STOCK_THRESHOLD)
    .where('products.is_active', true);

  return {
    pending_receipts:   Number(pendingReceipts.count),
    pending_deliveries: Number(pendingDeliveries.count),
    late_receipts:      Number(lateReceipts.count),
    late_deliveries:    Number(lateDeliveries.count),
    waiting_deliveries: Number(waitingDeliveries.count),
    low_stock_items:    lowStockItems,
    low_stock_count:    lowStockItems.length,
  };
};

module.exports = { getSummary };
