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

interface ProductReview {
  _id: string;
  rating: number;
  title?: string;
  comment?: string;
  customerName?: string;
  createdAt?: string;
}

export const ProductDetailPage: React.FC = () => {
  const { t } = useI18n();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(0);
  const [quantityInputValue, setQuantityInputValue] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariantSku, setSelectedVariantSku] = useState('');
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: '',
    comment: '',
  });

  const { data: product, isLoading, error } = useProduct(slug || '');
  const { data: relatedProducts } = useRelatedProducts(product?._id || '', 4);

  const { addItem } = useCartStore();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlistStore();
  const { user } = useAuthStore();

  useEffect(() => {
    if (product?.moq) {
      setQuantity(product.moq);
      setQuantityInputValue(String(product.moq));
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

  useEffect(() => {
    if (!product?._id) return;
    setReviewsLoading(true);
    api
      .get<{ items: ProductReview[] }>(`/reviews/product/${product._id}`)
      .then((response) => setReviews(Array.isArray(response.data.items) ? response.data.items : []))
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false));
  }, [product?._id]);

  const selectedVariant = product?.hasVariants
    ? product.variants?.find((variant: any) => variant.sku === selectedVariantSku)
    : null;
  const availableStock = product?.hasVariants
    ? Number(selectedVariant?.stockQty || 0)
    : Number(product?.stockQty || 0);

  useEffect(() => {
    if (!product) return;
    if (availableStock > 0 && quantity > availableStock) {
      setQuantity(Math.max(product.moq, availableStock));
    }
  }, [availableStock, quantity, product]);

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
  const images = selectedVariant?.imageUrls?.length
    ? selectedVariant.imageUrls
    : product.imageUrls?.length
      ? product.imageUrls
      : ['/images/placeholder.jpg'];
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
      const safeQuantity = Math.min(normalized, availableStock);
      setQuantity(safeQuantity);
      setQuantityInputValue(String(safeQuantity));
      return;
    }
    setQuantity(normalized);
    setQuantityInputValue(String(normalized));
  };

  const handleWishlist = async () => {
    if (isWishlisted) {
      await removeFromWishlist(product._id);
      toast.success('Removed from wishlist');
    } else {
      await addToWishlist(product._id);
      toast.success('Added to wishlist');
    }
  };

  const handleReviewSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) {
      navigate('/login', { state: { from: `/products/${product.slug}` } });
      return;
    }

    setSubmittingReview(true);
    try {
      await api.post('/reviews/product', {
        productId: product._id,
        rating: reviewForm.rating,
        title: reviewForm.title.trim(),
        comment: reviewForm.comment.trim(),
      });
      const response = await api.get<{ items: ProductReview[] }>(`/reviews/product/${product._id}`);
      setReviews(Array.isArray(response.data.items) ? response.data.items : []);
      setReviewForm({ rating: 5, title: '', comment: '' });
      toast.success('Review submitted successfully');
    } catch (reviewError: any) {
      toast.error(reviewError.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleAddToCart = async () => {
    const typedQuantity = parseInt(quantityInputValue, 10);
    const quantityToValidate = Number.isNaN(typedQuantity) ? quantity : typedQuantity;

    if (product.hasVariants && !selectedVariantSku) {
      toast.error('Please select a product option first');
      return;
    }

    if (quantityToValidate < product.moq) {
      toast.error(`Minimum order quantity is ${product.moq}`);
      return;
    }

    if (isOutOfStock) {
      toast.error('Low stock');
      return;
    }

    if (quantityExceedsStock || quantityToValidate > availableStock) {
      toast.error('Low stock');
      return;
    }

    if (quantityToValidate !== quantity) {
      setQuantity(quantityToValidate);
      setQuantityInputValue(String(quantityToValidate));
    }

    setIsAddingToCart(true);
    try {
      await addItem(product._id, quantityToValidate, selectedVariantSku, {
        vendorId: product.vendorId,
        slug: product.slug,
        title: product.title,
        unitPrice: product.priceTiers?.[0]?.unitPrice || 0,
        imageUrl: images[0],
        currency: product.currency,
        moq: product.moq,
      });
      toast.success(`Added ${quantityToValidate} units to cart`);
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
                className={`product-detail-wishlist-btn ${isWishlisted ? 'active' : ''}`}
                onClick={handleWishlist}
                aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                {isWishlisted ? <HeartSolidIcon className="icon" /> : <HeartIcon className="icon" />}
                <span>{isWishlisted ? t('product.saved', 'Saved') : t('product.saveWishlist', 'Save to Favorites')}</span>
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
              inputValue={quantityInputValue}
              onInputValueChange={setQuantityInputValue}
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

        <section className="product-reviews-section">
          <div className="reviews-header">
            <div>
              <h2>Customer Reviews</h2>
              <p className="reviews-subtitle">
                {reviews.length
                  ? `${reviews.length} verified review${reviews.length === 1 ? '' : 's'}`
                  : 'No reviews yet. Be the first verified buyer to share feedback.'}
              </p>
            </div>
            {!user ? (
              <button
                className="btn btn-outline"
                onClick={() => navigate('/login', { state: { from: `/products/${product.slug}` } })}
              >
                Login to Review
              </button>
            ) : null}
          </div>

          <div className="reviews-grid">
            <form className="review-form-card" onSubmit={handleReviewSubmit}>
              <h3>Write a Review</h3>
              <label className="review-label" htmlFor="review-rating">Rating</label>
              <div id="review-rating" className="review-stars-input">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`review-star-btn ${reviewForm.rating >= star ? 'active' : ''}`}
                    onClick={() => setReviewForm((prev) => ({ ...prev, rating: star }))}
                    aria-label={`Rate ${star} star${star === 1 ? '' : 's'}`}
                  >
                    ★
                  </button>
                ))}
              </div>

              <label className="review-label" htmlFor="review-title">Title</label>
              <input
                id="review-title"
                type="text"
                value={reviewForm.title}
                onChange={(event) => setReviewForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Short review title"
                className="review-input"
              />

              <label className="review-label" htmlFor="review-comment">Your Review</label>
              <textarea
                id="review-comment"
                value={reviewForm.comment}
                onChange={(event) => setReviewForm((prev) => ({ ...prev, comment: event.target.value }))}
                placeholder="Share what you liked, quality details, delivery experience, or anything helpful."
                className="review-textarea"
                rows={5}
              />

              <button className="btn btn-primary" type="submit" disabled={submittingReview}>
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>

            <div className="review-list-card">
              {reviewsLoading ? (
                <div className="review-empty-state">Loading reviews...</div>
              ) : reviews.length === 0 ? (
                <div className="review-empty-state">No reviews yet for this product.</div>
              ) : (
                <div className="review-list">
                  {reviews.map((review) => (
                    <article key={review._id} className="review-item">
                      <div className="review-item-top">
                        <div>
                          <strong>{review.customerName || 'Verified buyer'}</strong>
                          <div className="review-item-date">
                            {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'Recently'}
                          </div>
                        </div>
                        <div className="review-item-stars" aria-label={`${review.rating} out of 5`}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span key={star} className={review.rating >= star ? 'filled' : ''}>★</span>
                          ))}
                        </div>
                      </div>
                      {review.title ? <h4>{review.title}</h4> : null}
                      {review.comment ? <p>{review.comment}</p> : null}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

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
