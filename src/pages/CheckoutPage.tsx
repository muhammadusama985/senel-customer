import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { useI18n } from '../i18n';
import { formatMoney } from '../utils/currency';
import './CheckoutPage.css';

interface Address {
  _id: string;
  label?: string;
  isDefault?: boolean;
  companyName?: string;
  contactPerson?: string;
  phone?: string;
  country: string;
  city: string;
  postalCode?: string;
  street1: string;
  street2?: string;
}

interface CartPayload {
  cart: {
    discountTotal?: number;
    grandTotal?: number;
    subtotal?: number;
  };
}

interface StripeIntentResponse {
  orderId: string;
  clientSecret: string;
  publishableKey: string;
  paymentIntentId: string;
}

const StripePaymentForm: React.FC<{
  onSuccess: () => Promise<void>;
  onCancel: () => void;
}> = ({ onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    if (!stripe || !elements || isConfirming) return;
    setIsConfirming(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        toast.error(error.message || 'Payment failed');
        return;
      }

      if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
        await onSuccess();
        return;
      }

      toast.error(`Payment not completed: ${paymentIntent?.status || 'unknown'}`);
    } catch (err: any) {
      toast.error(err?.message || 'Payment failed');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="stripe-modal-backdrop">
      <div className="card stripe-modal">
        <h3>Complete Online Payment</h3>
        <p className="muted">Enter card details to confirm your order payment.</p>
        <div className="stripe-element-wrap">
          <PaymentElement />
        </div>
        <div className="stripe-actions">
          <button className="btn btn-outline" onClick={onCancel} disabled={isConfirming}>Cancel</button>
          <button className="btn btn-primary" onClick={handleConfirm} disabled={!stripe || !elements || isConfirming}>
            {isConfirming ? 'Processing...' : 'Pay Now'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user } = useAuthStore();
  const { items, subtotal, fetchCart, clearCart } = useCartStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'bank_transfer'>('online');
  const [couponCode, setCouponCode] = useState('');
  const [discountTotal, setDiscountTotal] = useState(0);
  const [grandTotal, setGrandTotal] = useState(subtotal);
  const [stripeIntent, setStripeIntent] = useState<StripeIntentResponse | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState('');
  const manualShippingRequired = items.some((item) => item.requiresManualShipping);

  const [addressForm, setAddressForm] = useState({
    label: 'Warehouse',
    companyName: '',
    contactPerson: '',
    phone: '',
    country: '',
    city: '',
    postalCode: '',
    street1: '',
    street2: '',
  });

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true, state: { from: '/checkout' } });
    }
  }, [user, navigate]);

  useEffect(() => {
    void fetchCart();
  }, [fetchCart]);

  useEffect(() => {
    void loadAddresses();
  }, []);

  useEffect(() => {
    setGrandTotal(Math.max(subtotal - discountTotal, 0));
  }, [subtotal, discountTotal]);

  const canPlaceOrder = useMemo(
    () => items.length > 0 && selectedAddressId.length > 0 && !isSubmitting && !stripeIntent,
    [items.length, selectedAddressId, isSubmitting, stripeIntent]
  );

  const stripePromise = useMemo(() => {
    if (!stripeIntent?.publishableKey) return null;
    return loadStripe(stripeIntent.publishableKey);
  }, [stripeIntent?.publishableKey]);

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const waitForPaidStatus = async (orderId: string) => {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      try {
        const response = await api.get<{ order?: { paymentStatus?: string } }>(`/orders/me/${orderId}`);
        const status = response.data?.order?.paymentStatus;
        if (status === 'paid') return true;
      } catch {
        // keep retrying until max attempts
      }
      await sleep(1500);
    }
    return false;
  };

  const handleStripeSuccess = async () => {
    if (!pendingOrderId) return;
    let paid = false;
    try {
      const confirmResponse = await api.post<{ paymentStatus?: string }>('/payments/stripe/confirm', { orderId: pendingOrderId });
      paid = confirmResponse.data?.paymentStatus === 'paid';
    } catch {
      // fallback to polling for safety
      paid = await waitForPaidStatus(pendingOrderId);
    }
    await clearCart();
    setStripeIntent(null);
    const targetOrderId = pendingOrderId;
    setPendingOrderId('');
    if (!paid) {
      toast.success('Payment submitted. Verification may take a few seconds.');
    } else {
      toast.success('Payment successful');
    }
    navigate(`/orders?created=${targetOrderId}`);
  };

  const loadAddresses = async () => {
    try {
      const response = await api.get<{ items: Address[] }>('/addresses/me');
      const next = Array.isArray(response.data.items) ? response.data.items : [];
      setAddresses(next);
      const def = next.find((a) => a.isDefault);
      setSelectedAddressId(def?._id || next[0]?._id || '');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load addresses');
    }
  };

  const createAddress = async () => {
    if (!addressForm.country || !addressForm.city || !addressForm.street1) {
      toast.error('Country, city and street are required');
      return;
    }

    try {
      await api.post('/addresses/me', addressForm);
      toast.success('Address added');
      setAddressForm({
        label: 'Warehouse',
        companyName: '',
        contactPerson: '',
        phone: '',
        country: '',
        city: '',
        postalCode: '',
        street1: '',
        street2: '',
      });
      await loadAddresses();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add address');
    }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const response = await api.post<CartPayload>('/coupons/me/apply', { code: couponCode.trim() });
      const cart = response.data.cart || {};
      setDiscountTotal(Number(cart.discountTotal || 0));
      setGrandTotal(Number(cart.grandTotal || subtotal));
      toast.success('Coupon applied');
      await fetchCart();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to apply coupon');
    }
  };

  const removeCoupon = async () => {
    try {
      const response = await api.post<CartPayload>('/coupons/me/remove');
      const cart = response.data.cart || {};
      setDiscountTotal(Number(cart.discountTotal || 0));
      setGrandTotal(Number(cart.grandTotal || subtotal));
      setCouponCode('');
      toast.success('Coupon removed');
      await fetchCart();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to remove coupon');
    }
  };

  const placeOrder = async () => {
    if (!canPlaceOrder) return;
    setIsSubmitting(true);
    try {
      const response = await api.post<{ order: { _id: string } }>('/checkout', {
        addressId: selectedAddressId,
        paymentMethod,
        shippingTotal: 0,
      });
      const orderId = response.data.order?._id || '';
      if (!orderId) {
        throw new Error('Order ID missing in checkout response');
      }

      if (paymentMethod === 'online') {
        const intentResponse = await api.post<StripeIntentResponse>('/payments/stripe/create-intent', { orderId });
        if (!intentResponse.data?.clientSecret || !intentResponse.data?.publishableKey) {
          throw new Error('Stripe payment initialization failed');
        }
        setPendingOrderId(orderId);
        setStripeIntent(intentResponse.data);
        toast.success('Order created. Complete online payment to finish.');
      } else {
        await clearCart();
        toast.success('Order placed successfully');
        navigate(`/orders?created=${orderId}`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Checkout failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="checkout-page">
      <div className="container">
        <div className="checkout-header">
          <h1>{t('checkout.title', 'Checkout')}</h1>
          <p>{t('checkout.subtitle', 'Review address, coupon and payment method before placing order.')}</p>
        </div>

        <div className="checkout-grid">
          <section className="card checkout-block">
            <h3>{t('checkout.shippingAddress', 'Shipping Address')}</h3>
            {addresses.length === 0 ? (
              <p className="muted">{t('checkout.noAddress', 'No saved address found. Add one below.')}</p>
            ) : (
              <div className="address-list">
                {addresses.map((address) => (
                  <label key={address._id} className="address-item">
                    <input
                      type="radio"
                      checked={selectedAddressId === address._id}
                      onChange={() => setSelectedAddressId(address._id)}
                    />
                    <span>
                      <strong>{address.label || 'Address'}</strong> - {address.street1}, {address.city}, {address.country}
                    </span>
                  </label>
                ))}
              </div>
            )}

            <div className="address-form">
              <h4>{t('checkout.addAddress', 'Add Address')}</h4>
              <input
                placeholder="Label"
                value={addressForm.label}
                onChange={(e) => setAddressForm((p) => ({ ...p, label: e.target.value }))}
              />
              <input
                placeholder="Company Name"
                value={addressForm.companyName}
                onChange={(e) => setAddressForm((p) => ({ ...p, companyName: e.target.value }))}
              />
              <input
                placeholder="Contact Person"
                value={addressForm.contactPerson}
                onChange={(e) => setAddressForm((p) => ({ ...p, contactPerson: e.target.value }))}
              />
              <input
                placeholder="Phone"
                value={addressForm.phone}
                onChange={(e) => setAddressForm((p) => ({ ...p, phone: e.target.value }))}
              />
              <input
                placeholder="Country"
                value={addressForm.country}
                onChange={(e) => setAddressForm((p) => ({ ...p, country: e.target.value }))}
              />
              <input
                placeholder="City"
                value={addressForm.city}
                onChange={(e) => setAddressForm((p) => ({ ...p, city: e.target.value }))}
              />
              <input
                placeholder="Postal Code"
                value={addressForm.postalCode}
                onChange={(e) => setAddressForm((p) => ({ ...p, postalCode: e.target.value }))}
              />
              <input
                placeholder="Street 1"
                value={addressForm.street1}
                onChange={(e) => setAddressForm((p) => ({ ...p, street1: e.target.value }))}
              />
              <input
                placeholder="Street 2"
                value={addressForm.street2}
                onChange={(e) => setAddressForm((p) => ({ ...p, street2: e.target.value }))}
              />
              <button className="btn btn-outline" onClick={createAddress}>{t('checkout.saveAddress', 'Save Address')}</button>
            </div>
          </section>

          <section className="card checkout-block">
            <h3>{t('checkout.coupon', 'Coupon')}</h3>
            <div className="coupon-row">
              <input
                placeholder={t('checkout.enterCoupon', 'Enter coupon code')}
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
              />
              <button className="btn btn-primary" onClick={applyCoupon}>{t('checkout.apply', 'Apply')}</button>
              <button className="btn btn-outline" onClick={removeCoupon}>{t('checkout.remove', 'Remove')}</button>
            </div>

            <h3>{t('checkout.paymentMethod', 'Payment Method')}</h3>
            <div className="payment-options">
              <label>
                <input
                  type="radio"
                  checked={paymentMethod === 'online'}
                  onChange={() => setPaymentMethod('online')}
                />
                {t('checkout.online', 'Online')}
              </label>
              <label>
                <input
                  type="radio"
                  checked={paymentMethod === 'bank_transfer'}
                  onChange={() => setPaymentMethod('bank_transfer')}
                />
                {t('checkout.bankTransfer', 'Bank Transfer')}
              </label>
            </div>

            <h3>{t('checkout.summary', 'Order Summary')}</h3>
            {manualShippingRequired && (
              <div className="summary-item">
                <span>{t('checkout.shippingQuote', 'Shipping Quote')}</span>
                <span>{t('checkout.shippingQuoteInfo', 'Will be discussed and quoted by admin')}</span>
              </div>
            )}
            <div className="summary-item"><span>{t('checkout.items', 'Items')}</span><span>{items.length}</span></div>
            <div className="summary-item"><span>{t('checkout.subtotal', 'Subtotal')}</span><span>{formatMoney(subtotal, items[0]?.currency)}</span></div>
            <div className="summary-item"><span>{t('checkout.discount', 'Discount')}</span><span>- {formatMoney(discountTotal, items[0]?.currency)}</span></div>
            <div className="summary-item total"><span>{t('checkout.total', 'Total')}</span><span>{formatMoney(grandTotal, items[0]?.currency)}</span></div>

            <button
              className="btn btn-primary place-order-btn"
              disabled={!canPlaceOrder}
              onClick={placeOrder}
            >
              {isSubmitting ? t('checkout.placing', 'Placing Order...') : t('checkout.placeOrder', 'Place Order')}
            </button>
          </section>
        </div>
      </div>
      {stripeIntent && stripePromise && (
        <Elements stripe={stripePromise} options={{ clientSecret: stripeIntent.clientSecret }}>
          <StripePaymentForm
            onSuccess={handleStripeSuccess}
            onCancel={() => {
              setStripeIntent(null);
              toast('Order kept as unpaid. You can pay later from order details.');
              navigate(`/orders?created=${pendingOrderId}`);
            }}
          />
        </Elements>
      )}
    </div>
  );
};
