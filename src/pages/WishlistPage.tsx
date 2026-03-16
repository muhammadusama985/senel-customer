import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useCartStore } from '../store/cartStore';
import { useI18n } from '../i18n';
import './WishlistPage.css';

interface WishlistProduct {
  _id: string;
  slug?: string;
  title: string;
  imageUrls?: string[];
  vendorId: string;
  moq?: number;
  priceTiers?: Array<{ minQty: number; unitPrice: number }>;
}

interface WishlistItem {
  _id: string;
  productId: string;
  product: WishlistProduct | null;
}

export const WishlistPage: React.FC = () => {
  const { t } = useI18n();
  const { addItem } = useCartStore();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadWishlist = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get<{ items: WishlistItem[] }>('/wishlist/me');
      setItems(Array.isArray(response.data.items) ? response.data.items : []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('wishlist.loading', 'Loading wishlist...'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadWishlist();
  }, [loadWishlist]);

  const removeItem = async (productId: string) => {
    try {
      await api.delete(`/wishlist/me/${productId}`);
      setItems((prev) => prev.filter((item) => item.productId !== productId));
      toast.success(t('wishlist.remove', 'Remove'));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to remove item');
    }
  };

  const moveToCart = async (item: WishlistItem) => {
    if (!item.product) return;
    try {
      const qty = Math.max(Number(item.product.moq || 1), 1);
      const price = Number(item.product.priceTiers?.[0]?.unitPrice || 0);
      await addItem(item.product._id, qty, '', {
        vendorId: item.product.vendorId,
        slug: item.product.slug || item.product._id,
        title: item.product.title,
        unitPrice: price,
        imageUrl: item.product.imageUrls?.[0] || '',
        moq: qty,
      });
      toast.success(t('wishlist.addToCart', 'Add to Cart'));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add to cart');
    }
  };

  return (
    <div className="wishlist-page">
      <div className="container">
        <h1>{t('wishlist.title', 'Wishlist')}</h1>
        {isLoading ? (
          <div className="card">{t('wishlist.loading', 'Loading wishlist...')}</div>
        ) : items.length === 0 ? (
          <div className="card">{t('wishlist.empty', 'No wishlist items found.')}</div>
        ) : (
          <div className="wishlist-grid">
            {items.map((item) => {
              const product = item.product;
              if (!product) return null;
              return (
                <article className="card wishlist-card" key={item._id}>
                  <img
                    src={product.imageUrls?.[0] || '/images/placeholder.jpg'}
                    alt={product.title}
                    className="wishlist-image"
                  />
                  <h3>{product.title}</h3>
                  <p className="muted">
                    MOQ: {product.moq || 1} | From EUR {Number(product.priceTiers?.[0]?.unitPrice || 0).toFixed(2)}
                  </p>
                  <div className="wishlist-actions">
                    <Link to={`/products/${product.slug || product._id}`} className="btn btn-outline">{t('wishlist.view', 'View')}</Link>
                    <button className="btn btn-primary" onClick={() => moveToCart(item)}>{t('wishlist.addToCart', 'Add to Cart')}</button>
                    <button className="btn btn-outline" onClick={() => removeItem(item.productId)}>{t('wishlist.remove', 'Remove')}</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
