-- أوتاد: نظام المحاسبة (شجرة الحسابات، القيود، دفتر الأستاذ، ميزان المراجعة، الترحيل التلقائي، الرسوم الحكومية، إقفال السنة).
-- نُفّذ على المشروع كترحيل awtad_15_accounting. كائنات awtad_ فقط.
alter table awtad_employees add column if not exists phone text;
alter table awtad_employees add column if not exists work_permit_expiry date;
alter table awtad_employees add column if not exists health_insurance_expiry date;
alter table awtad_employees add column if not exists passport_expiry date;

alter table awtad_profiles drop constraint if exists awtad_profiles_role_check;
alter table awtad_profiles add constraint awtad_profiles_role_check check (role in ('admin','hr','manager','employee','accountant'));

create table if not exists awtad_acct_accounts(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, code text not null, name text not null, type text not null check (type in ('أصول','التزامات','حقوق ملكية','إيرادات','مصروفات')), parent_id bigint references awtad_acct_accounts(id) on delete restrict, is_group boolean not null default false, active boolean not null default true, unique(org_id, code));
create table if not exists awtad_fiscal_years(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, name text not null, start_date date not null, end_date date not null, status text not null default 'مفتوحة' check (status in ('مفتوحة','مغلقة')));
create table if not exists awtad_journals(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, entry_no int not null, entry_date date not null, description text, source text not null default 'يدوي', source_ref text, status text not null default 'مرحّل', reversed_of bigint, created_by uuid, created_at timestamptz default now(), unique(org_id, entry_no));
create unique index if not exists awtad_journal_src_uq on awtad_journals(org_id, source, source_ref) where source_ref is not null and reversed_of is null;
create unique index if not exists awtad_journal_rev_uq on awtad_journals(reversed_of) where reversed_of is not null;
create table if not exists awtad_journal_lines(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, journal_id bigint not null references awtad_journals(id) on delete cascade, account_id bigint not null references awtad_acct_accounts(id) on delete restrict, debit numeric not null default 0 check (debit >= 0), credit numeric not null default 0 check (credit >= 0), memo text, dept text, employee_id bigint, check (debit = 0 or credit = 0));
create index if not exists awtad_jl_acc on awtad_journal_lines(account_id);
create index if not exists awtad_jl_jr on awtad_journal_lines(journal_id);
create table if not exists awtad_acct_mappings(org_id uuid not null references awtad_organizations(id) on delete cascade, event text not null, debit_code text, credit_code text, primary key(org_id, event));
create table if not exists awtad_fees(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, employee_id bigint references awtad_employees(id) on delete set null, kind text not null, amount numeric not null, vat numeric not null default 0, paid_on date default current_date, pay_code text default '1110', note text, journal_id bigint, created_at timestamptz default now());

do $$ declare t text; begin
 foreach t in array array['awtad_acct_accounts','awtad_fiscal_years','awtad_journals','awtad_journal_lines','awtad_acct_mappings','awtad_fees'] loop
  execute format('alter table %I enable row level security', t);
 end loop;
 foreach t in array array['awtad_acct_accounts','awtad_fiscal_years','awtad_acct_mappings'] loop
  execute format('create policy awtad_acct_all on %I for all using (org_id=awtad_my_org() and awtad_my_role() in (''admin'',''accountant'')) with check (org_id=awtad_my_org())', t);
 end loop;
 foreach t in array array['awtad_journals','awtad_journal_lines'] loop
  execute format('create policy awtad_acct_r on %I for select using (org_id=awtad_my_org() and awtad_my_role() in (''admin'',''accountant''))', t);
 end loop;
end $$;
revoke insert, update, delete on awtad_journals, awtad_journal_lines from authenticated;
create policy awtad_fee_r on awtad_fees for select using (org_id=awtad_my_org() and awtad_my_role() in ('admin','hr','accountant'));
revoke insert, update, delete on awtad_fees from authenticated;

do $$ declare t text; begin
 foreach t in array array['awtad_employees','awtad_expenses','awtad_loans','awtad_trips','awtad_petty_cash','awtad_petty_spend','awtad_journal_entries'] loop
  execute format('create policy awtad_acct_read on %I for select using (org_id=awtad_my_org() and awtad_my_role()=''accountant'')', t);
 end loop; end $$;

-- دوال داخلية (لا تُمنح للمستخدمين)
create or replace function public.awtad__post(p_org uuid, p_date date, p_desc text, p_source text, p_ref text, p_lines jsonb, p_user uuid default null) returns bigint language plpgsql security definer set search_path=public as $$
declare j bigint; l jsonb; acc bigint; d numeric := 0; c numeric := 0; no int; ex bigint;
begin
  perform pg_advisory_xact_lock(hashtext(p_org::text));
  if p_ref is not null then select id into ex from awtad_journals where org_id=p_org and source=p_source and source_ref=p_ref and reversed_of is null; if ex is not null then return ex; end if; end if;
  if exists(select 1 from awtad_fiscal_years where org_id=p_org and status='مغلقة' and p_date between start_date and end_date) then raise exception 'الفترة المالية مغلقة ولا يمكن الترحيل فيها'; end if;
  for l in select * from jsonb_array_elements(p_lines) loop d := d + coalesce((l->>'debit')::numeric,0); c := c + coalesce((l->>'credit')::numeric,0); end loop;
  if d <= 0 or round(d,2) <> round(c,2) then raise exception 'القيد غير متوازن: مدين % ودائن %', round(d,2), round(c,2); end if;
  select coalesce(max(entry_no),0)+1 into no from awtad_journals where org_id=p_org;
  insert into awtad_journals(org_id,entry_no,entry_date,description,source,source_ref,created_by) values(p_org,no,p_date,p_desc,p_source,p_ref,coalesce(p_user,auth.uid())) returning id into j;
  for l in select * from jsonb_array_elements(p_lines) loop
    if coalesce((l->>'debit')::numeric,0)=0 and coalesce((l->>'credit')::numeric,0)=0 then continue; end if;
    select id into acc from awtad_acct_accounts where org_id=p_org and code=(l->>'code') and not is_group and active;
    if acc is null then raise exception 'حساب غير صالح أو غير نشط أو رئيسي: %', l->>'code'; end if;
    insert into awtad_journal_lines(org_id,journal_id,account_id,debit,credit,memo,dept,employee_id) values(p_org,j,acc,coalesce((l->>'debit')::numeric,0),coalesce((l->>'credit')::numeric,0),l->>'memo',l->>'dept',nullif(l->>'employee_id','')::bigint);
  end loop;
  return j;
end $$;

create or replace function public.awtad__event(p_org uuid, p_event text, p_amount numeric, p_desc text, p_source text, p_ref text, p_dept text, p_emp bigint, p_date date) returns bigint language plpgsql security definer set search_path=public as $$
declare m awtad_acct_mappings%rowtype;
begin
  select * into m from awtad_acct_mappings where org_id=p_org and event=p_event;
  if not found or coalesce(p_amount,0) <= 0 or m.debit_code is null or m.credit_code is null then return null; end if;
  begin
    return awtad__post(p_org, coalesce(p_date,current_date), p_desc, p_source, p_ref, jsonb_build_array(
      jsonb_build_object('code',m.debit_code,'debit',p_amount,'memo',p_desc,'dept',p_dept,'employee_id',p_emp),
      jsonb_build_object('code',m.credit_code,'credit',p_amount,'memo',p_desc,'dept',p_dept,'employee_id',p_emp)));
  exception when others then
    insert into awtad_integration_logs(org_id,platform,action,result) values(p_org,'المحاسبة','ترحيل آلي: '||p_event,left('فشل: '||sqlerrm,300));
    return null;
  end;
end $$;

create or replace function public.awtad__seed_chart(p_org uuid) returns int language plpgsql security definer set search_path=public as $$
declare r jsonb; n int := 0;
  rows jsonb := '[
   ["1000","الأصول","أصول",true,null],["1100","الأصول المتداولة","أصول",true,"1000"],["1110","الصندوق","أصول",false,"1100"],["1120","البنوك","أصول",false,"1100"],["1140","عهد الموظفين","أصول",false,"1100"],["1150","سلف الموظفين","أصول",false,"1100"],["1160","ضريبة القيمة المضافة - مدخلات","أصول",false,"1100"],["1170","مصروفات مدفوعة مقدمًا","أصول",false,"1100"],
   ["1200","الأصول الثابتة","أصول",true,"1000"],["1210","الأجهزة والمعدات","أصول",false,"1200"],["1220","الأثاث والتجهيزات","أصول",false,"1200"],
   ["2000","الالتزامات","التزامات",true,null],["2100","الالتزامات المتداولة","التزامات",true,"2000"],["2110","رواتب مستحقة","التزامات",false,"2100"],["2120","التأمينات الاجتماعية المستحقة","التزامات",false,"2100"],["2130","مستحقات الموظفين","التزامات",false,"2100"],["2140","ضريبة القيمة المضافة - مخرجات","التزامات",false,"2100"],["2150","مصروفات مستحقة","التزامات",false,"2100"],["2160","مخصص نهاية الخدمة","التزامات",false,"2100"],
   ["3000","حقوق الملكية","حقوق ملكية",true,null],["3100","رأس المال","حقوق ملكية",false,"3000"],["3200","الأرباح المبقاة","حقوق ملكية",false,"3000"],
   ["4000","الإيرادات","إيرادات",true,null],["4100","إيرادات النشاط","إيرادات",false,"4000"],["4900","إيرادات أخرى","إيرادات",false,"4000"],
   ["5000","المصروفات","مصروفات",true,null],["5100","مصروفات الموظفين","مصروفات",true,"5000"],["5110","الرواتب والأجور","مصروفات",false,"5100"],["5120","العمل الإضافي","مصروفات",false,"5100"],["5130","التأمينات الاجتماعية - حصة المنشأة","مصروفات",false,"5100"],["5150","مكافأة نهاية الخدمة","مصروفات",false,"5100"],
   ["5200","الرسوم الحكومية","مصروفات",true,"5000"],["5210","رسوم الإقامة","مصروفات",false,"5200"],["5220","رخص العمل","مصروفات",false,"5200"],["5230","التأشيرات والخروج والعودة","مصروفات",false,"5200"],["5240","رسوم قوى ومدد ومقيم","مصروفات",false,"5200"],["5250","رسوم بلدية وتجارية","مصروفات",false,"5200"],
   ["5300","التأمين الطبي","مصروفات",false,"5000"],["5400","السفر والانتقال","مصروفات",false,"5000"],["5410","الضيافة","مصروفات",false,"5000"],["5420","المستلزمات","مصروفات",false,"5000"],["5430","مصروفات أخرى","مصروفات",false,"5000"],["5500","التدريب","مصروفات",false,"5000"],["5600","الإيجارات","مصروفات",false,"5000"]]'::jsonb;
begin
  if exists(select 1 from awtad_acct_accounts where org_id=p_org) then return 0; end if;
  for r in select * from jsonb_array_elements(rows) loop
    insert into awtad_acct_accounts(org_id,code,name,type,is_group,parent_id)
    values(p_org, r->>0, r->>1, r->>2, (r->>3)::boolean, (select id from awtad_acct_accounts where org_id=p_org and code=(r->>4)));
    n := n + 1;
  end loop;
  insert into awtad_acct_mappings(org_id,event,debit_code,credit_code) values
   (p_org,'مصروف:سفر','5400','2130'),(p_org,'مصروف:ضيافة','5410','2130'),(p_org,'مصروف:مستلزمات','5420','2130'),(p_org,'مصروف:أخرى','5430','2130'),
   (p_org,'رحلة عمل','5400','2130'),(p_org,'عهدة صرف','1140','1110'),(p_org,'عهدة مصروف','5430','1140'),(p_org,'سلفة','1150','1110'),
   (p_org,'رسم:تجديد إقامة','5210',null),(p_org,'رسم:رخصة عمل','5220',null),(p_org,'رسم:خروج وعودة','5230',null),(p_org,'رسم:رسوم قوى','5240',null),(p_org,'رسم:رسوم مقيم','5240',null),(p_org,'رسم:رسوم مدد','5240',null),(p_org,'رسم:بلدية','5250',null),(p_org,'رسم:تأمين طبي','5300',null),(p_org,'رسم:أخرى','5430',null)
   on conflict do nothing;
  return n;
end $$;

create or replace function public.awtad__tb(p_org uuid, p_from date, p_to date) returns table(account_id bigint, code text, name text, type text, parent_id bigint, is_group boolean, active boolean, debit numeric, credit numeric) language sql stable security definer set search_path=public as $$
  select a.id,a.code,a.name,a.type,a.parent_id,a.is_group,a.active,coalesce(sum(l.debit),0),coalesce(sum(l.credit),0)
  from awtad_acct_accounts a
  left join (select jl.* from awtad_journal_lines jl join awtad_journals j on j.id=jl.journal_id where j.org_id=p_org and j.entry_date between p_from and p_to) l on l.account_id=a.id
  where a.org_id=p_org group by a.id order by a.code $$;

revoke all on function public.awtad__post(uuid,date,text,text,text,jsonb,uuid), public.awtad__event(uuid,text,numeric,text,text,text,text,bigint,date), public.awtad__seed_chart(uuid), public.awtad__tb(uuid,date,date) from public, anon, authenticated;

-- واجهات المستخدم (بفحص الدور)
create or replace function public.awtad_seed_chart() returns int language plpgsql security definer set search_path=public as $$
begin
  if awtad_my_role() not in ('admin','accountant') then raise exception 'غير مسموح'; end if;
  return awtad__seed_chart(awtad_my_org());
end $$;
create or replace function public.awtad_post_journal(p_date date, p_desc text, p_lines jsonb, p_source text default 'يدوي', p_ref text default null) returns bigint language plpgsql security definer set search_path=public as $$
begin
  if awtad_my_role() not in ('admin','accountant') then raise exception 'غير مسموح'; end if;
  return awtad__post(awtad_my_org(), p_date, p_desc, p_source, p_ref, p_lines);
end $$;
create or replace function public.awtad_reverse_journal(p_id bigint) returns bigint language plpgsql security definer set search_path=public as $$
declare j awtad_journals%rowtype; lines jsonb; new_id bigint;
begin
  if awtad_my_role() not in ('admin','accountant') then raise exception 'غير مسموح'; end if;
  select * into j from awtad_journals where id=p_id and org_id=awtad_my_org();
  if not found then raise exception 'القيد غير موجود'; end if;
  if j.reversed_of is not null then raise exception 'هذا قيد عكسي ولا يُعكس'; end if;
  if exists(select 1 from awtad_journals where reversed_of=p_id) then raise exception 'القيد معكوس مسبقًا'; end if;
  select jsonb_agg(jsonb_build_object('code',a.code,'debit',l.credit,'credit',l.debit,'memo','عكس: '||coalesce(l.memo,''),'dept',l.dept,'employee_id',l.employee_id)) into lines
  from awtad_journal_lines l join awtad_acct_accounts a on a.id=l.account_id where l.journal_id=p_id;
  new_id := awtad__post(j.org_id, current_date, 'عكس القيد رقم '||j.entry_no||' — '||coalesce(j.description,''), 'عكس', 'rev-'||p_id, lines);
  update awtad_journals set reversed_of=p_id where id=new_id;
  return new_id;
end $$;
create or replace function public.awtad_trial_balance(p_from date, p_to date) returns table(account_id bigint, code text, name text, type text, parent_id bigint, is_group boolean, active boolean, debit numeric, credit numeric) language plpgsql security definer set search_path=public as $$
begin
  if awtad_my_role() not in ('admin','accountant') then raise exception 'غير مسموح'; end if;
  return query select * from awtad__tb(awtad_my_org(), p_from, p_to);
end $$;
create or replace function public.awtad_ledger(p_account bigint, p_from date, p_to date) returns table(entry_date date, entry_no int, journal_id bigint, description text, memo text, debit numeric, credit numeric, source text) language plpgsql security definer set search_path=public as $$
begin
  if awtad_my_role() not in ('admin','accountant') then raise exception 'غير مسموح'; end if;
  return query select j.entry_date,j.entry_no,j.id,j.description,l.memo,l.debit,l.credit,j.source from awtad_journal_lines l join awtad_journals j on j.id=l.journal_id
    where j.org_id=awtad_my_org() and l.account_id=p_account and j.entry_date between p_from and p_to order by j.entry_date, j.entry_no, l.id;
end $$;
create or replace function public.awtad_post_payroll(p_period text, p_salary numeric, p_ot numeric, p_gr numeric, p_reimb numeric, p_net numeric, p_social numeric, p_loan numeric) returns bigint language plpgsql security definer set search_path=public as $$
declare dt date := (p_period||'-01')::date + interval '1 month' - interval '1 day';
begin
  if awtad_my_role() not in ('admin','accountant','hr') then raise exception 'غير مسموح'; end if;
  return awtad__post(awtad_my_org(), dt, 'قيد رواتب '||p_period, 'رواتب', p_period, jsonb_build_array(
    jsonb_build_object('code','5110','debit',p_salary,'memo','الرواتب والأجور'),
    jsonb_build_object('code','5120','debit',p_ot,'memo','العمل الإضافي'),
    jsonb_build_object('code','5130','debit',p_gr,'memo','تأمينات - حصة المنشأة'),
    jsonb_build_object('code','2130','debit',p_reimb,'memo','تسوية مستحقات الموظفين'),
    jsonb_build_object('code','2110','credit',p_net,'memo','صافي الرواتب'),
    jsonb_build_object('code','2120','credit',p_social,'memo','التأمينات المستحقة'),
    jsonb_build_object('code','1150','credit',p_loan,'memo','أقساط السلف')));
end $$;
create or replace function public.awtad_record_fee(p_employee bigint, p_kind text, p_amount numeric, p_vat numeric, p_date date, p_pay_code text, p_new_expiry date, p_note text) returns bigint language plpgsql security definer set search_path=public as $$
declare org uuid := awtad_my_org(); m awtad_acct_mappings%rowtype; jid bigint; fid bigint; dept text; v numeric := coalesce(p_vat,0);
begin
  if awtad_my_role() not in ('admin','accountant','hr') then raise exception 'غير مسموح'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'المبلغ مطلوب'; end if;
  select * into m from awtad_acct_mappings where org_id=org and event='رسم:'||p_kind;
  if not found or m.debit_code is null then select * into m from awtad_acct_mappings where org_id=org and event='رسم:أخرى'; end if;
  if m.debit_code is null then raise exception 'هيّئ شجرة الحسابات وربط الأحداث أولًا'; end if;
  select e.dept into dept from awtad_employees e where e.id=p_employee and e.org_id=org;
  insert into awtad_fees(org_id,employee_id,kind,amount,vat,paid_on,pay_code,note) values(org,p_employee,p_kind,p_amount,v,coalesce(p_date,current_date),coalesce(p_pay_code,'1110'),p_note) returning id into fid;
  jid := awtad__post(org, coalesce(p_date,current_date), 'رسوم: '||p_kind||coalesce(' — '||p_note,''), 'رسوم', 'fee-'||fid, jsonb_build_array(
    jsonb_build_object('code',m.debit_code,'debit',p_amount,'memo',p_kind,'dept',dept,'employee_id',p_employee),
    jsonb_build_object('code','1160','debit',v,'memo','ضريبة القيمة المضافة','dept',dept),
    jsonb_build_object('code',coalesce(p_pay_code,'1110'),'credit',p_amount+v,'memo','سداد '||p_kind)));
  update awtad_fees set journal_id=jid where id=fid;
  if p_employee is not null and p_new_expiry is not null then
    if p_kind='تجديد إقامة' then update awtad_employees set iqama_expiry=p_new_expiry where id=p_employee and org_id=org;
    elsif p_kind='رخصة عمل' then update awtad_employees set work_permit_expiry=p_new_expiry where id=p_employee and org_id=org;
    elsif p_kind='تأمين طبي' then update awtad_employees set health_insurance_expiry=p_new_expiry where id=p_employee and org_id=org; end if;
  end if;
  return fid;
end $$;
create or replace function public.awtad_close_year(p_year bigint) returns bigint language plpgsql security definer set search_path=public as $$
declare fy awtad_fiscal_years%rowtype; org uuid := awtad_my_org(); lines jsonb := '[]'::jsonb; r record; bal numeric; net numeric := 0; jid bigint;
begin
  if awtad_my_role() not in ('admin','accountant') then raise exception 'غير مسموح'; end if;
  select * into fy from awtad_fiscal_years where id=p_year and org_id=org;
  if not found then raise exception 'السنة المالية غير موجودة'; end if;
  if fy.status='مغلقة' then raise exception 'السنة مغلقة مسبقًا'; end if;
  for r in select * from awtad__tb(org, fy.start_date, fy.end_date) where not is_group and type in ('إيرادات','مصروفات') loop
    bal := case when r.type='إيرادات' then r.credit - r.debit else r.debit - r.credit end;
    if bal = 0 then continue; end if;
    if r.type='إيرادات' then
      lines := lines || jsonb_build_array(jsonb_build_object('code',r.code,'debit',greatest(bal,0),'credit',greatest(-bal,0),'memo','إقفال'));
      net := net + bal;
    else
      lines := lines || jsonb_build_array(jsonb_build_object('code',r.code,'credit',greatest(bal,0),'debit',greatest(-bal,0),'memo','إقفال'));
      net := net - bal;
    end if;
  end loop;
  if jsonb_array_length(lines) > 0 then
    lines := lines || jsonb_build_array(jsonb_build_object('code','3200','credit',greatest(net,0),'debit',greatest(-net,0),'memo','صافي نتيجة السنة '||fy.name));
    jid := awtad__post(org, fy.end_date, 'قيد إقفال السنة المالية '||fy.name, 'إقفال', 'close-'||p_year, lines);
  end if;
  update awtad_fiscal_years set status='مغلقة' where id=p_year;
  return jid;
end $$;
revoke all on function public.awtad_seed_chart(), public.awtad_post_journal(date,text,jsonb,text,text), public.awtad_reverse_journal(bigint), public.awtad_trial_balance(date,date), public.awtad_ledger(bigint,date,date), public.awtad_post_payroll(text,numeric,numeric,numeric,numeric,numeric,numeric,numeric), public.awtad_record_fee(bigint,text,numeric,numeric,date,text,date,text), public.awtad_close_year(bigint) from public, anon;
grant execute on function public.awtad_seed_chart(), public.awtad_post_journal(date,text,jsonb,text,text), public.awtad_reverse_journal(bigint), public.awtad_trial_balance(date,date), public.awtad_ledger(bigint,date,date), public.awtad_post_payroll(text,numeric,numeric,numeric,numeric,numeric,numeric,numeric), public.awtad_record_fee(bigint,text,numeric,numeric,date,text,date,text), public.awtad_close_year(bigint) to authenticated;

-- الترحيل التلقائي من أقسام النظام
create or replace function public.awtad_tr_expense() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status='معتمد' and old.status is distinct from 'معتمد' then
    perform awtad__event(new.org_id,'مصروف:'||coalesce(new.category,'أخرى'),new.amount,'مصروف معتمد — '||coalesce(nullif(new.note,''),new.category),'مصروف','exp-'||new.id,(select dept from awtad_employees where id=new.employee_id),new.employee_id,coalesce(new.expense_date,current_date));
  end if; return new;
end $$;
create or replace function public.awtad_tr_trip() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status='معتمدة' and old.status is distinct from 'معتمدة' then
    perform awtad__event(new.org_id,'رحلة عمل',coalesce(new.daily_allowance,0)*(coalesce(new.to_date,new.from_date)-new.from_date+1),'بدل رحلة عمل — '||new.destination,'رحلة','trip-'||new.id,(select dept from awtad_employees where id=new.employee_id),new.employee_id,coalesce(new.from_date,current_date));
  end if; return new;
end $$;
create or replace function public.awtad_tr_petty() returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform awtad__event(new.org_id,'عهدة صرف',new.amount,'إصدار عهدة — '||coalesce(new.note,''),'عهدة','petty-'||new.id,(select dept from awtad_employees where id=new.employee_id),new.employee_id,coalesce(new.issued_on,current_date));
  return new;
end $$;
create or replace function public.awtad_tr_pspend() returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform awtad__event(new.org_id,'عهدة مصروف',new.amount,'مصروف عهدة — '||coalesce(new.note,''),'مصروف عهدة','pspend-'||new.id,null,(select employee_id from awtad_petty_cash where id=new.petty_id),coalesce(new.spent_on,current_date));
  return new;
end $$;
create or replace function public.awtad_tr_loan() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status='معتمد' and (tg_op='INSERT' or old.status is distinct from 'معتمد') then
    perform awtad__event(new.org_id,'سلفة',new.amount,'سلفة موظف — '||coalesce(new.note,''),'سلفة','loan-'||new.id,(select dept from awtad_employees where id=new.employee_id),new.employee_id,current_date);
  end if; return new;
end $$;
drop trigger if exists awtad_acct_exp on awtad_expenses; create trigger awtad_acct_exp after update on awtad_expenses for each row execute function public.awtad_tr_expense();
drop trigger if exists awtad_acct_trip on awtad_trips; create trigger awtad_acct_trip after update on awtad_trips for each row execute function public.awtad_tr_trip();
drop trigger if exists awtad_acct_petty on awtad_petty_cash; create trigger awtad_acct_petty after insert on awtad_petty_cash for each row execute function public.awtad_tr_petty();
drop trigger if exists awtad_acct_pspend on awtad_petty_spend; create trigger awtad_acct_pspend after insert on awtad_petty_spend for each row execute function public.awtad_tr_pspend();
drop trigger if exists awtad_acct_loan on awtad_loans; create trigger awtad_acct_loan after insert or update on awtad_loans for each row execute function public.awtad_tr_loan();

do $$ declare t text; begin
 foreach t in array array['awtad_acct_accounts','awtad_journals','awtad_fees','awtad_acct_mappings','awtad_fiscal_years'] loop
  execute format('drop trigger if exists awtad_audit on %I', t);
  execute format('create trigger awtad_audit after insert or update or delete on %I for each row execute function public.awtad_audit_trg()', t);
 end loop; end $$;

create or replace function public.awtad_update_profile(p_user uuid, p_role text, p_modules text[]) returns text language plpgsql security definer set search_path=public as $$
declare org uuid;
begin
  if awtad_my_role() is distinct from 'admin' then raise exception 'غير مسموح: لمدير النظام فقط'; end if;
  if p_role not in ('admin','hr','manager','employee','accountant') then raise exception 'دور غير صالح'; end if;
  org := awtad_my_org();
  if p_role <> 'admin' and not exists(select 1 from awtad_profiles where org_id=org and role='admin' and id<>p_user) then raise exception 'لا يمكن إزالة آخر مدير نظام'; end if;
  update awtad_profiles set role=p_role, module_access=p_modules where id=p_user and org_id=org;
  return 'تم التحديث';
end $$;
create or replace function public.awtad_assign_user(p_email text, p_employee_id bigint, p_role text) returns uuid language plpgsql security definer set search_path=public as $$
declare uid uuid; org uuid; ename text;
begin
  if awtad_my_role() is distinct from 'admin' then raise exception 'غير مسموح: هذه العملية لمدير النظام فقط'; end if;
  if p_role not in ('admin','hr','manager','employee','accountant') then raise exception 'دور غير صالح'; end if;
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
