import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { TrashIcon, ArrowLeftIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useI18n } from '../i18n';
import { formatMoney } from '../utils/currency';
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
      toast.error(error?.response?.data?.message || t('cart.failedUpdate', 'Failed to update quantity'));
    } finally {
      setUpdatingItems((prev) => {
        const next = new Set(prev);
        next.delete(cartItemId);
        return next;
      });
    }
  };

  const handleRemoveItem = async (cartItemId: string) => {
    if (!window.confirm(t('cart.removeConfirm', 'Remove this item from cart?'))) return;
    try {
      await removeItem(cartItemId);
      toast.success(t('cart.removed', 'Item removed from cart'));
    } catch {
      toast.error(t('cart.failedRemove', 'Failed to remove item'));
    }
  };

  const handleClearCart = async () => {
    if (!window.confirm(t('cart.clearConfirm', 'Clear your entire cart?'))) return;
    try {
      await clearCart();
      toast.success(t('cart.cleared', 'Cart cleared'));
    } catch {
      toast.error(t('cart.failedClear', 'Failed to clear cart'));
    }
  };

  const handleCheckout = () => {
    if (!user) {
      toast.error(t('cart.loginCheckout', 'Please login to checkout'));
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
            <h2>{t('cart.emptyTitle', 'Your cart is empty')}</h2>
            <p>{t('cart.emptySubtitle', 'Looks like you have not added any items yet.')}</p>
            <Link to="/products" className="btn btn-primary">
              {t('cart.startShopping', 'Start Shopping')}
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
            {t('cart.clearCart', 'Clear Cart')}
          </button>
        </div>

        <div className="cart-layout">
          <div className="cart-items">
            {items.map((item) => {
              const key = item.cartItemId || item.productId;
              const minimumOrder = Math.max(Number(item.moq || 1), 1);
              const nextDecreaseQty = item.quantity - 1;
              const availableStock = Number(item.availableStock || 0);
              const exceedsLiveStock = availableStock > 0 && item.quantity >= availableStock;
              return (
                <div key={key} className="cart-item">
                  <div className="cart-item-image">
                    <img src={item.imageUrl || '/images/placeholder.jpg'} alt={item.title} />
                  </div>

                  <div className="cart-item-details">
                    <Link to={`/products/${item.slug || item.productId}`} className="cart-item-title">
                      {item.title}
                    </Link>
                    <div className="cart-item-price">{formatMoney(item.unitPrice, item.currency)} {t('cart.perUnit', 'per unit')}</div>
                    <div className="cart-item-price">{t('cart.minimumOrder', 'Minimum order: {{qty}}', { qty: minimumOrder })}</div>
                    {availableStock > 0 ? (
                      <div className="cart-item-price">{t('cart.availableStock', 'Available stock: {{qty}}', { qty: availableStock })}</div>
                    ) : null}
                  </div>

                  <div className="cart-item-quantity">
                    <button
                      onClick={() => handleUpdateQuantity(key, nextDecreaseQty)}
                      disabled={nextDecreaseQty < minimumOrder || updatingItems.has(key)}
                      className="quantity-btn"
                    >
                      <MinusIcon className="icon-small" />
                    </button>

                    <span className="quantity-value">{updatingItems.has(key) ? '...' : item.quantity}</span>

                    <button
                      onClick={() => handleUpdateQuantity(key, item.quantity + 1)}
                      disabled={updatingItems.has(key) || exceedsLiveStock}
                      className="quantity-btn"
                    >
                      <PlusIcon className="icon-small" />
                    </button>
                  </div>

                  <div className="cart-item-total">
                    <div className="total-price">{formatMoney(item.lineTotal, item.currency)}</div>
                    <button
                      onClick={() => handleRemoveItem(key)}
                      className="remove-item-btn"
                      aria-label={t('cart.removeItem', 'Remove item')}
                    >
                      <TrashIcon className="icon-small" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="cart-summary">
            <h3>{t('cart.orderSummary', 'Order Summary')}</h3>

            <div className="summary-row">
              <span>{t('cart.subtotalItems', 'Subtotal ({{count}} items)', { count: itemCount })}</span>
              <span>{formatMoney(subtotal, items[0]?.currency)}</span>
            </div>

            <div className="summary-row">
              <span>{t('cart.shipping', 'Shipping')}</span>
              <span>{t('cart.calculatedCheckout', 'Calculated at checkout')}</span>
            </div>

            <div className="summary-row total">
              <span>{t('cart.estimatedTotal', 'Estimated Total')}</span>
              <span>{formatMoney(subtotal, items[0]?.currency)}</span>
            </div>

            <button onClick={handleCheckout} className="btn btn-primary btn-large checkout-btn">
              {t('cart.proceed', 'Proceed to Checkout')}
            </button>

            <Link to="/products" className="continue-shopping">
              <ArrowLeftIcon className="icon-small" />
              {t('cart.continueShopping', 'Continue Shopping')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
