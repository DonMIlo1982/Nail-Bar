import { can, requirePerm } from "@/lib/auth";
import type { DayHours } from "@/lib/settings";
import { isDay, planStatus, todayZA, workStatus, type DayChange, type Leave, type RosterTech } from "@/lib/roster";
import { Diary, type Booking } from "./Diary";

export default async function DiaryPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const { supabase, staff } = await requirePerm();
  const { d } = await searchParams;
  const today = todayZA();
  const day = isDay(d) ? d : today;

  const [{ data: s }, { data: techs }, { data: leave }, { data: changes }, { data: bookings }, { data: services }, { data: clients }] = await Promise.all([
    supabase.from("settings").select("opening_hours,roster_in_diary,business_name").eq("id", 1).single<{ opening_hours: DayHours[]; roster_in_diary: boolean; business_name: string }>(),
    supabase.from("technicians").select("id,name,colour,active,usual_days").eq("active", true).order("sort").order("name"),
    supabase.from("roster_leave").select("*").lte("from_date", day).gte("to_date", day),
    supabase.from("roster_days").select("*").eq("day", day),
    supabase.from("bookings").select("*, booking_items(item_id,name,price,duration_min,position)").eq("day", day).order("start_time"),
    supabase.from("items").select("id,name,price,duration_min,category").eq("kind", "service").eq("active", true).order("category").order("name"),
    can(staff, "clients") ? supabase.from("clients").select("id,name,phone,email").order("name").limit(5000) : Promise.resolve({ data: [] }),
  ]);

  const hours = s?.opening_hours || [];
  const ctx = { leave: (leave || []) as Leave[], changes: (changes || []) as DayChange[], hours, follow: !!s?.roster_in_diary };
  const list = (techs || []) as RosterTech[];
  const status = Object.fromEntries(list.map((t) => [t.id, workStatus(t, day, ctx)]));
  // What the roster says without any single-day change, so "Who's working" can go back to it.
  const usual = Object.fromEntries(list.map((t) => [t.id, (ctx.follow ? planStatus(t, day, { ...ctx, changes: [] }) : { on: true, why: "Working" }).on]));

  return (
    <Diary
      day={day}
      today={today}
      techs={list}
      status={status}
      usual={usual}
      bookings={(bookings || []) as Booking[]}
      services={services || []}
      clients={(clients || []) as { id: string; name: string; phone: string; email: string }[]}
      hours={hours[new Date(day + "T00:00:00").getDay()] || { open: "08:00", close: "19:00", closed: false }}
      follow={ctx.follow}
      canRoster={can(staff, "roster")}
      canCancel={can(staff, "cancelBooking")}
      businessName={s?.business_name || "Spoilt Brat"}
    />
  );
}
