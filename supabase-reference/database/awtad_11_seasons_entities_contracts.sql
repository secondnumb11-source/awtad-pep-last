-- أوتاد: المواسم (رمضان والصيف)، الكيانات المتعددة، العقود والتوقيع الإلكتروني الداخلي.
-- نُفّذ على المشروع كترحيل awtad_11_seasons_entities_contracts. كائنات awtad_ فقط.
create table if not exists awtad_seasons(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, name text not null, from_date date not null, to_date date not null, daily_hours numeric, shift_start time, shift_end time);
create table if not exists awtad_entities(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, name text not null, cr_number text, notes text);
alter table awtad_employees add column if not exists entity_id bigint references awtad_entities(id) on delete set null;
create table if not exists awtad_contracts(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, employee_id bigint not null references awtad_employees(id) on delete cascade, title text not null, body text, status text not null default 'مسودة', signed_name text, signed_at timestamptz, created_at timestamptz default now());

do $$ declare t text; begin
 foreach t in array array['awtad_seasons','awtad_entities','awtad_contracts'] loop
  execute format('alter table %I enable row level security', t);
  execute format('create policy awtad_w on %I for all using (org_id=awtad_my_org() and awtad_my_role() in (''admin'',''hr'')) with check (org_id=awtad_my_org())', t);
 end loop;
 foreach t in array array['awtad_seasons','awtad_entities'] loop
  execute format('create policy awtad_r on %I for select using (org_id=awtad_my_org())', t);
 end loop;
 foreach t in array array['awtad_entities','awtad_contracts','awtad_seasons'] loop
  execute format('drop trigger if exists awtad_audit on %I', t);
  execute format('create trigger awtad_audit after insert or update or delete on %I for each row execute function public.awtad_audit_trg()', t);
 end loop;
end $$;
create policy awtad_r on awtad_contracts for select using (org_id=awtad_my_org() and (awtad_my_role() in ('admin','hr') or employee_id=awtad_my_emp()));

create or replace function public.awtad_sign_contract(p_id bigint, p_name text) returns text language plpgsql security definer set search_path=public as $$
declare c awtad_contracts%rowtype;
begin
  select * into c from awtad_contracts where id=p_id and org_id=awtad_my_org();
  if not found then raise exception 'العقد غير موجود'; end if;
  if c.employee_id is distinct from awtad_my_emp() then raise exception 'هذا العقد ليس لك'; end if;
  if c.status <> 'أُرسل' then raise exception 'العقد ليس بانتظار توقيعك'; end if;
  if length(trim(coalesce(p_name,''))) < 3 then raise exception 'اكتب اسمك الكامل للتوقيع'; end if;
  update awtad_contracts set status='موقَّع', signed_name=trim(p_name), signed_at=now() where id=p_id;
  return 'تم التوقيع';
end $$;
revoke all on function public.awtad_sign_contract(bigint,text) from public, anon;
grant execute on function public.awtad_sign_contract(bigint,text) to authenticated;
