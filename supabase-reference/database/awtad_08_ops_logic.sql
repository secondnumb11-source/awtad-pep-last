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
