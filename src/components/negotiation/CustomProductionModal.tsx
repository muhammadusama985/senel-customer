import React, { useState } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface Props {
  productId: string;
  productTitle: string;
  defaultQty: number;
  currency: string;
  onClose: () => void;
}

export const CustomProductionModal: React.FC<Props> = ({
  productId,
  productTitle,
  defaultQty,
  currency,
  onClose,
}) => {
  const navigate = useNavigate();
  const [qty, setQty] = useState<number | ''>('');
  const [specifications, setSpecifications] = useState('');
  const [deliveryExpectations, setDeliveryExpectations] = useState('');
  const [validDays, setValidDays] = useState<number | ''>('');
  const [shippingAddress, setShippingAddress] = useState({
    companyName: '',
    contactPerson: '',
    mobileNumber: '',
    country: '',
    city: '',
    street: '',
    postalCode: '',
  });
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (qty === '' || qty < 1) return toast.error('Quantity must be at least 1');
    if (!specifications.trim()) return toast.error('Specifications are required');

    setSubmitting(true);
    try {
      await api.post('/custom-production/buyer', {
        productId,
        qty,
        specifications,
        deliveryExpectations,
        validDays,
        attachments: attachmentUrls.map((u) => ({ url: u, filename: u.split('/').pop() })),
        shippingAddress,
      });
      toast.success('Custom production request sent');
      onClose();
      navigate('/account?tab=negotiations');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send request');
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
      setAttachmentUrls((prev) => [...prev, r.data.url]);
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
        style={{ maxWidth: 720 }}
      >
        <div className="order-modal-head">
          <h3>Custom Production Request</h3>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="muted">
          For: <strong>{productTitle}</strong>
        </p>
        <form className="account-form-grid" onSubmit={submit}>
          <div className="account-field">
            <label>Quantity</label>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => {
                const v = e.target.value;
                setQty(v === '' ? '' : parseInt(v, 10));
              }}
              required
            />
          </div>
          <div className="account-field">
            <label>Request Validity (days)</label>
            <input
              type="number"
              min={1}
              max={180}
              value={validDays}
              onChange={(e) => {
                const v = e.target.value;
                setValidDays(v === '' ? '' : parseInt(v, 10));
              }}
              required
            />
          </div>
          <div className="account-field account-field-full">
            <label>Specifications (dimensions, materials, color, technical requirements, custom instructions)</label>
            <textarea
              value={specifications}
              onChange={(e) => setSpecifications(e.target.value)}
              rows={6}
              placeholder="Provide all production details here..."
              required
            />
          </div>
          <div className="account-field account-field-full">
            <label>Delivery Expectations (optional)</label>
            <textarea
              value={deliveryExpectations}
              onChange={(e) => setDeliveryExpectations(e.target.value)}
              rows={2}
              placeholder="e.g. Need by Q3 2026, FOB Hamburg..."
            />
          </div>
          <div className="account-field account-field-full">
            <label>Attachments (images, drawings, files)</label>
            <input type="file" onChange={handleFile} disabled={uploading} />
            {attachmentUrls.length > 0 && (
              <ul style={{ paddingLeft: '1rem', marginTop: '0.5rem' }}>
                {attachmentUrls.map((u) => (
                  <li key={u} className="muted">{u.split('/').pop()}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="account-field-full" style={{ gridColumn: '1 / -1' }}>
            <h4>Shipping Information (Product delivery address)</h4>
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
              {submitting ? 'Sending...' : 'Send Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};