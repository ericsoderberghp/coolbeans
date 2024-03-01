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

export const humanMoney = (value?: number, hideValues?: boolean) => {
  if (value) {
    if (hideValues) return '*****';
    return `$${Math.round(value).toLocaleString()}`
  }
  return '';
};
