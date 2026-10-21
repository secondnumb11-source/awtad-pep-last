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
