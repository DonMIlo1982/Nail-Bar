# Spoilt Brat staff dashboard

The online version of the Spoilt Brat POS: staff logins and a shared client database, built with Next.js and Supabase, hosted on Vercel. It replaces the single-file POS (`../spoilt-brat-pos.html`) one part at a time.

## Stage 1 (this version)
- **Staff logins** (email and password) with the same roles and permissions as the POS: owner, manager and cashier. The first person to sign up becomes the owner. Anyone added later stays switched off until the owner turns them on under **Staff**.
- **Client database:**
  - search by name, cellphone or email
  - add, edit and delete clients
  - warnings for likely duplicates
  - birthdays, allergies, notes, preferred technician and POPIA marketing consent (with date and source)
  - birthday list with WhatsApp wishes
  - CSV export, for staff with the export permission
- **Import** of a POS backup: technicians, services and products, and clients. Records are matched on their POS id, so importing again updates them instead of creating duplicates.
- **Activity log** of logins, client changes, exports, imports and staff changes.
- Database security rules: every table is limited to active staff with the right permission (see `supabase/migrations`).

## Stage 2
- **Settings:** receipt details, VAT, gift voucher validity, opening hours, and technicians (colour, commission, order, still working here).
- **Stock & services:** services (length, material cost, price, margin) and retail products (cost, retail, margin, stock on hand, reorder level, value at cost).
- **Stock changes:** deliveries, write-offs and stock counts. Each one is recorded with who made it, and stock can't go below zero.
- **Cost prices** are readable only by staff with the stock permission, enforced in the database.

## Setting up
1. In Supabase, open **SQL Editor** and run each file in `supabase/migrations` in order (0001, 0002, ...), once each.
2. In Supabase, open **Authentication → Sign In / Providers** and switch off **Allow new users to sign up**, so only the owner can add logins.
3. Copy `.env.local.example` to `.env.local` and fill in the project URL and the anon (publishable) key from Supabase (**Project Settings → API**).
4. Run `npm install`, then `npm run dev`, and open http://localhost:3000.
5. Create the owner login: in Supabase, open **Authentication → Users → Add user**. The first user becomes the owner.

## Deploying on Vercel
Import the GitHub repository and set **Root Directory** to `app`. Add the two `NEXT_PUBLIC_SUPABASE_*` values as environment variables. Then add the domain `app.spoiltbrat.co.za` under **Domains**.
