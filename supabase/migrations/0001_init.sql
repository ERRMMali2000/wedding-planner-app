-- =========================================================
-- Roshan & Priyanka Wedding Planner — Initial schema
-- Run this once in Supabase SQL Editor (or via `supabase db push`)
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------- PROFILES (extends auth.users) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'New Member',
  role text not null default 'family' check (role in ('admin','family','volunteer')),
  phone text,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'family')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- EVENTS ----------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_date date not null,
  theme text not null default 'default',
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- TASKS ----------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  name text not null,
  description text,
  category text,
  assignee uuid references public.profiles(id),
  priority text not null default 'Medium' check (priority in ('Critical','High','Medium','Low')),
  status text not null default 'Not Started'
    check (status in ('Not Started','In Progress','Waiting','Blocked','Completed','Cancelled')),
  due_date date,
  completion_pct int not null default 0 check (completion_pct between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_checklist_items (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete cascade,
  label text not null,
  done boolean not null default false,
  position int not null default 0
);

create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete cascade,
  author_id uuid references public.profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

-- ---------- SHOPPING ----------
create table if not exists public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  name text not null,
  category text not null,
  qty int not null default 1,
  budget numeric(12,2) not null default 0,
  actual numeric(12,2) not null default 0,
  store text,
  purchased boolean not null default false,
  assignee uuid references public.profiles(id),
  receipt_url text,
  created_at timestamptz not null default now()
);

-- ---------- BUDGET ----------
create table if not exists public.budget_expenses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  category text not null,
  item text not null,
  budgeted numeric(12,2) not null default 0,
  actual numeric(12,2) not null default 0,
  vendor text,
  paid boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- GUESTS ----------
create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  side text not null check (side in ('Bride','Groom')),
  group_name text not null default 'Friends' check (group_name in ('Family','Friends','VIP')),
  rsvp text not null default 'Pending' check (rsvp in ('Pending','Confirmed','Declined')),
  invited boolean not null default false,
  food_pref text not null default 'Veg' check (food_pref in ('Veg','Non-Veg','Vegan')),
  phone text,
  created_at timestamptz not null default now()
);

-- ---------- VENDORS (general contact list) ----------
create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  phone text,
  advance numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  rating int not null default 0 check (rating between 0 and 5),
  notes text,
  created_at timestamptz not null default now()
);

-- ---------- BOOKINGS (critical booking tracker) ----------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  vendor_name text,
  category text not null,
  event_id uuid references public.events(id) on delete set null,
  status text not null default 'Not Booked'
    check (status in ('Not Booked','Enquired','Negotiating','Booked','Confirmed','Cancelled')),
  booking_date date,
  contract_signed boolean not null default false,
  advance_paid numeric(12,2) not null default 0,
  balance_due numeric(12,2) not null default 0,
  final_payment_due date,
  contact_person text,
  phone text,
  trial_date date,
  fitting_dates text,
  notes text,
  contract_url text,
  created_at timestamptz not null default now()
);

-- ---------- ACTIVITY LOG ----------
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity text not null,
  entity_id uuid,
  created_at timestamptz not null default now()
);

-- ---------- Indexes ----------
create index if not exists idx_tasks_event on public.tasks(event_id);
create index if not exists idx_tasks_assignee on public.tasks(assignee);
create index if not exists idx_shopping_event on public.shopping_items(event_id);
create index if not exists idx_budget_event on public.budget_expenses(event_id);
create index if not exists idx_bookings_event on public.bookings(event_id);

-- ---------- updated_at trigger for tasks ----------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_tasks_updated_at on public.tasks;
create trigger trg_tasks_updated_at
  before update on public.tasks
  for each row execute procedure public.set_updated_at();

-- ---------- Convenience view: per-event progress ----------
create or replace view public.event_progress as
select
  e.id as event_id,
  e.name,
  count(t.id) as total_tasks,
  count(t.id) filter (where t.status = 'Completed') as completed_tasks,
  case when count(t.id) = 0 then 0
       else round(100.0 * count(t.id) filter (where t.status = 'Completed') / count(t.id))
  end as pct_complete
from public.events e
left join public.tasks t on t.event_id = e.id
group by e.id, e.name;

-- =========================================================
-- ROW LEVEL SECURITY
-- Rule: everyone signed in can VIEW all planner data (it's a
-- shared family planner). Only the Admin can create/delete
-- most records. For tasks specifically, a Family/Volunteer
-- member may update ONLY the tasks assigned to them; Admin can
-- update/delete/assign any task.
-- =========================================================

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.tasks enable row level security;
alter table public.task_checklist_items enable row level security;
alter table public.task_comments enable row level security;
alter table public.shopping_items enable row level security;
alter table public.budget_expenses enable row level security;
alter table public.guests enable row level security;
alter table public.vendors enable row level security;
alter table public.bookings enable row level security;
alter table public.activity_log enable row level security;

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql stable security definer;

-- PROFILES
create policy "profiles_select_all" on public.profiles for select using (auth.uid() is not null);
create policy "profiles_update_own_or_admin" on public.profiles for update
  using (auth.uid() = id or public.is_admin());

-- EVENTS (admin manages, everyone reads)
create policy "events_select_all" on public.events for select using (auth.uid() is not null);
create policy "events_write_admin" on public.events for insert with check (public.is_admin());
create policy "events_update_admin" on public.events for update using (public.is_admin());
create policy "events_delete_admin" on public.events for delete using (public.is_admin());

-- TASKS (everyone reads; admin full write; member can update only their own assigned task)
create policy "tasks_select_all" on public.tasks for select using (auth.uid() is not null);
create policy "tasks_insert_admin" on public.tasks for insert with check (public.is_admin());
create policy "tasks_delete_admin" on public.tasks for delete using (public.is_admin());
create policy "tasks_update_admin_or_assignee" on public.tasks for update
  using (public.is_admin() or assignee = auth.uid())
  with check (public.is_admin() or assignee = auth.uid());

-- CHECKLIST ITEMS / COMMENTS (tied to task permissions)
create policy "checklist_select_all" on public.task_checklist_items for select using (auth.uid() is not null);
create policy "checklist_write_admin_or_owner" on public.task_checklist_items for all
  using (public.is_admin() or exists (
    select 1 from public.tasks t where t.id = task_id and t.assignee = auth.uid()
  ));

create policy "comments_select_all" on public.task_comments for select using (auth.uid() is not null);
create policy "comments_insert_any_member" on public.task_comments for insert
  with check (auth.uid() is not null);

-- SHOPPING / BUDGET / GUESTS / VENDORS / BOOKINGS
-- everyone reads, only admin writes (matches "Admin has full access")
create policy "shopping_select_all" on public.shopping_items for select using (auth.uid() is not null);
create policy "shopping_write_admin" on public.shopping_items for all using (public.is_admin()) with check (public.is_admin());

create policy "budget_select_all" on public.budget_expenses for select using (auth.uid() is not null);
create policy "budget_write_admin" on public.budget_expenses for all using (public.is_admin()) with check (public.is_admin());

create policy "guests_select_all" on public.guests for select using (auth.uid() is not null);
create policy "guests_write_admin" on public.guests for all using (public.is_admin()) with check (public.is_admin());

create policy "vendors_select_all" on public.vendors for select using (auth.uid() is not null);
create policy "vendors_write_admin" on public.vendors for all using (public.is_admin()) with check (public.is_admin());

create policy "bookings_select_all" on public.bookings for select using (auth.uid() is not null);
create policy "bookings_write_admin" on public.bookings for all using (public.is_admin()) with check (public.is_admin());

create policy "activity_select_all" on public.activity_log for select using (auth.uid() is not null);
create policy "activity_insert_any" on public.activity_log for insert with check (auth.uid() is not null);

-- ---------- Realtime ----------
-- Enable realtime broadcast on the tables the dashboard subscribes to
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.shopping_items;
alter publication supabase_realtime add table public.budget_expenses;
alter publication supabase_realtime add table public.guests;
alter publication supabase_realtime add table public.bookings;
