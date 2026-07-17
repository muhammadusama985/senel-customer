import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import type { BulkOffer, CustomProductionRequest } from '../../types/negotiation';
import './NegotiationsView.css';

type Tab = 'offers' | 'rfqs';

const safeDate = (value?: string) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString();
};

export const NegotiationsView: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuthStore();
  const { addItem, fetchCart } = useCartStore();
  const [tab, setTab] = useState<Tab>('offers');
  const [offers, setOffers] = useState<BulkOffer[]>([]);
  const [rfqs, setRfqs] = useState<CustomProductionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedOffer, setSelectedOffer] = useState<BulkOffer | null>(null);
  const [selectedRfq, setSelectedRfq] = useState<CustomProductionRequest | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const initialTab = params.get('tab') as Tab | null;
    if (initialTab === 'rfqs') setTab('rfqs');
  }, [params]);

  useEffect(() => {
    if (!user) return;
    loadAll();
  }, [user, statusFilter, tab]);

  const loadAll = async () => {
    setLoading(true);
    try {
      if (tab === 'offers') {
        const r = await api.get<{ items: BulkOffer[] }>('/bulk-offers/buyer', {
          params: statusFilter ? { status: statusFilter } : {},
        });
        setOffers(Array.isArray(r.data.items) ? r.data.items : []);
      } else {
        const r = await api.get<{ items: CustomProductionRequest[] }>(
          '/custom-production/buyer',
          { params: statusFilter ? { status: statusFilter } : {} }
        );
        setRfqs(Array.isArray(r.data.items) ? r.data.items : []);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load negotiations');
    } finally {
      setLoading(false);
    }
  };

  const openOffer = async (offer: BulkOffer) => {
    try {
      const r = await api.get<{ offer: BulkOffer }>(`/bulk-offers/buyer/${offer._id}`);
      setSelectedOffer(r.data.offer);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load offer');
    }
  };

  const openRfq = async (rfq: CustomProductionRequest) => {
    try {
      const r = await api.get<{ rfq: CustomProductionRequest }>(`/custom-production/buyer/${rfq._id}`);
      setSelectedRfq(r.data.rfq);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load RFQ');
    }
  };

  const buyerCounter = async (id: string, payload: any) => {
    setBusy(true);
    try {
      const r = await api.post(`/bulk-offers/buyer/${id}/counter`, payload);
      setSelectedOffer(r.data.offer);
      toast.success('Counter offer sent');
      await loadAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send counter');
    } finally {
      setBusy(false);
    }
  };

  const buyerAccept = async (id: string) => {
    setBusy(true);
    try {
      const r = await api.post(`/bulk-offers/buyer/${id}/accept`);
      setSelectedOffer(r.data.offer);
      toast.success('Offer accepted');
      await loadAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to accept');
    } finally {
      setBusy(false);
    }
  };

  const buyerReject = async (id: string) => {
    setBusy(true);
    try {
      const r = await api.post(`/bulk-offers/buyer/${id}/reject`, {});
      setSelectedOffer(r.data.offer);
      toast.success('Offer rejected');
      await loadAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reject');
    } finally {
      setBusy(false);
    }
  };

  const buyerCancel = async (id: string) => {
    setBusy(true);
    try {
      const r = await api.post(`/bulk-offers/buyer/${id}/cancel`);
      setSelectedOffer(r.data.offer);
      toast.success('Offer cancelled');
      await loadAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    } finally {
      setBusy(false);
    }
  };

  const rfqAccept = async (id: string) => {
    setBusy(true);
    try {
      const r = await api.post(`/custom-production/buyer/${id}/accept`);
      setSelectedRfq(r.data.rfq);
      toast.success('Quotation accepted');
      await loadAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to accept');
    } finally {
      setBusy(false);
    }
  };

  const rfqReject = async (id: string) => {
    setBusy(true);
    try {
      const r = await api.post(`/custom-production/buyer/${id}/reject`, {});
      setSelectedRfq(r.data.rfq);
      toast.success('Quotation rejected');
      await loadAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reject');
    } finally {
      setBusy(false);
    }
  };

  const rfqCancel = async (id: string) => {
    setBusy(true);
    try {
      const r = await api.post(`/custom-production/buyer/${id}/cancel`);
      setSelectedRfq(r.data.rfq);
      toast.success('Request cancelled');
      await loadAll();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    } finally {
      setBusy(false);
    }
  };

  const goCheckout = (token: string) => {
    navigate(`/checkout/offer/${token}`);
  };

  const addOfferToCart = async (offer: BulkOffer) => {
    if (!offer.productSnapshot) return;
    try {
      await addItem(
        String(offer.productId),
        offer.currentQty,
        '',
        {
          vendorId: String(offer.vendorId),
          slug: offer.productSnapshot.slug,
          title: offer.productSnapshot.title || 'Product',
          unitPrice: offer.currentUnitPrice,
          imageUrl: offer.productSnapshot.imageUrl,
          currency: (offer.currency as any) || 'EUR',
          moq: offer.productSnapshot.moq || 1,
          customPriceSource: 'offer',
          customPriceRefId: String(offer._id),
        } as any
      );
      toast.success(`Added ${offer.currentQty} units of ${offer.productSnapshot.title} to cart at negotiated price`);
      await fetchCart();
      navigate('/cart');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to add to cart');
    }
  };

  const addRfqToCart = async (rfq: CustomProductionRequest) => {
    if (!rfq.productSnapshot || !rfq.quotation) return;
    const unitPrice = rfq.quotation.unitPrice;
    try {
      await addItem(
        String(rfq.productId),
        rfq.qty,
        '',
        {
          vendorId: String(rfq.vendorId),
          slug: rfq.productSnapshot.slug,
          title: rfq.productSnapshot.title || 'Product',
          unitPrice,
          imageUrl: rfq.productSnapshot.imageUrl,
          currency: (rfq.quotation.currency as any) || 'EUR',
          moq: 1,
          customPriceSource: 'rfq',
          customPriceRefId: String(rfq._id),
        } as any
      );
      toast.success(`Added ${rfq.qty} units of ${rfq.productSnapshot.title} to cart at quoted price`);
      await fetchCart();
      navigate('/cart');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to add to cart');
    }
  };

  return (
    <>
      <div className="account-stack">
        <div className="negotiations-toolbar">
          <button
            type="button"
            className={`neg-pill ${tab === 'offers' ? 'active' : ''}`}
            onClick={() => setTab('offers')}
          >
            Bulk Offers ({offers.length || ''})
          </button>
          <button
            type="button"
            className={`neg-pill ${tab === 'rfqs' ? 'active' : ''}`}
            onClick={() => setTab('rfqs')}
          >
            Custom Production ({rfqs.length || ''})
          </button>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="neg-select"
          >
            <option value="">All statuses</option>
            {tab === 'offers' ? (
              <>
                <option value="requested">Requested</option>
                <option value="countered">Countered</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </>
            ) : (
              <>
                <option value="requested">Requested</option>
                <option value="quoted">Quoted</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
                <option value="in_production">In Production</option>
                <option value="completed">Completed</option>
              </>
            )}
          </select>
        </div>

        {loading ? (
          <p className="muted">Loading...</p>
        ) : tab === 'offers' ? (
          offers.length === 0 ? (
            <p className="muted">No bulk offers yet. Submit one from any product page.</p>
          ) : (
            <div className="account-list-grid">
              {offers.map((o) => (
                <article key={o._id} className="account-panel">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{o.productSnapshot?.title || 'Product'}</strong>
                    <span className="status-pill">{o.status}</span>
                  </div>
                  <p className="muted">
                    {o.vendorSnapshot?.storeName || 'Vendor'} • {o.currentQty} units @{' '}
                    {o.currentUnitPrice} {o.currency}
                  </p>
                  <p className="muted">Valid until {safeDate(o.validUntil)}</p>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => openOffer(o)}
                    >
                      Open
                    </button>
                    {o.status === 'accepted' && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => addOfferToCart(o)}
                      >
                        Add to Cart
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )
        ) : rfqs.length === 0 ? (
          <p className="muted">No custom production requests yet.</p>
        ) : (
          <div className="account-list-grid">
            {rfqs.map((r) => (
              <article key={r._id} className="account-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong>{r.productSnapshot?.title || 'Product'}</strong>
                  <span className="status-pill">{r.status}</span>
                </div>
                <p className="muted">
                  {r.vendorSnapshot?.storeName || 'Vendor'} • {r.qty} units
                </p>
                {r.quotation && (
                  <p className="muted">
                    Quoted: {r.quotation.unitPrice} {r.quotation.currency}/unit (total{' '}
                    {r.quotation.totalPrice})
                  </p>
                )}
                <p className="muted">Valid until {safeDate(r.validUntil)}</p>
                <div className="row-actions">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => openRfq(r)}
                  >
                    Open
                  </button>
                  {r.status === 'accepted' && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => addRfqToCart(r)}
                    >
                      Add to Cart
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {selectedOffer && (
        <NegotiationDetailModal
          offer={selectedOffer}
          onClose={() => setSelectedOffer(null)}
          onCounter={buyerCounter}
          onAccept={buyerAccept}
          onReject={buyerReject}
          onCancel={buyerCancel}
          onAddToCart={() => addOfferToCart(selectedOffer)}
          busy={busy}
        />
      )}
      {selectedRfq && (
        <RFQDetailModal
          rfq={selectedRfq}
          onClose={() => setSelectedRfq(null)}
          onAccept={rfqAccept}
          onReject={rfqReject}
          onCancel={rfqCancel}
          onAddToCart={() => addRfqToCart(selectedRfq)}
          busy={busy}
        />
      )}
    </>
  );
};

// ----- Detail modal for offers -----
const NegotiationDetailModal: React.FC<{
  offer: BulkOffer;
  onClose: () => void;
  onCounter: (id: string, p: any) => void;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onCancel: (id: string) => void;
  onAddToCart: () => void;
  busy: boolean;
}> = ({ offer, onClose, onCounter, onAccept, onReject, onCancel, onAddToCart, busy }) => {
  const [qty, setQty] = useState(offer.currentQty);
  const [unitPrice, setUnitPrice] = useState(offer.currentUnitPrice);
  const [notes, setNotes] = useState('');
  const [validDays, setValidDays] = useState(7);

  const canBuyerAct =
    !['accepted', 'rejected', 'expired', 'cancelled'].includes(offer.status) &&
    offer.lastActionBy === 'seller';

  return (
    <div className="order-modal-backdrop" onClick={onClose}>
      <div className="order-modal card refund-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <div className="order-modal-head">
          <h3>Bulk Offer - {offer.productSnapshot?.title}</h3>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Close
          </button>
        </div>
        <p>
          <strong>Vendor:</strong> {offer.vendorSnapshot?.storeName} •{' '}
          <strong>Status:</strong> {offer.status}
        </p>
        <p>
          <strong>Current terms:</strong> {offer.currentQty} units @ {offer.currentUnitPrice}{' '}
          {offer.currency} = <strong>{(offer.currentQty * offer.currentUnitPrice).toFixed(2)} {offer.currency}</strong>
        </p>
        <p>
          <strong>Valid until:</strong> {safeDate(offer.validUntil)}
        </p>

        {offer.status === 'accepted' && (
          <div className="account-panel">
            <p>
              <strong>Both parties agreed.</strong> Add the agreed quantity at the negotiated price to your cart, then proceed to checkout normally.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onAddToCart}
            >
              Add to Cart at {offer.currentUnitPrice} {offer.currency} / unit
            </button>
          </div>
        )}

        <h4 style={{ marginTop: '1rem' }}>Offer History</h4>
        <div className="account-stack">
          {offer.messages.map((m, idx) => (
            <div key={idx} className="account-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{m.senderName || m.senderRole}</strong>
                <span className="muted">{safeDate(m.createdAt)}</span>
              </div>
              {m.qty != null && m.unitPrice != null && (
                <p>
                  Offered: {m.qty} units @ {m.unitPrice} {m.currency}
                </p>
              )}
              {m.notes && <p>{m.notes}</p>}
            </div>
          ))}
        </div>

        {canBuyerAct && (
          <div className="account-stack" style={{ marginTop: '1rem' }}>
            <h4>Your response</h4>
            <div className="account-form-grid">
              <div className="account-field">
                <label>Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(parseInt(e.target.value, 10) || 1)}
                />
              </div>
              <div className="account-field">
                <label>Unit Price ({offer.currency})</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="account-field">
                <label>Extend validity (days)</label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={validDays}
                  onChange={(e) => setValidDays(parseInt(e.target.value, 10) || 7)}
                />
              </div>
              <div className="account-field account-field-full">
                <label>Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </div>
            </div>
            <div className="account-actions">
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                onClick={() => onCounter(offer._id, { qty, unitPrice, notes, validDays })}
              >
                Send Counter
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy}
                onClick={() => onAccept(offer._id)}
              >
                Accept
              </button>
              <button
                type="button"
                className="btn btn-outline"
                disabled={busy}
                onClick={() => onReject(offer._id)}
              >
                Reject
              </button>
            </div>
          </div>
        )}

        {!['accepted', 'rejected', 'expired', 'cancelled'].includes(offer.status) && offer.lastActionBy === 'buyer' && (
          <div className="account-actions" style={{ marginTop: '1rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              disabled={busy}
              onClick={() => onCancel(offer._id)}
            >
              Cancel offer
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ----- Detail modal for RFQs -----
const RFQDetailModal: React.FC<{
  rfq: CustomProductionRequest;
  onClose: () => void;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onCancel: (id: string) => void;
  onAddToCart: () => void;
  busy: boolean;
}> = ({ rfq, onClose, onAccept, onReject, onCancel, onAddToCart, busy }) => {
  const terminalStates = ['rejected', 'expired', 'cancelled', 'completed'];
  return (
    <div className="order-modal-backdrop" onClick={onClose}>
      <div className="order-modal card refund-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <div className="order-modal-head">
          <h3>Custom Production - {rfq.productSnapshot?.title}</h3>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Close
          </button>
        </div>
        <p>
          <strong>Vendor:</strong> {rfq.vendorSnapshot?.storeName} •{' '}
          <strong>Status:</strong> {rfq.status}
        </p>
        <p>
          <strong>Quantity:</strong> {rfq.qty} •{' '}
          <strong>Valid until:</strong> {safeDate(rfq.validUntil)}
        </p>

        {rfq.quotation && (
          <div className="account-panel">
            <h4>Quotation</h4>
            <p>
              Unit price: <strong>{rfq.quotation.unitPrice} {rfq.quotation.currency}</strong>
            </p>
            <p>
              Total: <strong>{rfq.quotation.totalPrice} {rfq.quotation.currency}</strong>
            </p>
            <p>Lead time: {rfq.quotation.leadTimeDays || 0} days</p>
            {rfq.quotation.productionNotes && <p>{rfq.quotation.productionNotes}</p>}
            {rfq.quotation.termsAndConditions && <p className="muted">{rfq.quotation.termsAndConditions}</p>}
          </div>
        )}

        {rfq.status === 'accepted' && (
          <div className="account-panel">
            <p>
              <strong>Quotation accepted.</strong> Add the agreed quantity at the quoted price to your cart, then proceed to checkout normally.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onAddToCart}
            >
              Add to Cart at {rfq.quotation?.unitPrice} {rfq.quotation?.currency} / unit
            </button>
          </div>
        )}

        <h4 style={{ marginTop: '1rem' }}>Conversation</h4>
        <div className="account-stack">
          {rfq.messages.map((m, idx) => (
            <div key={idx} className="account-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{m.senderName || m.senderRole}</strong>
                <span className="muted">{safeDate(m.createdAt)}</span>
              </div>
              {m.message && <p>{m.message}</p>}
              {m.notes && <p>{m.notes}</p>}
            </div>
          ))}
        </div>

        {rfq.status === 'quoted' && !terminalStates.includes(rfq.status) && (
          <div className="account-actions" style={{ marginTop: '1rem' }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() => onAccept(rfq._id)}
            >
              Accept Quotation
            </button>
            <button
              type="button"
              className="btn btn-outline"
              disabled={busy}
              onClick={() => onReject(rfq._id)}
            >
              Reject
            </button>
          </div>
        )}

        {!terminalStates.includes(rfq.status) && rfq.status !== 'accepted' && (
          <div className="account-actions" style={{ marginTop: '1rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              disabled={busy}
              onClick={() => onCancel(rfq._id)}
            >
              Cancel request
            </button>
          </div>
        )}
      </div>
    </div>
  );
};