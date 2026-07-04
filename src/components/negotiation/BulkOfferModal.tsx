import React, { useState } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { useI18n } from '../../i18n';
import { useNavigate } from 'react-router-dom';

interface Props {
  productId: string;
  productTitle: string;
  defaultQty: number;
  defaultUnitPrice?: number;
  currency: string;
  onClose: () => void;
}

export const BulkOfferModal: React.FC<Props> = ({
  productId,
  productTitle,
  defaultQty,
  defaultUnitPrice,
  currency,
  onClose,
}) => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [qty, setQty] = useState<number>(defaultQty || 1);
  const [unitPrice, setUnitPrice] = useState<number>(defaultUnitPrice || 0);
  const [notes, setNotes] = useState('');
  const [validDays, setValidDays] = useState<number>(7);
  const [shippingAddress, setShippingAddress] = useState({
    companyName: '',
    contactPerson: '',
    mobileNumber: '',
    country: '',
    city: '',
    street: '',
    postalCode: '',
  });
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (qty < 1) return toast.error('Quantity must be at least 1');
    if (unitPrice < 0) return toast.error('Unit price cannot be negative');

    setSubmitting(true);
    try {
      await api.post('/bulk-offers/buyer', {
        productId,
        qty,
        unitPrice,
        currency,
        notes,
        validDays,
        attachments: attachmentUrl
          ? [{ url: attachmentUrl, filename: attachmentUrl.split('/').pop() }]
          : [],
        shippingAddress,
      });
      toast.success('Bulk offer submitted');
      onClose();
      navigate('/account?tab=negotiations');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit offer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('attachment', f);
      const r = await api.post('/attachments/upload', fd);
      setAttachmentUrl(r.data.url);
      toast.success('Attachment uploaded');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="order-modal-backdrop" onClick={onClose}>
      <div
        className="order-modal card refund-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 640 }}
      >
        <div className="order-modal-head">
          <h3>{t('product.bulkOfferTitle', 'Submit Bulk Offer')}</h3>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            {t('common.close', 'Close')}
          </button>
        </div>
        <p className="muted">
          {t('product.bulkOfferFor', 'For')}: <strong>{productTitle}</strong>
        </p>
        <form className="account-form-grid" onSubmit={submit}>
          <div className="account-field">
            <label>Quantity</label>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(parseInt(e.target.value, 10) || 1)}
              required
            />
          </div>
          <div className="account-field">
            <label>Target Unit Price ({currency})</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
              required
            />
          </div>
          <div className="account-field">
            <label>Offer Validity (days)</label>
            <input
              type="number"
              min={1}
              max={90}
              value={validDays}
              onChange={(e) => setValidDays(parseInt(e.target.value, 10) || 7)}
              required
            />
          </div>
          <div className="account-field account-field-full">
            <label>Notes for the seller</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add any specifications or context for your offer..."
            />
          </div>
          <div className="account-field account-field-full">
            <label>Attachment (image/PDF, optional)</label>
            <input type="file" onChange={handleFile} disabled={uploading} />
            {attachmentUrl ? (
              <p className="muted">Attached: {attachmentUrl.split('/').pop()}</p>
            ) : null}
          </div>

          <div className="account-field-full" style={{ gridColumn: '1 / -1' }}>
            <h4>Shipping Address (optional, can be set at checkout)</h4>
          </div>
          <div className="account-field">
            <label>Company</label>
            <input
              value={shippingAddress.companyName}
              onChange={(e) =>
                setShippingAddress((s) => ({ ...s, companyName: e.target.value }))
              }
            />
          </div>
          <div className="account-field">
            <label>Contact Person</label>
            <input
              value={shippingAddress.contactPerson}
              onChange={(e) =>
                setShippingAddress((s) => ({ ...s, contactPerson: e.target.value }))
              }
            />
          </div>
          <div className="account-field">
            <label>Phone</label>
            <input
              value={shippingAddress.mobileNumber}
              onChange={(e) =>
                setShippingAddress((s) => ({ ...s, mobileNumber: e.target.value }))
              }
            />
          </div>
          <div className="account-field">
            <label>Country</label>
            <input
              value={shippingAddress.country}
              onChange={(e) =>
                setShippingAddress((s) => ({ ...s, country: e.target.value }))
              }
            />
          </div>
          <div className="account-field">
            <label>City</label>
            <input
              value={shippingAddress.city}
              onChange={(e) => setShippingAddress((s) => ({ ...s, city: e.target.value }))}
            />
          </div>
          <div className="account-field">
            <label>Street</label>
            <input
              value={shippingAddress.street}
              onChange={(e) =>
                setShippingAddress((s) => ({ ...s, street: e.target.value }))
              }
            />
          </div>
          <div className="account-field">
            <label>Postal Code</label>
            <input
              value={shippingAddress.postalCode}
              onChange={(e) =>
                setShippingAddress((s) => ({ ...s, postalCode: e.target.value }))
              }
            />
          </div>

          <div className="account-actions" style={{ gridColumn: '1 / -1' }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Sending...' : 'Send Offer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};