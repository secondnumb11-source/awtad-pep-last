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
