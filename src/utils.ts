import { useEffect } from 'react';

export const humanDate = (date?: string) => {
  if (!date) return undefined;
  const [year, month, day] = date.split("-");
  if (day === "01") {
    if (month === "01") {
      return year;
    }
    return `${month} ${year}`;
  }
  return date;
};

export const humanMoney = (value?: number, hideValues?: boolean, raw: boolean = false) => {
  if (value) {
    const trimmedValue = raw ? value : Math.round(value);
    if (hideValues) return '*'.repeat(`${trimmedValue}`.length);
    return `$${trimmedValue.toLocaleString()}`;
  }
  return '';
};

export const useCancelOnEsc = (onCancel: () => void) => {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };

    document.addEventListener('keypress', onKey);

    return () => document.removeEventListener('keypress', onKey);
  }, [onCancel]);
};
