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
