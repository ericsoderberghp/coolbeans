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

export const humanDollars = (value?: number) =>
  value ? `$${Math.round(value).toLocaleString()}` : "";
