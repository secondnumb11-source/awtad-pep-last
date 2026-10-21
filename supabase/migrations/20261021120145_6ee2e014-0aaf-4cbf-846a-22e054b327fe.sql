revoke execute on function public.awtad_audit_trg(), public.awtad_tr_expense(), public.awtad_tr_loan(), public.awtad_tr_petty(), public.awtad_tr_pspend(), public.awtad_tr_trip(), public.awtad_req_levels() from public, anon, authenticated;
revoke execute on function public.awtad_create_org(text, text) from public, anon;
grant execute on function public.awtad_create_org(text, text) to authenticated;
alter function public.awtad_req_levels() set search_path = public;