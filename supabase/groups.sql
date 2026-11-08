create table if not exists public.football_groups (
 id uuid primary key,
 name text not null check(char_length(name) between 2 and 60),
 owner_email text not null unique,
 revision bigint not null default 0,
 data jsonb not null,
 created_at timestamptz not null default now()
);
alter table public.football_groups enable row level security;
revoke all on public.football_groups from public,anon,authenticated;
grant select,insert,update,delete on public.football_groups to service_role;
create table if not exists public.football_signup_limits (
 key text primary key, count integer not null, expires timestamptz not null
);
alter table public.football_signup_limits enable row level security;
revoke all on public.football_signup_limits from public,anon,authenticated;
grant all on public.football_signup_limits to service_role;
create or replace function public.football_signup_allowed(ip_key text) returns boolean
language plpgsql security invoker set search_path = public as $$
declare n integer; g integer;
begin
 delete from public.football_signup_limits where expires < now();
 insert into public.football_signup_limits(key,count,expires) values ('global',1,now()+interval '1 day')
 on conflict(key) do update set count=football_signup_limits.count+1 returning count into g;
 insert into public.football_signup_limits(key,count,expires) values ('ip:'||ip_key,1,now()+interval '1 hour')
 on conflict(key) do update set count=football_signup_limits.count+1 returning count into n;
 return n<=10 and g<=200;
end $$;
revoke execute on function public.football_signup_allowed(text) from public,anon,authenticated;
grant execute on function public.football_signup_allowed(text) to service_role;
