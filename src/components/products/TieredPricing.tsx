import React from 'react';
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
  moq: number;
}

export const TieredPricing: React.FC<TieredPricingProps> = ({
  tiers,
  selectedQuantity,
  onQuantityChange,
  moq,
}) => {
  const sortedTiers = [...tiers].sort((a, b) => a.minQty - b.minQty);

  const getPriceForQuantity = (qty: number) => {
    const applicableTier = [...sortedTiers]
      .reverse()
      .find(tier => qty >= tier.minQty);
    return applicableTier?.unitPrice || sortedTiers[0]?.unitPrice || 0;
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

  return (
    <div className="tiered-pricing">
      <div className="pricing-header">
        <h3>Pricing Tiers</h3>
        <div className="moq-badge">Minimum Order: {moq}+ units</div>
      </div>

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
              const isActive = selectedQuantity >= tier.minQty;
              const tierTotal = tier.unitPrice * selectedQuantity;

              return (
                <tr
                  key={index}
                  className={isActive ? 'active-tier' : ''}
                  onClick={() => onQuantityChange(tier.minQty)}
                >
                  <td className="quantity-cell">
                    {tier.minQty}+
                    {isActive && (
                      <span className="active-badge">Selected</span>
                    )}
                  </td>
                  <td className="price-cell">
                    €{tier.unitPrice.toFixed(2)}
                    {index === 0 && (
                      <span className="base-badge">Base</span>
                    )}
                  </td>
                  <td className="total-cell">
                    €{tierTotal.toFixed(2)}
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
            You save €{savings.savings.toFixed(2)} per unit
            ({savings.savingsPercent.toFixed(1)}% off base price)
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
            onClick={() => onQuantityChange(Math.max(moq, selectedQuantity - moq))}
            disabled={selectedQuantity <= moq}
          >
            −
          </button>
          <input
            id="quantity"
            type="number"
            value={selectedQuantity}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (val >= moq) onQuantityChange(val);
            }}
            min={moq}
            step={moq}
            className="quantity-input"
          />
          <button
            className="quantity-btn"
            onClick={() => onQuantityChange(selectedQuantity + moq)}
          >
            +
          </button>
        </div>
      </div>

      <div className="price-summary">
        <div className="summary-row">
          <span className="summary-label">Unit Price:</span>
          <span className="summary-value">€{currentPrice.toFixed(2)}</span>
        </div>
        <div className="summary-row total">
          <span className="summary-label">Total:</span>
          <span className="summary-value">€{totalPrice.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};