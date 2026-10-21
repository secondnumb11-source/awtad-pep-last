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
