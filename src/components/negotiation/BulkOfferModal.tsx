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

  // Resolve the variant matching the selected attributes.
  // Prefer an exact match (a single variant row whose attributes satisfy every
  // selected key). If no such row exists - which can happen when variants are
  // stored with only one attribute per row - fall back to the SKU of the first
  // variant so the form can be submitted (mirrors what the backend expects:
  // a non-empty variantSku that resolves to an existing variant row).
  const selectedVariantSku = useMemo(() => {
    if (!isVariantProduct) return '';
    const match = variants.find((v) =>
      attributeKeys.every((k) => (v.attributes || {})[k] === selectedAttributes[k])
    );
    if (match?.sku) return match.sku;
    // Defensive fallback: scan for the first variant with a defined, non-empty sku.
    for (const v of variants) {
      if (v && v.sku) return v.sku;
    }
    return '';
  }, [isVariantProduct, variants, attributeKeys, selectedAttributes]);

  const selectedVariant = useMemo(
    () => variants.find((v) => v.sku === selectedVariantSku) || null,
    [variants, selectedVariantSku]
  );

  // Available stock for the currently selected combination / option.
  //  - For variant products: the selected variant's own stockQty
  //    (this is what the cart / checkout will validate against and what
  //    the bulk offer is being made for). NEVER the overall product.stockQty
  //    sum, which would mislead the customer about how many units are
  //    available for the specific combination they have picked.
  //  - For non-variant products: there is no "combination", so we fall back
  //    to the product-level stockQty which IS the only stock figure.
  const availableStock = (() => {
    if (isVariantProduct) {
      return Number(selectedVariant?.stockQty || 0);
    }
    return Number(product?.stockQty || 0);
  })();

  // Form state
  // Quantity, unit price and validity are stored as STRINGS so the inputs
  // can start empty (placeholder-only) and only accept numeric characters
  // via the inputMode / type="number" attributes. The numeric values are
  // computed at submit time. The customer can offer any positive quantity
  // regardless of the product's MOQ; the only hard constraint is the
  // available stock of the selected combination.
  const [qty, setQty] = useState<string>(
    defaultQty && defaultQty > 0 ? String(defaultQty) : '',
  );
  const [unitPrice, setUnitPrice] = useState<string>(
    defaultUnitPrice && defaultUnitPrice > 0 ? String(defaultUnitPrice) : '',
  );
  const [notes, setNotes] = useState('');
  const [validDays, setValidDays] = useState<string>('7');
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
  // `exceedsStock` is computed inside submit() so it reflects the latest
  // numeric value of the qty string at submit time. `belowMoq` is
  // intentionally NOT used to block submission in the bulk offer flow —
  // the customer can offer any quantity regardless of MOQ.

  // Parse the string-form fields safely for validation + submit. Empty
  // strings become NaN here so we can detect "user hasn't typed yet".
  const parsedQty = parseInt(qty, 10);
  const parsedUnitPrice = parseFloat(unitPrice);
  const parsedValidDays = parseInt(validDays, 10);
  const exceedsStock = Number.isFinite(parsedQty) && parsedQty > availableStock;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOutOfStock) return toast.error('This product is out of stock');
    if (isVariantProduct && !selectedVariantSku) {
      return toast.error('Please select a product option (variant) before submitting an offer');
    }
    if (!Number.isFinite(parsedQty) || parsedQty < 1) {
      return toast.error('Please enter a valid quantity (numbers only, at least 1)');
    }
    if (exceedsStock) {
      return toast.error(`Only ${availableStock} units available for the selected option. Please reduce your quantity.`);
    }
    if (!Number.isFinite(parsedUnitPrice) || parsedUnitPrice < 0) {
      return toast.error('Please enter a valid target unit price (numbers only, 0 or more)');
    }
    if (!Number.isFinite(parsedValidDays) || parsedValidDays < 1 || parsedValidDays > 90) {
      return toast.error('Offer validity must be between 1 and 90 days');
    }

    setSubmitting(true);
    try {
      await api.post('/bulk-offers/buyer', {
        productId: product._id,
        qty: parsedQty,
        unitPrice: parsedUnitPrice,
        currency,
        notes,
        validDays: parsedValidDays,
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
              {attributeKeys.map((key) => {
                const options = attributeOptions[key] || [];
                const singleOption = options.length === 1;
                return (
                <div className="account-field" key={key}>
                  <label>{key}</label>
                  {singleOption ? (
                    <div className="single-option-static" style={{ padding: '0.75rem 0.9rem', backgroundColor: 'var(--bg-secondary, transparent)', borderRadius: '0.5rem', color: 'var(--text-primary)' }}>
                      {options[0]}
                    </div>
                  ) : (
                    <select
                      value={selectedAttributes[key] || ''}
                      onChange={(e) =>
                        setSelectedAttributes((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      required
                    >
                      {options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                );
              })}
              <div className="account-field-full" style={{ gridColumn: '1 / -1' }}>
                <p className={isOutOfStock ? 'muted' : 'muted'}>
                  Available stock for selected option:{' '}
                  <strong>{availableStock}</strong> units
                </p>
              </div>
            </>
          )}

          {/*
            Non-variant products: the overall product.stockQty IS the only
            stock figure for the product, so it is shown as the
            "Available stock for the selected option" (there is only one
            option). This is NOT the sum across multiple variants.
          */}
          {!isVariantProduct && (
            <div className="account-field-full" style={{ gridColumn: '1 / -1' }}>
              <p className="muted">
                Available stock for the selected option:{' '}
                <strong>{availableStock}</strong> units
              </p>
            </div>
          )}

          <div className="account-field">
            <label>Quantity (max: {availableStock})</label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={availableStock || undefined}
              value={qty}
              placeholder="Enter quantity"
              // Keep the input as a string (preserves empty state) and
              // strip non-numeric characters so the field only accepts
              // digits while typing.
              onChange={(e) => setQty(e.target.value.replace(/[^0-9]/g, ''))}
              required
              disabled={isOutOfStock}
            />
          </div>
          <div className="account-field">
            <label>Target Unit Price ({currency})</label>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={unitPrice}
              placeholder="Enter target price"
              onChange={(e) => setUnitPrice(e.target.value.replace(/[^0-9.]/g, ''))}
              required
            />
          </div>
          <div className="account-field">
            <label>Offer Validity (days)</label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={90}
              value={validDays}
              onChange={(e) => setValidDays(e.target.value.replace(/[^0-9]/g, ''))}
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