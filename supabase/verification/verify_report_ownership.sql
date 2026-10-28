-- Read-only checks to run after 20261016000100_add_report_ownership.sql.
-- These queries return schema/security metadata and aggregate counts only.

-- owner_id column
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'reports'
  and column_name = 'owner_id';

-- owner_id foreign key and its delete behavior
select
  tc.constraint_name,
  kcu.column_name,
  ccu.table_schema as referenced_table_schema,
  ccu.table_name as referenced_table_name,
  ccu.column_name as referenced_column_name,
  rc.delete_rule,
  rc.update_rule
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on kcu.constraint_catalog = tc.constraint_catalog
 and kcu.constraint_schema = tc.constraint_schema
 and kcu.constraint_name = tc.constraint_name
join information_schema.constraint_column_usage ccu
  on ccu.constraint_catalog = tc.constraint_catalog
 and ccu.constraint_schema = tc.constraint_schema
 and ccu.constraint_name = tc.constraint_name
join information_schema.referential_constraints rc
  on rc.constraint_catalog = tc.constraint_catalog
 and rc.constraint_schema = tc.constraint_schema
 and rc.constraint_name = tc.constraint_name
where tc.table_schema = 'public'
  and tc.table_name = 'reports'
  and tc.constraint_type = 'FOREIGN KEY'
  and kcu.column_name = 'owner_id';

-- RLS state
select
  n.nspname as table_schema,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where (n.nspname = 'public' and c.relname = 'reports')
   or (n.nspname = 'storage' and c.relname = 'objects')
order by n.nspname, c.relname;

-- Direct table grants for API roles
select grantee, privilege_type, is_grantable
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'reports'
  and grantee in ('anon', 'authenticated', 'service_role')
order by grantee, privilege_type;

-- Policies affecting reports and Storage objects
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where (schemaname = 'public' and tablename = 'reports')
   or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, policyname;

-- report-images must return public = false
select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'report-images';

-- Aggregate-only ownership check; no report or personal data is returned
select
  count(*) filter (where owner_id is null) as ownerless_report_count,
  count(*) filter (where owner_id is not null) as owned_report_count,
  count(*) as total_report_count
from public.reports;
