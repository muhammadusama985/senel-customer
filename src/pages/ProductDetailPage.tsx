import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProduct, useRelatedProducts } from '../hooks/useProducts';
import { useCartStore } from '../store/cartStore';
import { useWishlistStore } from '../store/wishlistStore';
import { useAuthStore } from '../store/authStore';
import api from '../api/client';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { ProductCard } from '../components/products/ProductCard';
import { TieredPricing } from '../components/products/TieredPricing';
import { ProductSpecs } from '../components/products/ProductSpecs';
import { VendorInfo } from '../components/vendor/VendorInfo';
import { HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { ShoppingBagIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useI18n } from '../i18n';
import './ProductDetailPage.css';

export const ProductDetailPage: React.FC = () => {
  const { t } = useI18n();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(0);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariantSku, setSelectedVariantSku] = useState('');
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  const { data: product, isLoading, error } = useProduct(slug || '');
  const { data: relatedProducts } = useRelatedProducts(product?._id || '', 4);

  const { addItem } = useCartStore();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlistStore();
  const { user } = useAuthStore();

  useEffect(() => {
    if (product?.moq) {
      setQuantity(product.moq);
    }
  }, [product]);

  useEffect(() => {
    if (!product?.hasVariants) {
      setSelectedVariantSku('');
      return;
    }

    const firstInStockVariant = product.variants?.find((variant: any) => Number(variant.stockQty || 0) > 0);
    setSelectedVariantSku(firstInStockVariant?.sku || product.variants?.[0]?.sku || '');
  }, [product]);

  useEffect(() => {
    if (!user || !product?._id) return;
    api.post('/recently-viewed/me', { productId: product._id }).catch(() => {});
  }, [user, product?._id]);

  if (isLoading) {
    return (
      <div className="product-detail-loading">
        <div className="container">
          <div className="loading-skeleton">
            <div className="skeleton-gallery" />
            <div className="skeleton-info">
              <div className="skeleton-title" />
              <div className="skeleton-price" />
              <div className="skeleton-description" />
              <div className="skeleton-tiers" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="product-detail-error">
        <div className="container">
          <div className="error-state">
            <h2>{t('product.notFound', 'Product Not Found')}</h2>
            <p>{t('product.notFoundDesc', "The product you're looking for doesn't exist or has been removed.")}</p>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/products')}
            >
              {t('product.browse', 'Browse Products')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isWishlisted = isInWishlist(product._id);
  const selectedVariant = product.hasVariants
    ? product.variants?.find((variant: any) => variant.sku === selectedVariantSku)
    : null;
  const images = selectedVariant?.imageUrls?.length
    ? selectedVariant.imageUrls
    : product.imageUrls?.length
      ? product.imageUrls
      : ['/images/placeholder.jpg'];
  const availableStock = product.hasVariants
    ? Number(selectedVariant?.stockQty || 0)
    : Number(product.stockQty || 0);
  const currencySymbol = product.currency === 'USD' ? '$' : product.currency === 'TRY' ? 'TRY ' : 'EUR ';
  const canMeetMinimumOrder = availableStock >= product.moq;
  const quantityExceedsStock = canMeetMinimumOrder && quantity > availableStock;
  const isOutOfStock = availableStock <= 0 || !canMeetMinimumOrder;

  const getVariantLabel = (variant: any) => {
    const parts = Object.entries(variant?.attributes || {}).map(([key, value]) => `${key}: ${value}`);
    if (parts.length) {
      return `${parts.join(' / ')} (${variant.sku})`;
    }
    return variant?.sku || 'Variant';
  };

  const handleQuantityChange = (nextQuantity: number) => {
    const normalized = Math.max(product.moq, nextQuantity);
    if (canMeetMinimumOrder) {
      setQuantity(Math.min(normalized, availableStock));
      return;
    }
    setQuantity(normalized);
  };

  useEffect(() => {
    if (availableStock > 0 && quantity > availableStock) {
      setQuantity(Math.max(product.moq, availableStock));
    }
  }, [availableStock, quantity, product.moq]);

  const handleWishlist = async () => {
    if (isWishlisted) {
      await removeFromWishlist(product._id);
      toast.success('Removed from wishlist');
    } else {
      await addToWishlist(product._id);
      toast.success('Added to wishlist');
    }
  };

  const handleAddToCart = async () => {
    if (product.hasVariants && !selectedVariantSku) {
      toast.error('Please select a product option first');
      return;
    }

    if (isOutOfStock) {
      toast.error('This product is out of stock');
      return;
    }

    if (quantityExceedsStock) {
      toast.error(`Only ${availableStock} units are available`);
      return;
    }

    setIsAddingToCart(true);
    try {
      await addItem(product._id, quantity, selectedVariantSku, {
        vendorId: product.vendorId,
        slug: product.slug,
        title: product.title,
        unitPrice: product.priceTiers?.[0]?.unitPrice || 0,
        imageUrl: images[0],
        moq: product.moq,
      });
      toast.success(`Added ${quantity} units to cart`);
    } catch (error) {
      toast.error('Failed to add to cart');
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <div className="product-detail-page">
      <div className="container">
        <Breadcrumbs
          items={[
            { label: 'Home', path: '/' },
            { label: 'Products', path: '/products' },
            { label: product.title, path: `/products/${product.slug}` }
          ]}
        />

        <div className="product-detail-layout">
          <div className="product-gallery">
            <div className="main-image">
              <img
                src={images[selectedImage]}
                alt={product.title}
                className="main-image-img"
              />
            </div>
            {images.length > 1 && (
              <div className="image-thumbnails">
                {images.map((img, index) => (
                  <button
                    key={index}
                    className={`thumbnail-btn ${selectedImage === index ? 'active' : ''}`}
                    onClick={() => setSelectedImage(index)}
                  >
                    <img src={img} alt={`${product.title} ${index + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="product-info">
            <h1 className="product-title">{product.title}</h1>

            <div className="product-meta">
              {product.avgRating ? (
                <div className="rating">
                  <div className="stars">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className={`star ${i < Math.floor(product.avgRating!) ? 'filled' : ''}`}>
                        &#9733;
                      </span>
                    ))}
                  </div>
                  <span className="rating-count">
                    {product.avgRating.toFixed(1)} ({product.reviewCount} reviews)
                  </span>
                </div>
              ) : (
                <span className="no-rating">{t('product.noReviews', 'No reviews yet')}</span>
              )}

              <button
                className={`wishlist-btn ${isWishlisted ? 'active' : ''}`}
                onClick={handleWishlist}
                aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                {isWishlisted ? <HeartSolidIcon /> : <HeartIcon />}
                {isWishlisted ? t('product.saved', 'Saved') : t('product.saveWishlist', 'Save to Wishlist')}
              </button>
            </div>

            <p className="product-description">{product.description}</p>

            {product.hasVariants && (
              <div className="variant-selector-section">
                <label htmlFor="variant-sku" className="variant-selector-label">
                  Select Option:
                </label>
                <select
                  id="variant-sku"
                  className="variant-selector"
                  value={selectedVariantSku}
                  onChange={(e) => {
                    setSelectedVariantSku(e.target.value);
                    setSelectedImage(0);
                  }}
                >
                  {(product.variants || []).map((variant: any) => (
                    <option key={variant.sku} value={variant.sku}>
                      {getVariantLabel(variant)}
                    </option>
                  ))}
                </select>
                <div className={`variant-stock ${isOutOfStock ? 'out' : ''}`}>
                  {availableStock <= 0
                    ? 'Out of stock'
                    : !canMeetMinimumOrder
                      ? `Only ${availableStock} units available. Minimum order is ${product.moq}.`
                      : `${availableStock} units available`}
                </div>
              </div>
            )}

            <TieredPricing
              tiers={product.priceTiers}
              selectedQuantity={quantity}
              onQuantityChange={handleQuantityChange}
              moq={product.moq}
              maxQty={canMeetMinimumOrder ? availableStock : undefined}
              currencySymbol={currencySymbol}
            />

            <div className="add-to-cart-section">
              <button
                className="btn btn-primary btn-large add-to-cart-btn"
                onClick={handleAddToCart}
                disabled={isAddingToCart || isOutOfStock || quantityExceedsStock || (product.hasVariants && !selectedVariantSku)}
              >
                <ShoppingBagIcon className="add-to-cart-btn__icon" />
                <span className="add-to-cart-btn__label">
                  {isAddingToCart ? t('product.adding', 'Adding...') : t('product.addToCart', 'Add to Cart')}
                </span>
              </button>
            </div>

            <VendorInfo vendorId={product.vendorId} />
          </div>
        </div>

        <ProductSpecs product={product} />

        {relatedProducts && relatedProducts.length > 0 && (
          <section className="related-products">
            <h2>{t('product.related', 'Related Products')}</h2>
            <div className="related-products-grid">
              {relatedProducts.map((relatedProduct: any) => (
                <ProductCard key={relatedProduct._id} product={relatedProduct} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
