-- أوتاد: الجداول التلقائية، الوظائف والتقديم، دورات التقييم، الاستبيان المجهول، مسارات التعلم، التقارير المحفوظة، ما قبل المباشرة.
-- نُفّذ على المشروع كترحيل awtad_14_cron_jobs_learning_surveys. كائنات awtad_ فقط، عدا تفعيل الامتداد pg_cron.
create extension if not exists pg_cron;

alter table awtad_organizations add column if not exists slug text;
create unique index if not exists awtad_org_slug_uq on awtad_organizations(slug) where slug is not null;
alter table awtad_employees add column if not exists preboarding boolean not null default false;
alter table awtad_candidates add column if not exists job_id bigint;
alter table awtad_candidates add column if not exists email text;
alter table awtad_candidates add column if not exists phone text;
alter table awtad_candidates add column if not exists cv_text text;
alter table awtad_candidates add column if not exists score numeric;
alter table awtad_surveys add column if not exists status text not null default 'مفتوح';
alter table awtad_expense_policies add column if not exists dept text;
alter table awtad_expense_policies drop constraint if exists awtad_expense_policies_org_id_category_key;
create unique index if not exists awtad_xpol_uq on awtad_expense_policies(org_id, category, coalesce(dept,''));
alter table awtad_reviews add column if not exists cycle_id bigint;

create table if not exists awtad_jobs(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, title text not null, dept text, description text, requirements text, status text not null default 'مفتوحة', created_at timestamptz default now());
create table if not exists awtad_review_cycles(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, name text not null, kind text default 'سنوية', from_date date, to_date date, status text not null default 'مفتوحة', criteria text);
create table if not exists awtad_survey_participation(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, survey_id bigint not null references awtad_surveys(id) on delete cascade, employee_id bigint not null references awtad_employees(id) on delete cascade, unique(survey_id, employee_id));
create table if not exists awtad_learning_paths(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, name text not null, description text);
create table if not exists awtad_path_courses(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, path_id bigint not null references awtad_learning_paths(id) on delete cascade, course_id bigint not null references awtad_courses(id) on delete cascade, position int default 0, unique(path_id, course_id));
create table if not exists awtad_saved_reports(id bigint generated always as identity primary key, org_id uuid not null references awtad_organizations(id) on delete cascade, name text not null, dataset text not null, columns jsonb not null default '[]'::jsonb, filters jsonb not null default '[]'::jsonb, created_at timestamptz default now());

do $$ declare t text; begin
 foreach t in array array['awtad_jobs','awtad_review_cycles','awtad_survey_participation','awtad_learning_paths','awtad_path_courses','awtad_saved_reports'] loop
  execute format('alter table %I enable row level security', t);
 end loop;
 foreach t in array array['awtad_jobs','awtad_review_cycles','awtad_learning_paths','awtad_path_courses','awtad_saved_reports'] loop
  execute format('create policy awtad_w on %I for all using (org_id=awtad_my_org() and awtad_my_role() in (''admin'',''hr'')) with check (org_id=awtad_my_org())', t);
  execute format('create policy awtad_r on %I for select using (org_id=awtad_my_org())', t);
 end loop;
 foreach t in array array['awtad_jobs','awtad_review_cycles'] loop
  execute format('drop trigger if exists awtad_audit on %I', t);
  execute format('create trigger awtad_audit after insert or update or delete on %I for each row execute function public.awtad_audit_trg()', t);
 end loop;
end $$;

create or replace function public.awtad_submit_survey(p_survey bigint, p_score int, p_comment text default null) returns text language plpgsql security definer set search_path=public as $$
declare e bigint; s awtad_surveys%rowtype;
begin
  e := awtad_my_emp();
  if e is null then raise exception 'حسابك غير مرتبط بسجل موظف'; end if;
  select * into s from awtad_surveys where id=p_survey and org_id=awtad_my_org();
  if not found then raise exception 'الاستبيان غير موجود'; end if;
  if s.status <> 'مفتوح' then raise exception 'الاستبيان مغلق'; end if;
  if p_score < 0 or p_score > 10 then raise exception 'الدرجة من 0 إلى 10'; end if;
  begin
    insert into awtad_survey_participation(org_id,survey_id,employee_id) values(s.org_id,p_survey,e);
  exception when unique_violation then raise exception 'سبق أن شاركت في هذا الاستبيان';
  end;
  insert into awtad_survey_responses(org_id,survey_id,score,comment) values(s.org_id,p_survey,p_score,nullif(trim(p_comment),''));
  return 'شكرًا لمشاركتك';
end $$;
revoke all on function public.awtad_submit_survey(bigint,int,text) from public, anon;
grant execute on function public.awtad_submit_survey(bigint,int,text) to authenticated;

create or replace function public.awtad_cron_renewals() returns int language plpgsql security definer set search_path=public as $$
declare n int;
begin
  insert into awtad_requests(org_id,employee_id,kind,req_date,reason)
  select e.org_id,e.id,'تجديد عقد',e.contract_end,'ينتهي العقد خلال 60 يومًا أو أقل (توليد آلي)'
  from awtad_employees e
  where e.active and e.contract_end between current_date and current_date+60
    and not exists(select 1 from awtad_requests r where r.employee_id=e.id and r.kind='تجديد عقد' and r.status like 'بانتظار%');
  get diagnostics n = row_count; return n;
end $$;
create or replace function public.awtad_cron_birthdays() returns int language plpgsql security definer set search_path=public as $$
declare n int;
begin
  insert into awtad_notifications(org_id,title,body,employee_id,kind)
  select e.org_id,'تهنئة بعيد ميلادك','كل عام وأنت بخير يا '||e.name||'، تتمنى لك المنشأة عامًا سعيدًا.',e.id,'تهنئة'
  from awtad_employees e
  where e.active and e.birth_date is not null and to_char(e.birth_date,'MM-DD')=to_char((now() at time zone 'Asia/Riyadh')::date,'MM-DD')
    and not exists(select 1 from awtad_notifications x where x.employee_id=e.id and x.kind='تهنئة' and x.created_at::date=current_date);
  get diagnostics n = row_count; return n;
end $$;
create or replace function public.awtad_cron_activate() returns int language plpgsql security definer set search_path=public as $$
declare n int;
begin
  update awtad_employees set active=true, preboarding=false where preboarding and join_date is not null and join_date <= (now() at time zone 'Asia/Riyadh')::date;
  get diagnostics n = row_count; return n;
end $$;
create or replace function public.awtad_cron_shift_reminders() returns int language plpgsql security definer set search_path=public as $$
declare n int; nowr timestamp := now() at time zone 'Asia/Riyadh'; today date := nowr::date; t time := nowr::time;
        dcode text := (array['sun','mon','tue','wed','thu','fri','sat'])[extract(dow from nowr)::int + 1];
begin
  insert into awtad_notifications(org_id,title,body,employee_id,kind)
  select a.org_id,'تذكير ببداية الدوام','يبدأ دوامك '||s.name||' الساعة '||to_char(s.start_time,'HH24:MI')||'.',a.employee_id,'تذكير'
  from (select distinct on (employee_id) * from awtad_shift_assign where from_date<=today and (until_date is null or today<=until_date) order by employee_id, from_date desc) a
  join awtad_shifts s on s.id=a.shift_id
  join awtad_employees e on e.id=a.employee_id and e.active
  where s.kind='ثابتة' and s.start_time is not null and position(dcode in s.work_days)>0
    and t >= s.start_time - interval '30 minutes' and t < s.start_time - interval '15 minutes'
    and not exists(select 1 from awtad_notifications x where x.employee_id=a.employee_id and x.kind='تذكير' and x.created_at::date=current_date and x.title='تذكير ببداية الدوام');
  get diagnostics n = row_count; return n;
end $$;
revoke all on function public.awtad_cron_renewals(), public.awtad_cron_birthdays(), public.awtad_cron_activate(), public.awtad_cron_shift_reminders() from public, anon, authenticated;

do $$ begin perform cron.unschedule(jobid) from cron.job where jobname like 'awtad-%'; end $$;
select cron.schedule('awtad-renewals','0 5 1 * *','select public.awtad_cron_renewals()');
select cron.schedule('awtad-birthdays','0 4 * * *','select public.awtad_cron_birthdays()');
select cron.schedule('awtad-activate','5 0 * * *','select public.awtad_cron_activate()');
select cron.schedule('awtad-shift-reminders','*/15 * * * *','select public.awtad_cron_shift_reminders()');
