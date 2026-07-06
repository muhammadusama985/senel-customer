import React, { useEffect, useState } from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../../i18n';
import './TieredPricing.css';

interface PriceTier {
  minQty: number;
  unitPrice: number;
}

interface TieredPricingProps {
  tiers: PriceTier[];
  selectedQuantity: number;
  onQuantityChange: (qty: number) => void;
  inputValue?: string;
  onInputValueChange?: (value: string) => void;
  moq: number;
  maxQty?: number;
  currencySymbol?: string;
  /**
   * Per-attribute-value price adjustments. Structure:
   *   { "<AttrName>": { "<Value>": adjustment, ... }, ... }
   *   e.g. { Color: { Green: -10 }, Size: { Small: -20 } }
   * Adjustments from all selected attribute values are summed
   * and applied to every tier's unitPrice.
   */
  attributeAdjustments?: Record<string, Record<string, number>>;
  /**
   * Currently selected attribute values, e.g. { Color: 'Green', Size: 'Small' }.
   * Pass the same structure on add-to-cart so backend pricing matches.
   */
  selectedAttributes?: Record<string, string>;
}

const computeAttributeAdjustment = (
  attributeAdjustments: Record<string, Record<string, number>> | undefined,
  selectedAttributes: Record<string, string> | undefined
): number => {
  if (!attributeAdjustments || !selectedAttributes) return 0;
  let total = 0;
  for (const [attrName, attrValue] of Object.entries(selectedAttributes)) {
    if (attrValue == null || attrValue === '') continue;
    const attrMap = attributeAdjustments[attrName];
    if (!attrMap || typeof attrMap !== 'object') continue;
    const raw = attrMap[attrValue];
    const num = Number(raw);
    if (Number.isFinite(num)) total += num;
  }
  return total;
};

export const TieredPricing: React.FC<TieredPricingProps> = ({
  tiers,
  selectedQuantity,
  onQuantityChange,
  inputValue,
  onInputValueChange,
  moq,
  maxQty,
  currencySymbol = 'EUR ',
  attributeAdjustments,
  selectedAttributes,
}) => {
  const { t } = useI18n();
  const [internalQuantityInput, setInternalQuantityInput] = useState(String(selectedQuantity || moq));
  const quantityInput = inputValue ?? internalQuantityInput;
  const sortedTiers = [...tiers].sort((a, b) => a.minQty - b.minQty);
  const adjustment = computeAttributeAdjustment(attributeAdjustments, selectedAttributes);
  const activeTier = [...sortedTiers]
    .reverse()
    .find((tier) => selectedQuantity >= tier.minQty) || sortedTiers[0];
  const activeTierMinQty = activeTier?.minQty;

  // Adjusted tier (clamped at 0)
  const adjustedTierUnitPrice =
    activeTier != null ? Math.max(0, Number(activeTier.unitPrice) + adjustment) : 0;

  const getPriceForQuantity = (qty: number) => {
    const applicableTier = [...sortedTiers]
      .reverse()
      .find((tier) => qty >= tier.minQty);
    const baseUnitPrice = applicableTier?.unitPrice || sortedTiers[0]?.unitPrice || 0;
    return Math.max(0, Number(baseUnitPrice) + adjustment);
  };

  const getAdjustedUnitPriceForTier = (tier: PriceTier) => {
    return Math.max(0, Number(tier.unitPrice) + adjustment);
  };

  const getSavings = () => {
    if (!sortedTiers.length || sortedTiers.length === 1) return null;

    const basePrice = sortedTiers[0].unitPrice;
    const currentPrice = getPriceForQuantity(selectedQuantity);
    const savings = basePrice - currentPrice;
    const savingsPercent = (savings / basePrice) * 100;

    return { savings, savingsPercent };
  };

  const currentPrice = getPriceForQuantity(selectedQuantity);
  const totalPrice = currentPrice * selectedQuantity;
  const savings = getSavings();
  const hasStockLimit = typeof maxQty === 'number' && maxQty > 0;
  const disableIncrement = hasStockLimit && selectedQuantity >= maxQty;
  const disableDecrement = selectedQuantity <= moq;

  const updateQuantityInput = (value: string) => {
    if (onInputValueChange) {
      onInputValueChange(value);
      return;
    }
    setInternalQuantityInput(value);
  };

  useEffect(() => {
    updateQuantityInput(String(selectedQuantity || moq));
  }, [moq, selectedQuantity]);

  const commitQuantityInput = () => {
    const parsed = parseInt(quantityInput, 10);
    if (Number.isNaN(parsed)) {
      return;
    }

    if (parsed < moq) {
      return;
    }

    if (hasStockLimit && parsed > maxQty) {
      return;
    }

    updateQuantityInput(String(parsed));
    onQuantityChange(parsed);
  };

  return (
    <div className="tiered-pricing">
      <div className="pricing-header">
        <h3>{t('pricing.title', 'Pricing Tiers')}</h3>
        <div className="moq-badge">{t('pricing.minimumOrder', 'Minimum Order: {{moq}}+ units', { moq })}</div>
      </div>

      {adjustment !== 0 && (
        <div className="adjustment-banner">
          <InformationCircleIcon className="icon-small" />
          <span>
            {adjustment > 0
              ? t('pricing.adjustmentUp', 'Option adjustment: +{{amount}} (applied to all tiers)', {
                  amount: adjustment.toFixed(2),
                })
              : t('pricing.adjustmentDown', 'Option adjustment: {{amount}} (applied to all tiers)', {
                  amount: adjustment.toFixed(2),
                })}
          </span>
        </div>
      )}

      <div className="price-tiers-table">
        <table>
          <thead>
            <tr>
              <th>{t('pricing.quantity', 'Quantity')}</th>
              <th>{t('pricing.unitPrice', 'Unit Price')}</th>
              <th>{t('pricing.totalPrice', 'Total Price')}</th>
            </tr>
          </thead>
          <tbody>
            {sortedTiers.map((tier, index) => {
              const isActive = tier.minQty === activeTierMinQty;
              const tierSelectable = !hasStockLimit || tier.minQty <= maxQty;
              const effectiveUnitPrice = getAdjustedUnitPriceForTier(tier);
              const tierTotal = effectiveUnitPrice * (isActive ? selectedQuantity : tier.minQty);
              const hasTierAdjustment = adjustment !== 0;
              const baseUnitPrice = Number(tier.unitPrice);

              return (
                <tr
                  key={index}
                  className={`${isActive ? 'active-tier' : ''} ${!tierSelectable ? 'unavailable-tier' : ''}`.trim()}
                  onClick={() => {
                    if (!tierSelectable) return;
                    onQuantityChange(hasStockLimit ? Math.min(tier.minQty, maxQty) : tier.minQty);
                  }}
                >
                  <td className="quantity-cell">
                    {tier.minQty}+
                    {isActive && (
                      <span className="active-badge">{t('pricing.selected', 'Selected')}</span>
                    )}
                  </td>
                  <td className="price-cell">
                    {currencySymbol}{effectiveUnitPrice.toFixed(2)}
                    {index === 0 && !hasTierAdjustment && (
                      <span className="base-badge">{t('pricing.base', 'Base')}</span>
                    )}
                    {hasTierAdjustment && (
                      <span className="base-badge adjusted-badge" title={`Base ${currencySymbol}${baseUnitPrice.toFixed(2)}`}>
                        {currencySymbol}{baseUnitPrice.toFixed(2)}
                      </span>
                    )}
                  </td>
                  <td className="total-cell">
                    {currencySymbol}{tierTotal.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {savings && savings.savings > 0 && (
        <div className="savings-banner">
          <InformationCircleIcon className="icon-small" />
          <span>
            {t('pricing.savings', 'You save {{amount}} per unit ({{percent}}% off base price)', {
              amount: `${currencySymbol}${savings.savings.toFixed(2)}`,
              percent: savings.savingsPercent.toFixed(1),
            })}
          </span>
        </div>
      )}

      <div className="quantity-selector-section">
        <label htmlFor="quantity" className="quantity-label">
          {t('pricing.selectQuantity', 'Select Quantity:')}
        </label>
        <div className="quantity-controls">
          <button
            className="quantity-btn"
            onClick={() => onQuantityChange(Math.max(moq, selectedQuantity - 1))}
            disabled={disableDecrement}
          >
            -
          </button>
          <input
            id="quantity"
            type="number"
            value={quantityInput}
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              const nextValue = e.target.value;
              if (nextValue === '') {
                updateQuantityInput('');
                return;
              }

              if (!/^\d+$/.test(nextValue)) return;
              updateQuantityInput(nextValue);
            }}
            onBlur={commitQuantityInput}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitQuantityInput();
              }
            }}
            min={moq}
            max={hasStockLimit ? maxQty : undefined}
            step={1}
            className="quantity-input"
            inputMode="numeric"
          />
          <button
            className="quantity-btn"
            onClick={() => onQuantityChange(selectedQuantity + 1)}
            disabled={disableIncrement}
          >
            +
          </button>
        </div>
      </div>

      {hasStockLimit && (
        <div className="stock-limit-note">
          {t('pricing.maxAvailable', 'Maximum available quantity: {{maxQty}}', { maxQty: maxQty ?? '' })}
        </div>
      )}

      <div className="price-summary">
        <div className="summary-row">
          <span className="summary-label">{t('pricing.unitPriceLabel', 'Unit Price:')}</span>
          <span className="summary-value">{currencySymbol}{currentPrice.toFixed(2)}</span>
        </div>
        <div className="summary-row total">
          <span className="summary-label">{t('pricing.totalLabel', 'Total:')}</span>
          <span className="summary-value">{currencySymbol}{totalPrice.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};