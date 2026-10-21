create or replace function public.awtad_autoconfirm_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email_confirmed_at is null then new.email_confirmed_at := now(); end if;
  return new;
end $$;
drop trigger if exists awtad_autoconfirm on auth.users;
create trigger awtad_autoconfirm before insert on auth.users for each row execute function public.awtad_autoconfirm_user();
update auth.users set email_confirmed_at = now() where email_confirmed_at is null;