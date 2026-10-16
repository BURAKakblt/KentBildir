alter table public.reports
  add column email_status text not null default 'pending',
  add column email_sent_at timestamptz null,
  add column email_last_error_code text null,
  add column email_attempt_count integer not null default 0,
  add constraint reports_email_status_check check (email_status in ('pending', 'sent', 'failed', 'disabled')),
  add constraint reports_email_attempt_count_check check (email_attempt_count >= 0);

-- Historical rows predate delivery support and must not be mistaken for queued mail.
update public.reports
set email_status = 'disabled'
where email_status = 'pending';

grant update (email_status, email_sent_at, email_last_error_code, email_attempt_count)
on public.reports
to service_role;
