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
