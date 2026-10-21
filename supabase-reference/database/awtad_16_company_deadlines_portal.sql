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
