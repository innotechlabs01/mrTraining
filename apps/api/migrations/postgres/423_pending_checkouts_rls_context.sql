-- 423_pending_checkouts_rls_context.sql
-- The pending_checkouts policies fell back to "current_user =
-- 'mr_training_app'", which let the application role read every row of the
-- table. The rows hold the payer's email and the payment state, so the
-- policies now require the row to be the one the request is working on.
--
-- The repository sets the context inside the transaction that reads or
-- writes the row:
--   app.checkout_id     -> the checkout being read or written
--   app.checkout_email  -> the email being looked up

DROP POLICY IF EXISTS pending_checkouts_select ON public.pending_checkouts;
CREATE POLICY pending_checkouts_select ON public.pending_checkouts
  FOR SELECT USING (
    id = NULLIF(current_setting('app.checkout_id', true)::text, '')
    OR LOWER(email) = NULLIF(LOWER(current_setting('app.checkout_email', true)::text), '')
  );

DROP POLICY IF EXISTS pending_checkouts_write ON public.pending_checkouts;
CREATE POLICY pending_checkouts_write ON public.pending_checkouts
  FOR INSERT WITH CHECK (
    id = NULLIF(current_setting('app.checkout_id', true)::text, '')
  );

DROP POLICY IF EXISTS pending_checkouts_update ON public.pending_checkouts;
CREATE POLICY pending_checkouts_update ON public.pending_checkouts
  FOR UPDATE USING (
    id = NULLIF(current_setting('app.checkout_id', true)::text, '')
  )
  WITH CHECK (
    id = NULLIF(current_setting('app.checkout_id', true)::text, '')
  );
