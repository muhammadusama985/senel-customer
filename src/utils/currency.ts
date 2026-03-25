export type CurrencyCode = 'EUR' | 'USD' | 'TRY';

const SUPPORTED_CURRENCIES: CurrencyCode[] = ['EUR', 'USD', 'TRY'];

export const normalizeCurrency = (currency?: string | null): CurrencyCode => {
  const normalized = String(currency || '').toUpperCase() as CurrencyCode;
  return SUPPORTED_CURRENCIES.includes(normalized) ? normalized : 'EUR';
};

export const formatMoney = (amount: number, currency?: string | null): string => {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const normalizedCurrency = normalizeCurrency(currency);

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: normalizedCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeAmount);
};
