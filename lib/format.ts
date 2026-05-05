export function formatMoney(amount: number, currency: string = "USD"): string {
  if (currency === "KHR") {
    return `${new Intl.NumberFormat("en-US").format(Math.round(amount))} ៛`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}
