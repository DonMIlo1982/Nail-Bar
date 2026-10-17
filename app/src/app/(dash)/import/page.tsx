import { requirePerm } from "@/lib/auth";
import { ImportForm } from "./ImportForm";

export default async function ImportPage() {
  await requirePerm("settings");
  return (
    <main className="page narrow">
      <div className="head"><h1>Bring data over from the POS</h1></div>
      <div className="panel small" style={{ marginBottom: 16 }}>
        <ol style={{ margin: 0, paddingLeft: 18 }}>
          <li>On the salon computer, open the POS in Chrome and go to <b>Settings → Download backup</b>.</li>
          <li>Choose that file below. Nothing is saved until you press <b>Import</b>.</li>
        </ol>
        <p className="muted" style={{ marginBottom: 0 }}>
          This brings across technicians, services and products, and all clients with their birthdays, allergies, notes and marketing consent.
          Importing the same backup again updates those records instead of adding them twice. Sales, bookings and vouchers come across when those parts move online.
        </p>
      </div>
      <ImportForm />
    </main>
  );
}
