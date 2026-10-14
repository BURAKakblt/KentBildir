revoke all on table public.reports from service_role;

grant usage on schema public to service_role;

grant select, insert
on table public.reports
to service_role;
