-- Live catalog: client reads only. Seed data separately with an administrative connection.
create table if not exists public.riwaq_tracks (id integer primary key, name text not null, note text not null default '', position integer not null);
create table if not exists public.riwaq_books (id text primary key, track_id integer not null references public.riwaq_tracks(id), position integer not null, title text not null, reason text not null default '', pages integer not null default 0, cover text, pending boolean not null default false, publisher_url text, parts jsonb not null default '[]', byte_size bigint not null default 0, sha256 text);
create index if not exists riwaq_books_track_position on public.riwaq_books(track_id,position);
alter table public.riwaq_tracks enable row level security;
alter table public.riwaq_books enable row level security;
revoke all on public.riwaq_tracks,public.riwaq_books from anon,authenticated;
grant select on public.riwaq_tracks,public.riwaq_books to anon,authenticated;
do $$ begin
 create policy catalog_tracks_read on public.riwaq_tracks for select to anon,authenticated using (true);
exception when duplicate_object then null; end $$;
do $$ begin
 create policy catalog_books_read on public.riwaq_books for select to anon,authenticated using (true);
exception when duplicate_object then null; end $$;
do $$ begin
 create policy riwaq_catalog_file_read on storage.objects for select to anon,authenticated using (bucket_id='riwaq-books' and exists (select 1 from public.riwaq_books b where b.parts @> jsonb_build_array(jsonb_build_object('path',storage.objects.name))));
exception when duplicate_object then null; end $$;
