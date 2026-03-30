const PLATFORM_FEE_PERCENT = 15; // 15% platform fee

/**
 * Calculate split rules for an order.
 * Distributes payment between platform and restaurants.
 *
 * @param {object} order - Order with items
 * @param {object[]} orderItems - Items with restaurant_id, restaurant_name, item_price, quantity
 * @param {object} db - Database instance
 * @returns {object[]} Split rules for ECP Pay
 */
export function calculateOrderSplits(order, orderItems, db) {
  // Group items by restaurant
  const byRestaurant = {};
  for (const item of orderItems) {
    if (!byRestaurant[item.restaurant_id]) {
      byRestaurant[item.restaurant_id] = {
        restaurant_id: item.restaurant_id,
        restaurant_name: item.restaurant_name,
        subtotal: 0,
      };
    }
    byRestaurant[item.restaurant_id].subtotal += item.item_price * item.quantity * 100; // to cents
  }

  const totalCents = Math.round(order.total * 100);
  const splits = [];
  let restaurantTotalCents = 0;

  // For each restaurant: restaurant gets (100% - platform fee) of their items
  for (const [restaurantId, data] of Object.entries(byRestaurant)) {
    // Get restaurant PJ info
    const restaurant = db.prepare('SELECT pj_cnpj, pj_pix_key FROM restaurants WHERE id = ?').get(restaurantId);

    const restaurantSubtotalCents = Math.round(data.subtotal);
    const restaurantShareCents = Math.round(restaurantSubtotalCents * (100 - PLATFORM_FEE_PERCENT) / 100);
    restaurantTotalCents += restaurantShareCents;

    if (restaurant && restaurant.pj_cnpj) {
      splits.push({
        account_id: restaurant.pj_cnpj,
        account_name: data.restaurant_name,
        pix_key: restaurant.pj_pix_key,
        amount: restaurantShareCents,
        type: 'fixed',
      });
    }
  }

  // Platform gets the rest (fees + delivery)
  const platformShareCents = totalCents - restaurantTotalCents;
  splits.push({
    account_id: 'ecp-food-platform',
    account_name: 'FoodFlow Plataforma',
    amount: platformShareCents,
    type: 'fixed',
  });

  return splits;
}
