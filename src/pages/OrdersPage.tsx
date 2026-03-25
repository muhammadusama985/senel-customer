import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useI18n } from '../i18n';
import { formatMoney } from '../utils/currency';
import './OrdersPage.css';

interface VendorOrder {
  _id: string;
  vendorStoreName?: string;
  status: string;
  shippingStatus?: string;
  vendorOrderNumber?: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  status: string;
  paymentMethod?: string;
  paymentStatus?: string;
  shippingStatus?: string;
  shippingPricingMode?: 'auto' | 'manual_discuss';
  shippingQuoteNote?: string;
  shippingTotal?: number;
  grandTotal: number;
  currency?: 'EUR' | 'TRY' | 'USD';
  createdAt: string;
  bankTransfer?: {
    proofUrl?: string;
    reference?: string;
  };
  vendorOrders?: VendorOrder[];
}

interface OrderItem {
  _id: string;
  title: string;
  qty: number;
  lineTotal: number;
  currency?: 'EUR' | 'TRY' | 'USD';
}

interface OrderDetail {
  order: Order;
  vendorOrders: VendorOrder[];
  items: OrderItem[];
}

interface StripeIntentResponse {
  orderId: string;
  clientSecret: string;
  publishableKey: string;
  paymentIntentId: string;
}

const StripePayLaterModal: React.FC<{
  onClose: () => void;
  onSuccess: () => Promise<void>;
}> = ({ onClose, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);

  const handlePay = async () => {
    if (!stripe || !elements || busy) return;
    setBusy(true);
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
    } catch (error: any) {
      toast.error(error?.message || 'Payment failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="order-modal-backdrop" onClick={onClose}>
      <div className="order-modal card stripe-paylater-modal" onClick={(e) => e.stopPropagation()}>
        <div className="order-modal-head">
          <h3>Pay Online</h3>
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
        <p className="muted">You can complete this unpaid order now.</p>
        <div className="stripe-element-wrap">
          <PaymentElement />
        </div>
        <div className="order-actions">
          <button className="btn btn-outline" onClick={onClose} disabled={busy}>Pay Later</button>
          <button className="btn btn-primary" onClick={handlePay} disabled={!stripe || !elements || busy}>
            {busy ? 'Processing...' : 'Pay Now'}
          </button>
        </div>
      </div>
    </div>
  );
};

const safeDate = (value?: string) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString();
};

export const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [bankReference, setBankReference] = useState('');
  const [stripeIntent, setStripeIntent] = useState<StripeIntentResponse | null>(null);
  const [stripeOrderId, setStripeOrderId] = useState('');
  const stripePromise = useMemo(
    () => (stripeIntent?.publishableKey ? loadStripe(stripeIntent.publishableKey) : null),
    [stripeIntent?.publishableKey]
  );

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  useEffect(() => {
    void loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await api.get<{ items: Order[] }>('/orders/me');
      setOrders(Array.isArray(response.data.items) ? response.data.items : []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const loadOrderDetail = async (orderId: string) => {
    try {
      const response = await api.get<OrderDetail>(`/orders/me/${orderId}`);
      setSelectedOrder(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load order details');
    }
  };

  const closeDetailOverlay = () => {
    setSelectedOrder(null);
    setProofImage(null);
    setBankReference('');
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const waitForPaidStatus = async (orderId: string) => {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const detailResponse = await api.get<OrderDetail>(`/orders/me/${orderId}`);
      const status = detailResponse.data?.order?.paymentStatus;
      if (status === 'paid') return true;
      await sleep(1500);
    }
    return false;
  };

  const startStripePayNow = async (orderId: string) => {
    try {
      const intentResponse = await api.post<StripeIntentResponse>('/payments/stripe/create-intent', { orderId });
      if (!intentResponse.data?.clientSecret || !intentResponse.data?.publishableKey) {
        throw new Error('Failed to initialize online payment');
      }
      setStripeIntent(intentResponse.data);
      setStripeOrderId(orderId);
    } catch (error: any) {
      toast.error(error.response?.data?.message || error?.message || 'Failed to initialize payment');
    }
  };

  const reorder = async (orderId: string) => {
    try {
      await api.post('/reorder/me', { orderId, mode: 'replace' });
      toast.success('Order items moved to cart');
      navigate('/cart');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reorder');
    }
  };

  const cancelOrder = async (orderId: string) => {
    try {
      await api.post(`/orders/me/${orderId}/cancel`);
      toast.success('Order cancelled');
      await loadOrders();
      if (selectedOrder?.order?._id === orderId) {
        setSelectedOrder(null);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Cannot cancel this order');
    }
  };

  const confirmShipping = async (orderId: string) => {
    try {
      await api.post(`/orders/${orderId}/confirm-shipping`);
      toast.success('Shipping quote confirmed');
      await loadOrders();
      if (selectedOrder?.order?._id === orderId) {
        await loadOrderDetail(orderId);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to confirm shipping');
    }
  };

  const submitBankProof = async () => {
    if (!selectedOrder?.order?._id) {
      toast.error('Order not selected');
      return;
    }

    if (!proofImage) {
      toast.error('Proof image is required');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('orderId', selectedOrder.order._id);
      if (proofImage) {
        formData.append('proofImage', proofImage);
      }
      if (bankReference.trim()) {
        formData.append('reference', bankReference.trim());
      }

      await api.post('/bank-transfer/submit-proof', formData);
      toast.success('Bank transfer proof submitted');
      await loadOrders();
      await loadOrderDetail(selectedOrder.order._id);
      setProofImage(null);
      setBankReference('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit proof');
    }
  };

  return (
    <div className="orders-page">
      <div className="container">
        <h1>{t('orders.title', 'My Orders')}</h1>

        {loading ? (
          <div className="card">{t('orders.loading', 'Loading orders...')}</div>
        ) : orders.length === 0 ? (
          <div className="card">{t('orders.empty', 'No orders found yet.')}</div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <article key={order._id} className="card order-item">
                <div className="order-top">
                  <div>
                    <h3>{order.orderNumber}</h3>
                    <p className="muted">{safeDate(order.createdAt)}</p>
                  </div>
                  <div>
                    <span className="badge">{order.status}</span>
                  </div>
                </div>
                <p>Total: <strong>{formatMoney(Number(order.grandTotal || 0), order.currency)}</strong></p>
                <p className="muted">{t('orders.payment', 'Payment')}: {order.paymentStatus || '-'}</p>
                <div className="order-actions">
                  <button className="btn btn-outline" onClick={() => loadOrderDetail(order._id)}>{t('orders.view', 'View')}</button>
                  {order.paymentMethod === 'online' && order.paymentStatus === 'unpaid' && (
                    <button className="btn btn-primary" onClick={() => startStripePayNow(order._id)}>Pay Now</button>
                  )}
                  <button className="btn btn-outline" onClick={() => reorder(order._id)}>{t('orders.reorder', 'Reorder')}</button>
                  {order.status !== 'cancelled' && (
                    <button className="btn btn-outline" onClick={() => cancelOrder(order._id)}>{t('orders.cancel', 'Cancel')}</button>
                  )}
                  {order.shippingStatus === 'quoted' && (
                    <button className="btn btn-primary" onClick={() => confirmShipping(order._id)}>{t('orders.confirmShipping', 'Confirm Shipping')}</button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      {selectedOrder && (
        <div className="order-modal-backdrop" onClick={closeDetailOverlay}>
          <div className="order-modal card" onClick={(e) => e.stopPropagation()}>
            <div className="order-modal-head">
              <h3>{selectedOrder.order.orderNumber}</h3>
              <button className="btn btn-outline" onClick={closeDetailOverlay}>
                {t('common.cancel', 'Cancel')}
              </button>
            </div>
            <p>Status: {selectedOrder.order.status}</p>
            <p>{t('orders.shipping', 'Shipping')}: {selectedOrder.order.shippingStatus || '-'}</p>
            <p>{t('orders.shippingMode', 'Shipping Mode')}: {selectedOrder.order.shippingPricingMode || '-'}</p>
            <p>{t('orders.payment', 'Payment')}: {selectedOrder.order.paymentStatus || '-'}</p>
            <p>{t('orders.placed', 'Placed')}: {safeDate(selectedOrder.order.createdAt)}</p>
            {selectedOrder.order.paymentMethod === 'online' && selectedOrder.order.paymentStatus === 'unpaid' && (
              <div className="order-actions">
                <button className="btn btn-primary" onClick={() => startStripePayNow(selectedOrder.order._id)}>Pay Now</button>
              </div>
            )}
            {selectedOrder.order.shippingQuoteNote ? (
              <p className="muted">{t('orders.shippingNote', 'Shipping Note')}: {selectedOrder.order.shippingQuoteNote}</p>
            ) : null}

            {selectedOrder.order.paymentMethod === 'bank_transfer' &&
              ['awaiting_transfer', 'rejected'].includes(selectedOrder.order.paymentStatus || '') && (
                <div className="bank-proof-box">
                  <h4>{t('orders.submitProof', 'Submit Bank Transfer Proof')}</h4>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProofImage(e.target.files?.[0] || null)}
                  />
                  <input
                    placeholder={t('orders.referenceOptional', 'Reference (optional)')}
                    value={bankReference}
                    onChange={(e) => setBankReference(e.target.value)}
                  />
                  <div className="order-actions">
                    <button className="btn btn-primary" onClick={submitBankProof}>{t('orders.submit', 'Submit Proof')}</button>
                    <button className="btn btn-outline" onClick={closeDetailOverlay}>{t('common.cancel', 'Cancel')}</button>
                  </div>
                </div>
              )}

            <h4>{t('orders.itemsLabel', 'Items')}</h4>
            <ul className="detail-list">
              {selectedOrder.items.map((item) => (
                <li key={item._id}>
                  <span>{item.title} x {item.qty}</span>
                  <strong>{formatMoney(Number(item.lineTotal || 0), item.currency || selectedOrder.order.currency)}</strong>
                </li>
              ))}
            </ul>

            <h4>{t('orders.vendorSplits', 'Vendor Splits')}</h4>
            <ul className="detail-list">
              {selectedOrder.vendorOrders.map((vo) => (
                <li key={vo._id}>
                  <span>{vo.vendorStoreName || vo.vendorOrderNumber || vo._id}</span>
                  <strong>{vo.status}</strong>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {stripeIntent && stripePromise && (
        <Elements stripe={stripePromise} options={{ clientSecret: stripeIntent.clientSecret }}>
          <StripePayLaterModal
            onClose={() => {
              setStripeIntent(null);
              setStripeOrderId('');
              toast('You can pay later from Orders using Pay Now.');
            }}
            onSuccess={async () => {
              if (stripeOrderId) {
                let paid = false;
                try {
                  const confirmResponse = await api.post<{ paymentStatus?: string }>('/payments/stripe/confirm', { orderId: stripeOrderId });
                  paid = confirmResponse.data?.paymentStatus === 'paid';
                } catch {
                  paid = await waitForPaidStatus(stripeOrderId);
                }
                await loadOrders();
                if (selectedOrder?.order?._id === stripeOrderId) {
                  await loadOrderDetail(stripeOrderId);
                }
                toast.success(paid ? 'Payment successful' : 'Payment submitted, verifying...');
              }
              setStripeIntent(null);
              setStripeOrderId('');
            }}
          />
        </Elements>
      )}
    </div>
  );
};
