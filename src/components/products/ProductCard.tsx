import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBagIcon, HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { useCartStore } from '../../store/cartStore';
import { useWishlistStore } from '../../store/wishlistStore';
import { Product } from '../../types/product';
import { formatMoney } from '../../utils/currency';
import toast from 'react-hot-toast';
import './ProductCard.css';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const navigate = useNavigate();
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const { addItem } = useCartStore();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlistStore();
  const isWishlisted = isInWishlist(product._id);
  const asCleanString = (value: unknown, fallback = ''): string => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (!value || typeof value !== 'object') return fallback;

    const candidate = value as Record<string, unknown>;
    if (typeof candidate.url === 'string') return candidate.url;
    if (typeof candidate.imageUrl === 'string') return candidate.imageUrl;
    if (typeof candidate.fileUrl === 'string') return candidate.fileUrl;
    if (typeof candidate.src === 'string') return candidate.src;
    if (typeof candidate.title === 'string') return candidate.title;
    if (typeof candidate.name === 'string') return candidate.name;

    return fallback;
  };

  const safeTitle = asCleanString(product.title, 'Product');
  const safeSlug = asCleanString(product.slug, product._id);
  const hasEnoughVariantStock = product.hasVariants
    ? (product.variants || []).some((variant) => Number(variant.stockQty || 0) >= Number(product.moq || 1))
    : true;
  const isOutOfStock = product.hasVariants
    ? !hasEnoughVariantStock
    : Number(product.stockQty || 0) < Number(product.moq || 1);

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isWishlisted) {
      await removeFromWishlist(product._id);
      toast.success('Removed from wishlist', {
        style: {
          background: 'var(--card-bg)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
        },
      });
    } else {
      await addToWishlist(product._id);
      toast.success('Added to wishlist', {
        style: {
          background: 'var(--card-bg)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
        },
      });
    }
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (product.hasVariants) {
      toast('Please select a product option first.', {
        style: {
          background: 'var(--card-bg)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
        },
      });
      navigate(`/products/${safeSlug}`);
      return;
    }

    if (isOutOfStock) {
      toast.error('This product does not currently have enough stock for the minimum order.');
      navigate(`/products/${safeSlug}`);
      return;
    }

    setIsAddingToCart(true);
    try {
      await addItem(product._id, product.moq, '', {
        vendorId: product.vendorId,
        slug: safeSlug,
        title: safeTitle,
        unitPrice: lowestPrice,
        imageUrl,
        currency: product.currency,
        moq: product.moq,
      });
      toast.success(`Added ${product.moq} units to cart`, {
        style: {
          background: 'var(--card-bg)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
        },
      });
    } catch (error) {
      toast.error('Failed to add to cart');
    } finally {
      setIsAddingToCart(false);
    }
  };

  const lowestPrice = product.priceTiers?.[0]?.unitPrice || 0;
  const imageUrl = asCleanString(product.imageUrls?.[0], '/images/placeholder.jpg');

  return (
    <div
      className="product-card"
    >
      <Link to={`/products/${safeSlug}`} className="product-link">
        <div className="product-image-container">
          <img
            src={imageUrl}
            alt={safeTitle}
            className="product-image"
            loading="lazy"
          />
          <button
            className={`wishlist-btn ${isWishlisted ? 'active' : ''}`}
            onClick={handleWishlist}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            {isWishlisted ? (
              <HeartSolidIcon className="icon animate-heart" />
            ) : (
              <HeartIcon className="icon" />
            )}
          </button>

          <div className={`product-badge ${isOutOfStock ? 'out-of-stock' : ''}`}>
            {isOutOfStock ? 'Out of Stock' : `${product.moq}+ MOQ`}
          </div>
        </div>

        <div className="product-info">
          <h3 className="product-title">{safeTitle}</h3>

          <div className="product-price-section">
            <div className="product-price">
              <span className="current-price">
                {formatMoney(lowestPrice, product.currency)}
              </span>
              <span className="original-price">
                {formatMoney(lowestPrice * 1.2, product.currency)}
              </span>
            </div>

            {product.avgRating ? (
              <div className="product-rating">
                <div className="stars">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className={`star ${i < Math.floor(product.avgRating!) ? 'filled' : ''}`}>
                      &#9733;
                    </span>
                  ))}
                </div>
                <span className="rating-count">({product.reviewCount})</span>
              </div>
            ) : (
              <div className="product-rating">
                <span className="no-rating">New Arrival</span>
              </div>
            )}
          </div>

          <button
            className={`btn btn-primary add-to-cart-btn ${isAddingToCart ? 'loading' : ''}`}
            onClick={handleAddToCart}
            disabled={isAddingToCart || isOutOfStock}
          >
            {isAddingToCart ? (
              <>
                <span className="loader-small"></span>
                Adding...
              </>
            ) : (
              <>
                <ShoppingBagIcon className="icon-small" />
                {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
              </>
            )}
          </button>
        </div>
      </Link>
    </div>
  );
};
