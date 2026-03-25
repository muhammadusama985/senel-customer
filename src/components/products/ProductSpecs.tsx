import React, { useState } from 'react';
import { Product } from '../../types/product';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import './ProductSpecs.css';

interface ProductSpecsProps {
  product: Product;
}

export const ProductSpecs: React.FC<ProductSpecsProps> = ({ product }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const totalVariantStock = (product.variants || []).reduce((sum, variant) => sum + Number(variant.stockQty || 0), 0);
  const displayStock = product.hasVariants ? totalVariantStock : product.stockQty;
  const displaySku = product.hasVariants
    ? (product.variants || []).map((variant) => variant.sku).filter(Boolean).join(', ')
    : product.sku || 'N/A';

  const baseSpecs = [
    { label: 'MOQ (Minimum Order Quantity)', value: product.moq?.toLocaleString() || 'N/A' },
    { label: 'Country of Origin', value: product.country || 'Not specified' },
    { label: 'Stock Available', value: displayStock?.toLocaleString() || '0' },
    { label: 'SKU', value: displaySku },
    { label: 'Product ID', value: product._id },
    { label: 'Vendor ID', value: product.vendorId },
    { label: 'Category ID', value: product.categoryId },
    { label: 'Status', value: product.status || 'N/A' },
  ];

  const attributeSpecs: { label: string; value: string }[] = [];
  const attributes = product.attributes || product.specifications || product.specs;

  if (attributes && typeof attributes === 'object') {
    Object.entries(attributes).forEach(([key, value]) => {
      const formattedLabel = key
        .split(/(?=[A-Z])|_/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

      const stringValue = value !== null && value !== undefined
        ? String(value)
        : 'Not specified';

      attributeSpecs.push({
        label: formattedLabel,
        value: stringValue
      });
    });
  }

  const allSpecs = [...baseSpecs, ...attributeSpecs];

  const uniqueSpecs = allSpecs.filter((spec, index, self) =>
    index === self.findIndex(s => s.label === spec.label)
  );

  const visibleSpecs = isExpanded ? uniqueSpecs : uniqueSpecs.slice(0, 6);

  if (uniqueSpecs.length === 0) {
    return null;
  }

  return (
    <div className="product-specs">
      <h3>Product Specifications</h3>

      <div className="specs-grid">
        {visibleSpecs.map((spec, index) => (
          <div key={index} className="spec-item">
            <span className="spec-label">{spec.label}</span>
            <span className="spec-value">{spec.value}</span>
          </div>
        ))}
      </div>

      {uniqueSpecs.length > 6 && (
        <button
          className="expand-specs-btn"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <>
              <ChevronUpIcon className="icon-small" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDownIcon className="icon-small" />
              Show {uniqueSpecs.length - 6} More Specifications
            </>
          )}
        </button>
      )}
    </div>
  );
};
