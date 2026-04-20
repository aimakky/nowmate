-- Add arrival_stage to profiles
alter table profiles
  add column if not exists arrival_stage text check (arrival_stage in ('new', 'settling', 'local'));
