import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BellIcon,
  MagnifyingGlassIcon,
  ShoppingBagIcon,
  UserIcon,
  XMarkIcon,
  HeartIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { setAppLanguage, useI18n } from '../../i18n';
import { useTranslatedData } from '../../hooks/useTranslatedData';
import api from '../../api/client';
import { hasNotificationAlertBeenSeen, markNotificationAlertSeen } from '../../utils/notificationAlertStore';
import './Header.css';

interface SearchSuggestion {
  _id: string;
  slug: string;
  title: string;
}

export const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  // Translate the product titles returned by the search-suggestions
  // endpoint client-side. Search-as-you-type does NOT change the queryKey,
  // so React Query would otherwise return stale titles after a language
  // switch. The hook picks up `lang` changes automatically.
  const translatedSuggestions = useTranslatedData(suggestions) ?? suggestions;
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(
    (localStorage.getItem('appTheme') as 'dark' | 'light') || 'light'
  );
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const { user, logout } = useAuthStore();
  const { t, lang } = useI18n();
  const { itemCount, fetchCart } = useCartStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchCart();
    }
  }, [user, fetchCart]);

  // Unread personal-notification count for the bell-icon badge. Uses the
  // existing /notifications/me endpoint with unreadOnly=true + limit=1 so we
  // only read the `total` counter (no backend change required). Polled every
  // 30s so the badge updates as soon as a new notification arrives.
  const [unreadCount, setUnreadCount] = useState(0);
  useEffect(() => {
    if (!user) { setUnreadCount(0); return; }
    let alive = true;
    const fetchUnread = async () => {
      try {
        const response = await api.get('/notifications/me', {
          params: { unreadOnly: 'true', limit: 1 },
        });
        if (alive) setUnreadCount(Number(response.data?.total || 0));
      } catch {
        /* swallow -- silent badge failure */
      }
    };
    void fetchUnread();
    const id = window.setInterval(fetchUnread, 30000);
    return () => { alive = false; window.clearInterval(id); };
  }, [user]);

  // Global notification popup: whenever the user is signed in (on ANY page),
  // poll the latest unread notifications and surface any brand-new ones as
  // a toast-style alert in the top-right corner. Polled every 10s so the popup
  // surfaces promptly after a new notification arrives.
  const [alertItem, setAlertItem] = useState<any | null>(null);
  const alertAutoCloseRef = useRef<number | null>(null);
  useEffect(() => {
    if (!user) {
      setAlertItem(null);
      return;
    }
    let alive = true;
    const fetchLatest = async () => {
      try {
        const response = await api.get('/notifications/me', {
          params: { unreadOnly: 'true', limit: 5 },
        });
        const items: any[] = Array.isArray(response.data?.items)
          ? response.data.items
          : [];
        if (!alive) return;
        // Surface the first notification that has not been alerted yet.
        // IDs are tracked in a shared session-storage store so the
        // notifications-page popup and this global popup never duplicate.
        const brandNew = items.find(
          (n) => n && n._id && !hasNotificationAlertBeenSeen(n._id)
        );
        if (brandNew) {
          markNotificationAlertSeen(brandNew._id);
          setAlertItem(brandNew);
        }
      } catch {
        /* swallow -- silent popup failure */
      }
    };
    void fetchLatest();
    const id = window.setInterval(fetchLatest, 10000);
    return () => { alive = false; window.clearInterval(id); };
  }, [user]);

  // Auto-dismiss the popup after 5 seconds.
  useEffect(() => {
    if (!alertItem) return;
    if (alertAutoCloseRef.current) window.clearTimeout(alertAutoCloseRef.current);
    alertAutoCloseRef.current = window.setTimeout(() => setAlertItem(null), 5000);
    return () => {
      if (alertAutoCloseRef.current) window.clearTimeout(alertAutoCloseRef.current);
    };
  }, [alertItem]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 24);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setIsAccountMenuOpen(false);
      }

      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsSearchFocused(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAccountMenuOpen(false);
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('appTheme', theme);
  }, [theme]);

  useEffect(() => {
    const query = searchQuery.trim();

    if (query.length < 2) {
      setSuggestions([]);
      setIsSuggestionsLoading(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        setIsSuggestionsLoading(true);
        const response = await api.get<{ items?: SearchSuggestion[] }>(
          `/shop/products?q=${encodeURIComponent(query)}&limit=6`
        );
        setSuggestions(Array.isArray(response.data.items) ? response.data.items : []);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSuggestionsLoading(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchQuery]);

  const showSuggestions = isSearchFocused && (searchQuery.trim().length >= 2 || translatedSuggestions.length > 0);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      setSuggestions([]);
      setIsSearchFocused(false);
      setIsMenuOpen(false);
    }
  };

  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    navigate(`/products/${suggestion.slug}`);
    setSearchQuery('');
    setSuggestions([]);
    setIsSearchFocused(false);
    setIsMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    setIsAccountMenuOpen(false);
    navigate('/');
  };

  const handleLanguageChange = (value: 'en' | 'de' | 'tr') => {
    setAppLanguage(value);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <header className={`header ${isScrolled ? 'scrolled' : ''}`}>
      {/* Global notification popup alert (top-right, auto-dismisses after 5s).
          Rendered here so it appears regardless of which page the user is on. */}
      {alertItem ? (
        <div
          role="alertdialog"
          aria-live="assertive"
          style={{
            position: 'fixed',
            top: 80,
            right: 20,
            zIndex: 1300,
            maxWidth: 360,
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderLeft: '4px solid #ef4444',
            borderRadius: 12,
            padding: '0.85rem 1rem',
            boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
            color: '#111827',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
          }}
        >
          <strong style={{ fontSize: '0.95rem' }}>{alertItem.title}</strong>
          {alertItem.body ? (
            <span style={{ fontSize: '0.85rem', color: '#6b7280', lineHeight: 1.4 }}>
              {alertItem.body}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => setAlertItem(null)}
            aria-label="Dismiss"
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 22,
              height: 22,
              borderRadius: 11,
              border: 'none',
              background: 'transparent',
              color: '#6b7280',
              cursor: 'pointer',
              fontSize: '0.9rem',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      ) : null}
      <div className="container">
        <div className="header-content">
          <Link to="/" className="logo-wrapper" aria-label="Senel Express home">
            <img src="/my-logo.png" alt="Senel Express" className="logo-image" />
          </Link>

          <div className="header-center">
            <nav className="nav-desktop">
              <Link to="/" className="nav-link">{t('nav.home', 'Home')}</Link>
              <Link to="/categories" className="nav-link">{t('nav.categories', 'Categories')}</Link>
              <Link to="/suppliers" className="nav-link">{t('nav.suppliers', 'Suppliers')}</Link>
              <Link to="/products" className="nav-link">{t('nav.products', 'Products')}</Link>
              <Link to="/hot-products" className="nav-link">{t('nav.deals', 'Hot Products')}</Link>
              <div
                className={`nav-more ${isMoreDropdownOpen ? 'open' : ''}`}
                onMouseEnter={() => setIsMoreDropdownOpen(true)}
                onMouseLeave={() => setIsMoreDropdownOpen(false)}
              >
                <span className="nav-link nav-link-more">{t('nav.more', 'More')}</span>
                <div className="nav-more-menu">
                  <Link to="/blog" className="nav-more-item">{t('blog.title', 'Blog')}</Link>
                  <Link to="/pages/about" className="nav-more-item">{t('cms.about', 'About')}</Link>
                  <Link to="/pages/contact" className="nav-more-item">{t('cms.contact', 'Contact')}</Link>
                  <Link to="/pages/faq" className="nav-more-item">{t('cms.faq', 'FAQ')}</Link>
                  <Link to="/pages/help" className="nav-more-item">{t('cms.help', 'Help')}</Link>
                  <Link to="/pages/shipping" className="nav-more-item">{t('cms.shipping', 'Shipping')}</Link>
                  <Link to="/pages/returns" className="nav-more-item">{t('cms.returns', 'Returns')}</Link>
                  <Link to="/pages/terms" className="nav-more-item">{t('cms.terms', 'Terms')}</Link>
                  <Link to="/pages/privacy" className="nav-more-item">{t('cms.privacy', 'Privacy')}</Link>
                </div>
              </div>
            </nav>
          </div>

          <div className="header-tools">
            <form
              onSubmit={handleSearch}
              className={`search-form ${isSearchFocused ? 'focused' : ''}`}
            >
              <div className="search-wrapper" ref={searchRef}>
                <MagnifyingGlassIcon className="search-icon" />
                <input
                  type="text"
                  placeholder={t('search.placeholder', 'Search products...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  className="search-input"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={() => {
                      setSearchQuery('');
                      setSuggestions([]);
                    }}
                    aria-label={t('search.clear', 'Clear search')}
                  >
                    <XMarkIcon className="icon-small" />
                  </button>
                )}

                {showSuggestions && (
                  <div className="search-suggestions">
                    {isSuggestionsLoading ? (
                      <div className="search-suggestion-empty">{t('search.loading', 'Searching products...')}</div>
                    ) : translatedSuggestions.length > 0 ? (
                      translatedSuggestions.map((suggestion) => (
                        <button
                          key={suggestion._id}
                          type="button"
                          className="search-suggestion-item"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            handleSuggestionSelect(suggestion);
                          }}
                        >
                          <MagnifyingGlassIcon className="icon-small" />
                          <span>{suggestion.title}</span>
                        </button>
                      ))
                    ) : searchQuery.trim().length >= 2 ? (
                      <div className="search-suggestion-empty">{t('search.noMatches', 'No matching products found.')}</div>
                    ) : null}
                  </div>
                )}
              </div>
            </form>

            <div className="actions">
              <button
                type="button"
                className="action-icon theme-toggle"
                aria-label={t('theme.toggle', 'Toggle theme')}
                onClick={toggleTheme}
              >
                {theme === 'dark' ? <SunIcon className="icon" /> : <MoonIcon className="icon" />}
              </button>

              <select
                className="lang-select"
                value={lang}
                onChange={(e) => handleLanguageChange(e.target.value as 'en' | 'de' | 'tr')}
                aria-label={t('search.aria', 'Select language')}
              >
                <option value="en">EN</option>
                <option value="de">DE</option>
                <option value="tr">TR</option>
              </select>

              <Link to="/wishlist" className="action-icon wishlist-icon" aria-label="Wishlist">
                <HeartIcon className="icon" />
              </Link>

              <Link
                to={user ? '/account?tab=notifications' : '/login'}
                className="action-icon notification-icon"
                aria-label="Notifications"
              >
                <BellIcon className="icon" />
                {unreadCount > 0 ? (
                  <span className="cart-badge" aria-label={`${unreadCount} unread`}>
                    <span className="badge-text">{unreadCount > 99 ? '99+' : unreadCount}</span>
                  </span>
                ) : null}
              </Link>

              <Link to="/cart" className="action-icon cart-icon" aria-label="Cart">
                <div className="cart-wrapper">
                  <ShoppingBagIcon className="icon" />
                  {itemCount > 0 && (
                    <span className="cart-badge">
                      <span className="badge-text">{itemCount}</span>
                    </span>
                  )}
                </div>
              </Link>

              {user ? (
                <div className="user-menu" ref={accountMenuRef}>
                  <button
                    className="action-icon user-button"
                    onClick={() => setIsAccountMenuOpen((prev) => !prev)}
                    aria-haspopup="menu"
                    aria-expanded={isAccountMenuOpen}
                    aria-label="Toggle account menu"
                  >
                    <UserIcon className="icon" />
                  </button>

                <div className={`user-dropdown ${isAccountMenuOpen ? 'open' : ''}`}>
                    <div className="dropdown-header">
                      <span className="user-email">{user.email}</span>
                    </div>

                    <Link
                      to="/account"
                      className="dropdown-item"
                      onClick={() => setIsAccountMenuOpen(false)}
                    >
                      <UserIcon className="icon-small" />
                      {t('account.title', 'My Account')}
                    </Link>

                    <Link
                      to="/orders"
                      className="dropdown-item"
                      onClick={() => setIsAccountMenuOpen(false)}
                    >
                      <ShoppingBagIcon className="icon-small" />
                      {t('account.ordersLink', 'Orders')}
                    </Link>

                    <Link
                      to="/wishlist"
                      className="dropdown-item"
                      onClick={() => setIsAccountMenuOpen(false)}
                    >
                      <HeartIcon className="icon-small" />
                      {t('wishlist.title', 'Wishlist')}
                    </Link>

                    <div className="dropdown-divider"></div>

                    <button onClick={handleLogout} className="dropdown-item logout">
                      <span>{t('account.logout', 'Logout')}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <Link to="/login" className="btn btn-primary btn-small login-btn">
                  <UserIcon className="icon-small" />
                  <span>{t('auth.login', 'Login')}</span>
                </Link>
              )}

              <button
                className={`mobile-menu-button ${isMenuOpen ? 'active' : ''}`}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label={isMenuOpen ? t('menu.close', 'Close menu') : t('menu.open', 'Open menu')}
              >
                <span className="hamburger-line"></span>
                <span className="hamburger-line"></span>
                <span className="hamburger-line"></span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`mobile-overlay ${isMenuOpen ? 'open' : ''}`}
        onClick={() => setIsMenuOpen(false)}
      ></div>

      <div className={`nav-mobile ${isMenuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-header">
          <span className="mobile-menu-title">{t('menu.title', 'Menu')}</span>
          <button
            className="mobile-menu-close"
            onClick={() => setIsMenuOpen(false)}
            aria-label={t('menu.close', 'Close mobile menu')}
          >
            <XMarkIcon className="icon" />
          </button>
        </div>

        <nav className="mobile-nav-links">
          <Link to="/" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
            <span>{t('nav.home', 'Home')}</span>
            <span className="mobile-link-arrow">&rarr;</span>
          </Link>

          <Link to="/categories" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
            <span>{t('nav.categories', 'Categories')}</span>
            <span className="mobile-link-arrow">&rarr;</span>
          </Link>

          <Link to="/suppliers" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
            <span>{t('nav.suppliers', 'Suppliers')}</span>
            <span className="mobile-link-arrow">&rarr;</span>
          </Link>

          <Link to="/products" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
            <span>{t('nav.products', 'Products')}</span>
            <span className="mobile-link-arrow">&rarr;</span>
          </Link>

          <Link to="/hot-products" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
            <span>{t('nav.deals', 'Hot Products')}</span>
            <span className="mobile-link-arrow">&rarr;</span>
          </Link>
          <Link
            to={user ? '/account?tab=notifications' : '/login'}
            className="mobile-nav-link"
            onClick={() => setIsMenuOpen(false)}
          >
            <span>{t('account.notifications', 'Notifications')}</span>
            <span className="mobile-link-arrow">&rarr;</span>
          </Link>
          <Link to="/blog" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
            <span>{t('blog.title', 'Blog')}</span>
            <span className="mobile-link-arrow">&rarr;</span>
          </Link>
          <Link to="/pages/about" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
            <span>{t('cms.about', 'About')}</span>
            <span className="mobile-link-arrow">&rarr;</span>
          </Link>
          <Link to="/pages/contact" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
            <span>{t('cms.contact', 'Contact')}</span>
            <span className="mobile-link-arrow">&rarr;</span>
          </Link>
          <Link to="/pages/faq" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
            <span>{t('cms.faq', 'FAQ')}</span>
            <span className="mobile-link-arrow">&rarr;</span>
          </Link>
          <Link to="/pages/help" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
            <span>{t('cms.help', 'Help')}</span>
            <span className="mobile-link-arrow">&rarr;</span>
          </Link>

          <div className="mobile-language">
            <span>{t('menu.language', 'Language')}</span>
            <select
              className="lang-select"
              value={lang}
              onChange={(e) => handleLanguageChange(e.target.value as 'en' | 'de' | 'tr')}
              aria-label={t('search.aria', 'Select language')}
            >
              <option value="en">English</option>
              <option value="de">German</option>
              <option value="tr">Turkish</option>
            </select>
          </div>

          <button type="button" className="mobile-nav-link" onClick={toggleTheme}>
            <span>{theme === 'dark' ? t('theme.light', 'Light Theme') : t('theme.dark', 'Dark Theme')}</span>
            <span className="mobile-link-arrow">{theme === 'dark' ? t('theme.on', 'On') : t('theme.off', 'Off')}</span>
          </button>

          {!user && (
            <Link to="/login" className="mobile-nav-link login" onClick={() => setIsMenuOpen(false)}>
              <span>{t('auth.loginRegister', 'Login / Register')}</span>
              <span className="mobile-link-arrow">&rarr;</span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};
