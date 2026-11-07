-- Documentation of already-applied schema. Do not reset production data.
create table if not exists public.football_club (
 id integer primary key check (id=1),
 revision bigint not null default 0,
 data jsonb not null,
 updated_at timestamptz not null default now()
);
alter table public.football_club enable row level security;
revoke all on public.football_club from public,anon,authenticated;
grant select,insert,update on public.football_club to service_role;
-- Initial data and hashed administrator credentials are provisioned separately.
