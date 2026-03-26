import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';
import { useI18n } from '../i18n';
import './AccountPage.css';

type TabKey =
  | 'profile'
  | 'addresses'
  | 'suppliers'
  | 'disputes'
  | 'recent'
  | 'notifications'
  | 'announcements';

interface Address {
  _id: string;
  label?: string;
  isDefault?: boolean;
  country: string;
  city: string;
  street1: string;
  street2?: string;
  postalCode?: string;
  companyName?: string;
  contactPerson?: string;
  phone?: string;
  notes?: string;
}

interface AddressFormState {
  label: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  country: string;
  city: string;
  postalCode: string;
  street1: string;
  street2: string;
  notes: string;
  isDefault: boolean;
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

interface CustomerDispute {
  _id: string;
  disputeNumber: string;
  subject: string;
  status: string;
  reason?: string;
  description?: string;
  createdAt?: string;
}

interface DisputeMessage {
  _id: string;
  senderRole: 'customer' | 'vendor' | 'admin';
  message: string;
  createdAt?: string;
}

const emptyAddressForm = (): AddressFormState => ({
  label: '',
  companyName: '',
  contactPerson: '',
  phone: '',
  country: '',
  city: '',
  postalCode: '',
  street1: '',
  street2: '',
  notes: '',
  isDefault: false,
});

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

  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    companyName: '',
    taxId: '',
    country: '',
    city: '',
    addressLine: '',
    contactPhone: '',
    preferredLanguage: 'en' as 'en' | 'de' | 'tr',
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressForm, setAddressForm] = useState<AddressFormState>(emptyAddressForm());
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  const [preferred, setPreferred] = useState<PreferredSupplier[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [disputes, setDisputes] = useState<CustomerDispute[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<CustomerDispute | null>(null);
  const [disputeMessages, setDisputeMessages] = useState<DisputeMessage[]>([]);
  const [disputeReply, setDisputeReply] = useState('');
  const [disputeBusy, setDisputeBusy] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: '/account' } });
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  useEffect(() => {
    if (!user) return;
    setProfileForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phone: user.phone || '',
      companyName: user.companyName || '',
      taxId: user.taxId || '',
      country: user.country || '',
      city: user.city || '',
      addressLine: user.addressLine || '',
      contactPhone: user.contactPhone || '',
      preferredLanguage: user.preferredLanguage || 'en',
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void loadAddresses();
    void loadPreferredSuppliers();
    void loadRecentlyViewed();
    void loadNotifications();
    void loadAnnouncements();
    void loadDisputes();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (tab === 'suppliers') {
      void loadPreferredSuppliers();
    }
  }, [tab, user]);

  const profileSummary = useMemo(
    () => [
      { label: 'Email', value: user?.email || '-' },
      { label: 'Company', value: profileForm.companyName || 'Not set' },
      { label: 'Location', value: [profileForm.city, profileForm.country].filter(Boolean).join(', ') || 'Not set' },
    ],
    [profileForm.city, profileForm.companyName, profileForm.country, user?.email]
  );

  const loadAddresses = async () => {
    try {
      const response = await api.get<{ items: Address[] }>('/addresses/me');
      setAddresses(Array.isArray(response.data.items) ? response.data.items : []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load addresses');
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

  const loadRecentlyViewed = async () => {
    try {
      const response = await api.get<{ items: RecentlyViewedItem[] }>('/recently-viewed/me');
      setRecentlyViewed(Array.isArray(response.data.items) ? response.data.items : []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load recently viewed');
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

  const loadAnnouncements = async () => {
    try {
      const response = await api.get<{ items: AnnouncementItem[] }>('/announcements/me');
      setAnnouncements(Array.isArray(response.data.items) ? response.data.items : []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load announcements');
    }
  };

  const loadDisputes = async () => {
    try {
      const response = await api.get<{ items: CustomerDispute[] }>('/disputes/customer');
      setDisputes(Array.isArray(response.data.items) ? response.data.items : []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load disputes');
    }
  };

  const openDispute = async (dispute: CustomerDispute) => {
    setDisputeBusy(true);
    try {
      const response = await api.get<{ dispute: CustomerDispute; messages: DisputeMessage[] }>(`/disputes/${dispute._id}`);
      setSelectedDispute(response.data.dispute);
      setDisputeMessages(Array.isArray(response.data.messages) ? response.data.messages : []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load dispute');
    } finally {
      setDisputeBusy(false);
    }
  };

  const sendDisputeReply = async () => {
    if (!selectedDispute?._id || !disputeReply.trim()) return;
    setDisputeBusy(true);
    try {
      await api.post(`/disputes/${selectedDispute._id}/messages`, { message: disputeReply.trim() });
      setDisputeReply('');
      await openDispute(selectedDispute);
      await loadDisputes();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send reply');
      setDisputeBusy(false);
    }
  };

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSavingProfile(true);
    try {
      const response = await api.patch('/auth/me', profileForm);
      useAuthStore.setState((state) => ({ ...state, user: response.data.user }));
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAddressSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSavingAddress(true);
    try {
      if (editingAddressId) {
        await api.patch(`/addresses/me/${editingAddressId}`, addressForm);
        toast.success('Address updated successfully');
      } else {
        await api.post('/addresses/me', addressForm);
        toast.success('Address added successfully');
      }
      await loadAddresses();
      setAddressForm(emptyAddressForm());
      setEditingAddressId(null);
      setShowAddressForm(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save address');
    } finally {
      setIsSavingAddress(false);
    }
  };

  const startNewAddress = () => {
    setEditingAddressId(null);
    setAddressForm(emptyAddressForm());
    setShowAddressForm(true);
  };

  const startEditAddress = (address: Address) => {
    setEditingAddressId(address._id);
    setAddressForm({
      label: address.label || '',
      companyName: address.companyName || '',
      contactPerson: address.contactPerson || '',
      phone: address.phone || '',
      country: address.country || '',
      city: address.city || '',
      postalCode: address.postalCode || '',
      street1: address.street1 || '',
      street2: address.street2 || '',
      notes: address.notes || '',
      isDefault: Boolean(address.isDefault),
    });
    setShowAddressForm(true);
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
    if (!window.confirm('Remove this address?')) return;
    try {
      await api.delete(`/addresses/me/${id}`);
      setAddresses((prev) => prev.filter((a) => a._id !== id));
      if (editingAddressId === id) {
        setAddressForm(emptyAddressForm());
        setEditingAddressId(null);
        setShowAddressForm(false);
      }
      toast.success('Address removed');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to remove address');
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

  const clearRecentlyViewed = async () => {
    try {
      await api.post('/recently-viewed/me/clear');
      setRecentlyViewed([]);
      toast.success('Recently viewed cleared');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to clear recently viewed');
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
        <div className="account-hero card">
          <div>
            <p className="account-kicker">Customer Space</p>
            <h1>{t('account.title', 'My Account')}</h1>
            <p className="muted">Manage your profile, saved addresses, suppliers, disputes, and updates in one place.</p>
          </div>
          <div className="account-summary-grid">
            {profileSummary.map((item) => (
              <div key={item.label} className="account-summary-card">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="account-layout">
          <aside className="card account-sidebar">
            <button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}>{t('account.profile', 'Profile')}</button>
            <button className={tab === 'addresses' ? 'active' : ''} onClick={() => setTab('addresses')}>{t('account.addresses', 'Addresses')}</button>
            <button className={tab === 'suppliers' ? 'active' : ''} onClick={() => setTab('suppliers')}>{t('account.preferred', 'Preferred Suppliers')}</button>
            <button className={tab === 'disputes' ? 'active' : ''} onClick={() => setTab('disputes')}>Disputes</button>
            <button className={tab === 'recent' ? 'active' : ''} onClick={() => setTab('recent')}>{t('account.recent', 'Recently Viewed')}</button>
            <button className={tab === 'notifications' ? 'active' : ''} onClick={() => setTab('notifications')}>{t('account.notifications', 'Notifications')}</button>
            <button className={tab === 'announcements' ? 'active' : ''} onClick={() => setTab('announcements')}>{t('account.announcements', 'Announcements')}</button>
          </aside>

          <section className="card account-content">
            {tab === 'profile' && (
              <form className="account-form-grid" onSubmit={handleSaveProfile}>
                <div className="account-section-head">
                  <div>
                    <h3>Profile</h3>
                    <p className="muted">Keep your customer details up to date for checkout and communication.</p>
                  </div>
                </div>

                <div className="account-field">
                  <label>Email</label>
                  <input value={user?.email || ''} disabled />
                </div>
                <div className="account-field">
                  <label>Phone</label>
                  <input value={profileForm.phone} onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))} />
                </div>
                <div className="account-field">
                  <label>First Name</label>
                  <input value={profileForm.firstName} onChange={(e) => setProfileForm((prev) => ({ ...prev, firstName: e.target.value }))} />
                </div>
                <div className="account-field">
                  <label>Last Name</label>
                  <input value={profileForm.lastName} onChange={(e) => setProfileForm((prev) => ({ ...prev, lastName: e.target.value }))} />
                </div>
                <div className="account-field">
                  <label>Company Name</label>
                  <input value={profileForm.companyName} onChange={(e) => setProfileForm((prev) => ({ ...prev, companyName: e.target.value }))} />
                </div>
                <div className="account-field">
                  <label>Tax ID</label>
                  <input value={profileForm.taxId} onChange={(e) => setProfileForm((prev) => ({ ...prev, taxId: e.target.value }))} />
                </div>
                <div className="account-field">
                  <label>Country</label>
                  <input value={profileForm.country} onChange={(e) => setProfileForm((prev) => ({ ...prev, country: e.target.value }))} />
                </div>
                <div className="account-field">
                  <label>City</label>
                  <input value={profileForm.city} onChange={(e) => setProfileForm((prev) => ({ ...prev, city: e.target.value }))} />
                </div>
                <div className="account-field account-field-full">
                  <label>Address Line</label>
                  <input value={profileForm.addressLine} onChange={(e) => setProfileForm((prev) => ({ ...prev, addressLine: e.target.value }))} />
                </div>
                <div className="account-field">
                  <label>Contact Phone</label>
                  <input value={profileForm.contactPhone} onChange={(e) => setProfileForm((prev) => ({ ...prev, contactPhone: e.target.value }))} />
                </div>
                <div className="account-field">
                  <label>Language</label>
                  <select
                    value={profileForm.preferredLanguage}
                    onChange={(e) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        preferredLanguage: e.target.value as 'en' | 'de' | 'tr',
                      }))
                    }
                  >
                    <option value="en">English</option>
                    <option value="de">German</option>
                    <option value="tr">Turkish</option>
                  </select>
                </div>

                <div className="account-actions">
                  <button className="btn btn-primary" type="submit" disabled={isSavingProfile}>
                    {isSavingProfile ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            )}

            {tab === 'addresses' && (
              <div className="account-stack">
                <div className="account-section-head">
                  <div>
                    <h3>{t('account.savedAddresses', 'Saved Addresses')}</h3>
                    <p className="muted">Add, edit, and reuse shipping addresses for faster checkout.</p>
                  </div>
                  <button className="btn btn-primary" onClick={startNewAddress}>Add Address</button>
                </div>

                {showAddressForm && (
                  <form className="account-form-grid account-panel" onSubmit={handleAddressSubmit}>
                    <div className="account-field">
                      <label>Label</label>
                      <input value={addressForm.label} onChange={(e) => setAddressForm((prev) => ({ ...prev, label: e.target.value }))} />
                    </div>
                    <div className="account-field">
                      <label>Company Name</label>
                      <input value={addressForm.companyName} onChange={(e) => setAddressForm((prev) => ({ ...prev, companyName: e.target.value }))} />
                    </div>
                    <div className="account-field">
                      <label>Contact Person</label>
                      <input value={addressForm.contactPerson} onChange={(e) => setAddressForm((prev) => ({ ...prev, contactPerson: e.target.value }))} />
                    </div>
                    <div className="account-field">
                      <label>Phone</label>
                      <input value={addressForm.phone} onChange={(e) => setAddressForm((prev) => ({ ...prev, phone: e.target.value }))} />
                    </div>
                    <div className="account-field">
                      <label>Country</label>
                      <input value={addressForm.country} onChange={(e) => setAddressForm((prev) => ({ ...prev, country: e.target.value }))} required />
                    </div>
                    <div className="account-field">
                      <label>City</label>
                      <input value={addressForm.city} onChange={(e) => setAddressForm((prev) => ({ ...prev, city: e.target.value }))} required />
                    </div>
                    <div className="account-field">
                      <label>Postal Code</label>
                      <input value={addressForm.postalCode} onChange={(e) => setAddressForm((prev) => ({ ...prev, postalCode: e.target.value }))} />
                    </div>
                    <div className="account-field account-field-full">
                      <label>Street 1</label>
                      <input value={addressForm.street1} onChange={(e) => setAddressForm((prev) => ({ ...prev, street1: e.target.value }))} required />
                    </div>
                    <div className="account-field account-field-full">
                      <label>Street 2</label>
                      <input value={addressForm.street2} onChange={(e) => setAddressForm((prev) => ({ ...prev, street2: e.target.value }))} />
                    </div>
                    <div className="account-field account-field-full">
                      <label>Notes</label>
                      <textarea value={addressForm.notes} onChange={(e) => setAddressForm((prev) => ({ ...prev, notes: e.target.value }))} rows={4} />
                    </div>
                    <label className="account-checkbox">
                      <input
                        type="checkbox"
                        checked={addressForm.isDefault}
                        onChange={(e) => setAddressForm((prev) => ({ ...prev, isDefault: e.target.checked }))}
                      />
                      <span>Set as default address</span>
                    </label>
                    <div className="account-actions">
                      <button className="btn btn-outline" type="button" onClick={() => {
                        setShowAddressForm(false);
                        setEditingAddressId(null);
                        setAddressForm(emptyAddressForm());
                      }}>
                        Cancel
                      </button>
                      <button className="btn btn-primary" type="submit" disabled={isSavingAddress}>
                        {isSavingAddress ? 'Saving...' : editingAddressId ? 'Update Address' : 'Save Address'}
                      </button>
                    </div>
                  </form>
                )}

                {addresses.length === 0 ? (
                  <p className="muted">{t('account.noAddresses', 'No addresses found.')}</p>
                ) : (
                  <div className="address-grid">
                    {addresses.map((address) => (
                      <article key={address._id} className="account-panel address-card">
                        <div className="address-card-head">
                          <div>
                            <h4>{address.label || 'Address'}</h4>
                            {address.isDefault ? <span className="status-pill">Default</span> : null}
                          </div>
                          <div className="row-actions">
                            <button className="btn btn-outline" onClick={() => startEditAddress(address)}>Edit</button>
                            {!address.isDefault ? <button className="btn btn-outline" onClick={() => setDefaultAddress(address._id)}>Set Default</button> : null}
                            <button className="btn btn-outline" onClick={() => deleteAddress(address._id)}>Delete</button>
                          </div>
                        </div>
                        <p>{[address.street1, address.street2].filter(Boolean).join(', ')}</p>
                        <p>{[address.city, address.country, address.postalCode].filter(Boolean).join(', ')}</p>
                        {(address.contactPerson || address.phone) ? (
                          <p className="muted">{[address.contactPerson, address.phone].filter(Boolean).join(' • ')}</p>
                        ) : null}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'suppliers' && (
              <div className="account-stack">
                <div className="account-section-head">
                  <div>
                    <h3>{t('account.preferred', 'Preferred Suppliers')}</h3>
                    <p className="muted">Keep your favorite suppliers nearby for quick repeat sourcing.</p>
                  </div>
                </div>
                {preferred.length === 0 ? <p className="muted">{t('account.noPreferred', 'No preferred suppliers found.')}</p> : (
                  <div className="account-list-grid">
                    {preferred.map((item) => (
                      <article key={item._id} className="account-panel">
                        <strong>{item.vendor?.storeName || item.vendorId}</strong>
                        <div className="row-actions">
                          {item.vendor?.storeSlug ? (
                            <Link className="btn btn-outline" to={`/vendors/${item.vendor.storeSlug}`}>{t('wishlist.view', 'View')}</Link>
                          ) : null}
                          <button className="btn btn-outline" onClick={() => removePreferredSupplier(item.vendorId)}>{t('wishlist.remove', 'Remove')}</button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'disputes' && (
              <div className="account-stack">
                <div className="account-section-head">
                  <div>
                    <h3>Disputes</h3>
                    <p className="muted">Track product and order disputes you have opened with vendors.</p>
                  </div>
                </div>
                {disputes.length === 0 ? (
                  <p className="muted">No disputes found.</p>
                ) : (
                  <div className="account-list-grid">
                    {disputes.map((dispute) => (
                      <article key={dispute._id} className="account-panel">
                        <div className="dispute-head">
                          <strong>{dispute.disputeNumber}</strong>
                          <span className="status-pill">{dispute.status.replace('_', ' ')}</span>
                        </div>
                        <p>{dispute.subject}</p>
                        <p className="muted">{dispute.reason ? dispute.reason.replace('_', ' ') : 'other'} • {safeDate(dispute.createdAt)}</p>
                        <div className="row-actions">
                          <button className="btn btn-outline" onClick={() => void openDispute(dispute)}>View Discussion</button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'recent' && (
              <div className="account-stack">
                <div className="account-section-head">
                  <div>
                    <h3>{t('account.recent', 'Recently Viewed')}</h3>
                    <p className="muted">Quickly revisit products you explored recently.</p>
                  </div>
                  <button className="btn btn-outline" onClick={clearRecentlyViewed}>{t('account.clear', 'Clear')}</button>
                </div>
                {recentlyViewed.length === 0 ? <p className="muted">{t('account.noRecent', 'No recently viewed items.')}</p> : (
                  <div className="account-list-grid">
                    {recentlyViewed.map((item) => (
                      <article key={`${item.productId}`} className="account-panel">
                        <strong>{item.product?.title || item.productId}</strong>
                        {item.product?.slug ? <Link className="btn btn-outline" to={`/products/${item.product.slug}`}>{t('account.open', 'Open')}</Link> : null}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'notifications' && (
              <div className="account-stack">
                <div className="account-section-head">
                  <div>
                    <h3>{t('account.notifications', 'Notifications')}</h3>
                    <p className="muted">Review order, payment, and support updates.</p>
                  </div>
                </div>
                {notifications.length === 0 ? <p className="muted">{t('account.noNotifications', 'No notifications.')}</p> : (
                  <div className="account-list-grid">
                    {notifications.map((notification) => (
                      <article key={notification._id} className="account-panel">
                        <strong>{notification.title}</strong>
                        <p className="muted">{notification.body || ''}</p>
                        <p className="muted">{safeDate(notification.createdAt)}</p>
                        {!notification.isRead ? <button className="btn btn-outline" onClick={() => markNotificationRead(notification._id)}>{t('account.markRead', 'Mark Read')}</button> : null}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'announcements' && (
              <div className="account-stack">
                <div className="account-section-head">
                  <div>
                    <h3>{t('account.announcements', 'Announcements')}</h3>
                    <p className="muted">Catch platform-wide updates, notices, and announcements.</p>
                  </div>
                </div>
                {announcements.length === 0 ? <p className="muted">{t('account.noAnnouncements', 'No announcements.')}</p> : (
                  <div className="account-list-grid">
                    {announcements.map((announcement) => (
                      <article key={announcement.id} className="account-panel">
                        <strong>{announcement.title}</strong>
                        <p className="muted">{announcement.body || ''}</p>
                        <p className="muted">{safeDate(announcement.publishedAt)}</p>
                        {!announcement.isRead ? <button className="btn btn-outline" onClick={() => markAnnouncementRead(announcement.id)}>{t('account.markRead', 'Mark Read')}</button> : null}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      {selectedDispute && (
        <div className="order-modal-backdrop" onClick={() => setSelectedDispute(null)}>
          <div className="order-modal card refund-modal" onClick={(e) => e.stopPropagation()}>
            <div className="order-modal-head">
              <h3>{selectedDispute.disputeNumber}</h3>
              <button className="btn btn-outline" onClick={() => setSelectedDispute(null)}>Close</button>
            </div>
            <p><strong>Status:</strong> {selectedDispute.status.replace('_', ' ')}</p>
            <p><strong>Reason:</strong> {(selectedDispute.reason || 'other').replace('_', ' ')}</p>
            <p>{selectedDispute.description || selectedDispute.subject}</p>
            {disputeBusy && disputeMessages.length === 0 ? (
              <div className="account-panel">Loading dispute...</div>
            ) : (
              <div className="account-stack">
                {disputeMessages.map((message) => (
                  <div key={message._id} className="account-panel">
                    <div className="dispute-head">
                      <strong>{message.senderRole === 'customer' ? 'You' : message.senderRole === 'vendor' ? 'Vendor' : 'Admin'}</strong>
                      <span className="muted">{safeDate(message.createdAt)}</span>
                    </div>
                    <p>{message.message}</p>
                  </div>
                ))}
              </div>
            )}
            {selectedDispute.status !== 'closed' ? (
              <div className="account-stack" style={{ marginTop: '1rem' }}>
                <textarea
                  className="account-field"
                  value={disputeReply}
                  onChange={(e) => setDisputeReply(e.target.value)}
                  placeholder="Reply to this dispute..."
                  rows={4}
                />
                <div className="account-actions">
                  <button className="btn btn-primary" onClick={() => void sendDisputeReply()} disabled={disputeBusy || !disputeReply.trim()}>
                    {disputeBusy ? 'Sending...' : 'Send Reply'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
