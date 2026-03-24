import { createContext, useContext, useReducer, useMemo } from 'react';

const CartContext = createContext(null);

const initialState = {
  items: [],
  coupon: null,
  discount: 0,
};

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find(
        (i) => i.menuItemId === action.payload.menuItemId
      );
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.menuItemId === action.payload.menuItemId
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        };
      }
      return { ...state, items: [...state.items, { ...action.payload, quantity: 1 }] };
    }
    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter((i) => i.menuItemId !== action.payload),
      };
    case 'UPDATE_QTY': {
      const { menuItemId, quantity } = action.payload;
      if (quantity <= 0) {
        return { ...state, items: state.items.filter((i) => i.menuItemId !== menuItemId) };
      }
      return {
        ...state,
        items: state.items.map((i) =>
          i.menuItemId === menuItemId ? { ...i, quantity } : i
        ),
      };
    }
    case 'SET_COUPON':
      return { ...state, coupon: action.payload.code, discount: action.payload.discount };
    case 'CLEAR_COUPON':
      return { ...state, coupon: null, discount: 0 };
    case 'CLEAR_CART':
      return { ...initialState };
    case 'SET_ITEMS':
      return { ...state, items: action.payload };
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  const addItem = (item) => dispatch({ type: 'ADD_ITEM', payload: item });
  const removeItem = (menuItemId) => dispatch({ type: 'REMOVE_ITEM', payload: menuItemId });
  const updateQty = (menuItemId, quantity) =>
    dispatch({ type: 'UPDATE_QTY', payload: { menuItemId, quantity } });
  const setCoupon = (code, discount) =>
    dispatch({ type: 'SET_COUPON', payload: { code, discount } });
  const clearCoupon = () => dispatch({ type: 'CLEAR_COUPON' });
  const clearCart = () => dispatch({ type: 'CLEAR_CART' });
  const setItems = (items) => dispatch({ type: 'SET_ITEMS', payload: items });

  const calculations = useMemo(() => {
    const subtotal = state.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const deliveryFee = state.items.length > 0 ? (state.items[0]?.deliveryFee ?? 5.9) : 0;
    const discountAmount = state.discount > 0 ? subtotal * (state.discount / 100) : 0;
    const total = Math.max(0, subtotal + deliveryFee - discountAmount);
    const itemCount = state.items.reduce((sum, i) => sum + i.quantity, 0);
    const freeDeliveryThreshold = 80;
    const freeDeliveryProgress = Math.min(100, (subtotal / freeDeliveryThreshold) * 100);
    const isFreeDelivery = subtotal >= freeDeliveryThreshold;
    const effectiveDeliveryFee = isFreeDelivery ? 0 : deliveryFee;
    const effectiveTotal = Math.max(0, subtotal + effectiveDeliveryFee - discountAmount);

    return {
      subtotal,
      deliveryFee: effectiveDeliveryFee,
      discountAmount,
      total: effectiveTotal,
      itemCount,
      freeDeliveryProgress,
      isFreeDelivery,
      freeDeliveryThreshold,
    };
  }, [state.items, state.discount]);

  return (
    <CartContext.Provider
      value={{
        ...state,
        ...calculations,
        addItem,
        removeItem,
        updateQty,
        setCoupon,
        clearCoupon,
        clearCart,
        setItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}

export default CartContext;
