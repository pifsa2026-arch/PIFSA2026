-- PIFSA Portal — Supabase schema (v2)
-- Run this in Supabase → SQL Editor. Safe to re-run.

-- ============ LEADS (Enrollment CRM) ============
create table if not exists public.leads (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  full_name text not null,
  email text not null,
  contact_number text,
  programs text[] default '{}',
  training_duration text,
  stage text not null default 'Leads'
    check (stage in ('Leads','Applicants','Examinees','For Requirements','Admitted','Paid')),
  source text default 'landing_page',
  amount_paid numeric not null default 0,
  notes text
);

alter table public.leads enable row level security;

drop policy if exists "anon can submit leads" on public.leads;
create policy "anon can submit leads"
  on public.leads for insert to anon with check (true);

drop policy if exists "authed can read leads" on public.leads;
create policy "authed can read leads"
  on public.leads for select to authenticated using (true);

drop policy if exists "authed can update leads" on public.leads;
create policy "authed can update leads"
  on public.leads for update to authenticated using (true);

drop policy if exists "authed can delete leads" on public.leads;
create policy "authed can delete leads"
  on public.leads for delete to authenticated using (true);

-- If upgrading an older leads table, add new columns / widen stage check:
alter table public.leads add column if not exists programs text[] default '{}';
alter table public.leads add column if not exists training_duration text;
alter table public.leads add column if not exists amount_paid numeric not null default 0;

-- ============ EXPENSES (Revenue Dashboard) ============
create table if not exists public.expenses (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  spent_on date not null default now(),
  category text not null check (category in ('Marketing','Operations')),
  subcategory text not null,
  description text,
  amount numeric not null default 0
);

alter table public.expenses enable row level security;

drop policy if exists "authed manage expenses" on public.expenses;
create policy "authed manage expenses"
  on public.expenses for all to authenticated using (true) with check (true);

-- ============ v3: per-duration expense tagging ============
-- Tag each expense with a training duration, or 'General' for annual/shared costs.
alter table public.expenses add column if not exists duration text default 'General';

-- ============ v4: automations (workflow builder) ============
create table if not exists public.automations (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null,
  enabled boolean not null default true,
  -- trigger: e.g. { type: 'stage_changed', stage: 'Admitted' } or { type: 'lead_created' }
  trigger jsonb not null default '{}',
  -- ordered list of steps: [{ type:'send_email', ... }, { type:'delay', hours:24 }, ...]
  steps jsonb not null default '[]',
  -- stats
  run_count integer not null default 0,
  last_run_at timestamptz
);
alter table public.automations enable row level security;
drop policy if exists "authed manage automations" on public.automations;
create policy "authed manage automations"
  on public.automations for all to authenticated using (true) with check (true);

-- ============ v5: expanded expense categories + lead detail fields ============
-- New primary expense sources (Digital, Events, Print, Operations)
alter table public.expenses drop constraint if exists expenses_category_check;
alter table public.expenses add constraint expenses_category_check
  check (category in ('Digital','Events','Print','Operations'));

-- Additional lead detail fields (all optional)
alter table public.leads add column if not exists current_work text;
alter table public.leads add column if not exists location text;
alter table public.leads add column if not exists bs_degree text;
