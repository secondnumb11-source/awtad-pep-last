-- أوتاد: الدخول الحقيقي وتشديد الصلاحيات (نُفّذ على المشروع كترحيل awtad_04_auth_security). يمس جداول awtad_ فقط.
alter table awtad_profiles add column if not exists employee_id bigint references awtad_employees(id) on delete set null;
create or replace function public.awtad_my_emp() returns bigint language sql stable security definer set search_path=public
as $$ select employee_id from awtad_profiles where id=auth.uid() $$;

-- إلغاء وضع التطوير المؤقت وحذف المنشأة التجريبية
do $$ declare t text; begin
 foreach t in array array['awtad_organizations','awtad_profiles','awtad_employees','awtad_attendance','awtad_leaves','awtad_expenses','awtad_candidates','awtad_org_units','awtad_onboarding_tasks','awtad_goals','awtad_reviews','awtad_courses','awtad_trainings','awtad_surveys','awtad_survey_responses','awtad_petty_cash','awtad_petty_spend','awtad_trips','awtad_salary_bands','awtad_journal_entries'] loop
  execute format('drop policy if exists awtad_dev_all on %I', t);
 end loop; end $$;
delete from awtad_organizations where id='00000000-0000-0000-0000-000000000001';

-- الموظفون: المدير فما فوق يرى الجميع، والموظف يرى سجله فقط
drop policy if exists awtad_emp_r on awtad_employees;
create policy awtad_emp_r on awtad_employees for select using (org_id=awtad_my_org() and (awtad_my_role() in ('admin','hr','manager') or id=awtad_my_emp()));

-- الحضور والإجازات والمصروفات
drop policy if exists awtad_att_all on awtad_attendance;
create policy awtad_att_r on awtad_attendance for select using (org_id=awtad_my_org() and (awtad_my_role() in ('admin','hr','manager') or employee_id=awtad_my_emp()));
create policy awtad_att_w on awtad_attendance for all using (org_id=awtad_my_org() and (awtad_my_role() in ('admin','hr') or employee_id=awtad_my_emp())) with check (org_id=awtad_my_org() and (awtad_my_role() in ('admin','hr') or employee_id=awtad_my_emp()));
drop policy if exists awtad_lv_r on awtad_leaves; drop policy if exists awtad_lv_i on awtad_leaves;
create policy awtad_lv_r on awtad_leaves for select using (org_id=awtad_my_org() and (awtad_my_role() in ('admin','hr','manager') or employee_id=awtad_my_emp()));
create policy awtad_lv_i on awtad_leaves for insert with check (org_id=awtad_my_org() and (awtad_my_role() in ('admin','hr','manager') or employee_id=awtad_my_emp()));
drop policy if exists awtad_ex_r on awtad_expenses; drop policy if exists awtad_ex_i on awtad_expenses;
create policy awtad_ex_r on awtad_expenses for select using (org_id=awtad_my_org() and (awtad_my_role() in ('admin','hr','manager') or employee_id=awtad_my_emp()));
create policy awtad_ex_i on awtad_expenses for insert with check (org_id=awtad_my_org() and (awtad_my_role() in ('admin','hr','manager') or employee_id=awtad_my_emp()));

-- جداول الوحدات
do $$ declare t text; begin
 foreach t in array array['awtad_org_units','awtad_onboarding_tasks','awtad_goals','awtad_reviews','awtad_courses','awtad_trainings','awtad_surveys','awtad_survey_responses','awtad_petty_cash','awtad_petty_spend','awtad_trips','awtad_salary_bands','awtad_journal_entries'] loop
  execute format('drop policy if exists awtad_org_all on %I', t);
  execute format('create policy awtad_w on %I for all using (org_id=awtad_my_org() and awtad_my_role() in (''admin'',''hr'')) with check (org_id=awtad_my_org())', t);
 end loop;
 foreach t in array array['awtad_org_units','awtad_courses','awtad_surveys'] loop
  execute format('create policy awtad_r on %I for select using (org_id=awtad_my_org())', t);
 end loop;
 foreach t in array array['awtad_onboarding_tasks','awtad_goals','awtad_reviews','awtad_trainings','awtad_trips','awtad_petty_cash'] loop
  execute format('create policy awtad_r on %I for select using (org_id=awtad_my_org() and (awtad_my_role() in (''admin'',''hr'',''manager'') or employee_id=awtad_my_emp()))', t);
 end loop;
 foreach t in array array['awtad_petty_spend','awtad_survey_responses'] loop
  execute format('create policy awtad_r on %I for select using (org_id=awtad_my_org() and awtad_my_role() in (''admin'',''hr'',''manager''))', t);
 end loop;
 foreach t in array array['awtad_salary_bands','awtad_journal_entries'] loop
  execute format('create policy awtad_r on %I for select using (org_id=awtad_my_org() and awtad_my_role() in (''admin'',''hr''))', t);
 end loop;
end $$;
create policy awtad_resp_i on awtad_survey_responses for insert with check (org_id=awtad_my_org());
create policy awtad_trip_i on awtad_trips for insert with check (org_id=awtad_my_org() and (awtad_my_role() in ('admin','hr','manager') or employee_id=awtad_my_emp()));
create policy awtad_trip_u on awtad_trips for update using (org_id=awtad_my_org() and awtad_my_role() in ('admin','hr','manager'));
