import { Type } from '@sinclair/typebox';
import { authMiddleware } from '../auth.mjs';
import * as couponService from '../services/coupon.service.mjs';

const ValidateCouponBody = Type.Object({
  code: Type.String({ minLength: 1 }),
  subtotal: Type.Number({ minimum: 0 }),
});

export async function couponRoutes(app) {
  // POST /api/coupons/validate
  app.post('/api/coupons/validate', {
    preHandler: [authMiddleware],
    schema: { body: ValidateCouponBody },
  }, async (request, reply) => {
    const { code, subtotal } = request.body;
    const result = couponService.validateCoupon(app.db, code, subtotal);
    if (!result.success) {
      const statusCode = result.error.code === 'COUPON_NOT_FOUND' ? 404 : 422;
      return reply.code(statusCode).send(result);
    }
    return reply.send(result);
  });
}
