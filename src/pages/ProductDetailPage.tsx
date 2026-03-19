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
  const images = product.imageUrls?.length ? product.imageUrls : ['/images/placeholder.jpg'];

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
    setIsAddingToCart(true);
    try {
      await addItem(product._id, quantity, '', {
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

            <TieredPricing
              tiers={product.priceTiers}
              selectedQuantity={quantity}
              onQuantityChange={setQuantity}
              moq={product.moq}
            />

            <div className="add-to-cart-section">
              <button
                className="btn btn-primary btn-large add-to-cart-btn"
                onClick={handleAddToCart}
                disabled={isAddingToCart}
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
