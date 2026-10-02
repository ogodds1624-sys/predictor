create table if not exists visits (
  id serial primary key,
  login_number text not null,
  created_at timestamptz not null default now()
);

create index if not exists visits_login_number_idx on visits (login_number);

create table if not exists admin_access (
  id integer primary key,
  login_number text not null,
  constraint admin_access_singleton check (id = 1)
);
