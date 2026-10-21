-- أوتاد: حقول بيانات الموظف اللازمة للربط الحكومي (نُفّذ على المشروع كترحيل awtad_07_employee_gov_fields)
alter table awtad_employees add column if not exists national_id text;
alter table awtad_employees add column if not exists nationality text;
alter table awtad_employees add column if not exists birth_date date;
alter table awtad_employees add column if not exists gender text;
alter table awtad_employees add column if not exists gosi_no text;
alter table awtad_employees add column if not exists qiwa_contract_no text;
alter table awtad_employees add column if not exists qiwa_status text;
alter table awtad_employees add column if not exists occupation text;
