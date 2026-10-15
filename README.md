# Spoilt Brat POS

Point of sale for Spoilt Brat Nail Bar & Blowdry Bar, Bryanpark Shopping Centre, Bryanston.

This is a working prototype in a single file with no dependencies. Open `spoilt-brat-pos.html` in Chrome.

## What it does
- **Till:** separate bills per technician, drag-and-drop services and products, split payments, line and invoice discounts, 80mm thermal receipts.
- **Diary:** bookings per technician sized by service length, deposits, cancellations and no-shows, WhatsApp/email reminders.
- **Clients:** birthdays, allergies, POPIA marketing consent, duplicate warnings.
- **Gift vouchers:** unique codes with a built-in check character, pre-printed cards that only work once sold, free vouchers, and a register that shows each use against its invoice.
- **Stock & services:** cost and retail prices, stock levels, reorder flags.
- **Cash-up:** end-of-day takings by payment method, with cash and card over/short.
- **Reports:** turnover and commission per technician, sales by cashier, activity log.
- **Staff logins:** Owner, Manager and Cashier roles with per-person permissions, and manager PIN approval.

See [CHANGES.md](CHANGES.md) for details. `spoilt-brat-pos.original.html` is the first version, kept for reference.

## Data
All salon data (sales, clients, bookings) is stored in the browser on the computer that runs it, never in this repository. Download a backup daily from Settings. Backup files contain client details and staff PINs, so don't commit them here; `.gitignore` already excludes them.

## Next
Phase 2: a production system on a real backend (database, staff logins, online booking and payments). See the project handover notes.
