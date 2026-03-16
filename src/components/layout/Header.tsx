import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
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
import { useI18n } from '../../i18n';
import './Header.css';

export const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [language, setLanguage] = useState<'en' | 'de' | 'tr'>(
    (localStorage.getItem('appLanguage') as 'en' | 'de' | 'tr') || 'en'
  );
  const [theme, setTheme] = useState<'dark' | 'light'>(
    (localStorage.getItem('appTheme') as 'dark' | 'light') || 'dark'
  );
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const { user, logout } = useAuthStore();
  const { t } = useI18n();
  const { itemCount, fetchCart } = useCartStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchCart();
    }
  }, [user, fetchCart]);

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      setIsMenuOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    setIsAccountMenuOpen(false);
    navigate('/');
  };

  const handleLanguageChange = (value: 'en' | 'de' | 'tr') => {
    setLanguage(value);
    localStorage.setItem('appLanguage', value);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <header className={`header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="container">
        <div className="header-content">
          <Link to="/" className="logo-wrapper" aria-label="Senel Express home">
            <img src="/my-logo.png" alt="Senel Express" className="logo-image" />
          </Link>

          <div className="header-center">
            <nav className="nav-desktop">
              <Link to="/categories" className="nav-link">{t('nav.categories', 'Categories')}</Link>
              <Link to="/suppliers" className="nav-link">{t('nav.suppliers', 'Suppliers')}</Link>
              <Link to="/products" className="nav-link">{t('nav.products', 'Products')}</Link>
              <Link to="/deals" className="nav-link">{t('nav.deals', 'Deals')}</Link>
              <div className="nav-more">
                <span className="nav-link nav-link-more">More</span>
                <div className="nav-more-menu">
                  <Link to="/pages/about" className="nav-more-item">About</Link>
                  <Link to="/pages/contact" className="nav-more-item">Contact</Link>
                  <Link to="/pages/faq" className="nav-more-item">FAQ</Link>
                  <Link to="/pages/help" className="nav-more-item">Help</Link>
                  <Link to="/pages/shipping" className="nav-more-item">Shipping</Link>
                  <Link to="/pages/returns" className="nav-more-item">Returns</Link>
                  <Link to="/pages/terms" className="nav-more-item">Terms</Link>
                  <Link to="/pages/privacy" className="nav-more-item">Privacy</Link>
                </div>
              </div>
            </nav>
          </div>

          <div className="header-tools">
            <form
              onSubmit={handleSearch}
              className={`search-form ${isSearchFocused ? 'focused' : ''}`}
            >
              <div className="search-wrapper">
                <MagnifyingGlassIcon className="search-icon" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  className="search-input"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="search-clear"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                  >
                    <XMarkIcon className="icon-small" />
                  </button>
                )}
              </div>
            </form>

            <div className="actions">
              <button
                type="button"
                className="action-icon theme-toggle"
                aria-label="Toggle theme"
                onClick={toggleTheme}
              >
                {theme === 'dark' ? <SunIcon className="icon" /> : <MoonIcon className="icon" />}
              </button>

              <select
                className="lang-select"
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value as 'en' | 'de' | 'tr')}
                aria-label="Select language"
              >
                <option value="en">EN</option>
                <option value="de">DE</option>
                <option value="tr">TR</option>
              </select>

              <Link to="/wishlist" className="action-icon wishlist-icon" aria-label="Wishlist">
                <HeartIcon className="icon" />
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
                      My Account
                    </Link>

                    <Link
                      to="/orders"
                      className="dropdown-item"
                      onClick={() => setIsAccountMenuOpen(false)}
                    >
                      <ShoppingBagIcon className="icon-small" />
                      Orders
                    </Link>

                    <Link
                      to="/wishlist"
                      className="dropdown-item"
                      onClick={() => setIsAccountMenuOpen(false)}
                    >
                      <HeartIcon className="icon-small" />
                      Wishlist
                    </Link>

                    <div className="dropdown-divider"></div>

                    <button onClick={handleLogout} className="dropdown-item logout">
                      <span>Logout</span>
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
                aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
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
          <span className="mobile-menu-title">Menu</span>
          <button
            className="mobile-menu-close"
            onClick={() => setIsMenuOpen(false)}
            aria-label="Close mobile menu"
          >
            <XMarkIcon className="icon" />
          </button>
        </div>

        <nav className="mobile-nav-links">
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

          <Link to="/deals" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
            <span>{t('nav.deals', 'Deals')}</span>
            <span className="mobile-link-arrow">&rarr;</span>
          </Link>
          <Link to="/pages/about" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
            <span>About</span>
            <span className="mobile-link-arrow">&rarr;</span>
          </Link>
          <Link to="/pages/contact" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
            <span>Contact</span>
            <span className="mobile-link-arrow">&rarr;</span>
          </Link>
          <Link to="/pages/faq" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
            <span>FAQ</span>
            <span className="mobile-link-arrow">&rarr;</span>
          </Link>
          <Link to="/pages/help" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
            <span>Help</span>
            <span className="mobile-link-arrow">&rarr;</span>
          </Link>

          <div className="mobile-language">
            <span>Language</span>
            <select
              className="lang-select"
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value as 'en' | 'de' | 'tr')}
              aria-label="Select language"
            >
              <option value="en">English</option>
              <option value="de">German</option>
              <option value="tr">Turkish</option>
            </select>
          </div>

          <button type="button" className="mobile-nav-link" onClick={toggleTheme}>
            <span>{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
            <span className="mobile-link-arrow">{theme === 'dark' ? 'On' : 'Off'}</span>
          </button>

          {!user && (
            <Link to="/login" className="mobile-nav-link login" onClick={() => setIsMenuOpen(false)}>
              <span>Login / Register</span>
              <span className="mobile-link-arrow">&rarr;</span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};
