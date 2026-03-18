/**
 * Validate a coupon code and calculate discount.
 */
export function validateCoupon(db, code, subtotal) {
  const coupon = db.prepare('SELECT * FROM coupons WHERE code = ?').get(code.toUpperCase());

  if (!coupon) {
    return { success: false, error: { code: 'COUPON_NOT_FOUND', message: 'Coupon not found' } };
  }

  if (!coupon.is_active) {
    return { success: false, error: { code: 'COUPON_INACTIVE', message: 'This coupon is no longer active' } };
  }

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return { success: false, error: { code: 'COUPON_EXPIRED', message: 'This coupon has expired' } };
  }

  if (coupon.max_uses && coupon.uses_count >= coupon.max_uses) {
    return { success: false, error: { code: 'COUPON_EXHAUSTED', message: 'This coupon has reached its maximum uses' } };
  }

  if (subtotal < coupon.min_order) {
    return {
      success: false,
      error: {
        code: 'MIN_ORDER_NOT_MET',
        message: `Minimum order of R$ ${coupon.min_order.toFixed(2)} required for this coupon`,
      },
    };
  }

  // Calculate discount amount
  let discountAmount;
  if (coupon.discount_type === 'percent') {
    discountAmount = Math.round(subtotal * coupon.discount_value) / 100;
  } else {
    discountAmount = coupon.discount_value;
  }

  // Discount cannot exceed subtotal
  discountAmount = Math.min(discountAmount, subtotal);
  discountAmount = Math.round(discountAmount * 100) / 100;

  return {
    success: true,
    data: {
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      discount_amount: discountAmount,
      min_order: coupon.min_order,
    },
  };
}
