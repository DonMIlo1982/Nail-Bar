export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
/** Monday first, the way the salon reads a week. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export interface DayHours { open: string; close: string; closed: boolean }

export interface Settings {
  business_name: string;
  address: string;
  phone: string;
  email: string;
  vat_registered: boolean;
  vat_no: string;
  receipt_footer: string;
  voucher_months: number;
  opening_hours: DayHours[];
}

export interface Technician {
  id: string;
  name: string;
  colour: string;
  comm_svc: number;
  comm_prod: number;
  active: boolean;
  sort: number;
}

export const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

export function R(n: number | string | null | undefined): string {
  const v = Number(n) || 0;
  const [a, b] = Math.abs(v).toFixed(2).split(".");
  return (v < 0 ? "-" : "") + "R" + a.replace(/\B(?=(\d{3})+(?!\d))/g, " ") + "." + b;
}
