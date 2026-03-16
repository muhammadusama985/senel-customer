import React from 'react';
import { Product } from '../../types/product';
import { ProductCard } from './ProductCard';
import './ProductGrid.css';

interface ProductGridProps {
  products: Product[];
}

export const ProductGrid: React.FC<ProductGridProps> = ({ products }) => {
  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
};