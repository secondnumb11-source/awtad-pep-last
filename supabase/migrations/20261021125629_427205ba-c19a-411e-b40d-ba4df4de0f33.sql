DO $policies$
DECLARE p record;
BEGIN
  FOR p IN SELECT * FROM pg_policies WHERE schemaname='public' AND tablename LIKE 'awtad_%' AND cmd='ALL' AND qual IS NOT NULL AND with_check = '(org_id = awtad_my_org())'
  LOOP
    EXECUTE format('ALTER POLICY %I ON public.%I WITH CHECK (%s)',p.policyname,p.tablename,p.qual);
  END LOOP;
  -- All these tables have no anonymous grants; anonymous careers use the verified service endpoint.
  FOR p IN SELECT * FROM pg_policies WHERE schemaname='public' AND tablename LIKE 'awtad_%' AND roles = ARRAY['public']::name[]
  LOOP
    EXECUTE format('ALTER POLICY %I ON public.%I TO authenticated',p.policyname,p.tablename);
  END LOOP;
END;
$policies$;

ALTER POLICY memberships_insert_own ON public.memberships
WITH CHECK (public.user_has_org_role(org_id, ARRAY['owner'::public.member_role,'admin'::public.member_role]));

REVOKE EXECUTE ON FUNCTION public.awtad_my_org(),public.awtad_my_emp(),public.awtad_my_role(),public.current_org_id() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.awtad_my_org(),public.awtad_my_emp(),public.awtad_my_role(),public.current_org_id() TO authenticated,service_role;

GRANT SELECT ON public.awtad_survey_participation TO authenticated;
GRANT ALL ON public.awtad_survey_participation TO service_role;
CREATE POLICY awtad_participation_self_read ON public.awtad_survey_participation
FOR SELECT TO authenticated
USING (org_id = public.awtad_my_org() AND employee_id = public.awtad_my_emp());

-- Structural regressions validate exact access rules without modifying company records.
DO $tests$
DECLARE t text; p record;
BEGIN
  FOREACH t IN ARRAY ARRAY['awtad_acct_accounts','awtad_acct_mappings','awtad_fiscal_years'] LOOP
    SELECT * INTO p FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname='awtad_acct_all';
    IF p.qual IS DISTINCT FROM p.with_check OR position('accountant' in p.with_check)=0 THEN RAISE EXCEPTION 'Accounting role check regression: %',t; END IF;
  END LOOP;
  SELECT * INTO p FROM pg_policies WHERE schemaname='public' AND tablename='awtad_profiles' AND policyname='awtad_prof_adm';
  IF p.qual IS DISTINCT FROM p.with_check OR position('admin' in p.with_check)=0 THEN RAISE EXCEPTION 'Profile admin authorization regression'; END IF;
  IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename LIKE 'awtad_%' AND roles=ARRAY['public']::name[]) THEN RAISE EXCEPTION 'Anonymous policy regression'; END IF;
  IF has_function_privilege('anon','public.awtad_my_role()','EXECUTE') THEN RAISE EXCEPTION 'Anonymous helper access regression'; END IF;
  IF NOT has_function_privilege('authenticated','public.awtad_my_role()','EXECUTE') THEN RAISE EXCEPTION 'Authenticated helper access regression'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='awtad_survey_participation' AND policyname='awtad_participation_self_read' AND qual LIKE '%employee_id = awtad_my_emp()%') THEN RAISE EXCEPTION 'Survey participation privacy regression'; END IF;
  SELECT * INTO p FROM pg_policies WHERE schemaname='public' AND tablename='memberships' AND policyname='memberships_insert_own';
  IF p.with_check NOT LIKE '%user_has_org_role%' THEN RAISE EXCEPTION 'Membership assignment regression'; END IF;
END;
$tests$;