# Spoilt Brat POS: changes, 15 October 2026

Changes to `spoilt-brat-pos.html`. The version before these changes is kept as `spoilt-brat-pos.original.html`.

## Data safety
- **Saves in the browser.** When the file is opened from disk in Chrome, data is now kept in the browser's local storage, so it survives closing the tab. It stays on that one computer and Chrome profile only.
- **Backup reminder.** If there are sales since the last backup and the last backup is more than 20 hours old, the header shows "No backup yet / Last backup …" with a **Download backup** button.
- Older data and backups are upgraded automatically when they are loaded or restored.

## Till
- **Edit** button on each invoice line: change the price, quantity, or give a line discount in rand or %, with a reason that prints on the receipt.
- **Split payment.** Tap more than one payment method. The amounts can be edited, and the invoice shows "Still to pay" or "Change to give". Only cash can be overpaid.
- **Gift vouchers.** Use **Sell gift voucher** to add one to the invoice. When the sale is completed, a code (e.g. `SB-2GN4-XABY`) is created and printed on the receipt. To redeem it, choose **Voucher** as the payment method and type the code. Partial use is allowed.
- Look up a client by **name or cellphone**. The client card shows how many no-shows they have.

## Diary
- **More than one service per booking.** The length is the total of the services chosen.
- **Deposit paid (R)** field. When the booking is sent to the till, the deposit is added as a payment.
- **Cancel booking** and **No-show** replace Delete. Both free the time slot and stay listed under the diary and in the client's history. Use **Restore** if a booking was cancelled by mistake.
- **Warnings instead of silent changes:** booking a technician who is off, booking outside opening hours or on a closed day, and a cellphone number that belongs to an existing client (the booking is then saved under that client's name).
- **Opening hours** per day: the diary greys out the closed hours.
- **Reminders** button: WhatsApp or email reminders for the bookings on the day shown, with a "reminded" timestamp.

## Clients
- When a client is saved, there is a warning for possible duplicates (same cellphone, same email, or a similar name such as "Thandi" / "Thandi M" / "Thandi Mokoena"), with a **Go back** option.
- Consent source (till or client form) is recorded with the consent date.

## Roster (new tab)
- **Week grid:** every technician by day, showing **Working**, **Day off**, the type of leave, or **Salon closed**, with the number of bookings. Use ‹ › or the date box to move between weeks.
- **Usual working days:** untick each technician's regular days off. Days the salon is closed (Settings → Opening hours) are off for everyone.
- **Leave and time away:**
  - Types: annual leave, sick leave, family responsibility, study or training, unpaid leave, and other time away.
  - Each entry has a first and last day and a note, and can be edited or deleted. Leave is in whole days.
  - You're warned if the technician has bookings during the leave, and two leave entries for the same technician can't overlap.
- **Changing a single day:** tap any day in the grid to set **Working this day** or **Off this day**, or go back to the usual roster. This is how you bring in a technician who is normally off or on leave. Days changed this way have a pink outline.
- **Roster in the diary:** with **The diary follows this roster** ticked (the default), each diary day only shows the technicians working that day.
  - A **Not working** strip lists the others with the reason. **Add to today** brings one in for that day, after a confirmation if they're on leave.
  - The diary's **Who's working** button also changes that day only.
  - Untick the option to show all technicians in the diary again.
- Booking a technician who isn't rostered warns you first, then adds them as working that day.
- A new **Roster** permission controls who can change the roster. Managers have it; cashiers can view the roster but need a manager's PIN to change it. All roster changes go in the activity log.

## Cash-up (new tab)
- **Opening float carries over.** At the cash-up, enter the cash **taken out of the till** (banked or put in the safe). What's left becomes the **opening float of the next cash-up**, filled in automatically with a "Brought forward" note. It can still be changed by hand. If an earlier cash-up is changed afterwards, the later day shows a warning that the amounts no longer match.
- The cash-up history shows the opening float, the cash taken out and the cash left in the till for each day.
- The day's takings by payment method, gift vouchers sold, discounts and voids.
- **Money paid back on the day is taken off.** This covers voucher refunds, and sales from an earlier day that are voided today. The earlier day's figures stay as they were when it was cashed up. A sale rung up and voided on the same day isn't counted at all.
- Enter the opening float, the cash counted and the card machine total. The tab shows whether cash and card are over or short.
- **Save cash-up** keeps a history. **Print slip** prints an 80mm Z-slip with signature lines.

## Reports
- **Void / refund** on any sale. A reason is required, the invoice number is kept and marked voided, products go back into stock, and voucher balances are corrected. An invoice can't be voided if a voucher sold on it has already been used.
- Turnover excludes voided invoices and gift vouchers sold (vouchers count as turnover when they are spent).
- **Commission** column per technician, with separate % rates for services and products set in Settings, and included in the CSV export.
- New tables: money received by payment method, and open gift vouchers (the amount owed to clients).

## Staff logins (Settings → Staff logins)
*These replace the single owner PIN. If a PIN was already set, it becomes a login called "Owner".*
- **Logins are switched on by adding the first login, which is always the owner.** From then on, everyone signs in with their own 4–8 digit PIN on a keypad screen. Two people can't share a PIN.
- **Roles:**
  - **Owner:** everything.
  - **Manager:** everything except Settings.
  - **Cashier:** till, diary, client list, cash-up, and cancelling bookings.
- The ticks for each person can be changed individually. Cashiers do **not** get Stock & services, Reports or Settings, and those tabs are hidden from them.
- **Approval with a PIN.** If someone tries something they aren't allowed to do, such as giving a discount, changing a price, voiding a sale or issuing a free voucher, a manager or owner can type their PIN to approve that one action. Both names are recorded.
- Staff are logged out automatically after 15 minutes of no use. The time can be changed in Settings. Tap your name at the top right to log out or switch user.
- **What each record shows:**
  - **Sale:** who served it (also printed on the receipt as "Served by").
  - **Invoice discount:** who gave or approved it.
  - **Void:** who voided it and who approved it.
  - **Booking:** who made it, who changed it, and who cancelled it or marked it a no-show.
  - **Cash-up:** who did it.
  - **Vouchers:** who sold, issued and cancelled them.
- **Reports → Sales by cashier:** invoices, takings, discounts given and voids for each person.
- **Reports → Activity log:** sales, voids, cleared slips, removed bills, approvals, booking changes, stock and price changes, new and deleted clients, voucher actions, logins and settings changes. It can be filtered by person, searched and exported.
- **Today's sales** button on the till: reprint a receipt, or void a sale (with approval if needed), without opening Reports.
- This keeps staff out of areas they shouldn't use and gives a record of who did what. It is not strong security: anyone holding a backup file can read the PINs in it.

## Separate technician bills on the till
- Each technician's work is a separate **bill**. When more than one technician has items, the invoice shows **Bills on this slip** chips. Tap a chip to put that bill on the slip or hold it back.
- The slip can hold one bill, several, or all of them (**Put all bills on the slip**). Each bill on the slip has **Hold** (keep it on the till for later) and **Remove** (take that technician's items off the till) buttons.
- A held bill shows **Waiting** on the technician's card. When the slip is paid or cleared, waiting bills stay on the till for the next slip.
- **Each bill remembers its client.** When a bill is put on the slip, its client fills in automatically. A booking sent to the till while another client is on the slip waits as its own bill, and its deposit stays with it.

## Gift vouchers (new Vouchers tab)
- **Unique codes.** Every code (SB-XXXX-XXXX) is checked against the whole register before it is issued, so it can never be duplicated. The last character is a check character, so most typing mistakes and swapped characters are caught ("Check for a typo").
- **Check a voucher.** Type or scan the client's code to see whether it is valid, its balance, who it is for, its expiry date, how it was sold or issued, and every invoice it was used on.
- **Strict checks at the till.** The Voucher payment accepts a code only if the register shows it was sold or issued and is still valid. It refuses codes that are unknown, never sold, fully used (showing the invoice it was used on), expired or cancelled. Each use is ticked off against the invoice and the cashier.
- **Three kinds of voucher:**
  - **Sold at the till:** with a new code, as before.
  - **Pre-printed cards:** created in batches and printed. A card is **not valid until it is sold**. At the till choose **Sell gift voucher → Pre-printed card** and type the code on the card. The register shows how many cards are still unsold, so the physical cards can be counted against it.
  - **Free (issued):** for prizes, birthday treats or complaints. A reason is required, and no money is taken. When spent, it shows as "Free voucher" in reports and the cash-up.
- **Register:** filter by Valid, Not sold, Used, Expired or Cancelled, and search by code, name or invoice. Shows the amount owed to clients, and can be exported to CSV.
- **Value and client name on pre-printed cards:**
  - When creating cards you can set a value for every card in the batch. A client's name can be added when creating a single card.
  - **Open** any unsold card in the register to type in or change its **Value** and **Made out to** name. Then **Save**, **Save and print** (the slip shows the amount and the name), or **Sell at the till**, which puts the card on the till ready for payment.
  - At the till, typing a card's code fills in its saved value and name.
- **Change value or name on a valid voucher.** Open the voucher and choose **Change value or name**. This needs voucher permission or a manager's PIN, plus a reason. The balance moves by the same amount, and the value can't go below what has already been spent. Each change is listed on the voucher and in the activity log. If a client pays to add value, ring the payment up at the till as well, so the money appears in the cash-up.
- **Refunding a voucher when it is cancelled.** When a sold voucher with money left on it is cancelled, the screen offers **Give the client their R… back** (ticked by default) and asks how the money is paid back (Cash, Card, EFT or Online). It suggests the method the voucher was bought with.
  - The refund comes off the cash-up for the day it is paid back. A voucher sold and refunded on the same day nets to zero, and the cash expected in the till goes down by the refund.
  - Refunds need the "Void or refund sales" permission, or a manager's PIN.
  - The voucher shows "Refunded R… by Cash" and can't be used again. Its sale can't also be voided, which would pay the client back twice.
  - Untick the box to cancel without paying back, for example for a lost card. The balance is then written off.
- **Print slips** (80mm) for vouchers and pre-printed cards. Vouchers can be cancelled with a reason, for example when a card is lost.
- **Expiry:** 36 months by default, which is the Consumer Protection Act minimum. It can be changed in Settings.

## Still not done
- Partial refunds (voiding refunds the whole invoice).
- Data still lives on one computer only. Moving to another computer is done with backup and restore.
- If every owner PIN is forgotten, the only way back in is to restore an older backup or clear the browser's site data.
- Vouchers can't be scanned as barcodes yet. Codes are typed in, although a barcode scanner that types like a keyboard will work if the codes are printed as barcodes elsewhere.
- **VAT on free vouchers:** when a free voucher is spent, it is a discount, not money received. Confirm with the accountant how VAT should be reported.
- **VAT on gift vouchers:** none is charged when a voucher is sold. VAT is included when the voucher is spent. Confirm this treatment with the accountant.
