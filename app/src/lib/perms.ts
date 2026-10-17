export type Role = "owner" | "manager" | "cashier";

export interface Staff {
  id: string;
  name: string;
  email: string | null;
  role: Role;
  perms: string[];
  active: boolean;
}

/** The same permissions as the single-file POS, so roles carry over. */
export const PERMS: [string, string][] = [
  ["discount", "Give discounts and change prices at the till"],
  ["void", "Void or refund sales"],
  ["cancelBooking", "Cancel bookings and mark no-shows"],
  ["clients", "Open the client list"],
  ["clientExport", "Export the client list"],
  ["cashup", "Do the cash-up"],
  ["roster", "Roster: days off, leave and who works each day"],
  ["stock", "Stock and services: cost prices, deliveries, adding and editing"],
  ["vouchers", "Issue free vouchers, create voucher cards, cancel vouchers"],
  ["reports", "Reports, turnover and the activity log"],
  ["settings", "Settings and staff logins"],
];

export const ROLE_PERMS: Record<Role, string[]> = {
  owner: PERMS.map((p) => p[0]),
  manager: ["discount", "void", "cancelBooking", "clients", "clientExport", "cashup", "roster", "stock", "vouchers", "reports"],
  cashier: ["cancelBooking", "clients", "cashup"],
};

export const ROLE_LABEL: Record<Role, string> = { owner: "Owner", manager: "Manager", cashier: "Cashier" };

export function can(staff: Staff | null | undefined, perm: string): boolean {
  return !!staff && staff.active && (staff.role === "owner" || staff.perms.includes(perm));
}
