import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { TrashIcon, ArrowLeftIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useI18n } from '../i18n';
import './CartPage.css';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user } = useAuthStore();
  const {
    items,
    subtotal,
    itemCount,
    updateQuantity,
    removeItem,
    clearCart,
    isLoading,
  } = useCartStore();

  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());

  const handleUpdateQuantity = async (cartItemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    setUpdatingItems((prev) => new Set(prev).add(cartItemId));
    try {
      await updateQuantity(cartItemId, newQuantity);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update quantity');
    } finally {
      setUpdatingItems((prev) => {
        const next = new Set(prev);
        next.delete(cartItemId);
        return next;
      });
    }
  };

  const handleRemoveItem = async (cartItemId: string) => {
    if (!window.confirm('Remove this item from cart?')) return;
    try {
      await removeItem(cartItemId);
      toast.success('Item removed from cart');
    } catch {
      toast.error('Failed to remove item');
    }
  };

  const handleClearCart = async () => {
    if (!window.confirm('Clear your entire cart?')) return;
    try {
      await clearCart();
      toast.success('Cart cleared');
    } catch {
      toast.error('Failed to clear cart');
    }
  };

  const handleCheckout = () => {
    if (!user) {
      toast.error('Please login to checkout');
      navigate('/login', { state: { from: '/checkout' } });
      return;
    }
    navigate('/checkout');
  };

  if (isLoading) {
    return (
      <div className="cart-page-loading">
        <div className="container">
          <div className="loading-skeleton">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="cart-item-skeleton" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="cart-page-empty">
        <div className="container">
          <div className="empty-cart">
            <h2>Your cart is empty</h2>
            <p>Looks like you have not added any items yet.</p>
            <Link to="/products" className="btn btn-primary">
              Start Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="container">
        <div className="cart-header">
          <h1>{t('cart.title', 'Shopping Cart')}</h1>
          <button onClick={handleClearCart} className="clear-cart-btn">
            Clear Cart
          </button>
        </div>

        <div className="cart-layout">
          <div className="cart-items">
            {items.map((item) => {
              const key = item.cartItemId || item.productId;
              const step = Math.max(Number(item.moq || 1), 1);
              const nextDecreaseQty = item.quantity - step;
              return (
                <div key={key} className="cart-item">
                  <div className="cart-item-image">
                    <img src={item.imageUrl || '/images/placeholder.jpg'} alt={item.title} />
                  </div>

                  <div className="cart-item-details">
                    <Link to={`/products/${item.slug || item.productId}`} className="cart-item-title">
                      {item.title}
                    </Link>
                    <div className="cart-item-price">EUR {item.unitPrice.toFixed(2)} per unit</div>
                    <div className="cart-item-price">MOQ step: {step}</div>
                  </div>

                  <div className="cart-item-quantity">
                    <button
                      onClick={() => handleUpdateQuantity(key, nextDecreaseQty)}
                      disabled={nextDecreaseQty < step || updatingItems.has(key)}
                      className="quantity-btn"
                    >
                      <MinusIcon className="icon-small" />
                    </button>

                    <span className="quantity-value">{updatingItems.has(key) ? '...' : item.quantity}</span>

                    <button
                      onClick={() => handleUpdateQuantity(key, item.quantity + step)}
                      disabled={updatingItems.has(key)}
                      className="quantity-btn"
                    >
                      <PlusIcon className="icon-small" />
                    </button>
                  </div>

                  <div className="cart-item-total">
                    <div className="total-price">EUR {item.lineTotal.toFixed(2)}</div>
                    <button
                      onClick={() => handleRemoveItem(key)}
                      className="remove-item-btn"
                      aria-label="Remove item"
                    >
                      <TrashIcon className="icon-small" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="cart-summary">
            <h3>Order Summary</h3>

            <div className="summary-row">
              <span>Subtotal ({itemCount} items)</span>
              <span>EUR {subtotal.toFixed(2)}</span>
            </div>

            <div className="summary-row">
              <span>Shipping</span>
              <span>Calculated at checkout</span>
            </div>

            <div className="summary-row total">
              <span>Estimated Total</span>
              <span>EUR {subtotal.toFixed(2)}</span>
            </div>

            <button onClick={handleCheckout} className="btn btn-primary btn-large checkout-btn">
              {t('cart.proceed', 'Proceed to Checkout')}
            </button>

            <Link to="/products" className="continue-shopping">
              <ArrowLeftIcon className="icon-small" />
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
