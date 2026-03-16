import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBagIcon, HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { useCartStore } from '../../store/cartStore';
import { useWishlistStore } from '../../store/wishlistStore';
import { Product } from '../../types/product';
import toast from 'react-hot-toast';
import './ProductCard.css';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const { addItem } = useCartStore();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlistStore();

  React.useEffect(() => {
    setIsWishlisted(isInWishlist(product._id));
  }, [product._id, isInWishlist]);

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
    setIsWishlisted(!isWishlisted);
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsAddingToCart(true);
    try {
      await addItem(product._id, product.moq, '', {
        vendorId: product.vendorId,
        slug: product.slug,
        title: product.title,
        unitPrice: lowestPrice,
        imageUrl,
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
  const imageUrl = product.imageUrls?.[0] || '/images/placeholder.jpg';

  return (
    <div
      className="product-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link to={`/products/${product.slug}`} className="product-link">
        <div className="product-image-container">
          <img
            src={imageUrl}
            alt={product.title}
            className={`product-image ${isHovered ? 'hovered' : ''}`}
            loading="lazy"
          />
          <button
            className={`wishlist-btn ${isWishlisted ? 'active' : ''} ${isHovered ? 'visible' : ''}`}
            onClick={handleWishlist}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            {isWishlisted ? (
              <HeartSolidIcon className="icon animate-heart" />
            ) : (
              <HeartIcon className="icon" />
            )}
          </button>

          <div className={`product-badge ${isHovered ? 'hovered' : ''}`}>
            {product.moq}+ MOQ
          </div>
        </div>

        <div className="product-info">
          <h3 className="product-title">{product.title}</h3>

          <div className="product-price-section">
            <div className="product-price">
              <span className="current-price">
                EUR {lowestPrice.toFixed(2)}
              </span>
              <span className="original-price">
                EUR {(lowestPrice * 1.2).toFixed(2)}
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
            disabled={isAddingToCart}
          >
            {isAddingToCart ? (
              <>
                <span className="loader-small"></span>
                Adding...
              </>
            ) : (
              <>
                <ShoppingBagIcon className="icon-small" />
                Add to Cart
              </>
            )}
          </button>
        </div>
      </Link>
    </div>
  );
};