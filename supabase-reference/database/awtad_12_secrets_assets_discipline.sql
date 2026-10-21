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
