create table if not exists confirmed_logins (
  login_number text primary key,
  confirmed_at timestamptz not null default now()
);
