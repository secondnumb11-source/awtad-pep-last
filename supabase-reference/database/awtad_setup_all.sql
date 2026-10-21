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
-- أوتاد: إعداد قاعدة البيانات. كل الكائنات تبدأ بالبادئة awtad_ ولا تمس أي جدول آخر في المشروع.
-- أوتاد: الترحيل الثاني (نفّذه بعد schema.sql)
alter table awtad_employees add column if not exists iban text;
alter table awtad_employees add column if not exists bank_code text;
alter table awtad_employees add column if not exists unit_id bigint;

create table if not exists awtad_org_units(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, name text not null, parent_id bigint references awtad_org_units(id) on delete set null, head_id bigint references awtad_employees(id) on delete set null, created_at timestamptz default now());
create table if not exists awtad_onboarding_tasks(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, employee_id bigint not null references awtad_employees(id) on delete cascade, title text not null, due date, done boolean not null default false);
create table if not exists awtad_goals(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, employee_id bigint not null references awtad_employees(id) on delete cascade, title text not null, kind text default 'SMART', cycle text, weight numeric default 0, progress numeric default 0);
create table if not exists awtad_reviews(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, employee_id bigint not null references awtad_employees(id) on delete cascade, cycle text, reviewer_type text default 'مدير', score numeric, comment text);
create table if not exists awtad_courses(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, title text not null, hours numeric default 0, provider text);
create table if not exists awtad_trainings(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, employee_id bigint not null references awtad_employees(id) on delete cascade, course_id bigint not null references awtad_courses(id) on delete cascade, status text not null default 'مسجّل');
create table if not exists awtad_surveys(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, title text not null, question text not null, created_at timestamptz default now());
create table if not exists awtad_survey_responses(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, survey_id bigint not null references awtad_surveys(id) on delete cascade, score int check (score between 0 and 10), comment text, created_at timestamptz default now());
create table if not exists awtad_petty_cash(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, employee_id bigint not null references awtad_employees(id) on delete cascade, amount numeric not null, note text, issued_on date default current_date);
create table if not exists awtad_petty_spend(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, petty_id bigint not null references awtad_petty_cash(id) on delete cascade, amount numeric not null, note text, spent_on date default current_date);
create table if not exists awtad_trips(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, employee_id bigint not null references awtad_employees(id) on delete cascade, destination text not null, from_date date, to_date date, daily_allowance numeric default 0, status text not null default 'بانتظار الموافقة');
create table if not exists awtad_salary_bands(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, job text not null, min_sal numeric, mid_sal numeric, max_sal numeric);
create table if not exists awtad_journal_entries(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, period text not null, lines jsonb not null, total numeric, created_at timestamptz default now());

-- سياسات الصلاحيات: قراءة وكتابة لأعضاء المنشأة (التشديد حسب الدور في مرحلة لاحقة)
do $$ declare t text; begin
 foreach t in array array['awtad_org_units','awtad_onboarding_tasks','awtad_goals','awtad_reviews','awtad_courses','awtad_trainings','awtad_surveys','awtad_survey_responses','awtad_petty_cash','awtad_petty_spend','awtad_trips','awtad_salary_bands','awtad_journal_entries'] loop
  execute format('alter table %I enable row level security', t);
  execute format('drop policy if exists awtad_org_all on %I', t);
  execute format('create policy awtad_org_all on %I for all using (org_id=awtad_my_org()) with check (org_id=awtad_my_org())', t);
 end loop; end $$;
-- أوتاد: الدخول الحقيقي وتشديد الصلاحيات (نُفّذ على المشروع كترحيل awtad_04_auth_security). يمس جداول awtad_ فقط.
alter table awtad_profiles add column if not exists employee_id bigint references awtad_employees(id) on delete set null;
create or replace function public.awtad_my_emp() returns bigint language sql stable security definer set search_path=public
as $$ select employee_id from awtad_profiles where id=auth.uid() $$;

-- إلغاء وضع التطوير المؤقت وحذف المنشأة التجريبية
do $$ declare t text; begin
 foreach t in array array['awtad_organizations','awtad_profiles','awtad_employees','awtad_attendance','awtad_leaves','awtad_expenses','awtad_candidates','awtad_org_units','awtad_onboarding_tasks','awtad_goals','awtad_reviews','awtad_courses','awtad_trainings','awtad_surveys','awtad_survey_responses','awtad_petty_cash','awtad_petty_spend','awtad_trips','awtad_salary_bands','awtad_journal_entries'] loop
  execute format('drop policy if exists awtad_dev_all on %I', t);
 end loop; end $$;
delete from awtad_organizations where id='00000000-0000-0000-0000-000000000001';

-- الموظفون: المدير فما فوق يرى الجميع، والموظف يرى سجله فقط
drop policy if exists awtad_emp_r on awtad_employees;
create policy awtad_emp_r on awtad_employees for select using (org_id=awtad_my_org() and (awtad_my_role() in ('admin','hr','manager') or id=awtad_my_emp()));

-- الحضور والإجازات والمصروفات
drop policy if exists awtad_att_all on awtad_attendance;
create policy awtad_att_r on awtad_attendance for select using (org_id=awtad_my_org() and (awtad_my_role() in ('admin','hr','manager') or employee_id=awtad_my_emp()));
create policy awtad_att_w on awtad_attendance for all using (org_id=awtad_my_org() and (awtad_my_role() in ('admin','hr') or employee_id=awtad_my_emp())) with check (org_id=awtad_my_org() and (awtad_my_role() in ('admin','hr') or employee_id=awtad_my_emp()));
drop policy if exists awtad_lv_r on awtad_leaves; drop policy if exists awtad_lv_i on awtad_leaves;
create policy awtad_lv_r on awtad_leaves for select using (org_id=awtad_my_org() and (awtad_my_role() in ('admin','hr','manager') or employee_id=awtad_my_emp()));
create policy awtad_lv_i on awtad_leaves for insert with check (org_id=awtad_my_org() and (awtad_my_role() in ('admin','hr','manager') or employee_id=awtad_my_emp()));
drop policy if exists awtad_ex_r on awtad_expenses; drop policy if exists awtad_ex_i on awtad_expenses;
create policy awtad_ex_r on awtad_expenses for select using (org_id=awtad_my_org() and (awtad_my_role() in ('admin','hr','manager') or employee_id=awtad_my_emp()));
create policy awtad_ex_i on awtad_expenses for insert with check (org_id=awtad_my_org() and (awtad_my_role() in ('admin','hr','manager') or employee_id=awtad_my_emp()));

-- جداول الوحدات
do $$ declare t text; begin
 foreach t in array array['awtad_org_units','awtad_onboarding_tasks','awtad_goals','awtad_reviews','awtad_courses','awtad_trainings','awtad_surveys','awtad_survey_responses','awtad_petty_cash','awtad_petty_spend','awtad_trips','awtad_salary_bands','awtad_journal_entries'] loop
  execute format('drop policy if exists awtad_org_all on %I', t);
  execute format('create policy awtad_w on %I for all using (org_id=awtad_my_org() and awtad_my_role() in (''admin'',''hr'')) with check (org_id=awtad_my_org())', t);
 end loop;
 foreach t in array array['awtad_org_units','awtad_courses','awtad_surveys'] loop
  execute format('create policy awtad_r on %I for select using (org_id=awtad_my_org())', t);
 end loop;
 foreach t in array array['awtad_onboarding_tasks','awtad_goals','awtad_reviews','awtad_trainings','awtad_trips','awtad_petty_cash'] loop
  execute format('create policy awtad_r on %I for select using (org_id=awtad_my_org() and (awtad_my_role() in (''admin'',''hr'',''manager'') or employee_id=awtad_my_emp()))', t);
 end loop;
 foreach t in array array['awtad_petty_spend','awtad_survey_responses'] loop
  execute format('create policy awtad_r on %I for select using (org_id=awtad_my_org() and awtad_my_role() in (''admin'',''hr'',''manager''))', t);
 end loop;
 foreach t in array array['awtad_salary_bands','awtad_journal_entries'] loop
  execute format('create policy awtad_r on %I for select using (org_id=awtad_my_org() and awtad_my_role() in (''admin'',''hr''))', t);
 end loop;
end $$;
create policy awtad_resp_i on awtad_survey_responses for insert with check (org_id=awtad_my_org());
create policy awtad_trip_i on awtad_trips for insert with check (org_id=awtad_my_org() and (awtad_my_role() in ('admin','hr','manager') or employee_id=awtad_my_emp()));
create policy awtad_trip_u on awtad_trips for update using (org_id=awtad_my_org() and awtad_my_role() in ('admin','hr','manager'));
-- أوتاد: بوابة الموظف والمستندات وربط الحسابات (نُفّذ على المشروع كترحيل awtad_05_portal). يمس كائنات awtad_ وحاوية awtad-docs فقط.
create table if not exists awtad_documents(
  id bigint generated always as identity primary key,
  org_id uuid not null references awtad_organizations(id) on delete cascade,
  employee_id bigint not null references awtad_employees(id) on delete cascade,
  title text not null, kind text default 'أخرى', path text not null, expires_on date,
  created_at timestamptz default now());
alter table awtad_documents enable row level security;
create policy awtad_w on awtad_documents for all using (org_id=awtad_my_org() and awtad_my_role() in ('admin','hr')) with check (org_id=awtad_my_org());
create policy awtad_r on awtad_documents for select using (org_id=awtad_my_org() and (awtad_my_role() in ('admin','hr','manager') or employee_id=awtad_my_emp()));

create or replace function public.awtad_assign_user(p_email text, p_employee_id bigint, p_role text) returns uuid
language plpgsql security definer set search_path=public as $$
declare uid uuid; org uuid; ename text;
begin
  if awtad_my_role() is distinct from 'admin' then raise exception 'غير مسموح: هذه العملية لمدير النظام فقط'; end if;
  if p_role not in ('admin','hr','manager','employee') then raise exception 'دور غير صالح'; end if;
  org := awtad_my_org();
  select id into uid from auth.users where lower(email)=lower(trim(p_email));
  if uid is null then raise exception 'هذا البريد غير مسجّل. اطلب من المستخدم إنشاء حساب ببريده أولًا'; end if;
  if exists(select 1 from awtad_profiles where id=uid and org_id<>org) then raise exception 'هذا المستخدم يتبع منشأة أخرى'; end if;
  if p_employee_id is not null then
    select name into ename from awtad_employees where id=p_employee_id and org_id=org;
    if ename is null then raise exception 'الموظف غير موجود في منشأتك'; end if;
  end if;
  insert into awtad_profiles(id,org_id,role,employee_id,full_name) values(uid,org,p_role,p_employee_id,ename)
  on conflict (id) do update set role=excluded.role, employee_id=excluded.employee_id, full_name=coalesce(excluded.full_name, awtad_profiles.full_name);
  return uid;
end $$;
revoke all on function public.awtad_assign_user(text,bigint,text) from public, anon;
grant execute on function public.awtad_assign_user(text,bigint,text) to authenticated;

insert into storage.buckets(id,name,public) values('awtad-docs','awtad-docs',false) on conflict (id) do nothing;
create policy awtad_docs_read on storage.objects for select to authenticated using (bucket_id='awtad-docs' and (storage.foldername(name))[1]=awtad_my_org()::text and (awtad_my_role() in ('admin','hr','manager') or (storage.foldername(name))[2]=awtad_my_emp()::text));
create policy awtad_docs_ins on storage.objects for insert to authenticated with check (bucket_id='awtad-docs' and (storage.foldername(name))[1]=awtad_my_org()::text and awtad_my_role() in ('admin','hr'));
create policy awtad_docs_del on storage.objects for delete to authenticated using (bucket_id='awtad-docs' and (storage.foldername(name))[1]=awtad_my_org()::text and awtad_my_role() in ('admin','hr'));
-- أوتاد: عمليات القوى العاملة والإشعارات والطلبات والتكاملات (نُفّذ على المشروع كترحيل awtad_06_workforce_ops). كائنات awtad_ فقط.
create table if not exists awtad_shifts(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, name text not null, start_time time, end_time time, break_start time, break_end time, work_days text default 'sun,mon,tue,wed,thu', flex_minutes int default 0, auto_checkout time default '00:00');
create table if not exists awtad_shift_assign(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, employee_id bigint not null references awtad_employees(id) on delete cascade, shift_id bigint not null references awtad_shifts(id) on delete cascade, from_date date not null, repeat_rule text default 'none', until_date date);
create table if not exists awtad_locations(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, name text not null, kind text default 'مكتب', lat numeric, lng numeric, radius_m int default 100, active boolean not null default true);
create table if not exists awtad_groups(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, name text not null, code text, supervisor_id bigint references awtad_employees(id) on delete set null);
create table if not exists awtad_group_members(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, group_id bigint not null references awtad_groups(id) on delete cascade, employee_id bigint not null references awtad_employees(id) on delete cascade, unique(group_id, employee_id));
create table if not exists awtad_announcements(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, title text not null, body text, link text, group_id bigint references awtad_groups(id) on delete set null, created_at timestamptz default now());
create table if not exists awtad_notifications(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, title text not null, body text, employee_id bigint references awtad_employees(id) on delete cascade, kind text default 'عام', created_at timestamptz default now());
create table if not exists awtad_requests(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, employee_id bigint not null references awtad_employees(id) on delete cascade, kind text not null, req_date date, hours numeric, reason text, status text not null default 'بانتظار الموافقة', comment text, decided_by uuid, created_at timestamptz default now());
create table if not exists awtad_holidays(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, name text not null, day date not null, scope text default 'الجميع');
create table if not exists awtad_loans(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, employee_id bigint not null references awtad_employees(id) on delete cascade, amount numeric not null, installment numeric default 0, start_month text, note text, status text not null default 'بانتظار الموافقة', created_at timestamptz default now());
create table if not exists awtad_letters(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, employee_id bigint not null references awtad_employees(id) on delete cascade, kind text not null, addressed_to text, status text not null default 'بانتظار الموافقة', created_at timestamptz default now());
create table if not exists awtad_integrations(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, platform text not null, status text not null default 'غير مفعّل', establishment_ref text, last_sync timestamptz, notes text, unique(org_id, platform));
create table if not exists awtad_integration_logs(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, platform text not null, action text, result text, created_at timestamptz default now());

do $$ declare t text; begin
 foreach t in array array['awtad_shifts','awtad_shift_assign','awtad_locations','awtad_groups','awtad_group_members','awtad_announcements','awtad_notifications','awtad_requests','awtad_holidays','awtad_loans','awtad_letters','awtad_integrations','awtad_integration_logs'] loop
  execute format('alter table %I enable row level security', t);
  execute format('create policy awtad_w on %I for all using (org_id=awtad_my_org() and awtad_my_role() in (''admin'',''hr'')) with check (org_id=awtad_my_org())', t);
 end loop;
 foreach t in array array['awtad_shifts','awtad_locations','awtad_groups','awtad_group_members','awtad_announcements','awtad_holidays'] loop
  execute format('create policy awtad_r on %I for select using (org_id=awtad_my_org())', t);
 end loop;
 foreach t in array array['awtad_shift_assign','awtad_requests','awtad_loans','awtad_letters'] loop
  execute format('create policy awtad_r on %I for select using (org_id=awtad_my_org() and (awtad_my_role() in (''admin'',''hr'',''manager'') or employee_id=awtad_my_emp()))', t);
 end loop;
 foreach t in array array['awtad_requests','awtad_loans','awtad_letters'] loop
  execute format('create policy awtad_i on %I for insert with check (org_id=awtad_my_org() and (awtad_my_role() in (''admin'',''hr'',''manager'') or employee_id=awtad_my_emp()))', t);
 end loop;
 execute 'create policy awtad_u on awtad_requests for update using (org_id=awtad_my_org() and awtad_my_role() in (''admin'',''hr'',''manager''))';
end $$;
create policy awtad_r on awtad_notifications for select using (org_id=awtad_my_org() and (employee_id is null or employee_id=awtad_my_emp() or awtad_my_role() in ('admin','hr','manager')));
-- أوتاد: حقول بيانات الموظف اللازمة للربط الحكومي (نُفّذ على المشروع كترحيل awtad_07_employee_gov_fields)
alter table awtad_employees add column if not exists national_id text;
alter table awtad_employees add column if not exists nationality text;
alter table awtad_employees add column if not exists birth_date date;
alter table awtad_employees add column if not exists gender text;
alter table awtad_employees add column if not exists gosi_no text;
alter table awtad_employees add column if not exists qiwa_contract_no text;
alter table awtad_employees add column if not exists qiwa_status text;
alter table awtad_employees add column if not exists occupation text;
-- أوتاد: منطق العمليات (نُفّذ على المشروع كترحيل awtad_08_ops_logic). كائنات awtad_ فقط.
alter table awtad_employees add column if not exists active boolean not null default true;
alter table awtad_employees add column if not exists employment_type text default 'دوام كامل';
alter table awtad_employees add column if not exists marital_status text;
alter table awtad_employees add column if not exists education text;
alter table awtad_employees add column if not exists emergency_name text;
alter table awtad_employees add column if not exists emergency_phone text;
alter table awtad_employees add column if not exists address text;
alter table awtad_employees add column if not exists manager_id bigint references awtad_employees(id) on delete set null;
alter table awtad_employees add column if not exists cost_center text;
alter table awtad_requests add column if not exists check_in time;
alter table awtad_requests add column if not exists check_out time;
alter table awtad_requests add column if not exists shift_id bigint references awtad_shifts(id) on delete set null;
alter table awtad_requests add column if not exists delegate_to bigint references awtad_employees(id) on delete set null;
alter table awtad_requests add column if not exists applied boolean not null default false;
alter table awtad_attendance add column if not exists lat numeric;
alter table awtad_attendance add column if not exists lng numeric;
alter table awtad_attendance add column if not exists location_id bigint references awtad_locations(id) on delete set null;
alter table awtad_attendance add column if not exists in_range boolean;

create table if not exists awtad_verifications(
  id bigint generated always as identity primary key,
  org_id uuid not null references awtad_organizations(id) on delete cascade,
  employee_id bigint not null references awtad_employees(id) on delete cascade,
  title text not null, status text not null default 'بانتظار الرد',
  lat numeric, lng numeric, comment text,
  created_at timestamptz default now(), answered_at timestamptz);
alter table awtad_verifications enable row level security;
create policy awtad_w on awtad_verifications for all using (org_id=awtad_my_org() and awtad_my_role() in ('admin','hr')) with check (org_id=awtad_my_org());
create policy awtad_r on awtad_verifications for select using (org_id=awtad_my_org() and (awtad_my_role() in ('admin','hr','manager') or employee_id=awtad_my_emp()));
create policy awtad_u_own on awtad_verifications for update using (org_id=awtad_my_org() and employee_id=awtad_my_emp()) with check (org_id=awtad_my_org() and employee_id=awtad_my_emp());

create table if not exists awtad_audit(
  id bigint generated always as identity primary key,
  org_id uuid, actor uuid, action text, table_name text, record_id text,
  old_data jsonb, new_data jsonb, at timestamptz default now());
alter table awtad_audit enable row level security;
create policy awtad_r on awtad_audit for select using (org_id=awtad_my_org() and awtad_my_role()='admin');
create or replace function public.awtad_audit_trg() returns trigger language plpgsql security definer set search_path=public as $$
declare r jsonb;
begin
  if tg_op='DELETE' then r:=to_jsonb(old); else r:=to_jsonb(new); end if;
  insert into awtad_audit(org_id,actor,action,table_name,record_id,old_data,new_data)
  values((r->>'org_id')::uuid, auth.uid(), tg_op, tg_table_name, r->>'id',
         case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
         case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end);
  return coalesce(new, old);
end $$;
do $$ declare t text; begin
 foreach t in array array['awtad_employees','awtad_leaves','awtad_expenses','awtad_requests','awtad_loans','awtad_trips','awtad_letters','awtad_documents','awtad_journal_entries'] loop
  execute format('drop trigger if exists awtad_audit on %I', t);
  execute format('create trigger awtad_audit after insert or update or delete on %I for each row execute function public.awtad_audit_trg()', t);
 end loop; end $$;

create or replace function public.awtad_apply_request(p_id bigint) returns text language plpgsql security definer set search_path=public as $$
declare r awtad_requests%rowtype;
begin
  if awtad_my_role() not in ('admin','hr','manager') then raise exception 'غير مسموح'; end if;
  select * into r from awtad_requests where id=p_id and org_id=awtad_my_org();
  if not found then raise exception 'الطلب غير موجود'; end if;
  if r.status <> 'معتمد' then raise exception 'الطلب غير معتمد بعد'; end if;
  if r.applied then return 'مُطبَّق مسبقًا'; end if;
  if r.kind in ('إضافة دوام','تعديل دوام') then
    if r.req_date is null then raise exception 'تاريخ الطلب مطلوب'; end if;
    insert into awtad_attendance(org_id,employee_id,day,check_in,check_out) values(r.org_id,r.employee_id,r.req_date,r.check_in,r.check_out)
    on conflict (employee_id,day) do update set check_in=excluded.check_in, check_out=excluded.check_out;
  elsif r.kind='حذف سجل دوام' then
    delete from awtad_attendance where employee_id=r.employee_id and day=r.req_date;
  elsif r.kind='تغيير مناوبة' and r.shift_id is not null and r.req_date is not null then
    insert into awtad_shift_assign(org_id,employee_id,shift_id,from_date,repeat_rule,until_date) values(r.org_id,r.employee_id,r.shift_id,r.req_date,'none',r.req_date);
  end if;
  update awtad_requests set applied=true where id=p_id;
  return 'تم تطبيق الطلب';
end $$;
revoke all on function public.awtad_apply_request(bigint) from public, anon;
grant execute on function public.awtad_apply_request(bigint) to authenticated;

create or replace function public.awtad_generate_renewals(p_days int default 60) returns int language plpgsql security definer set search_path=public as $$
declare n int;
begin
  if awtad_my_role() not in ('admin','hr') then raise exception 'غير مسموح'; end if;
  insert into awtad_requests(org_id,employee_id,kind,req_date,reason)
  select e.org_id,e.id,'تجديد عقد',e.contract_end,'ينتهي العقد خلال '||p_days||' يومًا أو أقل'
  from awtad_employees e
  where e.org_id=awtad_my_org() and e.active and e.contract_end between current_date and current_date+p_days
    and not exists(select 1 from awtad_requests r where r.employee_id=e.id and r.kind='تجديد عقد' and r.status like 'بانتظار%');
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.awtad_generate_renewals(int) from public, anon;
grant execute on function public.awtad_generate_renewals(int) to authenticated;
-- أوتاد: محرك الموافقات متعدد المستويات، التفويض الفعلي، الرصيد التعويضي، التقارير الميدانية، القوائم، صلاحيات الوحدات، التهنئة.
-- نُفّذ على المشروع كترحيل awtad_09_approvals_permissions. كائنات awtad_ فقط.
alter table awtad_profiles add column if not exists email text;
alter table awtad_profiles add column if not exists module_access text[];
update awtad_profiles p set email=u.email from auth.users u where u.id=p.id and p.email is null;
alter table awtad_attendance add column if not exists excused boolean not null default false;
alter table awtad_requests add column if not exists end_date date;
alter table awtad_requests add column if not exists required_levels int not null default 1;
alter table awtad_requests add column if not exists approvals jsonb not null default '[]'::jsonb;

create table if not exists awtad_delegations(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, from_emp bigint not null references awtad_employees(id) on delete cascade, to_emp bigint not null references awtad_employees(id) on delete cascade, from_date date not null, to_date date not null, request_id bigint);
create table if not exists awtad_comp_ledger(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, employee_id bigint not null references awtad_employees(id) on delete cascade, hours numeric not null, reason text, request_id bigint, created_at timestamptz default now());
create table if not exists awtad_field_reports(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, employee_id bigint not null references awtad_employees(id) on delete cascade, title text not null, body text, lat numeric, lng numeric, photo_path text, created_at timestamptz default now());
create table if not exists awtad_lists(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, kind text not null, name text not null, unique(org_id, kind, name));
create table if not exists awtad_approval_rules(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, kind text not null, levels int not null default 1 check (levels in (1,2)), unique(org_id, kind));

do $$ declare t text; begin
 foreach t in array array['awtad_delegations','awtad_comp_ledger','awtad_field_reports','awtad_lists','awtad_approval_rules'] loop
  execute format('alter table %I enable row level security', t);
  execute format('create policy awtad_w on %I for all using (org_id=awtad_my_org() and awtad_my_role() in (''admin'',''hr'')) with check (org_id=awtad_my_org())', t);
 end loop;
 foreach t in array array['awtad_lists','awtad_approval_rules'] loop
  execute format('create policy awtad_r on %I for select using (org_id=awtad_my_org())', t);
 end loop;
end $$;
create policy awtad_r on awtad_comp_ledger for select using (org_id=awtad_my_org() and (awtad_my_role() in ('admin','hr','manager') or employee_id=awtad_my_emp()));
create policy awtad_r on awtad_delegations for select using (org_id=awtad_my_org() and (awtad_my_role() in ('admin','hr','manager') or from_emp=awtad_my_emp() or to_emp=awtad_my_emp()));
create policy awtad_r on awtad_field_reports for select using (org_id=awtad_my_org() and (awtad_my_role() in ('admin','hr','manager') or employee_id=awtad_my_emp()));
create policy awtad_i on awtad_field_reports for insert with check (org_id=awtad_my_org() and (awtad_my_role() in ('admin','hr') or employee_id=awtad_my_emp()));

create policy awtad_docs_ins_own on storage.objects for insert to authenticated with check (bucket_id='awtad-docs' and (storage.foldername(name))[1]=awtad_my_org()::text and (storage.foldername(name))[2]=awtad_my_emp()::text and (storage.foldername(name))[3]='reports');

create or replace function public.awtad_my_role() returns text language sql stable security definer set search_path=public as $$
  select case when p.role='employee' and exists(select 1 from awtad_delegations d where d.to_emp=p.employee_id and current_date between d.from_date and d.to_date) then 'manager' else p.role end
  from awtad_profiles p where p.id=auth.uid() $$;

create or replace function public.awtad_req_levels() returns trigger language plpgsql as $$
begin
  select coalesce((select levels from awtad_approval_rules where org_id=new.org_id and kind=new.kind),1) into new.required_levels;
  return new;
end $$;
drop trigger if exists awtad_req_levels on awtad_requests;
create trigger awtad_req_levels before insert on awtad_requests for each row execute function public.awtad_req_levels();

create or replace function public.awtad_apply_request(p_id bigint) returns text language plpgsql security definer set search_path=public as $$
declare r awtad_requests%rowtype;
begin
  if awtad_my_role() not in ('admin','hr','manager') then raise exception 'غير مسموح'; end if;
  select * into r from awtad_requests where id=p_id and org_id=awtad_my_org();
  if not found then raise exception 'الطلب غير موجود'; end if;
  if r.status <> 'معتمد' then raise exception 'الطلب غير معتمد بعد'; end if;
  if r.applied then return 'مُطبَّق مسبقًا'; end if;
  if r.kind in ('إضافة دوام','تعديل دوام') then
    if r.req_date is null then raise exception 'تاريخ الطلب مطلوب'; end if;
    insert into awtad_attendance(org_id,employee_id,day,check_in,check_out) values(r.org_id,r.employee_id,r.req_date,r.check_in,r.check_out)
    on conflict (employee_id,day) do update set check_in=excluded.check_in, check_out=excluded.check_out;
  elsif r.kind='حذف سجل دوام' then
    delete from awtad_attendance where employee_id=r.employee_id and day=r.req_date;
  elsif r.kind='تغيير مناوبة' and r.shift_id is not null and r.req_date is not null then
    insert into awtad_shift_assign(org_id,employee_id,shift_id,from_date,repeat_rule,until_date) values(r.org_id,r.employee_id,r.shift_id,r.req_date,'none',r.req_date);
  elsif r.kind='طلب عذر' and r.req_date is not null then
    insert into awtad_attendance(org_id,employee_id,day,excused) values(r.org_id,r.employee_id,r.req_date,true)
    on conflict (employee_id,day) do update set excused=true;
  elsif r.kind='رصيد تعويضي' then
    insert into awtad_comp_ledger(org_id,employee_id,hours,reason,request_id) values(r.org_id,r.employee_id,coalesce(r.hours,0),r.reason,r.id);
  elsif r.kind='استخدام رصيد تعويضي' then
    if (select coalesce(sum(hours),0) from awtad_comp_ledger where employee_id=r.employee_id) < coalesce(r.hours,0) then raise exception 'الرصيد التعويضي غير كافٍ'; end if;
    insert into awtad_comp_ledger(org_id,employee_id,hours,reason,request_id) values(r.org_id,r.employee_id,-coalesce(r.hours,0),r.reason,r.id);
  elsif r.kind='تفويض مؤقت' and r.delegate_to is not null and r.req_date is not null then
    insert into awtad_delegations(org_id,from_emp,to_emp,from_date,to_date,request_id) values(r.org_id,r.employee_id,r.delegate_to,r.req_date,coalesce(r.end_date,r.req_date),r.id);
  end if;
  update awtad_requests set applied=true where id=p_id;
  return 'تم تطبيق الطلب';
end $$;

create or replace function public.awtad_decide_request(p_id bigint, p_approve boolean, p_comment text default null) returns text language plpgsql security definer set search_path=public as $$
declare r awtad_requests%rowtype; v_role text; v_emp bigint; lvl int; ns text; res text;
begin
  v_role := awtad_my_role();
  if v_role not in ('admin','hr','manager') then raise exception 'غير مسموح'; end if;
  select * into r from awtad_requests where id=p_id and org_id=awtad_my_org() for update;
  if not found then raise exception 'الطلب غير موجود'; end if;
  if r.status not like 'بانتظار%' then raise exception 'تم البتّ في هذا الطلب سابقًا'; end if;
  v_emp := awtad_my_emp();
  if v_emp is not null and v_emp = r.employee_id and v_role <> 'admin' then raise exception 'لا يمكنك اعتماد طلبك بنفسك'; end if;
  lvl := jsonb_array_length(r.approvals) + 1;
  if lvl >= 2 and v_role not in ('admin','hr') then raise exception 'المستوى الثاني يتطلب الموارد البشرية أو مدير النظام'; end if;
  if not p_approve then ns := 'مرفوض';
  elsif lvl >= r.required_levels then ns := 'معتمد';
  else ns := 'بانتظار المستوى ' || (lvl+1); end if;
  update awtad_requests set status=ns, comment=p_comment, decided_by=auth.uid(),
    approvals = approvals || jsonb_build_array(jsonb_build_object('by',auth.uid(),'role',v_role,'level',lvl,'approve',p_approve,'comment',p_comment,'at',now()))
  where id=p_id;
  if ns='معتمد' then res := awtad_apply_request(p_id); return 'اعتُمد: ' || res; end if;
  return ns;
end $$;
revoke all on function public.awtad_decide_request(bigint,boolean,text) from public, anon;
grant execute on function public.awtad_decide_request(bigint,boolean,text) to authenticated;

create or replace function public.awtad_birthday_greetings() returns int language plpgsql security definer set search_path=public as $$
declare n int;
begin
  if awtad_my_role() not in ('admin','hr') then return 0; end if;
  insert into awtad_notifications(org_id,title,body,employee_id,kind)
  select e.org_id,'تهنئة بعيد ميلادك','كل عام وأنت بخير يا '||e.name||'، تتمنى لك المنشأة عامًا سعيدًا.',e.id,'تهنئة'
  from awtad_employees e
  where e.org_id=awtad_my_org() and e.active and e.birth_date is not null and to_char(e.birth_date,'MM-DD')=to_char(current_date,'MM-DD')
    and not exists(select 1 from awtad_notifications x where x.employee_id=e.id and x.kind='تهنئة' and x.created_at::date=current_date);
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.awtad_birthday_greetings() from public, anon;
grant execute on function public.awtad_birthday_greetings() to authenticated;

create or replace function public.awtad_update_profile(p_user uuid, p_role text, p_modules text[]) returns text language plpgsql security definer set search_path=public as $$
declare org uuid;
begin
  if awtad_my_role() is distinct from 'admin' then raise exception 'غير مسموح: لمدير النظام فقط'; end if;
  if p_role not in ('admin','hr','manager','employee') then raise exception 'دور غير صالح'; end if;
  org := awtad_my_org();
  if p_role <> 'admin' and not exists(select 1 from awtad_profiles where org_id=org and role='admin' and id<>p_user) then raise exception 'لا يمكن إزالة آخر مدير نظام'; end if;
  update awtad_profiles set role=p_role, module_access=p_modules where id=p_user and org_id=org;
  return 'تم التحديث';
end $$;
revoke all on function public.awtad_update_profile(uuid,text,text[]) from public, anon;
grant execute on function public.awtad_update_profile(uuid,text,text[]) to authenticated;

create or replace function public.awtad_create_org(org_name text, my_name text default null) returns uuid language plpgsql security definer set search_path=public as $$
declare o uuid;
begin
  if auth.uid() is null then raise exception 'unauthenticated'; end if;
  if exists(select 1 from awtad_profiles where id=auth.uid()) then raise exception 'already member'; end if;
  insert into awtad_organizations(name) values(org_name) returning id into o;
  insert into awtad_profiles(id,org_id,role,full_name,email) values(auth.uid(),o,'admin',my_name,(select email from auth.users where id=auth.uid()));
  return o;
end $$;
create or replace function public.awtad_assign_user(p_email text, p_employee_id bigint, p_role text) returns uuid language plpgsql security definer set search_path=public as $$
declare uid uuid; org uuid; ename text;
begin
  if awtad_my_role() is distinct from 'admin' then raise exception 'غير مسموح: هذه العملية لمدير النظام فقط'; end if;
  if p_role not in ('admin','hr','manager','employee') then raise exception 'دور غير صالح'; end if;
  org := awtad_my_org();
  select id into uid from auth.users where lower(email)=lower(trim(p_email));
  if uid is null then raise exception 'هذا البريد غير مسجّل. اطلب من المستخدم إنشاء حساب ببريده أولًا'; end if;
  if exists(select 1 from awtad_profiles where id=uid and org_id<>org) then raise exception 'هذا المستخدم يتبع منشأة أخرى'; end if;
  if p_employee_id is not null then
    select name into ename from awtad_employees where id=p_employee_id and org_id=org;
    if ename is null then raise exception 'الموظف غير موجود في منشأتك'; end if;
  end if;
  insert into awtad_profiles(id,org_id,role,employee_id,full_name,email) values(uid,org,p_role,p_employee_id,ename,lower(trim(p_email)))
  on conflict (id) do update set role=excluded.role, employee_id=excluded.employee_id, full_name=coalesce(excluded.full_name, awtad_profiles.full_name), email=excluded.email;
  return uid;
end $$;

do $$ declare t text; begin
 foreach t in array array['awtad_delegations','awtad_comp_ledger','awtad_approval_rules','awtad_profiles'] loop
  execute format('drop trigger if exists awtad_audit on %I', t);
  execute format('create trigger awtad_audit after insert or update or delete on %I for each row execute function public.awtad_audit_trg()', t);
 end loop; end $$;
-- أوتاد: سياسات المصروفات والإجازات، أنواع المناوبات، التعويض عن الإضافي برصيد، مجموعات الرواتب، نهاية التجربة.
-- نُفّذ على المشروع كترحيل awtad_10_policies_shifts_expenses. كائنات awtad_ فقط.
alter table awtad_shifts add column if not exists kind text default 'ثابتة';
alter table awtad_shifts add column if not exists required_hours numeric;
alter table awtad_shifts add column if not exists differential_pct numeric default 0;
alter table awtad_employees add column if not exists probation_end date;
alter table awtad_employees add column if not exists pay_group text;
alter table awtad_requests add column if not exists compensation text default 'أجر';
alter table awtad_expenses add column if not exists expense_date date default current_date;
alter table awtad_expenses add column if not exists flagged text;
alter table awtad_expenses add column if not exists paid_in text;
alter table awtad_expenses add column if not exists reimburse boolean not null default true;

create table if not exists awtad_expense_policies(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, category text not null, max_amount numeric, monthly_budget numeric, note text, unique(org_id, category));
create table if not exists awtad_leave_policies(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, kind text not null, days int not null, paid_pct int not null default 100, note text, unique(org_id, kind));
do $$ declare t text; begin
 foreach t in array array['awtad_expense_policies','awtad_leave_policies'] loop
  execute format('alter table %I enable row level security', t);
  execute format('create policy awtad_w on %I for all using (org_id=awtad_my_org() and awtad_my_role() in (''admin'',''hr'')) with check (org_id=awtad_my_org())', t);
  execute format('create policy awtad_r on %I for select using (org_id=awtad_my_org())', t);
 end loop; end $$;

create or replace function public.awtad_apply_request(p_id bigint) returns text language plpgsql security definer set search_path=public as $$
declare r awtad_requests%rowtype;
begin
  if awtad_my_role() not in ('admin','hr','manager') then raise exception 'غير مسموح'; end if;
  select * into r from awtad_requests where id=p_id and org_id=awtad_my_org();
  if not found then raise exception 'الطلب غير موجود'; end if;
  if r.status <> 'معتمد' then raise exception 'الطلب غير معتمد بعد'; end if;
  if r.applied then return 'مُطبَّق مسبقًا'; end if;
  if r.kind in ('إضافة دوام','تعديل دوام') then
    if r.req_date is null then raise exception 'تاريخ الطلب مطلوب'; end if;
    insert into awtad_attendance(org_id,employee_id,day,check_in,check_out) values(r.org_id,r.employee_id,r.req_date,r.check_in,r.check_out)
    on conflict (employee_id,day) do update set check_in=excluded.check_in, check_out=excluded.check_out;
  elsif r.kind='حذف سجل دوام' then
    delete from awtad_attendance where employee_id=r.employee_id and day=r.req_date;
  elsif r.kind='تغيير مناوبة' and r.shift_id is not null and r.req_date is not null then
    insert into awtad_shift_assign(org_id,employee_id,shift_id,from_date,repeat_rule,until_date) values(r.org_id,r.employee_id,r.shift_id,r.req_date,'none',r.req_date);
  elsif r.kind='طلب عذر' and r.req_date is not null then
    insert into awtad_attendance(org_id,employee_id,day,excused) values(r.org_id,r.employee_id,r.req_date,true)
    on conflict (employee_id,day) do update set excused=true;
  elsif r.kind='عمل إضافي' and r.compensation='رصيد تعويضي' then
    insert into awtad_comp_ledger(org_id,employee_id,hours,reason,request_id) values(r.org_id,r.employee_id,coalesce(r.hours,0),'عمل إضافي معوَّض برصيد',r.id);
  elsif r.kind='رصيد تعويضي' then
    insert into awtad_comp_ledger(org_id,employee_id,hours,reason,request_id) values(r.org_id,r.employee_id,coalesce(r.hours,0),r.reason,r.id);
  elsif r.kind='استخدام رصيد تعويضي' then
    if (select coalesce(sum(hours),0) from awtad_comp_ledger where employee_id=r.employee_id) < coalesce(r.hours,0) then raise exception 'الرصيد التعويضي غير كافٍ'; end if;
    insert into awtad_comp_ledger(org_id,employee_id,hours,reason,request_id) values(r.org_id,r.employee_id,-coalesce(r.hours,0),r.reason,r.id);
  elsif r.kind='تفويض مؤقت' and r.delegate_to is not null and r.req_date is not null then
    insert into awtad_delegations(org_id,from_emp,to_emp,from_date,to_date,request_id) values(r.org_id,r.employee_id,r.delegate_to,r.req_date,coalesce(r.end_date,r.req_date),r.id);
  end if;
  update awtad_requests set applied=true where id=p_id;
  return 'تم تطبيق الطلب';
end $$;

do $$ declare t text; begin
 foreach t in array array['awtad_expense_policies','awtad_leave_policies'] loop
  execute format('drop trigger if exists awtad_audit on %I', t);
  execute format('create trigger awtad_audit after insert or update or delete on %I for each row execute function public.awtad_audit_trg()', t);
 end loop; end $$;
-- أوتاد: المواسم (رمضان والصيف)، الكيانات المتعددة، العقود والتوقيع الإلكتروني الداخلي.
-- نُفّذ على المشروع كترحيل awtad_11_seasons_entities_contracts. كائنات awtad_ فقط.
create table if not exists awtad_seasons(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, name text not null, from_date date not null, to_date date not null, daily_hours numeric, shift_start time, shift_end time);
create table if not exists awtad_entities(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, name text not null, cr_number text, notes text);
alter table awtad_employees add column if not exists entity_id bigint references awtad_entities(id) on delete set null;
create table if not exists awtad_contracts(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, employee_id bigint not null references awtad_employees(id) on delete cascade, title text not null, body text, status text not null default 'مسودة', signed_name text, signed_at timestamptz, created_at timestamptz default now());

do $$ declare t text; begin
 foreach t in array array['awtad_seasons','awtad_entities','awtad_contracts'] loop
  execute format('alter table %I enable row level security', t);
  execute format('create policy awtad_w on %I for all using (org_id=awtad_my_org() and awtad_my_role() in (''admin'',''hr'')) with check (org_id=awtad_my_org())', t);
 end loop;
 foreach t in array array['awtad_seasons','awtad_entities'] loop
  execute format('create policy awtad_r on %I for select using (org_id=awtad_my_org())', t);
 end loop;
 foreach t in array array['awtad_entities','awtad_contracts','awtad_seasons'] loop
  execute format('drop trigger if exists awtad_audit on %I', t);
  execute format('create trigger awtad_audit after insert or update or delete on %I for each row execute function public.awtad_audit_trg()', t);
 end loop;
end $$;
create policy awtad_r on awtad_contracts for select using (org_id=awtad_my_org() and (awtad_my_role() in ('admin','hr') or employee_id=awtad_my_emp()));

create or replace function public.awtad_sign_contract(p_id bigint, p_name text) returns text language plpgsql security definer set search_path=public as $$
declare c awtad_contracts%rowtype;
begin
  select * into c from awtad_contracts where id=p_id and org_id=awtad_my_org();
  if not found then raise exception 'العقد غير موجود'; end if;
  if c.employee_id is distinct from awtad_my_emp() then raise exception 'هذا العقد ليس لك'; end if;
  if c.status <> 'أُرسل' then raise exception 'العقد ليس بانتظار توقيعك'; end if;
  if length(trim(coalesce(p_name,''))) < 3 then raise exception 'اكتب اسمك الكامل للتوقيع'; end if;
  update awtad_contracts set status='موقَّع', signed_name=trim(p_name), signed_at=now() where id=p_id;
  return 'تم التوقيع';
end $$;
revoke all on function public.awtad_sign_contract(bigint,text) from public, anon;
grant execute on function public.awtad_sign_contract(bigint,text) to authenticated;
-- أوتاد: أسرار التكاملات (كتابة فقط من الواجهة)، بريد الموظف، الأصول، الإجراءات التأديبية، مهام الخروج.
-- نُفّذ على المشروع كترحيل awtad_12_secrets_assets_discipline. كائنات awtad_ فقط.
alter table awtad_employees add column if not exists email text;

create table if not exists awtad_secrets(
  org_id uuid not null references awtad_organizations(id) on delete cascade,
  provider text not null,
  config jsonb not null default '{}'::jsonb,
  secret text,
  updated_at timestamptz default now(),
  primary key (org_id, provider));
alter table awtad_secrets add column if not exists has_secret boolean generated always as (secret is not null and secret <> '') stored;
alter table awtad_secrets enable row level security;
create policy awtad_s_all on awtad_secrets for all using (org_id=awtad_my_org() and awtad_my_role()='admin') with check (org_id=awtad_my_org() and awtad_my_role()='admin');
revoke all on awtad_secrets from anon, authenticated;
grant select (org_id, provider, config, updated_at, has_secret) on awtad_secrets to authenticated;
grant insert (org_id, provider, config, secret, updated_at), update (config, secret, updated_at), delete on awtad_secrets to authenticated;
-- لا مشغّل تدقيق على هذا الجدول عمدًا حتى لا يُسجَّل السر

create table if not exists awtad_assets(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, employee_id bigint not null references awtad_employees(id) on delete cascade, name text not null, serial text, issued_on date default current_date, returned_on date, status text not null default 'مع الموظف');
create table if not exists awtad_disciplinary(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, employee_id bigint not null references awtad_employees(id) on delete cascade, kind text not null, on_date date default current_date, details text, status text not null default 'مسجّل');
create table if not exists awtad_exit_tasks(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, employee_id bigint not null references awtad_employees(id) on delete cascade, title text not null, done boolean not null default false);
do $$ declare t text; begin
 foreach t in array array['awtad_assets','awtad_disciplinary','awtad_exit_tasks'] loop
  execute format('alter table %I enable row level security', t);
  execute format('create policy awtad_w on %I for all using (org_id=awtad_my_org() and awtad_my_role() in (''admin'',''hr'')) with check (org_id=awtad_my_org())', t);
  execute format('create policy awtad_r on %I for select using (org_id=awtad_my_org() and (awtad_my_role() in (''admin'',''hr'',''manager'') or employee_id=awtad_my_emp()))', t);
 end loop;
 foreach t in array array['awtad_assets','awtad_disciplinary'] loop
  execute format('drop trigger if exists awtad_audit on %I', t);
  execute format('create trigger awtad_audit after insert or update or delete on %I for each row execute function public.awtad_audit_trg()', t);
 end loop;
end $$;
-- أوتاد: تعديلات رصيد الإجازات (ترحيل/استثناء)، تاريخ العودة، صورة السيلفي عند التسجيل.
-- نُفّذ على المشروع كترحيل awtad_13_leave_adjustments_selfie. كائنات awtad_ فقط.
alter table awtad_leaves add column if not exists returned_on date;
alter table awtad_attendance add column if not exists selfie_path text;

create table if not exists awtad_leave_adjustments(
  id bigint generated always as identity primary key,
  org_id uuid not null references awtad_organizations(id) on delete cascade,
  employee_id bigint not null references awtad_employees(id) on delete cascade,
  year int not null, kind text not null check (kind in ('ترحيل','استثناء','تسوية')),
  days numeric not null, note text, created_at timestamptz default now());
alter table awtad_leave_adjustments enable row level security;
create policy awtad_w on awtad_leave_adjustments for all using (org_id=awtad_my_org() and awtad_my_role() in ('admin','hr')) with check (org_id=awtad_my_org());
create policy awtad_r on awtad_leave_adjustments for select using (org_id=awtad_my_org() and (awtad_my_role() in ('admin','hr','manager') or employee_id=awtad_my_emp()));
drop trigger if exists awtad_audit on awtad_leave_adjustments;
create trigger awtad_audit after insert or update or delete on awtad_leave_adjustments for each row execute function public.awtad_audit_trg();

create policy awtad_docs_ins_selfie on storage.objects for insert to authenticated with check (bucket_id='awtad-docs' and (storage.foldername(name))[1]=awtad_my_org()::text and (storage.foldername(name))[2]=awtad_my_emp()::text and (storage.foldername(name))[3]='selfies');
-- أوتاد: الجداول التلقائية، الوظائف والتقديم، دورات التقييم، الاستبيان المجهول، مسارات التعلم، التقارير المحفوظة، ما قبل المباشرة.
-- نُفّذ على المشروع كترحيل awtad_14_cron_jobs_learning_surveys. كائنات awtad_ فقط، عدا تفعيل الامتداد pg_cron.
create extension if not exists pg_cron;

alter table awtad_organizations add column if not exists slug text;
create unique index if not exists awtad_org_slug_uq on awtad_organizations(slug) where slug is not null;
alter table awtad_employees add column if not exists preboarding boolean not null default false;
alter table awtad_candidates add column if not exists job_id bigint;
alter table awtad_candidates add column if not exists email text;
alter table awtad_candidates add column if not exists phone text;
alter table awtad_candidates add column if not exists cv_text text;
alter table awtad_candidates add column if not exists score numeric;
alter table awtad_surveys add column if not exists status text not null default 'مفتوح';
alter table awtad_expense_policies add column if not exists dept text;
alter table awtad_expense_policies drop constraint if exists awtad_expense_policies_org_id_category_key;
create unique index if not exists awtad_xpol_uq on awtad_expense_policies(org_id, category, coalesce(dept,''));
alter table awtad_reviews add column if not exists cycle_id bigint;

create table if not exists awtad_jobs(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, title text not null, dept text, description text, requirements text, status text not null default 'مفتوحة', created_at timestamptz default now());
create table if not exists awtad_review_cycles(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, name text not null, kind text default 'سنوية', from_date date, to_date date, status text not null default 'مفتوحة', criteria text);
create table if not exists awtad_survey_participation(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, survey_id bigint not null references awtad_surveys(id) on delete cascade, employee_id bigint not null references awtad_employees(id) on delete cascade, unique(survey_id, employee_id));
create table if not exists awtad_learning_paths(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, name text not null, description text);
create table if not exists awtad_path_courses(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, path_id bigint not null references awtad_learning_paths(id) on delete cascade, course_id bigint not null references awtad_courses(id) on delete cascade, position int default 0, unique(path_id, course_id));
create table if not exists awtad_saved_reports(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, name text not null, dataset text not null, columns jsonb not null default '[]'::jsonb, filters jsonb not null default '[]'::jsonb, created_at timestamptz default now());

do $$ declare t text; begin
 foreach t in array array['awtad_jobs','awtad_review_cycles','awtad_survey_participation','awtad_learning_paths','awtad_path_courses','awtad_saved_reports'] loop
  execute format('alter table %I enable row level security', t);
 end loop;
 foreach t in array array['awtad_jobs','awtad_review_cycles','awtad_learning_paths','awtad_path_courses','awtad_saved_reports'] loop
  execute format('create policy awtad_w on %I for all using (org_id=awtad_my_org() and awtad_my_role() in (''admin'',''hr'')) with check (org_id=awtad_my_org())', t);
  execute format('create policy awtad_r on %I for select using (org_id=awtad_my_org())', t);
 end loop;
 foreach t in array array['awtad_jobs','awtad_review_cycles'] loop
  execute format('drop trigger if exists awtad_audit on %I', t);
  execute format('create trigger awtad_audit after insert or update or delete on %I for each row execute function public.awtad_audit_trg()', t);
 end loop;
end $$;

create or replace function public.awtad_submit_survey(p_survey bigint, p_score int, p_comment text default null) returns text language plpgsql security definer set search_path=public as $$
declare e bigint; s awtad_surveys%rowtype;
begin
  e := awtad_my_emp();
  if e is null then raise exception 'حسابك غير مرتبط بسجل موظف'; end if;
  select * into s from awtad_surveys where id=p_survey and org_id=awtad_my_org();
  if not found then raise exception 'الاستبيان غير موجود'; end if;
  if s.status <> 'مفتوح' then raise exception 'الاستبيان مغلق'; end if;
  if p_score < 0 or p_score > 10 then raise exception 'الدرجة من 0 إلى 10'; end if;
  begin
    insert into awtad_survey_participation(org_id,survey_id,employee_id) values(s.org_id,p_survey,e);
  exception when unique_violation then raise exception 'سبق أن شاركت في هذا الاستبيان';
  end;
  insert into awtad_survey_responses(org_id,survey_id,score,comment) values(s.org_id,p_survey,p_score,nullif(trim(p_comment),''));
  return 'شكرًا لمشاركتك';
end $$;
revoke all on function public.awtad_submit_survey(bigint,int,text) from public, anon;
grant execute on function public.awtad_submit_survey(bigint,int,text) to authenticated;

create or replace function public.awtad_cron_renewals() returns int language plpgsql security definer set search_path=public as $$
declare n int;
begin
  insert into awtad_requests(org_id,employee_id,kind,req_date,reason)
  select e.org_id,e.id,'تجديد عقد',e.contract_end,'ينتهي العقد خلال 60 يومًا أو أقل (توليد آلي)'
  from awtad_employees e
  where e.active and e.contract_end between current_date and current_date+60
    and not exists(select 1 from awtad_requests r where r.employee_id=e.id and r.kind='تجديد عقد' and r.status like 'بانتظار%');
  get diagnostics n = row_count; return n;
end $$;
create or replace function public.awtad_cron_birthdays() returns int language plpgsql security definer set search_path=public as $$
declare n int;
begin
  insert into awtad_notifications(org_id,title,body,employee_id,kind)
  select e.org_id,'تهنئة بعيد ميلادك','كل عام وأنت بخير يا '||e.name||'، تتمنى لك المنشأة عامًا سعيدًا.',e.id,'تهنئة'
  from awtad_employees e
  where e.active and e.birth_date is not null and to_char(e.birth_date,'MM-DD')=to_char((now() at time zone 'Asia/Riyadh')::date,'MM-DD')
    and not exists(select 1 from awtad_notifications x where x.employee_id=e.id and x.kind='تهنئة' and x.created_at::date=current_date);
  get diagnostics n = row_count; return n;
end $$;
create or replace function public.awtad_cron_activate() returns int language plpgsql security definer set search_path=public as $$
declare n int;
begin
  update awtad_employees set active=true, preboarding=false where preboarding and join_date is not null and join_date <= (now() at time zone 'Asia/Riyadh')::date;
  get diagnostics n = row_count; return n;
end $$;
create or replace function public.awtad_cron_shift_reminders() returns int language plpgsql security definer set search_path=public as $$
declare n int; nowr timestamp := now() at time zone 'Asia/Riyadh'; today date := nowr::date; t time := nowr::time;
        dcode text := (array['sun','mon','tue','wed','thu','fri','sat'])[extract(dow from nowr)::int + 1];
begin
  insert into awtad_notifications(org_id,title,body,employee_id,kind)
  select a.org_id,'تذكير ببداية الدوام','يبدأ دوامك '||s.name||' الساعة '||to_char(s.start_time,'HH24:MI')||'.',a.employee_id,'تذكير'
  from (select distinct on (employee_id) * from awtad_shift_assign where from_date<=today and (until_date is null or today<=until_date) order by employee_id, from_date desc) a
  join awtad_shifts s on s.id=a.shift_id
  join awtad_employees e on e.id=a.employee_id and e.active
  where s.kind='ثابتة' and s.start_time is not null and position(dcode in s.work_days)>0
    and t >= s.start_time - interval '30 minutes' and t < s.start_time - interval '15 minutes'
    and not exists(select 1 from awtad_notifications x where x.employee_id=a.employee_id and x.kind='تذكير' and x.created_at::date=current_date and x.title='تذكير ببداية الدوام');
  get diagnostics n = row_count; return n;
end $$;
revoke all on function public.awtad_cron_renewals(), public.awtad_cron_birthdays(), public.awtad_cron_activate(), public.awtad_cron_shift_reminders() from public, anon, authenticated;

do $$ begin perform cron.unschedule(jobid) from cron.job where jobname like 'awtad-%'; end $$;
select cron.schedule('awtad-renewals','0 5 1 * *','select public.awtad_cron_renewals()');
select cron.schedule('awtad-birthdays','0 4 * * *','select public.awtad_cron_birthdays()');
select cron.schedule('awtad-activate','5 0 * * *','select public.awtad_cron_activate()');
select cron.schedule('awtad-shift-reminders','*/15 * * * *','select public.awtad_cron_shift_reminders()');
-- أوتاد: نظام المحاسبة (شجرة الحسابات، القيود، دفتر الأستاذ، ميزان المراجعة، الترحيل التلقائي، الرسوم الحكومية، إقفال السنة).
-- نُفّذ على المشروع كترحيل awtad_15_accounting. كائنات awtad_ فقط.
alter table awtad_employees add column if not exists phone text;
alter table awtad_employees add column if not exists work_permit_expiry date;
alter table awtad_employees add column if not exists health_insurance_expiry date;
alter table awtad_employees add column if not exists passport_expiry date;

alter table awtad_profiles drop constraint if exists awtad_profiles_role_check;
alter table awtad_profiles add constraint awtad_profiles_role_check check (role in ('admin','hr','manager','employee','accountant'));

create table if not exists awtad_acct_accounts(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, code text not null, name text not null, type text not null check (type in ('أصول','التزامات','حقوق ملكية','إيرادات','مصروفات')), parent_id bigint references awtad_acct_accounts(id) on delete restrict, is_group boolean not null default false, active boolean not null default true, unique(org_id, code));
create table if not exists awtad_fiscal_years(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, name text not null, start_date date not null, end_date date not null, status text not null default 'مفتوحة' check (status in ('مفتوحة','مغلقة')));
create table if not exists awtad_journals(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, entry_no int not null, entry_date date not null, description text, source text not null default 'يدوي', source_ref text, status text not null default 'مرحّل', reversed_of bigint, created_by uuid, created_at timestamptz default now(), unique(org_id, entry_no));
create unique index if not exists awtad_journal_src_uq on awtad_journals(org_id, source, source_ref) where source_ref is not null and reversed_of is null;
create unique index if not exists awtad_journal_rev_uq on awtad_journals(reversed_of) where reversed_of is not null;
create table if not exists awtad_journal_lines(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, journal_id bigint not null references awtad_journals(id) on delete cascade, account_id bigint not null references awtad_acct_accounts(id) on delete restrict, debit numeric not null default 0 check (debit >= 0), credit numeric not null default 0 check (credit >= 0), memo text, dept text, employee_id bigint, check (debit = 0 or credit = 0));
create index if not exists awtad_jl_acc on awtad_journal_lines(account_id);
create index if not exists awtad_jl_jr on awtad_journal_lines(journal_id);
create table if not exists awtad_acct_mappings(org_id uuid not null references awtad_organizations(id) on delete cascade, event text not null, debit_code text, credit_code text, primary key(org_id, event));
create table if not exists awtad_fees(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, employee_id bigint references awtad_employees(id) on delete set null, kind text not null, amount numeric not null, vat numeric not null default 0, paid_on date default current_date, pay_code text default '1110', note text, journal_id bigint, created_at timestamptz default now());

do $$ declare t text; begin
 foreach t in array array['awtad_acct_accounts','awtad_fiscal_years','awtad_journals','awtad_journal_lines','awtad_acct_mappings','awtad_fees'] loop
  execute format('alter table %I enable row level security', t);
 end loop;
 foreach t in array array['awtad_acct_accounts','awtad_fiscal_years','awtad_acct_mappings'] loop
  execute format('create policy awtad_acct_all on %I for all using (org_id=awtad_my_org() and awtad_my_role() in (''admin'',''accountant'')) with check (org_id=awtad_my_org())', t);
 end loop;
 foreach t in array array['awtad_journals','awtad_journal_lines'] loop
  execute format('create policy awtad_acct_r on %I for select using (org_id=awtad_my_org() and awtad_my_role() in (''admin'',''accountant''))', t);
 end loop;
end $$;
revoke insert, update, delete on awtad_journals, awtad_journal_lines from authenticated;
create policy awtad_fee_r on awtad_fees for select using (org_id=awtad_my_org() and awtad_my_role() in ('admin','hr','accountant'));
revoke insert, update, delete on awtad_fees from authenticated;

do $$ declare t text; begin
 foreach t in array array['awtad_employees','awtad_expenses','awtad_loans','awtad_trips','awtad_petty_cash','awtad_petty_spend','awtad_journal_entries'] loop
  execute format('create policy awtad_acct_read on %I for select using (org_id=awtad_my_org() and awtad_my_role()=''accountant'')', t);
 end loop; end $$;

-- دوال داخلية (لا تُمنح للمستخدمين)
create or replace function public.awtad__post(p_org uuid, p_date date, p_desc text, p_source text, p_ref text, p_lines jsonb, p_user uuid default null) returns bigint language plpgsql security definer set search_path=public as $$
declare j bigint; l jsonb; acc bigint; d numeric := 0; c numeric := 0; no int; ex bigint;
begin
  perform pg_advisory_xact_lock(hashtext(p_org::text));
  if p_ref is not null then select id into ex from awtad_journals where org_id=p_org and source=p_source and source_ref=p_ref and reversed_of is null; if ex is not null then return ex; end if; end if;
  if exists(select 1 from awtad_fiscal_years where org_id=p_org and status='مغلقة' and p_date between start_date and end_date) then raise exception 'الفترة المالية مغلقة ولا يمكن الترحيل فيها'; end if;
  for l in select * from jsonb_array_elements(p_lines) loop d := d + coalesce((l->>'debit')::numeric,0); c := c + coalesce((l->>'credit')::numeric,0); end loop;
  if d <= 0 or round(d,2) <> round(c,2) then raise exception 'القيد غير متوازن: مدين % ودائن %', round(d,2), round(c,2); end if;
  select coalesce(max(entry_no),0)+1 into no from awtad_journals where org_id=p_org;
  insert into awtad_journals(org_id,entry_no,entry_date,description,source,source_ref,created_by) values(p_org,no,p_date,p_desc,p_source,p_ref,coalesce(p_user,auth.uid())) returning id into j;
  for l in select * from jsonb_array_elements(p_lines) loop
    if coalesce((l->>'debit')::numeric,0)=0 and coalesce((l->>'credit')::numeric,0)=0 then continue; end if;
    select id into acc from awtad_acct_accounts where org_id=p_org and code=(l->>'code') and not is_group and active;
    if acc is null then raise exception 'حساب غير صالح أو غير نشط أو رئيسي: %', l->>'code'; end if;
    insert into awtad_journal_lines(org_id,journal_id,account_id,debit,credit,memo,dept,employee_id) values(p_org,j,acc,coalesce((l->>'debit')::numeric,0),coalesce((l->>'credit')::numeric,0),l->>'memo',l->>'dept',nullif(l->>'employee_id','')::bigint);
  end loop;
  return j;
end $$;

create or replace function public.awtad__event(p_org uuid, p_event text, p_amount numeric, p_desc text, p_source text, p_ref text, p_dept text, p_emp bigint, p_date date) returns bigint language plpgsql security definer set search_path=public as $$
declare m awtad_acct_mappings%rowtype;
begin
  select * into m from awtad_acct_mappings where org_id=p_org and event=p_event;
  if not found or coalesce(p_amount,0) <= 0 or m.debit_code is null or m.credit_code is null then return null; end if;
  begin
    return awtad__post(p_org, coalesce(p_date,current_date), p_desc, p_source, p_ref, jsonb_build_array(
      jsonb_build_object('code',m.debit_code,'debit',p_amount,'memo',p_desc,'dept',p_dept,'employee_id',p_emp),
      jsonb_build_object('code',m.credit_code,'credit',p_amount,'memo',p_desc,'dept',p_dept,'employee_id',p_emp)));
  exception when others then
    insert into awtad_integration_logs(org_id,platform,action,result) values(p_org,'المحاسبة','ترحيل آلي: '||p_event,left('فشل: '||sqlerrm,300));
    return null;
  end;
end $$;

create or replace function public.awtad__seed_chart(p_org uuid) returns int language plpgsql security definer set search_path=public as $$
declare r jsonb; n int := 0;
  rows jsonb := '[
   ["1000","الأصول","أصول",true,null],["1100","الأصول المتداولة","أصول",true,"1000"],["1110","الصندوق","أصول",false,"1100"],["1120","البنوك","أصول",false,"1100"],["1140","عهد الموظفين","أصول",false,"1100"],["1150","سلف الموظفين","أصول",false,"1100"],["1160","ضريبة القيمة المضافة - مدخلات","أصول",false,"1100"],["1170","مصروفات مدفوعة مقدمًا","أصول",false,"1100"],
   ["1200","الأصول الثابتة","أصول",true,"1000"],["1210","الأجهزة والمعدات","أصول",false,"1200"],["1220","الأثاث والتجهيزات","أصول",false,"1200"],
   ["2000","الالتزامات","التزامات",true,null],["2100","الالتزامات المتداولة","التزامات",true,"2000"],["2110","رواتب مستحقة","التزامات",false,"2100"],["2120","التأمينات الاجتماعية المستحقة","التزامات",false,"2100"],["2130","مستحقات الموظفين","التزامات",false,"2100"],["2140","ضريبة القيمة المضافة - مخرجات","التزامات",false,"2100"],["2150","مصروفات مستحقة","التزامات",false,"2100"],["2160","مخصص نهاية الخدمة","التزامات",false,"2100"],
   ["3000","حقوق الملكية","حقوق ملكية",true,null],["3100","رأس المال","حقوق ملكية",false,"3000"],["3200","الأرباح المبقاة","حقوق ملكية",false,"3000"],
   ["4000","الإيرادات","إيرادات",true,null],["4100","إيرادات النشاط","إيرادات",false,"4000"],["4900","إيرادات أخرى","إيرادات",false,"4000"],
   ["5000","المصروفات","مصروفات",true,null],["5100","مصروفات الموظفين","مصروفات",true,"5000"],["5110","الرواتب والأجور","مصروفات",false,"5100"],["5120","العمل الإضافي","مصروفات",false,"5100"],["5130","التأمينات الاجتماعية - حصة المنشأة","مصروفات",false,"5100"],["5150","مكافأة نهاية الخدمة","مصروفات",false,"5100"],
   ["5200","الرسوم الحكومية","مصروفات",true,"5000"],["5210","رسوم الإقامة","مصروفات",false,"5200"],["5220","رخص العمل","مصروفات",false,"5200"],["5230","التأشيرات والخروج والعودة","مصروفات",false,"5200"],["5240","رسوم قوى ومدد ومقيم","مصروفات",false,"5200"],["5250","رسوم بلدية وتجارية","مصروفات",false,"5200"],
   ["5300","التأمين الطبي","مصروفات",false,"5000"],["5400","السفر والانتقال","مصروفات",false,"5000"],["5410","الضيافة","مصروفات",false,"5000"],["5420","المستلزمات","مصروفات",false,"5000"],["5430","مصروفات أخرى","مصروفات",false,"5000"],["5500","التدريب","مصروفات",false,"5000"],["5600","الإيجارات","مصروفات",false,"5000"]]'::jsonb;
begin
  if exists(select 1 from awtad_acct_accounts where org_id=p_org) then return 0; end if;
  for r in select * from jsonb_array_elements(rows) loop
    insert into awtad_acct_accounts(org_id,code,name,type,is_group,parent_id)
    values(p_org, r->>0, r->>1, r->>2, (r->>3)::boolean, (select id from awtad_acct_accounts where org_id=p_org and code=(r->>4)));
    n := n + 1;
  end loop;
  insert into awtad_acct_mappings(org_id,event,debit_code,credit_code) values
   (p_org,'مصروف:سفر','5400','2130'),(p_org,'مصروف:ضيافة','5410','2130'),(p_org,'مصروف:مستلزمات','5420','2130'),(p_org,'مصروف:أخرى','5430','2130'),
   (p_org,'رحلة عمل','5400','2130'),(p_org,'عهدة صرف','1140','1110'),(p_org,'عهدة مصروف','5430','1140'),(p_org,'سلفة','1150','1110'),
   (p_org,'رسم:تجديد إقامة','5210',null),(p_org,'رسم:رخصة عمل','5220',null),(p_org,'رسم:خروج وعودة','5230',null),(p_org,'رسم:رسوم قوى','5240',null),(p_org,'رسم:رسوم مقيم','5240',null),(p_org,'رسم:رسوم مدد','5240',null),(p_org,'رسم:بلدية','5250',null),(p_org,'رسم:تأمين طبي','5300',null),(p_org,'رسم:أخرى','5430',null)
   on conflict do nothing;
  return n;
end $$;

create or replace function public.awtad__tb(p_org uuid, p_from date, p_to date) returns table(account_id bigint, code text, name text, type text, parent_id bigint, is_group boolean, active boolean, debit numeric, credit numeric) language sql stable security definer set search_path=public as $$
  select a.id,a.code,a.name,a.type,a.parent_id,a.is_group,a.active,coalesce(sum(l.debit),0),coalesce(sum(l.credit),0)
  from awtad_acct_accounts a
  left join (select jl.* from awtad_journal_lines jl join awtad_journals j on j.id=jl.journal_id where j.org_id=p_org and j.entry_date between p_from and p_to) l on l.account_id=a.id
  where a.org_id=p_org group by a.id order by a.code $$;

revoke all on function public.awtad__post(uuid,date,text,text,text,jsonb,uuid), public.awtad__event(uuid,text,numeric,text,text,text,text,bigint,date), public.awtad__seed_chart(uuid), public.awtad__tb(uuid,date,date) from public, anon, authenticated;

-- واجهات المستخدم (بفحص الدور)
create or replace function public.awtad_seed_chart() returns int language plpgsql security definer set search_path=public as $$
begin
  if awtad_my_role() not in ('admin','accountant') then raise exception 'غير مسموح'; end if;
  return awtad__seed_chart(awtad_my_org());
end $$;
create or replace function public.awtad_post_journal(p_date date, p_desc text, p_lines jsonb, p_source text default 'يدوي', p_ref text default null) returns bigint language plpgsql security definer set search_path=public as $$
begin
  if awtad_my_role() not in ('admin','accountant') then raise exception 'غير مسموح'; end if;
  return awtad__post(awtad_my_org(), p_date, p_desc, p_source, p_ref, p_lines);
end $$;
create or replace function public.awtad_reverse_journal(p_id bigint) returns bigint language plpgsql security definer set search_path=public as $$
declare j awtad_journals%rowtype; lines jsonb; new_id bigint;
begin
  if awtad_my_role() not in ('admin','accountant') then raise exception 'غير مسموح'; end if;
  select * into j from awtad_journals where id=p_id and org_id=awtad_my_org();
  if not found then raise exception 'القيد غير موجود'; end if;
  if j.reversed_of is not null then raise exception 'هذا قيد عكسي ولا يُعكس'; end if;
  if exists(select 1 from awtad_journals where reversed_of=p_id) then raise exception 'القيد معكوس مسبقًا'; end if;
  select jsonb_agg(jsonb_build_object('code',a.code,'debit',l.credit,'credit',l.debit,'memo','عكس: '||coalesce(l.memo,''),'dept',l.dept,'employee_id',l.employee_id)) into lines
  from awtad_journal_lines l join awtad_acct_accounts a on a.id=l.account_id where l.journal_id=p_id;
  new_id := awtad__post(j.org_id, current_date, 'عكس القيد رقم '||j.entry_no||' — '||coalesce(j.description,''), 'عكس', 'rev-'||p_id, lines);
  update awtad_journals set reversed_of=p_id where id=new_id;
  return new_id;
end $$;
create or replace function public.awtad_trial_balance(p_from date, p_to date) returns table(account_id bigint, code text, name text, type text, parent_id bigint, is_group boolean, active boolean, debit numeric, credit numeric) language plpgsql security definer set search_path=public as $$
begin
  if awtad_my_role() not in ('admin','accountant') then raise exception 'غير مسموح'; end if;
  return query select * from awtad__tb(awtad_my_org(), p_from, p_to);
end $$;
create or replace function public.awtad_ledger(p_account bigint, p_from date, p_to date) returns table(entry_date date, entry_no int, journal_id bigint, description text, memo text, debit numeric, credit numeric, source text) language plpgsql security definer set search_path=public as $$
begin
  if awtad_my_role() not in ('admin','accountant') then raise exception 'غير مسموح'; end if;
  return query select j.entry_date,j.entry_no,j.id,j.description,l.memo,l.debit,l.credit,j.source from awtad_journal_lines l join awtad_journals j on j.id=l.journal_id
    where j.org_id=awtad_my_org() and l.account_id=p_account and j.entry_date between p_from and p_to order by j.entry_date, j.entry_no, l.id;
end $$;
create or replace function public.awtad_post_payroll(p_period text, p_salary numeric, p_ot numeric, p_gr numeric, p_reimb numeric, p_net numeric, p_social numeric, p_loan numeric) returns bigint language plpgsql security definer set search_path=public as $$
declare dt date := (p_period||'-01')::date + interval '1 month' - interval '1 day';
begin
  if awtad_my_role() not in ('admin','accountant','hr') then raise exception 'غير مسموح'; end if;
  return awtad__post(awtad_my_org(), dt, 'قيد رواتب '||p_period, 'رواتب', p_period, jsonb_build_array(
    jsonb_build_object('code','5110','debit',p_salary,'memo','الرواتب والأجور'),
    jsonb_build_object('code','5120','debit',p_ot,'memo','العمل الإضافي'),
    jsonb_build_object('code','5130','debit',p_gr,'memo','تأمينات - حصة المنشأة'),
    jsonb_build_object('code','2130','debit',p_reimb,'memo','تسوية مستحقات الموظفين'),
    jsonb_build_object('code','2110','credit',p_net,'memo','صافي الرواتب'),
    jsonb_build_object('code','2120','credit',p_social,'memo','التأمينات المستحقة'),
    jsonb_build_object('code','1150','credit',p_loan,'memo','أقساط السلف')));
end $$;
create or replace function public.awtad_record_fee(p_employee bigint, p_kind text, p_amount numeric, p_vat numeric, p_date date, p_pay_code text, p_new_expiry date, p_note text) returns bigint language plpgsql security definer set search_path=public as $$
declare org uuid := awtad_my_org(); m awtad_acct_mappings%rowtype; jid bigint; fid bigint; dept text; v numeric := coalesce(p_vat,0);
begin
  if awtad_my_role() not in ('admin','accountant','hr') then raise exception 'غير مسموح'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'المبلغ مطلوب'; end if;
  select * into m from awtad_acct_mappings where org_id=org and event='رسم:'||p_kind;
  if not found or m.debit_code is null then select * into m from awtad_acct_mappings where org_id=org and event='رسم:أخرى'; end if;
  if m.debit_code is null then raise exception 'هيّئ شجرة الحسابات وربط الأحداث أولًا'; end if;
  select e.dept into dept from awtad_employees e where e.id=p_employee and e.org_id=org;
  insert into awtad_fees(org_id,employee_id,kind,amount,vat,paid_on,pay_code,note) values(org,p_employee,p_kind,p_amount,v,coalesce(p_date,current_date),coalesce(p_pay_code,'1110'),p_note) returning id into fid;
  jid := awtad__post(org, coalesce(p_date,current_date), 'رسوم: '||p_kind||coalesce(' — '||p_note,''), 'رسوم', 'fee-'||fid, jsonb_build_array(
    jsonb_build_object('code',m.debit_code,'debit',p_amount,'memo',p_kind,'dept',dept,'employee_id',p_employee),
    jsonb_build_object('code','1160','debit',v,'memo','ضريبة القيمة المضافة','dept',dept),
    jsonb_build_object('code',coalesce(p_pay_code,'1110'),'credit',p_amount+v,'memo','سداد '||p_kind)));
  update awtad_fees set journal_id=jid where id=fid;
  if p_employee is not null and p_new_expiry is not null then
    if p_kind='تجديد إقامة' then update awtad_employees set iqama_expiry=p_new_expiry where id=p_employee and org_id=org;
    elsif p_kind='رخصة عمل' then update awtad_employees set work_permit_expiry=p_new_expiry where id=p_employee and org_id=org;
    elsif p_kind='تأمين طبي' then update awtad_employees set health_insurance_expiry=p_new_expiry where id=p_employee and org_id=org; end if;
  end if;
  return fid;
end $$;
create or replace function public.awtad_close_year(p_year bigint) returns bigint language plpgsql security definer set search_path=public as $$
declare fy awtad_fiscal_years%rowtype; org uuid := awtad_my_org(); lines jsonb := '[]'::jsonb; r record; bal numeric; net numeric := 0; jid bigint;
begin
  if awtad_my_role() not in ('admin','accountant') then raise exception 'غير مسموح'; end if;
  select * into fy from awtad_fiscal_years where id=p_year and org_id=org;
  if not found then raise exception 'السنة المالية غير موجودة'; end if;
  if fy.status='مغلقة' then raise exception 'السنة مغلقة مسبقًا'; end if;
  for r in select * from awtad__tb(org, fy.start_date, fy.end_date) where not is_group and type in ('إيرادات','مصروفات') loop
    bal := case when r.type='إيرادات' then r.credit - r.debit else r.debit - r.credit end;
    if bal = 0 then continue; end if;
    if r.type='إيرادات' then
      lines := lines || jsonb_build_array(jsonb_build_object('code',r.code,'debit',greatest(bal,0),'credit',greatest(-bal,0),'memo','إقفال'));
      net := net + bal;
    else
      lines := lines || jsonb_build_array(jsonb_build_object('code',r.code,'credit',greatest(bal,0),'debit',greatest(-bal,0),'memo','إقفال'));
      net := net - bal;
    end if;
  end loop;
  if jsonb_array_length(lines) > 0 then
    lines := lines || jsonb_build_array(jsonb_build_object('code','3200','credit',greatest(net,0),'debit',greatest(-net,0),'memo','صافي نتيجة السنة '||fy.name));
    jid := awtad__post(org, fy.end_date, 'قيد إقفال السنة المالية '||fy.name, 'إقفال', 'close-'||p_year, lines);
  end if;
  update awtad_fiscal_years set status='مغلقة' where id=p_year;
  return jid;
end $$;
revoke all on function public.awtad_seed_chart(), public.awtad_post_journal(date,text,jsonb,text,text), public.awtad_reverse_journal(bigint), public.awtad_trial_balance(date,date), public.awtad_ledger(bigint,date,date), public.awtad_post_payroll(text,numeric,numeric,numeric,numeric,numeric,numeric,numeric), public.awtad_record_fee(bigint,text,numeric,numeric,date,text,date,text), public.awtad_close_year(bigint) from public, anon;
grant execute on function public.awtad_seed_chart(), public.awtad_post_journal(date,text,jsonb,text,text), public.awtad_reverse_journal(bigint), public.awtad_trial_balance(date,date), public.awtad_ledger(bigint,date,date), public.awtad_post_payroll(text,numeric,numeric,numeric,numeric,numeric,numeric,numeric), public.awtad_record_fee(bigint,text,numeric,numeric,date,text,date,text), public.awtad_close_year(bigint) to authenticated;

-- الترحيل التلقائي من أقسام النظام
create or replace function public.awtad_tr_expense() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status='معتمد' and old.status is distinct from 'معتمد' then
    perform awtad__event(new.org_id,'مصروف:'||coalesce(new.category,'أخرى'),new.amount,'مصروف معتمد — '||coalesce(nullif(new.note,''),new.category),'مصروف','exp-'||new.id,(select dept from awtad_employees where id=new.employee_id),new.employee_id,coalesce(new.expense_date,current_date));
  end if; return new;
end $$;
create or replace function public.awtad_tr_trip() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status='معتمدة' and old.status is distinct from 'معتمدة' then
    perform awtad__event(new.org_id,'رحلة عمل',coalesce(new.daily_allowance,0)*(coalesce(new.to_date,new.from_date)-new.from_date+1),'بدل رحلة عمل — '||new.destination,'رحلة','trip-'||new.id,(select dept from awtad_employees where id=new.employee_id),new.employee_id,coalesce(new.from_date,current_date));
  end if; return new;
end $$;
create or replace function public.awtad_tr_petty() returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform awtad__event(new.org_id,'عهدة صرف',new.amount,'إصدار عهدة — '||coalesce(new.note,''),'عهدة','petty-'||new.id,(select dept from awtad_employees where id=new.employee_id),new.employee_id,coalesce(new.issued_on,current_date));
  return new;
end $$;
create or replace function public.awtad_tr_pspend() returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform awtad__event(new.org_id,'عهدة مصروف',new.amount,'مصروف عهدة — '||coalesce(new.note,''),'مصروف عهدة','pspend-'||new.id,null,(select employee_id from awtad_petty_cash where id=new.petty_id),coalesce(new.spent_on,current_date));
  return new;
end $$;
create or replace function public.awtad_tr_loan() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status='معتمد' and (tg_op='INSERT' or old.status is distinct from 'معتمد') then
    perform awtad__event(new.org_id,'سلفة',new.amount,'سلفة موظف — '||coalesce(new.note,''),'سلفة','loan-'||new.id,(select dept from awtad_employees where id=new.employee_id),new.employee_id,current_date);
  end if; return new;
end $$;
drop trigger if exists awtad_acct_exp on awtad_expenses; create trigger awtad_acct_exp after update on awtad_expenses for each row execute function public.awtad_tr_expense();
drop trigger if exists awtad_acct_trip on awtad_trips; create trigger awtad_acct_trip after update on awtad_trips for each row execute function public.awtad_tr_trip();
drop trigger if exists awtad_acct_petty on awtad_petty_cash; create trigger awtad_acct_petty after insert on awtad_petty_cash for each row execute function public.awtad_tr_petty();
drop trigger if exists awtad_acct_pspend on awtad_petty_spend; create trigger awtad_acct_pspend after insert on awtad_petty_spend for each row execute function public.awtad_tr_pspend();
drop trigger if exists awtad_acct_loan on awtad_loans; create trigger awtad_acct_loan after insert or update on awtad_loans for each row execute function public.awtad_tr_loan();

do $$ declare t text; begin
 foreach t in array array['awtad_acct_accounts','awtad_journals','awtad_fees','awtad_acct_mappings','awtad_fiscal_years'] loop
  execute format('drop trigger if exists awtad_audit on %I', t);
  execute format('create trigger awtad_audit after insert or update or delete on %I for each row execute function public.awtad_audit_trg()', t);
 end loop; end $$;

create or replace function public.awtad_update_profile(p_user uuid, p_role text, p_modules text[]) returns text language plpgsql security definer set search_path=public as $$
declare org uuid;
begin
  if awtad_my_role() is distinct from 'admin' then raise exception 'غير مسموح: لمدير النظام فقط'; end if;
  if p_role not in ('admin','hr','manager','employee','accountant') then raise exception 'دور غير صالح'; end if;
  org := awtad_my_org();
  if p_role <> 'admin' and not exists(select 1 from awtad_profiles where org_id=org and role='admin' and id<>p_user) then raise exception 'لا يمكن إزالة آخر مدير نظام'; end if;
  update awtad_profiles set role=p_role, module_access=p_modules where id=p_user and org_id=org;
  return 'تم التحديث';
end $$;
create or replace function public.awtad_assign_user(p_email text, p_employee_id bigint, p_role text) returns uuid language plpgsql security definer set search_path=public as $$
declare uid uuid; org uuid; ename text;
begin
  if awtad_my_role() is distinct from 'admin' then raise exception 'غير مسموح: هذه العملية لمدير النظام فقط'; end if;
  if p_role not in ('admin','hr','manager','employee','accountant') then raise exception 'دور غير صالح'; end if;
  org := awtad_my_org();
  select id into uid from auth.users where lower(email)=lower(trim(p_email));
  if uid is null then raise exception 'هذا البريد غير مسجّل. اطلب من المستخدم إنشاء حساب ببريده أولًا'; end if;
  if exists(select 1 from awtad_profiles where id=uid and org_id<>org) then raise exception 'هذا المستخدم يتبع منشأة أخرى'; end if;
  if p_employee_id is not null then
    select name into ename from awtad_employees where id=p_employee_id and org_id=org;
    if ename is null then raise exception 'الموظف غير موجود في منشأتك'; end if;
  end if;
  insert into awtad_profiles(id,org_id,role,employee_id,full_name,email) values(uid,org,p_role,p_employee_id,ename,lower(trim(p_email)))
  on conflict (id) do update set role=excluded.role, employee_id=excluded.employee_id, full_name=coalesce(excluded.full_name, awtad_profiles.full_name), email=excluded.email;
  return uid;
end $$;
-- أوتاد: ملف الشركة والترويسة، مستندات الشركة، المواعيد والمهل، بوابة الموظف الخارجية.
-- نُفّذ على المشروع كترحيل awtad_16_company_deadlines_portal. كائنات awtad_ فقط.
alter table awtad_profiles add column if not exists portal_username text;
alter table awtad_profiles add column if not exists portal_created_at timestamptz;
create unique index if not exists awtad_profiles_portal_user_uq on awtad_profiles(portal_username) where portal_username is not null;
alter table awtad_employees add column if not exists portal_username text;

create table if not exists awtad_company_profile(
  org_id uuid primary key references awtad_organizations(id) on delete cascade,
  name_ar text, name_en text, cr_number text, vat_number text, unified_no text,
  address text, city text, phone text, email text, website text,
  logo_path text, header_note text, footer_note text, brand_color text default '#0a6cc2',
  updated_at timestamptz default now());
create table if not exists awtad_company_docs(
  id bigint generated always as identity primary key,
  org_id uuid not null references awtad_organizations(id) on delete cascade,
  kind text not null, title text not null, number text, issuer text,
  issue_date date, expiry_date date, notify_days int not null default 60,
  notes text, file_path text, created_at timestamptz default now());
create table if not exists awtad_deadlines(
  id bigint generated always as identity primary key,
  org_id uuid not null references awtad_organizations(id) on delete cascade,
  title text not null, category text default 'عام',
  recurrence text not null default 'شهري' check (recurrence in ('شهري','سنوي','مرة واحدة')),
  day_of_month int, month_of_year int, due_date date,
  notify_days int not null default 7, notes text, done_period text, active boolean not null default true);

alter table awtad_company_profile enable row level security;
alter table awtad_company_docs enable row level security;
alter table awtad_deadlines enable row level security;
create policy awtad_cp_r on awtad_company_profile for select using (org_id=awtad_my_org());
create policy awtad_cp_w on awtad_company_profile for all using (org_id=awtad_my_org() and awtad_my_role() in ('admin','hr','accountant')) with check (org_id=awtad_my_org());
create policy awtad_cd_all on awtad_company_docs for all using (org_id=awtad_my_org() and awtad_my_role() in ('admin','hr','accountant')) with check (org_id=awtad_my_org());
create policy awtad_dl_all on awtad_deadlines for all using (org_id=awtad_my_org() and awtad_my_role() in ('admin','hr','accountant')) with check (org_id=awtad_my_org());
create policy awtad_dl_r on awtad_deadlines for select using (org_id=awtad_my_org() and awtad_my_role()='manager');

do $$ declare t text; begin
 foreach t in array array['awtad_company_profile','awtad_company_docs','awtad_deadlines'] loop
  execute format('drop trigger if exists awtad_audit on %I', t);
  execute format('create trigger awtad_audit after insert or update or delete on %I for each row execute function public.awtad_audit_trg()', t);
 end loop; end $$;

create policy awtad_docs_company_r on storage.objects for select to authenticated using (bucket_id='awtad-docs' and (storage.foldername(name))[1]=awtad_my_org()::text and (storage.foldername(name))[2]='company' and awtad_my_role() in ('admin','hr','accountant','manager','employee'));
create policy awtad_docs_company_w on storage.objects for insert to authenticated with check (bucket_id='awtad-docs' and (storage.foldername(name))[1]=awtad_my_org()::text and (storage.foldername(name))[2]='company' and awtad_my_role() in ('admin','hr','accountant'));
create policy awtad_docs_company_d on storage.objects for delete to authenticated using (bucket_id='awtad-docs' and (storage.foldername(name))[1]=awtad_my_org()::text and (storage.foldername(name))[2]='company' and awtad_my_role() in ('admin','hr','accountant'));
