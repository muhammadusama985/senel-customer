import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useI18n } from '../i18n';
import './AccountPage.css';

type TabKey = 'profile' | 'addresses' | 'suppliers' | 'recent' | 'notifications' | 'announcements';

interface Address {
  _id: string;
  label?: string;
  isDefault?: boolean;
  country: string;
  city: string;
  street1: string;
}

interface PreferredSupplier {
  _id: string;
  vendorId: string;
  vendor?: {
    _id: string;
    storeName?: string;
    storeSlug?: string;
  } | null;
}

interface RecentlyViewedItem {
  productId: string;
  product?: {
    _id: string;
    slug?: string;
    title: string;
  } | null;
}

interface NotificationItem {
  _id: string;
  title: string;
  body?: string;
  isRead?: boolean;
  createdAt?: string;
}

interface AnnouncementItem {
  id: string;
  title: string;
  body?: string;
  isRead?: boolean;
  publishedAt?: string;
}

const safeDate = (value?: string) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString();
};

export const AccountPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user } = useAuthStore();
  const [tab, setTab] = useState<TabKey>('profile');

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [preferred, setPreferred] = useState<PreferredSupplier[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    void loadAddresses();
    void loadPreferredSuppliers();
    void loadRecentlyViewed();
    void loadNotifications();
    void loadAnnouncements();
  }, [user]);

  const loadAddresses = async () => {
    try {
      const response = await api.get<{ items: Address[] }>('/addresses/me');
      setAddresses(Array.isArray(response.data.items) ? response.data.items : []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load addresses');
    }
  };

  const setDefaultAddress = async (id: string) => {
    try {
      await api.post(`/addresses/me/${id}/set-default`);
      await loadAddresses();
      toast.success('Default address updated');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to set default address');
    }
  };

  const deleteAddress = async (id: string) => {
    try {
      await api.delete(`/addresses/me/${id}`);
      setAddresses((prev) => prev.filter((a) => a._id !== id));
      toast.success('Address removed');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to remove address');
    }
  };

  const loadPreferredSuppliers = async () => {
    try {
      const response = await api.get<{ items: PreferredSupplier[] }>('/preferred-suppliers/me');
      setPreferred(Array.isArray(response.data.items) ? response.data.items : []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load preferred suppliers');
    }
  };

  const removePreferredSupplier = async (vendorId: string) => {
    try {
      await api.delete(`/preferred-suppliers/me/${vendorId}`);
      setPreferred((prev) => prev.filter((item) => item.vendorId !== vendorId));
      toast.success('Supplier removed');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to remove supplier');
    }
  };

  const loadRecentlyViewed = async () => {
    try {
      const response = await api.get<{ items: RecentlyViewedItem[] }>('/recently-viewed/me');
      setRecentlyViewed(Array.isArray(response.data.items) ? response.data.items : []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load recently viewed');
    }
  };

  const clearRecentlyViewed = async () => {
    try {
      await api.post('/recently-viewed/me/clear');
      setRecentlyViewed([]);
      toast.success('Recently viewed cleared');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to clear recently viewed');
    }
  };

  const loadNotifications = async () => {
    try {
      const response = await api.get<{ items: NotificationItem[] }>('/notifications/me');
      setNotifications(Array.isArray(response.data.items) ? response.data.items : []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load notifications');
    }
  };

  const markNotificationRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update notification');
    }
  };

  const loadAnnouncements = async () => {
    try {
      const response = await api.get<{ items: AnnouncementItem[] }>('/announcements/me');
      setAnnouncements(Array.isArray(response.data.items) ? response.data.items : []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load announcements');
    }
  };

  const markAnnouncementRead = async (id: string) => {
    try {
      await api.post(`/announcements/${id}/read`);
      setAnnouncements((prev) => prev.map((a) => (a.id === id ? { ...a, isRead: true } : a)));
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update announcement');
    }
  };

  return (
    <div className="account-page">
      <div className="container">
        <h1>{t('account.title', 'My Account')}</h1>
        <div className="account-layout">
          <aside className="card account-sidebar">
            <button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}>{t('account.profile', 'Profile')}</button>
            <button className={tab === 'addresses' ? 'active' : ''} onClick={() => setTab('addresses')}>{t('account.addresses', 'Addresses')}</button>
            <button className={tab === 'suppliers' ? 'active' : ''} onClick={() => setTab('suppliers')}>{t('account.preferred', 'Preferred Suppliers')}</button>
            <button className={tab === 'recent' ? 'active' : ''} onClick={() => setTab('recent')}>{t('account.recent', 'Recently Viewed')}</button>
            <button className={tab === 'notifications' ? 'active' : ''} onClick={() => setTab('notifications')}>{t('account.notifications', 'Notifications')}</button>
            <button className={tab === 'announcements' ? 'active' : ''} onClick={() => setTab('announcements')}>{t('account.announcements', 'Announcements')}</button>
          </aside>

          <section className="card account-content">
            {tab === 'profile' && (
              <div>
                <h3>Profile</h3>
                <p>Email: <strong>{user?.email || '-'}</strong></p>
                <p>Role: <strong>{user?.role || '-'}</strong></p>
                <p>Language: <strong>{user?.preferredLanguage || 'en'}</strong></p>
              </div>
            )}

            {tab === 'addresses' && (
              <div>
                <h3>{t('account.savedAddresses', 'Saved Addresses')}</h3>
                {addresses.length === 0 ? <p className="muted">{t('account.noAddresses', 'No addresses found.')}</p> : (
                  <ul className="simple-list">
                    {addresses.map((a) => (
                      <li key={a._id}>
                        <span>
                          {a.label || 'Address'} - {a.street1}, {a.city}, {a.country}
                          {a.isDefault ? ' (Default)' : ''}
                        </span>
                        <div className="row-actions">
                          {!a.isDefault && <button className="btn btn-outline" onClick={() => setDefaultAddress(a._id)}>{t('account.setDefault', 'Set Default')}</button>}
                          <button className="btn btn-outline" onClick={() => deleteAddress(a._id)}>{t('account.delete', 'Delete')}</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {tab === 'suppliers' && (
              <div>
                <h3>{t('account.preferred', 'Preferred Suppliers')}</h3>
                {preferred.length === 0 ? <p className="muted">{t('account.noPreferred', 'No preferred suppliers found.')}</p> : (
                  <ul className="simple-list">
                    {preferred.map((item) => (
                      <li key={item._id}>
                        <span>{item.vendor?.storeName || item.vendorId}</span>
                        <div className="row-actions">
                          {item.vendor?.storeSlug && (
                            <Link className="btn btn-outline" to={`/vendors/${item.vendor.storeSlug}`}>{t('wishlist.view', 'View')}</Link>
                          )}
                          <button className="btn btn-outline" onClick={() => removePreferredSupplier(item.vendorId)}>{t('wishlist.remove', 'Remove')}</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {tab === 'recent' && (
              <div>
                <h3>{t('account.recent', 'Recently Viewed')}</h3>
                <div className="top-actions">
                  <button className="btn btn-outline" onClick={clearRecentlyViewed}>{t('account.clear', 'Clear')}</button>
                </div>
                {recentlyViewed.length === 0 ? <p className="muted">{t('account.noRecent', 'No recently viewed items.')}</p> : (
                  <ul className="simple-list">
                    {recentlyViewed.map((item) => (
                      <li key={`${item.productId}`}>
                        <span>{item.product?.title || item.productId}</span>
                        {item.product?.slug && <Link className="btn btn-outline" to={`/products/${item.product.slug}`}>{t('account.open', 'Open')}</Link>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {tab === 'notifications' && (
              <div>
                <h3>{t('account.notifications', 'Notifications')}</h3>
                {notifications.length === 0 ? <p className="muted">{t('account.noNotifications', 'No notifications.')}</p> : (
                  <ul className="simple-list">
                    {notifications.map((n) => (
                      <li key={n._id}>
                        <div>
                          <strong>{n.title}</strong>
                          <p className="muted">{n.body || ''}</p>
                          <p className="muted">{safeDate(n.createdAt)}</p>
                        </div>
                        {!n.isRead && <button className="btn btn-outline" onClick={() => markNotificationRead(n._id)}>{t('account.markRead', 'Mark Read')}</button>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {tab === 'announcements' && (
              <div>
                <h3>{t('account.announcements', 'Announcements')}</h3>
                {announcements.length === 0 ? <p className="muted">{t('account.noAnnouncements', 'No announcements.')}</p> : (
                  <ul className="simple-list">
                    {announcements.map((a) => (
                      <li key={a.id}>
                        <div>
                          <strong>{a.title}</strong>
                          <p className="muted">{a.body || ''}</p>
                          <p className="muted">{safeDate(a.publishedAt)}</p>
                        </div>
                        {!a.isRead && <button className="btn btn-outline" onClick={() => markAnnouncementRead(a.id)}>{t('account.markRead', 'Mark Read')}</button>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
