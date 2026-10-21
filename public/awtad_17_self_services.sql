-- أوتاد: الخدمات الذاتية للموظفين (Employee Self Services)
-- يُنفَّذ مرة واحدة في محرر SQL بمشروع قاعدة البيانات. آمن لإعادة التشغيل. كائنات awtad_ فقط.
-- مسار الاعتماد: المدير المباشر ← الموارد البشرية ← الحسابات (حسب نوع الخدمة).

-- 1) حقول إضافية لملف الموظف
alter table awtad_employees add column if not exists name_en text;
alter table awtad_employees add column if not exists job_en text;
alter table awtad_employees add column if not exists contract_type text;
alter table awtad_employees add column if not exists contract_start date;
alter table awtad_employees add column if not exists passport_no text;
alter table awtad_employees add column if not exists insurance_no text;
alter table awtad_employees add column if not exists insurance_company text;
alter table awtad_employees add column if not exists insurance_class text;
alter table awtad_employees add column if not exists bank_name text;
alter table awtad_employees add column if not exists photo_path text;
alter table awtad_employees add column if not exists annual_leave_days int;
alter table awtad_employees add column if not exists marriage_bonus numeric;
alter table awtad_employees add column if not exists birth_bonus numeric;
alter table awtad_employees add column if not exists remote_punch boolean not null default false;

-- 2) جدول طلبات الخدمات الذاتية
create table if not exists awtad_ess_requests(
  id bigint generated always as identity primary key,
  org_id uuid not null references awtad_organizations(id) on delete cascade,
  employee_id bigint not null references awtad_employees(id) on delete cascade,
  service text not null,
  title text,
  details jsonb not null default '{}'::jsonb,
  amount numeric,
  attachment_path text,
  result_path text,
  flow text[] not null default array['manager','hr'],
  stage text not null default 'manager' check (stage in ('manager','hr','accounts','done','rejected')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists awtad_ess_requests_emp on awtad_ess_requests(employee_id);
create index if not exists awtad_ess_requests_stage on awtad_ess_requests(org_id, stage);

grant select on public.awtad_ess_requests to authenticated;
grant all on public.awtad_ess_requests to service_role;
alter table awtad_ess_requests enable row level security;

drop policy if exists awtad_ess_r on awtad_ess_requests;
create policy awtad_ess_r on awtad_ess_requests for select to authenticated using (
  org_id = awtad_my_org() and (
    employee_id = awtad_my_emp()
    or coalesce(awtad_my_role(),'') in ('admin','hr')
    or (coalesce(awtad_my_role(),'') = 'accountant' and 'accounts' = any(flow))
    or exists (select 1 from awtad_employees e where e.id = employee_id and e.manager_id is not null and e.manager_id = awtad_my_emp())
  ));
-- لا كتابة مباشرة: الإنشاء والقرار عبر الدوال أدناه فقط.

-- 3) أداة داخلية: إشعار + قائمة البريد لمرحلة معيّنة
create or replace function public.awtad_ess_recipients(p_org uuid, p_emp bigint, p_stage text)
returns table(employee_id bigint, email text, name text) language sql stable security definer set search_path=public as $$
  select e.id, coalesce(e.email, p.email), e.name from awtad_employees e
   left join awtad_profiles p on p.employee_id = e.id
   where p_stage = 'manager' and e.id = (select manager_id from awtad_employees where id = p_emp)
  union
  select p.employee_id, coalesce(p.email, e.email), coalesce(e.name, p.full_name) from awtad_profiles p
   left join awtad_employees e on e.id = p.employee_id
   where p.org_id = p_org and (
     (p_stage = 'hr' and p.role in ('admin','hr')) or
     (p_stage = 'accounts' and p.role in ('admin','accountant')))
$$;
revoke all on function public.awtad_ess_recipients(uuid,bigint,text) from public, anon, authenticated;

create or replace function public.awtad_ess_notify(p_org uuid, p_emp bigint, p_stage text, p_title text, p_body text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare out jsonb := '[]'::jsonb; r record;
begin
  for r in select * from awtad_ess_recipients(p_org, p_emp, p_stage) loop
    if r.employee_id is not null then
      insert into awtad_notifications(org_id,title,body,employee_id,kind) values(p_org,p_title,p_body,r.employee_id,'خدمات ذاتية');
    end if;
    if r.email is not null then out := out || jsonb_build_array(jsonb_build_object('email',r.email,'name',r.name)); end if;
  end loop;
  return out;
end $$;
revoke all on function public.awtad_ess_notify(uuid,bigint,text,text,text) from public, anon, authenticated;

-- 4) تقديم طلب من الموظف نفسه
create or replace function public.awtad_ess_submit(p_service text, p_title text, p_details jsonb, p_amount numeric default null, p_attachment text default null, p_flow text[] default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_emp bigint := awtad_my_emp(); v_org uuid := awtad_my_org(); v_mgr bigint; v_flow text[]; v_stage text; v_id bigint; v_name text; v_mail jsonb;
begin
  if v_emp is null or v_org is null then raise exception 'حسابك غير مرتبط بسجل موظف'; end if;
  if p_service is null or length(p_service) > 40 then raise exception 'نوع الخدمة غير صالح'; end if;
  if p_attachment is not null and p_attachment not like v_org::text || '/' || v_emp::text || '/ess/%' then raise exception 'مسار المرفق غير صالح'; end if;
  select manager_id, name into v_mgr, v_name from awtad_employees where id = v_emp and org_id = v_org;
  v_flow := coalesce(p_flow, array['manager','hr']);
  if not (v_flow <@ array['manager','hr','accounts']) or cardinality(v_flow) = 0 then raise exception 'مسار اعتماد غير صالح'; end if;
  if v_mgr is null or v_mgr = v_emp then v_flow := array_remove(v_flow, 'manager'); end if;
  if cardinality(v_flow) = 0 then v_flow := array['hr']; end if;
  v_stage := v_flow[1];
  insert into awtad_ess_requests(org_id,employee_id,service,title,details,amount,attachment_path,flow,stage,history)
  values(v_org,v_emp,p_service,left(p_title,200),coalesce(p_details,'{}'::jsonb),p_amount,p_attachment,v_flow,v_stage,
    jsonb_build_array(jsonb_build_object('action','submitted','by',auth.uid(),'at',now())))
  returning id into v_id;
  v_mail := awtad_ess_notify(v_org, v_emp, v_stage, 'طلب جديد بانتظار اعتمادك', coalesce(v_name,'') || ' — ' || coalesce(p_title,p_service));
  return jsonb_build_object('id',v_id,'stage',v_stage,'notify',v_mail);
end $$;
revoke all on function public.awtad_ess_submit(text,text,jsonb,numeric,text,text[]) from public, anon;
grant execute on function public.awtad_ess_submit(text,text,jsonb,numeric,text,text[]) to authenticated;

-- 5) قرار المعتمد في المرحلة الحالية
create or replace function public.awtad_ess_decide(p_id bigint, p_approve boolean, p_comment text default null, p_result text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r awtad_ess_requests%rowtype; v_role text := coalesce(awtad_my_role(),''); v_me bigint := awtad_my_emp(); v_mgr bigint; v_idx int; v_next text; v_mail jsonb := '[]'::jsonb; v_name text;
begin
  select * into r from awtad_ess_requests where id = p_id and org_id = awtad_my_org() for update;
  if not found then raise exception 'الطلب غير موجود'; end if;
  if r.stage in ('done','rejected') then raise exception 'تم البتّ في هذا الطلب سابقًا'; end if;
  if v_me is not null and v_me = r.employee_id and v_role <> 'admin' then raise exception 'لا يمكنك اعتماد طلبك بنفسك'; end if;
  select manager_id, name into v_mgr, v_name from awtad_employees where id = r.employee_id;
  if r.stage = 'manager' and not (v_role = 'admin' or (v_me is not null and v_me = v_mgr)) then raise exception 'هذا الطلب بانتظار المدير المباشر'; end if;
  if r.stage = 'hr' and v_role not in ('admin','hr') then raise exception 'هذا الطلب بانتظار الموارد البشرية'; end if;
  if r.stage = 'accounts' and v_role not in ('admin','accountant') then raise exception 'هذا الطلب بانتظار الحسابات'; end if;
  if p_result is not null and p_result not like r.org_id::text || '/' || r.employee_id::text || '/ess/%' then raise exception 'مسار المستند غير صالح'; end if;

  if not p_approve then v_next := 'rejected';
  else
    v_idx := array_position(r.flow, r.stage);
    v_next := case when v_idx is null or v_idx >= cardinality(r.flow) then 'done' else r.flow[v_idx + 1] end;
  end if;

  update awtad_ess_requests set stage = v_next,
    status = case v_next when 'done' then 'approved' when 'rejected' then 'rejected' else 'pending' end,
    result_path = coalesce(p_result, result_path), updated_at = now(),
    history = history || jsonb_build_array(jsonb_build_object('action', case when p_approve then 'approved' else 'rejected' end,'stage',r.stage,'by',auth.uid(),'role',v_role,'comment',p_comment,'at',now()))
  where id = p_id;

  -- إشعار الموظف
  insert into awtad_notifications(org_id,title,body,employee_id,kind)
  values(r.org_id, case v_next when 'done' then 'تم اعتماد طلبك' when 'rejected' then 'تم رفض طلبك' else 'تقدّم طلبك لمرحلة جديدة' end,
         coalesce(r.title,r.service) || coalesce(' — ' || p_comment,''), r.employee_id, 'خدمات ذاتية');

  if v_next in ('hr','accounts') then
    v_mail := awtad_ess_notify(r.org_id, r.employee_id, v_next, 'طلب بانتظار اعتمادك', coalesce(v_name,'') || ' — ' || coalesce(r.title,r.service));
  end if;

  -- التكامل مع وحدات النظام بعد الاعتماد النهائي
  if v_next = 'done' then
    if r.service = 'leave' and (r.details->>'from') is not null and (r.details->>'to') is not null then
      insert into awtad_leaves(org_id,employee_id,type,from_date,to_date,days,status)
      values(r.org_id,r.employee_id,coalesce(r.details->>'leave_type','سنوية'),(r.details->>'from')::date,(r.details->>'to')::date,
             ((r.details->>'to')::date - (r.details->>'from')::date + 1),'معتمدة');
    elsif r.service = 'loan' and r.amount is not null then
      insert into awtad_loans(org_id,employee_id,amount,installment,start_month,note,status)
      values(r.org_id,r.employee_id,r.amount,round(r.amount / greatest(coalesce((r.details->>'months')::int,1),1),2),coalesce(r.details->>'start_month',to_char(current_date + interval '1 month','YYYY-MM')),'طلب خدمة ذاتية #' || r.id,'معتمد');
    elsif r.service = 'bank' and (r.details->>'iban') is not null then
      update awtad_employees set iban = r.details->>'iban', bank_name = coalesce(r.details->>'bank', bank_name) where id = r.employee_id;
    end if;
  end if;
  return jsonb_build_object('stage',v_next,'notify',v_mail);
end $$;
revoke all on function public.awtad_ess_decide(bigint,boolean,text,text) from public, anon;
grant execute on function public.awtad_ess_decide(bigint,boolean,text,text) to authenticated;

-- 6) الملفات: الموظف يرفع ويقرأ مرفقاته، والموارد البشرية ترفع المستند النهائي
drop policy if exists awtad_ess_ins_own on storage.objects;
create policy awtad_ess_ins_own on storage.objects for insert to authenticated with check (
  bucket_id = 'awtad-docs' and (storage.foldername(name))[1] = awtad_my_org()::text
  and (storage.foldername(name))[3] = 'ess'
  and ((storage.foldername(name))[2] = awtad_my_emp()::text or coalesce(awtad_my_role(),'') in ('admin','hr')));
drop policy if exists awtad_ess_sel on storage.objects;
create policy awtad_ess_sel on storage.objects for select to authenticated using (
  bucket_id = 'awtad-docs' and (storage.foldername(name))[1] = awtad_my_org()::text
  and (storage.foldername(name))[3] in ('ess','photo')
  and ((storage.foldername(name))[2] = awtad_my_emp()::text
       or coalesce(awtad_my_role(),'') in ('admin','hr','accountant')
       or exists (select 1 from awtad_employees e where e.id::text = (storage.foldername(name))[2] and e.manager_id = awtad_my_emp())));
drop policy if exists awtad_photo_ins on storage.objects;
create policy awtad_photo_ins on storage.objects for insert to authenticated with check (
  bucket_id = 'awtad-docs' and (storage.foldername(name))[1] = awtad_my_org()::text
  and (storage.foldername(name))[3] = 'photo' and coalesce(awtad_my_role(),'') in ('admin','hr'));
