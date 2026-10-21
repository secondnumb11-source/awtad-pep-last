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
