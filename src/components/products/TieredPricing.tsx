import React, { useEffect, useState } from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
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
   * Per-combination OFFSET from the base combination. Key is the joined
   * selected values of all attributes (e.g. "Red|Medium"). Value is a
   * flat offset added to every tier's unitPrice for this combination.
   * Missing entry = 0 (= same price as the base combination).
   */
  combinationOffsets?: Record<string, number>;
  /**
   * Minimum effective unit price (in product currency). The final
   * (tier + offset) price is floored at this value. Defaults to 0.
   */
  minEffectiveUnitPrice?: number;
  selectedAttributes?: Record<string, string>;
}

/**
 * Build the deterministic per-combination key used by combinationOffsets.
 * The attribute titles order must be stable (e.g. sorted alphabetically or
 * in the order the vendor defined them).
 */
const buildCombinationKey = (
  selectedAttributes: Record<string, string> | undefined
): string => {
  if (!selectedAttributes) return '';
  const parts: string[] = [];
  for (const attrTitle of Object.keys(selectedAttributes).sort()) {
    const v = selectedAttributes[attrTitle];
    if (v == null || v === '') continue;
    parts.push(String(v));
  }
  return parts.join('|');
};

/**
 * Resolve the per-combination OFFSET for the currently selected attributes.
 * Returns 0 if the combination is not in the map (treated as "same as base"),
 * or if no combination is selected yet (customer hasn't picked any options).
 */
const resolveCombinationOffset = (
  combinationOffsets: Record<string, number> | undefined,
  selectedAttributes: Record<string, string> | undefined
): number => {
  if (!combinationOffsets || Object.keys(combinationOffsets).length === 0) return 0;
  const key = buildCombinationKey(selectedAttributes);
  if (!key) return 0;
  const num = Number(combinationOffsets[key]);
  return Number.isFinite(num) ? num : 0;
};

// NOTE: Pricing UI is intentionally hardcoded in English. The pricing
// matrix, tier labels, math descriptions, and quantity-selector copy
// describe a B2B purchasing formula that is canonical across languages
// (Quantity → Unit Price → Total Price → Savings → Floor). Translating
// these labels would change the meaning of the formula and break parity
// with the pricing the vendor set on the admin/vendor side, so we keep
// them in English regardless of the customer's selected UI language.
// The numbers, the currency symbol and the math themselves are already
// preserved by the client-side translation layer (it only translates
// human-language strings, never numbers or formulas).

export const TieredPricing: React.FC<TieredPricingProps> = ({
  tiers,
  selectedQuantity,
  onQuantityChange,
  inputValue,
  onInputValueChange,
  moq,
  maxQty,
  currencySymbol = 'EUR ',
  combinationOffsets,
  minEffectiveUnitPrice = 0,
  selectedAttributes,
}) => {
  const [internalQuantityInput, setInternalQuantityInput] = useState(String(selectedQuantity || moq));
  const quantityInput = inputValue ?? internalQuantityInput;
  const sortedTiers = [...tiers].sort((a, b) => a.minQty - b.minQty);
  const adjustment = resolveCombinationOffset(combinationOffsets, selectedAttributes);
  const floor = Math.max(0, Number(minEffectiveUnitPrice) || 0);
  const activeTier = [...sortedTiers]
    .reverse()
    .find((tier) => selectedQuantity >= tier.minQty) || sortedTiers[0];
  const activeTierMinQty = activeTier?.minQty;

  // Effective unit price for any tier: base tier price + combination
  // offset, then floor at minEffectiveUnitPrice. Matches pricing.js.
  const getEffectiveUnitPriceForTier = (tier: PriceTier): number => {
    const base = Number(tier.unitPrice);
    if (!Number.isFinite(base)) return 0;
    return Math.max(floor, base + adjustment);
  };

  const getPriceForQuantity = (qty: number): number => {
    const applicableTier = [...sortedTiers]
      .reverse()
      .find((tier) => qty >= tier.minQty);
    if (applicableTier) return getEffectiveUnitPriceForTier(applicableTier);
    if (sortedTiers[0]) return getEffectiveUnitPriceForTier(sortedTiers[0]);
    return 0;
  };

  // Adjusted tier (used for the current selection highlight + summary)
  const adjustedTierUnitPrice = activeTier != null ? getEffectiveUnitPriceForTier(activeTier) : 0;

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
        <h3>Pricing Tiers</h3>
        <div className="moq-badge">
          Minimum Order: {moq}+ units
        </div>
      </div>

      {adjustment !== 0 && (
        <div className="adjustment-banner">
          <InformationCircleIcon className="icon-small" />
          <span>
            {adjustment > 0
              ? `Combination offset: +${adjustment.toFixed(2)} (applied to all tiers)`
              : `Combination offset: ${adjustment.toFixed(2)} (applied to all tiers)`}
          </span>
        </div>
      )}

      {/* Defensive notice: only shown if a clamp actually fired (upstream
          backend + vendor editor validation should prevent this, but the
          customer should never see a $0 tier price silently). */}
      {sortedTiers.some((tier) => Number(tier.unitPrice) + adjustment < floor) && (
        <div className="adjustment-banner" style={{ borderColor: 'var(--warning)' }}>
          <InformationCircleIcon className="icon-small" />
          <span>
            Some prices were floored to the minimum effective unit price.
          </span>
        </div>
      )}

      <div className="price-tiers-table">
        <table>
          <thead>
            <tr>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Total Price</th>
            </tr>
          </thead>
          <tbody>
            {sortedTiers.map((tier, index) => {
              const isActive = tier.minQty === activeTierMinQty;
              const tierSelectable = !hasStockLimit || tier.minQty <= maxQty;
              const effectiveUnitPrice = getEffectiveUnitPriceForTier(tier);
              const tierTotal = effectiveUnitPrice * (isActive ? selectedQuantity : tier.minQty);
              const hasTierAdjustment = adjustment !== 0;
              const baseUnitPrice = Number(tier.unitPrice);
              // Was the per-tier price floored at minEffectiveUnitPrice because
              // the (base + offset) sum would otherwise drop below the floor?
              const wasClamped = floor > 0 && baseUnitPrice + adjustment < floor;

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
                      <span className="active-badge">Selected</span>
                    )}
                  </td>
                  <td className="price-cell">
                    {currencySymbol}{effectiveUnitPrice.toFixed(2)}
                    {index === 0 && !hasTierAdjustment && (
                      <span className="base-badge">Base</span>
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
            You save {currencySymbol}{savings.savings.toFixed(2)} per unit ({savings.savingsPercent.toFixed(1)}% off base price)
          </span>
        </div>
      )}

      <div className="quantity-selector-section">
        <label htmlFor="quantity" className="quantity-label">
          Select Quantity:
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
          Maximum available quantity: {maxQty ?? ''}
        </div>
      )}

      <div className="price-summary">
        <div className="summary-row">
          <span className="summary-label">Unit Price:</span>
          <span className="summary-value">{currencySymbol}{currentPrice.toFixed(2)}</span>
        </div>
        <div className="summary-row total">
          <span className="summary-label">Total:</span>
          <span className="summary-value">{currencySymbol}{totalPrice.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};
