import React, { useState, useEffect, useRef } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useI18n } from '../../i18n';
import './SearchBar.css';

interface SearchBarProps {
  initialValue?: string;
  onSearch: (query: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  initialValue = '',
  onSearch,
  placeholder = 'Search products...',
  autoFocus = false,
}) => {
  const { t } = useI18n();
  const [query, setQuery] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const resolvedPlaceholder = placeholder === 'Search products...'
    ? t('search.placeholder', 'Search products...')
    : placeholder;

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <MagnifyingGlassIcon className="search-icon" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={resolvedPlaceholder}
        className="search-input"
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="clear-button"
          aria-label={t('search.clear', 'Clear search')}
        >
          <XMarkIcon className="clear-icon" />
        </button>
      )}
      <button type="submit" className="search-button">
        {t('common.search', 'Search')}
      </button>
    </form>
  );
};
