import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';

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
}

interface OfferData {
  _id: string;
  type: 'offer' | 'rfq';
  productSnapshot: { title?: string; imageUrl?: string; currency?: string };
  vendorSnapshot: { storeName?: string };
  currentQty: number;
  currentUnitPrice: number;
  qty?: number;
  quotation?: {
    unitPrice: number;
    totalPrice?: number;
    currency: string;
    leadTimeDays?: number;
    productionNotes?: string;
  };
  currency: string;
  paymentLink?: {
    token?: string;
    expiresAt?: string;
    usedAt?: string;
  };
  shippingAddress?: any;
  status: string;
}

const safeDate = (value?: string) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString();
};

export const OfferCheckoutPage: React.FC = () => {
  const { token = '' } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [data, setData] = useState<{
    offer?: any;
    rfq?: any;
    isExpired?: boolean;
    isUsed?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [newAddress, setNewAddress] = useState({
    companyName: '',
    contactPerson: '',
    mobileNumber: '',
    country: '',
    city: '',
    street: '',
    postalCode: '',
  });
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'bank_transfer'>('online');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: `/checkout/offer/${token}` } });
    }
  }, [user, navigate, token]);

  useEffect(() => {
    if (!user) return;
    loadData();
    loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Try offer endpoint first, then RFQ
      try {
        const r = await api.get(`/bulk-offers/payment-link/${token}`);
        setData({ offer: r.data.offer, isExpired: r.data.isExpired, isUsed: r.data.isUsed });
        return;
      } catch (err: any) {
        if (err.response?.status !== 404) throw err;
      }
      const r2 = await api.get(`/custom-production/payment-link/${token}`);
      setData({ rfq: r2.data.rfq, isExpired: r2.data.isExpired, isUsed: r2.data.isUsed });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid or expired payment link');
    } finally {
      setLoading(false);
    }
  };

  const loadAddresses = async () => {
    try {
      const r = await api.get<{ items: Address[] }>('/addresses/me');
      const items = Array.isArray(r.data.items) ? r.data.items : [];
      setAddresses(items);
      const def = items.find((a) => a.isDefault);
      if (def) setSelectedAddressId(def._id);
    } catch {
      // ignore
    }
  };

  const isOffer = Boolean(data?.offer);
  const isRfq = Boolean(data?.rfq);
  const source = (data?.offer || data?.rfq) as any;
  const productTitle = source?.productSnapshot?.title;
  const qty = source?.currentQty || source?.qty;
  const unitPrice = source?.currentUnitPrice || source?.quotation?.unitPrice;
  const currency = source?.currency || source?.quotation?.currency;
  const total = qty * unitPrice;
  const vendorName = source?.vendorSnapshot?.storeName;

  const submit = async () => {
    if (!isOffer && !isRfq) return;
    const useNewAddress = !selectedAddressId;
    if (useNewAddress) {
      const { companyName, contactPerson, mobileNumber, country, city, street } = newAddress;
      if (!companyName || !contactPerson || !mobileNumber || !country || !city || !street) {
        toast.error('Please select an address or fill in all required shipping fields');
        return;
      }
    }

    setSubmitting(true);
    try {
      const body: any = {
        paymentMethod,
        ...(useNewAddress ? { shippingAddress: newAddress } : { addressId: selectedAddressId }),
      };
      const endpoint = isOffer
        ? `/bulk-offers/payment-link/${token}/checkout`
        : `/custom-production/payment-link/${token}/checkout`;
      const r = await api.post(endpoint, body);
      toast.success('Order created! Redirecting...');
      const orderId = r.data.order?._id || r.data.order?.id;
      if (orderId) {
        navigate(`/orders`);
      } else {
        navigate('/orders');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '3rem 0' }}>
        <p>Loading checkout...</p>
      </div>
    );
  }

  if (!data || (!data.offer && !data.rfq)) {
    return (
      <div className="container" style={{ padding: '3rem 0' }}>
        <h2>Invalid or expired link</h2>
        <p>This payment link is no longer valid.</p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>Go home</button>
      </div>
    );
  }

  if (data.isUsed) {
    return (
      <div className="container" style={{ padding: '3rem 0' }}>
        <h2>This payment link has already been used</h2>
        <p>If you need to place a new order, please start a new negotiation.</p>
      </div>
    );
  }

  if (data.isExpired) {
    return (
      <div className="container" style={{ padding: '3rem 0' }}>
        <h2>This payment link has expired</h2>
        <p>Please contact the seller to regenerate the payment link.</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>Complete Your Order</h1>
        <p className="muted">
          You are about to place an order from a {isOffer ? 'accepted bulk offer' : 'custom production quotation'}.
        </p>
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
        <h3>Order Summary</h3>
        <p>
          <strong>Product:</strong> {productTitle}
        </p>
        <p>
          <strong>Vendor:</strong> {vendorName}
        </p>
        <p>
          <strong>Quantity:</strong> {qty}
        </p>
        <p>
          <strong>Unit Price:</strong> {unitPrice} {currency}
        </p>
        <p>
          <strong>Total:</strong> {(total).toFixed(2)} {currency}
        </p>
        {source?.quotation?.leadTimeDays ? (
          <p className="muted">Lead time: {source.quotation.leadTimeDays} days</p>
        ) : null}
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
        <h3>Shipping Information</h3>
        {addresses.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <label>Choose a saved address:</label>
            <select
              value={selectedAddressId}
              onChange={(e) => setSelectedAddressId(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }}
            >
              <option value="">-- Use new address below --</option>
              {addresses.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.label || `${a.companyName} - ${a.street1}`}
                </option>
              ))}
            </select>
          </div>
        )}
        {!selectedAddressId && (
          <div className="account-form-grid">
            <div className="account-field">
              <label>Company *</label>
              <input
                value={newAddress.companyName}
                onChange={(e) => setNewAddress((s) => ({ ...s, companyName: e.target.value }))}
              />
            </div>
            <div className="account-field">
              <label>Contact Person *</label>
              <input
                value={newAddress.contactPerson}
                onChange={(e) => setNewAddress((s) => ({ ...s, contactPerson: e.target.value }))}
              />
            </div>
            <div className="account-field">
              <label>Phone *</label>
              <input
                value={newAddress.mobileNumber}
                onChange={(e) => setNewAddress((s) => ({ ...s, mobileNumber: e.target.value }))}
              />
            </div>
            <div className="account-field">
              <label>Country *</label>
              <input
                value={newAddress.country}
                onChange={(e) => setNewAddress((s) => ({ ...s, country: e.target.value }))}
              />
            </div>
            <div className="account-field">
              <label>City *</label>
              <input
                value={newAddress.city}
                onChange={(e) => setNewAddress((s) => ({ ...s, city: e.target.value }))}
              />
            </div>
            <div className="account-field">
              <label>Street *</label>
              <input
                value={newAddress.street}
                onChange={(e) => setNewAddress((s) => ({ ...s, street: e.target.value }))}
              />
            </div>
            <div className="account-field">
              <label>Postal Code</label>
              <input
                value={newAddress.postalCode}
                onChange={(e) => setNewAddress((s) => ({ ...s, postalCode: e.target.value }))}
              />
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
        <h3>Billing Information</h3>
        <p className="muted">Billing is the same as the shipping address for this order.</p>
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
        <h3>Payment Details</h3>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
          <label>
            <input
              type="radio"
              checked={paymentMethod === 'online'}
              onChange={() => setPaymentMethod('online')}
            />{' '}
            Online (Stripe)
          </label>
          <label>
            <input
              type="radio"
              checked={paymentMethod === 'bank_transfer'}
              onChange={() => setPaymentMethod('bank_transfer')}
            />{' '}
            Bank Transfer
          </label>
        </div>
        <p className="muted" style={{ marginTop: '0.5rem' }}>
          {paymentMethod === 'online'
            ? 'You will be redirected to Stripe to complete the payment. The order will be created automatically after successful payment.'
            : 'Your order will be created with "awaiting transfer" status. You will receive bank details to complete payment.'}
        </p>
      </div>

      <div className="account-actions">
        <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>
          Back
        </button>
        <button type="button" className="btn btn-primary" disabled={submitting} onClick={submit}>
          {submitting ? 'Processing...' : `Pay ${total.toFixed(2)} ${currency}`}
        </button>
      </div>
    </div>
  );
};