-- Existing reports deliberately remain ownerless. They are not claimable by the
-- first anonymous session that happens to know their UUID.
begin;

alter table public.reports
  add column owner_id uuid references auth.users(id) on delete set null;

create index reports_owner_id_created_at_idx
  on public.reports (owner_id, created_at desc)
  where owner_id is not null;

-- The mobile app has no direct table access. Its only route is the backend,
-- which uses the service role and applies owner_id filtering explicitly.
-- Keep client Data API access denied even if a permissive policy is added later.
revoke all on table public.reports from anon, authenticated;
drop policy if exists reports_backend_only on public.reports;
create policy reports_backend_only
  on public.reports
  as restrictive
  for all
  to public
  using (false)
  with check (false);

-- report-images is private and is served only by the authenticated backend
-- endpoint. This restrictive policy prevents direct Storage API access by
-- authenticated users even if a permissive bucket policy is introduced later.
drop policy if exists report_images_backend_only on storage.objects;
create policy report_images_backend_only
  on storage.objects
  as restrictive
  for all
  to public
  using (bucket_id <> 'report-images')
  with check (bucket_id <> 'report-images');

commit;
