export type Profile = {
  id: string;
  full_name: string;
  role: "admin" | "family" | "volunteer";
  phone: string | null;
};

export type EventRow = {
  id: string;
  name: string;
  event_date: string;
  theme: string;
  archived: boolean;
};

export type TaskStatus =
  | "Not Started"
  | "In Progress"
  | "Waiting"
  | "Blocked"
  | "Completed"
  | "Cancelled";

export type TaskPriority = "Critical" | "High" | "Medium" | "Low";

export type Task = {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  category: string | null;
  assignee: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  completion_pct: number;
};

export const STATUSES: TaskStatus[] = [
  "Not Started",
  "In Progress",
  "Waiting",
  "Blocked",
  "Completed",
  "Cancelled",
];

export type ShoppingItem = {
  id: string;
  event_id: string | null;
  name: string;
  category: string;
  qty: number;
  budget: number;
  actual: number;
  store: string | null;
  purchased: boolean;
  assignee: string | null;
};

export const SHOP_CATEGORIES = [
  "Clothes", "Jewelry", "Decorations", "Flowers", "Food", "Return Gifts",
  "Wedding Cards", "Stage", "Lighting", "Other",
];

export type BudgetExpense = {
  id: string;
  event_id: string | null;
  category: string;
  item: string;
  budgeted: number;
  actual: number;
  vendor: string | null;
  paid: boolean;
};

export type Guest = {
  id: string;
  name: string;
  side: "Bride" | "Groom";
  group_name: "Family" | "Friends" | "VIP";
  rsvp: "Pending" | "Confirmed" | "Declined";
  invited: boolean;
  food_pref: "Veg" | "Non-Veg" | "Vegan";
  phone: string | null;
};

export type Vendor = {
  id: string;
  name: string;
  category: string;
  phone: string | null;
  advance: number;
  total: number;
  rating: number;
  notes: string | null;
};

export type BookingStatus =
  | "Not Booked"
  | "Enquired"
  | "Negotiating"
  | "Booked"
  | "Confirmed"
  | "Cancelled";

export type Booking = {
  id: string;
  vendor_name: string | null;
  category: string;
  event_id: string | null;
  status: BookingStatus;
  booking_date: string | null;
  contract_signed: boolean;
  advance_paid: number;
  balance_due: number;
  final_payment_due: string | null;
  contact_person: string | null;
  phone: string | null;
  trial_date: string | null;
  fitting_dates: string | null;
  notes: string | null;
};

export const BOOKING_STATUSES: BookingStatus[] = [
  "Not Booked", "Enquired", "Negotiating", "Booked", "Confirmed", "Cancelled",
];

export const BOOKING_CATEGORIES: { name: string; lead: number }[] = [
  { name: "Venue", lead: 270 },
  { name: "Food Catering", lead: 270 },
  { name: "Photographer", lead: 240 },
  { name: "Videographer", lead: 240 },
  { name: "Decoration", lead: 180 },
  { name: "Invitation Cards Printing", lead: 150 },
  { name: "DJ / Sound", lead: 150 },
  { name: "Lighting", lead: 150 },
  { name: "Jeweler", lead: 120 },
  { name: "Makeup Artist", lead: 120 },
  { name: "Wedding Clothes / Tailor", lead: 120 },
  { name: "Accommodation / Guest Hotel", lead: 120 },
  { name: "Mehendi Artist", lead: 90 },
  { name: "Others", lead: 90 },
  { name: "Transportation", lead: 60 },
  { name: "Flowers", lead: 60 },
];

export function leadFor(category: string) {
  return BOOKING_CATEGORIES.find((c) => c.name === category)?.lead ?? 90;
}
