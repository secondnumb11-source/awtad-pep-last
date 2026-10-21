DO $hardening$
DECLARE f record; original text; hardened text;
BEGIN
  FOR f IN SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN (
      'awtad_apply_request','awtad_birthday_greetings','awtad_close_year',
      'awtad_decide_request','awtad_generate_renewals','awtad_ledger',
      'awtad_post_journal','awtad_post_payroll','awtad_record_fee',
      'awtad_reverse_journal','awtad_seed_chart','awtad_trial_balance')
  LOOP
    original := pg_get_functiondef(f.oid);
    hardened := replace(original, 'if awtad_my_role() not in (', 'if awtad_my_role() is null or awtad_my_role() not in (');
    hardened := replace(hardened, 'if v_role not in (', 'if v_role is null or v_role not in (');
    IF hardened <> original THEN EXECUTE hardened; END IF;
  END LOOP;
END;
$hardening$;

-- Regression checks: operations must reject a caller with no identity or role.
DO $checks$
DECLARE rejected boolean;
BEGIN
  PERFORM set_config('request.jwt.claim.sub','',true);
  PERFORM set_config('request.jwt.claims','{}',true);
  IF public.awtad_my_role() IS NOT NULL THEN RAISE EXCEPTION 'Regression setup requires no role'; END IF;
  rejected := false;
  BEGIN PERFORM public.awtad_generate_renewals(60);
  EXCEPTION WHEN OTHERS THEN rejected := SQLERRM = 'غير مسموح'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Renewal authorization regression'; END IF;
  rejected := false;
  BEGIN PERFORM public.awtad_seed_chart();
  EXCEPTION WHEN OTHERS THEN rejected := SQLERRM = 'غير مسموح'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Accounting authorization regression'; END IF;
  rejected := false;
  BEGIN PERFORM public.awtad_apply_request(-1);
  EXCEPTION WHEN OTHERS THEN rejected := SQLERRM = 'غير مسموح'; END;
  IF NOT rejected THEN RAISE EXCEPTION 'Request authorization regression'; END IF;
  IF public.awtad_birthday_greetings() <> 0 THEN RAISE EXCEPTION 'Notification authorization regression'; END IF;
END;
$checks$;