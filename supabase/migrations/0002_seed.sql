-- =========================================================
-- Seed data — run AFTER 0001_init.sql
-- Uses fixed UUIDs for the 4 default events so tasks/shopping/
-- budget/bookings below can reference them directly.
-- =========================================================

insert into public.events (id, name, event_date, theme, archived) values
  ('11111111-1111-1111-1111-111111111111','Mehendi','2027-01-26','mehendi', false),
  ('22222222-2222-2222-2222-222222222222','Haldi','2027-01-27','haldi', false),
  ('33333333-3333-3333-3333-333333333333','Nikah','2027-01-29','nikah', false),
  ('44444444-4444-4444-4444-444444444444','Walima / Reception','2027-01-30','reception', false)
on conflict (id) do nothing;

-- Sample tasks (assignee left null — assign real people after they sign up,
-- since assignee must reference an existing profiles.id)
insert into public.tasks (event_id, name, category, priority, status, due_date) values
  ('33333333-3333-3333-3333-333333333333','Book Nikah venue hall','Venue','Critical','In Progress','2026-08-01'),
  ('11111111-1111-1111-1111-111111111111','Confirm mehendi artist','Beauty','High','Not Started','2026-11-15'),
  ('22222222-2222-2222-2222-222222222222','Order marigold flowers','Decor','Medium','Not Started','2027-01-10'),
  ('44444444-4444-4444-4444-444444444444','Finalise catering menu','Catering','Critical','Waiting','2026-09-20'),
  ('33333333-3333-3333-3333-333333333333','Send save-the-dates','Invitations','High','Completed','2026-06-01');

insert into public.shopping_items (event_id, name, category, qty, budget, actual, purchased) values
  ('33333333-3333-3333-3333-333333333333','Bridal lehenga','Clothes',1,120000,0,false),
  ('33333333-3333-3333-3333-333333333333','Groom sherwani','Clothes',1,60000,0,false),
  ('22222222-2222-2222-2222-222222222222','Marigold garlands','Flowers',50,8000,0,false),
  ('44444444-4444-4444-4444-444444444444','Return gift boxes','Return Gifts',300,45000,0,false);

insert into public.budget_expenses (event_id, category, item, budgeted, actual, vendor, paid) values
  ('33333333-3333-3333-3333-333333333333','Venue','Hall booking advance',200000,100000,'Emerald Banquets', true),
  ('44444444-4444-4444-4444-444444444444','Catering','Menu tasting + advance',350000,150000,'Royal Caterers', true),
  ('11111111-1111-1111-1111-111111111111','Decor','Mehendi stage decor',60000,0,'Bloom Decor', false),
  ('22222222-2222-2222-2222-222222222222','Flowers','Marigold flower order',15000,8000,'Local Flower Mart', true);

insert into public.guests (name, side, group_name, rsvp, invited, food_pref, phone) values
  ('Fatima Khan','Bride','Family','Confirmed', true,'Veg','+91 98200 11223'),
  ('Arjun Mehta','Groom','Friends','Pending', true,'Non-Veg','+91 98200 33445'),
  ('Dr. Naveen Rao','Groom','VIP','Confirmed', true,'Veg','+91 98200 55667');

insert into public.vendors (name, category, phone, advance, total, rating, notes) values
  ('Emerald Banquets','Venue','+91 98111 22334',100000,200000,4,'Deposit paid, contract signed.'),
  ('Royal Caterers','Catering','+91 98111 55667',150000,350000,5,'Menu tasting scheduled.'),
  ('Bloom Decor','Decorator','+91 98111 88990',0,60000,0,'Awaiting confirmation.');

insert into public.bookings (vendor_name, category, event_id, status, booking_date, contract_signed, advance_paid, balance_due, final_payment_due, contact_person, phone, trial_date, notes) values
  ('Emerald Banquets','Venue','33333333-3333-3333-3333-333333333333','Confirmed','2026-03-01', true, 100000, 100000, '2027-01-15','Mr. Kapoor','+91 98111 22334', null, 'Deposit paid, contract signed.'),
  ('Royal Caterers','Food Catering','44444444-4444-4444-4444-444444444444','Booked','2026-04-10', true, 150000, 200000, '2027-01-20','Ravi','+91 98111 55667','2026-11-05','Menu tasting scheduled.'),
  (null,'Photographer','33333333-3333-3333-3333-333333333333','Not Booked', null, false, 0, 0, null, null, null, null, null),
  (null,'Makeup Artist','33333333-3333-3333-3333-333333333333','Enquired', null, false, 0, 0, null, null, null, null,'Waiting on quote.'),
  (null,'Wedding Clothes / Tailor','33333333-3333-3333-3333-333333333333','Not Booked', null, false, 0, 0, null, null, null, null, null),
  ('Bloom Decor','Decoration','11111111-1111-1111-1111-111111111111','Negotiating', null, false, 0, 0, null,'Neha','+91 98111 88990', null,'Awaiting final quote.');

-- ---------------------------------------------------------
-- IMPORTANT: making yourself Admin
-- 1. Sign up once through the app's /login page (this creates
--    your row in public.profiles with role='family' by default).
-- 2. Then run this, swapping in your email:
--
--    update public.profiles set role = 'admin'
--    where id = (select id from auth.users where email = 'YOUR_EMAIL_HERE');
--
-- ---------------------------------------------------------
