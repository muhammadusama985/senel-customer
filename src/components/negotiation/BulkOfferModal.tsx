import React, { useEffect, useMemo, useState } from 'react';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { useI18n } from '../../i18n';
import { useNavigate } from 'react-router-dom';

interface VariantAttr {
  [key: string]: string;
}

interface Variant {
  sku: string;
  attributes?: VariantAttr;
  stockQty?: number;
  imageUrls?: string[];
}

interface Props {
  product: {
    _id: string;
    title: string;
    slug: string;
    moq: number;
    stockQty: number;
    hasVariants?: boolean;
    variants?: Variant[];
    priceTiers?: { minQty: number; unitPrice: number }[];
    currency?: string;
  };
  defaultQty?: number;
  defaultUnitPrice?: number;
  onClose: () => void;
}

export const BulkOfferModal: React.FC<Props> = ({ product, defaultQty, defaultUnitPrice, onClose }) => {
  const navigate = useNavigate();
  const { t } = useI18n();

  const isVariantProduct = Boolean(product?.hasVariants) && Array.isArray(product?.variants) && product.variants.length > 0;
  const variants: Variant[] = isVariantProduct ? product.variants || [] : [];

  // Build attribute keys from the variants (e.g. ["Size", "Color"])
  const attributeKeys = useMemo(() => {
    const keys: string[] = [];
    for (const v of variants) {
      if (!v.attributes) continue;
      for (const k of Object.keys(v.attributes)) {
        if (!keys.includes(k)) keys.push(k);
      }
    }
    return keys;
  }, [variants]);

  // attribute key -> available values (unique, ordered by first appearance)
  const attributeOptions = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const k of attributeKeys) map[k] = [];
    for (const v of variants) {
      if (!v.attributes) continue;
      for (const k of attributeKeys) {
        const val = v.attributes[k];
        if (val && !map[k].includes(val)) map[k].push(val);
      }
    }
    return map;
  }, [variants, attributeKeys]);

  // user-selected attributes
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});

  // When the product is a variant product, auto-pick the first option for each attribute
  useEffect(() => {
    if (!isVariantProduct) return;
    const init: Record<string, string> = {};
    for (const k of attributeKeys) {
      init[k] = attributeOptions[k]?.[0] || '';
    }
    setSelectedAttributes(init);
  }, [isVariantProduct, attributeKeys, attributeOptions]);

  // Resolve the variant matching the selected attributes
  const selectedVariantSku = useMemo(() => {
    if (!isVariantProduct) return '';
    const match = variants.find((v) =>
      attributeKeys.every((k) => (v.attributes || {})[k] === selectedAttributes[k])
    );
    return match?.sku || '';
  }, [isVariantProduct, variants, attributeKeys, selectedAttributes]);

  const selectedVariant = useMemo(
    () => variants.find((v) => v.sku === selectedVariantSku) || null,
    [variants, selectedVariantSku]
  );

  // Available stock:
  // There is only one source of truth for inventory - product.stockQty - which
  // applies uniformly whether the product has zero, one, or many attributes.
  // The bulk-offer quantity input reads this same value so it reflects
  // exactly what the admin/vendor entered when creating the product.
  const availableStock = Number(product?.stockQty || 0);

  // Form state
  // Quantity has NO MOQ minimum — customer may request any positive quantity
  // regardless of the product's minimum order quantity (MOQ). The only hard
  // constraint is the available stock, which is enforced below.
  const initialQty = Math.max(defaultQty || 1, 1);
  const [qty, setQty] = useState<number>(initialQty);
  const [unitPrice, setUnitPrice] = useState<number>(defaultUnitPrice || product?.priceTiers?.[0]?.unitPrice || 0);
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

  const currency = product?.currency || 'EUR';
  const isOutOfStock = availableStock <= 0;
  const exceedsStock = qty > availableStock;
  // `belowMoq` is intentionally NOT used to block submission in the bulk
  // offer flow — the customer can offer any quantity regardless of MOQ.

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOutOfStock) return toast.error('This product is out of stock');
    if (exceedsStock)
      return toast.error(`Only ${availableStock} units available. Please reduce your quantity.`);
    if (isVariantProduct && !selectedVariantSku) {
      return toast.error('Please select all product options');
    }
    if (qty < 1) return toast.error('Quantity must be at least 1');
    if (unitPrice < 0) return toast.error('Unit price cannot be negative');

    setSubmitting(true);
    try {
      await api.post('/bulk-offers/buyer', {
        productId: product._id,
        qty,
        unitPrice,
        currency,
        notes,
        validDays,
        variantSku: isVariantProduct ? selectedVariantSku : '',
        variantAttributes: isVariantProduct ? selectedAttributes : {},
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
          {t('product.bulkOfferFor', 'For')}: <strong>{product?.title}</strong>
        </p>

        <form className="account-form-grid" onSubmit={submit}>
          {/* Variant pickers (only for variant products) */}
          {isVariantProduct && (
            <>
              <div className="account-field-full" style={{ gridColumn: '1 / -1' }}>
                <h4>Select product option</h4>
              </div>
              {attributeKeys.map((key) => (
                <div className="account-field" key={key}>
                  <label>{key}</label>
                  <select
                    value={selectedAttributes[key] || ''}
                    onChange={(e) =>
                      setSelectedAttributes((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    required
                  >
                    {attributeOptions[key]?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              <div className="account-field-full" style={{ gridColumn: '1 / -1' }}>
                <p className={isOutOfStock ? 'muted' : 'muted'}>
                  Available stock for selected option:{' '}
                  <strong>{availableStock}</strong> units
                </p>
              </div>
            </>
          )}

          {/* Stock info (non-variant) */}
          {!isVariantProduct && (
            <div className="account-field-full" style={{ gridColumn: '1 / -1' }}>
              <p className="muted">
                Available stock: <strong>{availableStock}</strong> units
              </p>
            </div>
          )}

          <div className="account-field">
            <label>Quantity (max: {availableStock})</label>
            <input
              type="number"
              min={1}
              max={availableStock || undefined}
              value={qty}
              onChange={(e) => setQty(parseInt(e.target.value, 10) || 1)}
              required
              disabled={isOutOfStock}
            />
            {exceedsStock && (
              <p style={{ color: 'red', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
                Only {availableStock} units available.
              </p>
            )}
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
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || isOutOfStock || exceedsStock}
            >
              {submitting ? 'Sending...' : 'Send Offer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};