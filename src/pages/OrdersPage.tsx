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
import './OrdersPage.css';

interface VendorOrder {
  _id: string;
  vendorStoreName?: string;
  status: string;
  shippingStatus?: string;
  vendorOrderNumber?: string;
  vendorId?: string;
}

interface RefundRequest {
  status?: 'none' | 'requested' | 'refunded' | 'rejected';
  accountHolderName?: string;
  bankName?: string;
  accountNumber?: string;
  iban?: string;
  swiftCode?: string;
  country?: string;
  notes?: string;
  requestedAt?: string;
  processedAt?: string;
  adminNote?: string;
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
  refundRequest?: RefundRequest;
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

interface DisputeMessage {
  _id: string;
  senderRole: 'customer' | 'vendor' | 'admin';
  message: string;
  createdAt?: string;
}

interface DisputeSummary {
  _id: string;
  disputeNumber: string;
  subject: string;
  reason?: string;
  status: string;
  vendorOrderId?: string;
  createdAt?: string;
}

interface StripeIntentResponse {
  orderId: string;
  clientSecret: string;
  publishableKey: string;
  paymentIntentId: string;
}

interface ReorderResponse {
  cart?: {
    items?: any[];
  };
  unavailableItems?: Array<{ productId?: string; reason?: string }>;
}

interface RefundFormState {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  iban: string;
  swiftCode: string;
  country: string;
  notes: string;
}

const emptyRefundForm = (): RefundFormState => ({
  accountHolderName: '',
  bankName: '',
  accountNumber: '',
  iban: '',
  swiftCode: '',
  country: '',
  notes: '',
});

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
  const { normalizeServerItems, setCartFromItems } = useCartStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [bankReference, setBankReference] = useState('');
  const [stripeIntent, setStripeIntent] = useState<StripeIntentResponse | null>(null);
  const [stripeOrderId, setStripeOrderId] = useState('');
  const [cancelOrderTarget, setCancelOrderTarget] = useState<Order | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [refundForm, setRefundForm] = useState<RefundFormState>(emptyRefundForm());
  const [disputes, setDisputes] = useState<DisputeSummary[]>([]);
  const [activeDispute, setActiveDispute] = useState<DisputeSummary | null>(null);
  const [disputeMessages, setDisputeMessages] = useState<DisputeMessage[]>([]);
  const [disputeLoading, setDisputeLoading] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeDraft, setDisputeDraft] = useState({
    vendorOrderId: '',
    subject: '',
    reason: 'wrong_items',
    description: '',
  });
  const [replyMessage, setReplyMessage] = useState('');
  const [submittingDispute, setSubmittingDispute] = useState(false);
  const stripePromise = useMemo(
    () => (stripeIntent?.publishableKey ? loadStripe(stripeIntent.publishableKey) : null),
    [stripeIntent?.publishableKey]
  );

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  useEffect(() => {
    void loadOrders();
    void loadDisputes();
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

  const loadDisputes = async () => {
    try {
      const response = await api.get<{ items: DisputeSummary[] }>('/disputes/customer');
      setDisputes(Array.isArray(response.data.items) ? response.data.items : []);
    } catch {
      // Keep orders usable even if disputes fail to load.
    }
  };

  const loadDisputeDetail = async (disputeId: string) => {
    setDisputeLoading(true);
    try {
      const response = await api.get<{ dispute: DisputeSummary; messages: DisputeMessage[] }>(`/disputes/${disputeId}`);
      setActiveDispute(response.data.dispute);
      setDisputeMessages(Array.isArray(response.data.messages) ? response.data.messages : []);
      setShowDisputeForm(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load dispute');
    } finally {
      setDisputeLoading(false);
    }
  };

  const closeDetailOverlay = () => {
    setSelectedOrder(null);
    setProofImage(null);
    setBankReference('');
  };

  const openCreateDispute = (vendorOrder: VendorOrder) => {
    setShowDisputeForm(true);
    setActiveDispute(null);
    setDisputeMessages([]);
    setReplyMessage('');
    setDisputeDraft({
      vendorOrderId: vendorOrder._id,
      subject: `Issue with ${vendorOrder.vendorStoreName || vendorOrder.vendorOrderNumber || 'delivered order'}`,
      reason: 'wrong_items',
      description: '',
    });
  };

  const closeDisputeOverlay = () => {
    setShowDisputeForm(false);
    setActiveDispute(null);
    setDisputeMessages([]);
    setReplyMessage('');
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
      const response = await api.post<ReorderResponse>('/reorder/me', { orderId, mode: 'replace' });
      if (response.data?.cart?.items) {
        setCartFromItems(normalizeServerItems(response.data.cart.items));
      }
      const unavailableCount = response.data?.unavailableItems?.length || 0;
      if (unavailableCount > 0) {
        toast.success(`Available items moved to cart. ${unavailableCount} item(s) were skipped because they are no longer available.`);
      } else {
        toast.success('Order items moved to cart');
      }
      navigate('/cart');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reorder');
    }
  };

  const submitCancelOrder = async (order: Order, refundDetails?: RefundFormState) => {
    setCancelBusy(true);
    try {
      await api.post(`/orders/me/${order._id}/cancel`, refundDetails ? { refundDetails } : {});
      toast.success(
        refundDetails
          ? 'Order cancelled. Your refund request has been submitted and will be processed within 5 working days.'
          : 'Order cancelled successfully'
      );
      await loadOrders();
      if (selectedOrder?.order?._id === order._id) {
        setSelectedOrder(null);
      }
      setCancelOrderTarget(null);
      setRefundForm(emptyRefundForm());
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Cannot cancel this order');
    } finally {
      setCancelBusy(false);
    }
  };

  const cancelOrder = async (order: Order) => {
    if (order.paymentStatus === 'paid') {
      setCancelOrderTarget(order);
      return;
    }

    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    await submitCancelOrder(order);
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
      formData.append('proofImage', proofImage);
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

  const submitDispute = async () => {
    if (!disputeDraft.vendorOrderId || !disputeDraft.subject.trim() || !disputeDraft.description.trim()) {
      toast.error('Please complete the dispute subject and details');
      return;
    }

    setSubmittingDispute(true);
    try {
      const response = await api.post<{ dispute: DisputeSummary }>('/disputes/customer', {
        vendorOrderId: disputeDraft.vendorOrderId,
        subject: disputeDraft.subject.trim(),
        reason: disputeDraft.reason,
        description: disputeDraft.description.trim(),
      });
      toast.success('Dispute created successfully');
      await loadDisputes();
      await loadDisputeDetail(response.data.dispute._id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create dispute');
    } finally {
      setSubmittingDispute(false);
    }
  };

  const submitDisputeReply = async () => {
    if (!activeDispute?._id || !replyMessage.trim()) return;
    setSubmittingDispute(true);
    try {
      await api.post(`/disputes/${activeDispute._id}/messages`, { message: replyMessage.trim() });
      setReplyMessage('');
      await loadDisputeDetail(activeDispute._id);
      await loadDisputes();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send reply');
    } finally {
      setSubmittingDispute(false);
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
                {order.refundRequest?.status && order.refundRequest.status !== 'none' ? (
                  <p className="muted">
                    Refund: {order.refundRequest.status}
                    {order.refundRequest.status === 'requested' ? ' - expected within 5 working days' : ''}
                  </p>
                ) : null}
                <div className="order-actions">
                  <button className="btn btn-outline" onClick={() => loadOrderDetail(order._id)}>{t('orders.view', 'View')}</button>
                  {order.vendorOrders?.some((vendorOrder) => vendorOrder.status === 'delivered') ? (
                    <button className="btn btn-outline" onClick={() => loadOrderDetail(order._id)}>Dispute</button>
                  ) : null}
                  {order.paymentMethod === 'online' && order.paymentStatus === 'unpaid' && (
                    <button className="btn btn-primary" onClick={() => startStripePayNow(order._id)}>Pay Now</button>
                  )}
                  <button className="btn btn-outline" onClick={() => reorder(order._id)}>{t('orders.reorder', 'Reorder')}</button>
                  {order.status !== 'cancelled' && (
                    <button className="btn btn-outline" onClick={() => cancelOrder(order)}>{t('orders.cancel', 'Cancel')}</button>
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
            {selectedOrder.order.refundRequest?.status && selectedOrder.order.refundRequest.status !== 'none' ? (
              <p>
                Refund: {selectedOrder.order.refundRequest.status}
                {selectedOrder.order.refundRequest.status === 'requested' ? ' (processing within 5 working days)' : ''}
              </p>
            ) : null}
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
                  <input type="file" accept="image/*" onChange={(e) => setProofImage(e.target.files?.[0] || null)} />
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
                  <span>
                    {vo.vendorStoreName || vo.vendorOrderNumber || vo._id}
                    {vo.status === 'delivered' ? (
                      <button className="btn btn-outline order-inline-btn" onClick={() => openCreateDispute(vo)}>
                        Open Dispute
                      </button>
                    ) : null}
                    {disputes.find((dispute) => dispute.vendorOrderId === vo._id) ? (
                      <button
                        className="btn btn-outline order-inline-btn"
                        onClick={() => {
                          const existing = disputes.find((dispute) => dispute.vendorOrderId === vo._id);
                          if (existing) {
                            void loadDisputeDetail(existing._id);
                          }
                        }}
                      >
                        View Dispute
                      </button>
                    ) : null}
                  </span>
                  <strong>{vo.status}</strong>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {(showDisputeForm || activeDispute) && (
        <div className="order-modal-backdrop" onClick={closeDisputeOverlay}>
          <div className="order-modal card refund-modal" onClick={(e) => e.stopPropagation()}>
            <div className="order-modal-head">
              <h3>{activeDispute ? `Dispute ${activeDispute.disputeNumber}` : 'Open Dispute'}</h3>
              <button className="btn btn-outline" onClick={closeDisputeOverlay}>Close</button>
            </div>

            {showDisputeForm && !activeDispute ? (
              <>
                <p className="muted">Describe how the delivered product differs from what was shown. The vendor and admin will both be able to reply.</p>
                <div className="refund-form-grid">
                  <input
                    placeholder="Subject"
                    value={disputeDraft.subject}
                    onChange={(e) => setDisputeDraft((prev) => ({ ...prev, subject: e.target.value }))}
                  />
                  <select
                    value={disputeDraft.reason}
                    onChange={(e) => setDisputeDraft((prev) => ({ ...prev, reason: e.target.value }))}
                    className="dispute-select"
                  >
                    <option value="wrong_items">Wrong Items</option>
                    <option value="damaged_items">Damaged Items</option>
                    <option value="missing_items">Missing Items</option>
                    <option value="quality_issue">Quality Issue</option>
                    <option value="late_delivery">Late Delivery</option>
                    <option value="other">Other</option>
                  </select>
                  <textarea
                    placeholder="Tell us what happened and what you expected to receive."
                    rows={5}
                    value={disputeDraft.description}
                    onChange={(e) => setDisputeDraft((prev) => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="order-actions">
                  <button className="btn btn-outline" onClick={closeDisputeOverlay}>Cancel</button>
                  <button className="btn btn-primary" onClick={submitDispute} disabled={submittingDispute}>
                    {submittingDispute ? 'Submitting...' : 'Submit Dispute'}
                  </button>
                </div>
              </>
            ) : (
              <>
                {disputeLoading ? (
                  <div className="card">Loading dispute...</div>
                ) : activeDispute ? (
                  <>
                    <p><strong>Status:</strong> {activeDispute.status.replace('_', ' ')}</p>
                    <p><strong>Reason:</strong> {(activeDispute.reason || 'other').replace('_', ' ')}</p>
                    <div className="dispute-thread">
                      {disputeMessages.map((message) => (
                        <div key={message._id} className={`dispute-message ${message.senderRole}`}>
                          <div className="dispute-message-meta">
                            <strong>{message.senderRole === 'customer' ? 'You' : message.senderRole === 'vendor' ? 'Vendor' : 'Admin'}</strong>
                            <span>{safeDate(message.createdAt)}</span>
                          </div>
                          <p>{message.message}</p>
                        </div>
                      ))}
                    </div>
                    {activeDispute.status !== 'closed' ? (
                      <>
                        <textarea
                          className="dispute-reply-box"
                          rows={4}
                          placeholder="Reply to this dispute..."
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                        />
                        <div className="order-actions">
                          <button className="btn btn-primary" onClick={submitDisputeReply} disabled={submittingDispute || !replyMessage.trim()}>
                            {submittingDispute ? 'Sending...' : 'Send Reply'}
                          </button>
                        </div>
                      </>
                    ) : null}
                  </>
                ) : null}
              </>
            )}
          </div>
        </div>
      )}

      {cancelOrderTarget && (
        <div className="order-modal-backdrop" onClick={() => !cancelBusy && setCancelOrderTarget(null)}>
          <div className="order-modal card refund-modal" onClick={(e) => e.stopPropagation()}>
            <div className="order-modal-head">
              <h3>Refund Details</h3>
              <button className="btn btn-outline" onClick={() => setCancelOrderTarget(null)} disabled={cancelBusy}>Close</button>
            </div>
            <p className="muted">
              Please enter the account details where your refund should be sent. Once approved, the refund will be processed within 5 working days.
            </p>
            <div className="refund-form-grid">
              <input
                placeholder="Account Holder Name *"
                value={refundForm.accountHolderName}
                onChange={(e) => setRefundForm((prev) => ({ ...prev, accountHolderName: e.target.value }))}
              />
              <input
                placeholder="Bank Name"
                value={refundForm.bankName}
                onChange={(e) => setRefundForm((prev) => ({ ...prev, bankName: e.target.value }))}
              />
              <input
                placeholder="Account Number *"
                value={refundForm.accountNumber}
                onChange={(e) => setRefundForm((prev) => ({ ...prev, accountNumber: e.target.value }))}
              />
              <input
                placeholder="IBAN"
                value={refundForm.iban}
                onChange={(e) => setRefundForm((prev) => ({ ...prev, iban: e.target.value }))}
              />
              <input
                placeholder="SWIFT / BIC"
                value={refundForm.swiftCode}
                onChange={(e) => setRefundForm((prev) => ({ ...prev, swiftCode: e.target.value }))}
              />
              <input
                placeholder="Country"
                value={refundForm.country}
                onChange={(e) => setRefundForm((prev) => ({ ...prev, country: e.target.value }))}
              />
              <textarea
                placeholder="Notes"
                rows={4}
                value={refundForm.notes}
                onChange={(e) => setRefundForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            <div className="order-actions">
              <button className="btn btn-outline" onClick={() => setCancelOrderTarget(null)} disabled={cancelBusy}>Cancel</button>
              <button
                className="btn btn-primary"
                disabled={cancelBusy || !refundForm.accountHolderName.trim() || !refundForm.accountNumber.trim()}
                onClick={() =>
                  submitCancelOrder(cancelOrderTarget, {
                    accountHolderName: refundForm.accountHolderName.trim(),
                    bankName: refundForm.bankName.trim(),
                    accountNumber: refundForm.accountNumber.trim(),
                    iban: refundForm.iban.trim(),
                    swiftCode: refundForm.swiftCode.trim(),
                    country: refundForm.country.trim(),
                    notes: refundForm.notes.trim(),
                  })
                }
              >
                {cancelBusy ? 'Submitting...' : 'Confirm Cancel & Refund Request'}
              </button>
            </div>
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
