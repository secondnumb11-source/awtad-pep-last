-- أوتاد: إعداد قاعدة البيانات. كل الكائنات تبدأ بالبادئة awtad_ ولا تمس أي جدول آخر في المشروع.
-- أوتاد: مخطط قاعدة البيانات (Supabase / Postgres)
-- التنفيذ: Supabase Dashboard > SQL Editor > الصق الملف كاملًا > Run

create table if not exists awtad_organizations(
  id uuid primary key default gen_random_uuid(),
  name text not null,
  settings jsonb not null default '{"sEmp":9.75,"sEr":11.75,"nEr":2,"cap":45000,"shift":"08:00","limit":1000}',
  created_at timestamptz default now());

create table if not exists awtad_profiles(
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references awtad_organizations(id) on delete cascade,
  role text not null default 'employee' check (role in ('admin','hr','manager','employee')),
  full_name text);

create table if not exists awtad_employees(
  id bigint generated always as identity primary key,
  org_id uuid not null references awtad_organizations(id) on delete cascade,
  name text not null, nat text not null default 'S' check (nat in ('S','N')),
  dept text, job text,
  basic numeric default 0, house numeric default 0, trans numeric default 0, other numeric default 0,
  join_date date, iqama_expiry date, contract_end date,
  created_at timestamptz default now());

create table if not exists awtad_attendance(
  id bigint generated always as identity primary key,
  org_id uuid not null references awtad_organizations(id) on delete cascade,
  employee_id bigint not null references awtad_employees(id) on delete cascade,
  day date not null default current_date, check_in time, check_out time,
  unique(employee_id, day));

create table if not exists awtad_leaves(
  id bigint generated always as identity primary key,
  org_id uuid not null references awtad_organizations(id) on delete cascade,
  employee_id bigint not null references awtad_employees(id) on delete cascade,
  type text not null, from_date date not null, to_date date not null, days int not null,
  status text not null default 'بانتظار الموافقة',
  created_at timestamptz default now());

create table if not exists awtad_expenses(
  id bigint generated always as identity primary key,
  org_id uuid not null references awtad_organizations(id) on delete cascade,
  employee_id bigint not null references awtad_employees(id) on delete cascade,
  category text, amount numeric not null, note text,
  status text not null default 'بانتظار المدير',
  created_at timestamptz default now());

create table if not exists awtad_candidates(
  id bigint generated always as identity primary key,
  org_id uuid not null references awtad_organizations(id) on delete cascade,
  name text not null, job text, stage int not null default 0,
  created_at timestamptz default now());

-- دوال مساعدة للصلاحيات
create or replace function public.awtad_my_org() returns uuid language sql stable security definer set search_path=public
as $$ select org_id from awtad_profiles where id=auth.uid() $$;
create or replace function public.awtad_my_role() returns text language sql stable security definer set search_path=public
as $$ select role from awtad_profiles where id=auth.uid() $$;

-- إنشاء منشأة جديدة وجعل المنشئ مديرًا (يُستدعى بعد أول تسجيل دخول)
create or replace function public.awtad_create_org(org_name text, my_name text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare o uuid;
begin
  if auth.uid() is null then raise exception 'unauthenticated'; end if;
  if exists(select 1 from awtad_profiles where id=auth.uid()) then raise exception 'already member'; end if;
  insert into awtad_organizations(name) values(org_name) returning id into o;
  insert into awtad_profiles(id,org_id,role,full_name) values(auth.uid(),o,'admin',my_name);
  return o;
end $$;

-- RLS
alter table awtad_organizations enable row level security;
alter table awtad_profiles enable row level security;
alter table awtad_employees enable row level security;
alter table awtad_attendance enable row level security;
alter table awtad_leaves enable row level security;
alter table awtad_expenses enable row level security;
alter table awtad_candidates enable row level security;

create policy awtad_org_read on awtad_organizations for select using (id=awtad_my_org());
create policy awtad_org_upd on awtad_organizations for update using (id=awtad_my_org() and awtad_my_role()='admin');
create policy awtad_prof_read on awtad_profiles for select using (org_id=awtad_my_org());
create policy awtad_prof_adm on awtad_profiles for all using (org_id=awtad_my_org() and awtad_my_role()='admin') with check (org_id=awtad_my_org());

-- الموظفون والتوظيف: للمدير ومسؤول الموارد البشرية فقط للكتابة، والقراءة لأعضاء المنشأة
create policy awtad_emp_r on awtad_employees for select using (org_id=awtad_my_org());
create policy awtad_emp_w on awtad_employees for all using (org_id=awtad_my_org() and awtad_my_role() in ('admin','hr')) with check (org_id=awtad_my_org());
create policy awtad_cand_r on awtad_candidates for select using (org_id=awtad_my_org() and awtad_my_role() in ('admin','hr','manager'));
create policy awtad_cand_w on awtad_candidates for all using (org_id=awtad_my_org() and awtad_my_role() in ('admin','hr')) with check (org_id=awtad_my_org());

-- الحضور: الجميع يسجل، والتعديل للجميع داخل المنشأة (يمكن تشديده بربط الموظف بالمستخدم لاحقًا)
create policy awtad_att_all on awtad_attendance for all using (org_id=awtad_my_org()) with check (org_id=awtad_my_org());

-- الإجازات والمصروفات: الجميع يقدم، والاعتماد للمدير/HR/المدير العام
create policy awtad_lv_r on awtad_leaves for select using (org_id=awtad_my_org());
create policy awtad_lv_i on awtad_leaves for insert with check (org_id=awtad_my_org());
create policy awtad_lv_u on awtad_leaves for update using (org_id=awtad_my_org() and awtad_my_role() in ('admin','hr','manager'));
create policy awtad_ex_r on awtad_expenses for select using (org_id=awtad_my_org());
create policy awtad_ex_i on awtad_expenses for insert with check (org_id=awtad_my_org());
create policy awtad_ex_u on awtad_expenses for update using (org_id=awtad_my_org() and awtad_my_role() in ('admin','hr','manager'));

grant execute on function public.awtad_create_org(text,text) to authenticated;
