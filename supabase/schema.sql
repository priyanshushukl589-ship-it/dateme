-- =====================================================================
--  DateMe - database setup
--
--  HOW TO USE:
--  Supabase dashboard -> SQL Editor -> New query -> paste this ENTIRE
--  file -> click "Run".  It is safe to run more than once.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. TABLES
-- ---------------------------------------------------------------------

create table if not exists public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  name            text not null check (char_length(name) between 1 and 50),
  birthdate       date not null,
  gender          text not null check (gender in ('man', 'woman', 'nonbinary')),
  interested_in   text not null default 'everyone'
                    check (interested_in in ('men', 'women', 'everyone')),
  bio             text not null default '' check (char_length(bio) <= 500),
  interests       text[] not null default '{}',
  photos          text[] not null default '{}',
  city            text not null default '' check (char_length(city) <= 80),
  latitude        double precision,
  longitude       double precision,
  min_age         int not null default 18 check (min_age >= 18),
  max_age         int not null default 99 check (max_age <= 99),
  max_distance_km int not null default 100 check (max_distance_km between 1 and 20000),
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint profiles_age_range check (max_age >= min_age)
);

create table if not exists public.swipes (
  swiper     uuid not null references public.profiles (id) on delete cascade,
  swiped     uuid not null references public.profiles (id) on delete cascade,
  direction  text not null check (direction in ('like', 'pass', 'super')),
  created_at timestamptz not null default now(),
  primary key (swiper, swiped),
  check (swiper <> swiped)
);
create index if not exists swipes_swiped_idx on public.swipes (swiped);

create table if not exists public.matches (
  id         uuid primary key default gen_random_uuid(),
  user_a     uuid not null references public.profiles (id) on delete cascade,
  user_b     uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);
create index if not exists matches_user_b_idx on public.matches (user_b);

create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references public.matches (id) on delete cascade,
  sender_id  uuid not null references public.profiles (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at    timestamptz
);
create index if not exists messages_match_idx on public.messages (match_id, created_at);

create table if not exists public.blocks (
  blocker    uuid not null references public.profiles (id) on delete cascade,
  blocked    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);

-- Reports are kept even if either person later deletes their account,
-- so there are deliberately no foreign keys here.
create table if not exists public.reports (
  id         uuid primary key default gen_random_uuid(),
  reporter   uuid not null,
  reported   uuid not null,
  reason     text not null,
  details    text not null default '' check (char_length(details) <= 1000),
  created_at timestamptz not null default now()
);


-- ---------------------------------------------------------------------
-- 2. PROFILE RULES (18+ check, limits)
-- ---------------------------------------------------------------------

create or replace function public.check_profile()
returns trigger
language plpgsql
as $$
begin
  if new.birthdate > (current_date - interval '18 years') then
    raise exception 'You must be 18 or older to use DateMe.';
  end if;
  if coalesce(array_length(new.photos, 1), 0) > 6 then
    raise exception 'You can have at most 6 photos.';
  end if;
  if coalesce(array_length(new.interests, 1), 0) > 10 then
    raise exception 'You can pick at most 10 interests.';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_check on public.profiles;
create trigger profiles_check
  before insert or update on public.profiles
  for each row execute function public.check_profile();


-- ---------------------------------------------------------------------
-- 3. FUNCTIONS THE APP CALLS
-- ---------------------------------------------------------------------

-- Record a swipe. Creates a match automatically if the other person
-- already liked you. Returns {"match_id": <uuid or null>, "super_downgraded": bool}.
create or replace function public.swipe_user(target uuid, dir text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  final_dir text := dir;
  downgraded boolean := false;
  ua uuid;
  ub uuid;
  mid uuid;
begin
  if me is null then
    raise exception 'Please sign in first.';
  end if;
  if target = me then
    raise exception 'You cannot swipe on yourself.';
  end if;
  if dir not in ('like', 'pass', 'super') then
    raise exception 'Invalid swipe.';
  end if;
  if not exists (select 1 from public.profiles pr where pr.id = me) then
    raise exception 'Create your profile first.';
  end if;
  if exists (
    select 1 from public.blocks bl
    where (bl.blocker = me and bl.blocked = target)
       or (bl.blocker = target and bl.blocked = me)
  ) then
    raise exception 'This person is not available.';
  end if;

  -- one Super Like per 24 hours; extra ones become normal likes
  if final_dir = 'super' and exists (
    select 1 from public.swipes s
    where s.swiper = me and s.direction = 'super'
      and s.created_at > now() - interval '24 hours'
  ) then
    final_dir := 'like';
    downgraded := true;
  end if;

  insert into public.swipes (swiper, swiped, direction)
  values (me, target, final_dir)
  on conflict (swiper, swiped) do nothing;

  if final_dir in ('like', 'super') and exists (
    select 1 from public.swipes s2
    where s2.swiper = target and s2.swiped = me
      and s2.direction in ('like', 'super')
  ) then
    if me < target then
      ua := me; ub := target;
    else
      ua := target; ub := me;
    end if;
    insert into public.matches (user_a, user_b)
    values (ua, ub)
    on conflict (user_a, user_b) do nothing;
    select m.id into mid from public.matches m where m.user_a = ua and m.user_b = ub;
  end if;

  return jsonb_build_object('match_id', mid, 'super_downgraded', downgraded);
end;
$$;


-- People to swipe on: respects both people's gender preference, age range
-- and distance, hides blocked / already-swiped / paused profiles.
create or replace function public.get_discover(max_results int default 10)
returns table (
  id uuid,
  name text,
  age int,
  gender text,
  bio text,
  interests text[],
  photos text[],
  city text,
  distance_km int
)
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select * from public.profiles where profiles.id = auth.uid()
  ),
  cand as (
    select
      p.id            as c_id,
      p.name          as c_name,
      p.gender        as c_gender,
      p.bio           as c_bio,
      p.interests     as c_interests,
      p.photos        as c_photos,
      p.city          as c_city,
      extract(year from age(p.birthdate))::int as c_age,
      me.max_distance_km as my_max_dist,
      p.max_distance_km  as their_max_dist,
      case
        when me.latitude is not null and p.latitude is not null then
          6371 * 2 * asin(least(1, sqrt(
            power(sin(radians(p.latitude - me.latitude) / 2), 2) +
            cos(radians(me.latitude)) * cos(radians(p.latitude)) *
            power(sin(radians(p.longitude - me.longitude) / 2), 2)
          )))
      end as dist
    from public.profiles p
    cross join me
    where p.id <> me.id
      and p.is_active
      and cardinality(p.photos) > 0
      -- what I'm looking for
      and (me.interested_in = 'everyone'
           or (me.interested_in = 'men'   and p.gender = 'man')
           or (me.interested_in = 'women' and p.gender = 'woman'))
      -- what they're looking for
      and (p.interested_in = 'everyone'
           or (p.interested_in = 'men'   and me.gender = 'man')
           or (p.interested_in = 'women' and me.gender = 'woman'))
      -- age ranges, both ways
      and extract(year from age(p.birthdate))  between me.min_age and me.max_age
      and extract(year from age(me.birthdate)) between p.min_age  and p.max_age
      -- not already swiped
      and not exists (
        select 1 from public.swipes s
        where s.swiper = me.id and s.swiped = p.id
      )
      -- not blocked either way
      and not exists (
        select 1 from public.blocks b
        where (b.blocker = me.id and b.blocked = p.id)
           or (b.blocker = p.id and b.blocked = me.id)
      )
  )
  select
    cand.c_id,
    cand.c_name,
    cand.c_age,
    cand.c_gender,
    cand.c_bio,
    cand.c_interests,
    cand.c_photos,
    cand.c_city,
    round(cand.dist)::int
  from cand
  where cand.dist is null
     or (cand.dist <= cand.my_max_dist and cand.dist <= cand.their_max_dist)
  order by random()
  limit least(greatest(max_results, 1), 20);
$$;


-- Your matches with the last message and unread count.
create or replace function public.get_matches()
returns table (
  match_id uuid,
  other_id uuid,
  name text,
  photo text,
  matched_at timestamptz,
  last_message text,
  last_at timestamptz,
  last_sender uuid,
  unread int
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.id,
    o.id,
    o.name,
    o.photos[1],
    m.created_at,
    lm.body,
    lm.created_at,
    lm.sender_id,
    (select count(*)::int
       from public.messages x
      where x.match_id = m.id
        and x.sender_id <> auth.uid()
        and x.read_at is null)
  from public.matches m
  join public.profiles o
    on o.id = case when m.user_a = auth.uid() then m.user_b else m.user_a end
  left join lateral (
    select msg.body, msg.created_at, msg.sender_id
      from public.messages msg
     where msg.match_id = m.id
     order by msg.created_at desc
     limit 1
  ) lm on true
  where auth.uid() in (m.user_a, m.user_b)
  order by coalesce(lm.created_at, m.created_at) desc;
$$;


-- Mark the other person's messages in a chat as read.
create or replace function public.mark_read(p_match uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.messages
     set read_at = now()
   where match_id = p_match
     and sender_id <> auth.uid()
     and read_at is null
     and exists (
       select 1 from public.matches m
        where m.id = p_match
          and auth.uid() in (m.user_a, m.user_b)
     );
$$;


-- People you have blocked (for the Settings page).
create or replace function public.get_blocked()
returns table (blocked_id uuid, name text, photo text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.name, p.photos[1]
    from public.blocks b
    join public.profiles p on p.id = b.blocked
   where b.blocker = auth.uid();
$$;


-- "Show me people I passed on again".
create or replace function public.reset_passes()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.swipes
   where swiper = auth.uid() and direction = 'pass';
$$;


-- Permanently delete your own account and all your data.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Please sign in first.';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

-- Only signed-in users may call these.
revoke all on function public.swipe_user(uuid, text) from public, anon;
revoke all on function public.get_discover(int)      from public, anon;
revoke all on function public.get_matches()          from public, anon;
revoke all on function public.mark_read(uuid)        from public, anon;
revoke all on function public.get_blocked()          from public, anon;
revoke all on function public.reset_passes()         from public, anon;
revoke all on function public.delete_my_account()    from public, anon;

grant execute on function public.swipe_user(uuid, text) to authenticated;
grant execute on function public.get_discover(int)      to authenticated;
grant execute on function public.get_matches()          to authenticated;
grant execute on function public.mark_read(uuid)        to authenticated;
grant execute on function public.get_blocked()          to authenticated;
grant execute on function public.reset_passes()         to authenticated;
grant execute on function public.delete_my_account()    to authenticated;


-- ---------------------------------------------------------------------
-- 4. SECURITY RULES (Row Level Security)
--    These make sure people can only see / change what they should.
-- ---------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.swipes   enable row level security;
alter table public.matches  enable row level security;
alter table public.messages enable row level security;
alter table public.blocks   enable row level security;
alter table public.reports  enable row level security;

revoke all on all tables in schema public from anon;

-- profiles: you can only read and write your OWN row directly.
-- Other people's profiles are only reachable through the functions above.
drop policy if exists "profiles read own"   on public.profiles;
drop policy if exists "profiles insert own" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles read own"   on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "profiles insert own" on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy "profiles update own" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- swipes: you can see your own swipes; they are only written by swipe_user().
drop policy if exists "swipes read own" on public.swipes;
create policy "swipes read own" on public.swipes for select to authenticated using (swiper = (select auth.uid()));

-- matches: members can see and delete (unmatch).
drop policy if exists "matches read member"   on public.matches;
drop policy if exists "matches delete member" on public.matches;
create policy "matches read member" on public.matches for select to authenticated
  using ((select auth.uid()) in (user_a, user_b));
create policy "matches delete member" on public.matches for delete to authenticated
  using ((select auth.uid()) in (user_a, user_b));

-- messages: only the two people in the match can read or send.
drop policy if exists "messages read member"   on public.messages;
drop policy if exists "messages insert member" on public.messages;
create policy "messages read member" on public.messages for select to authenticated
  using (exists (
    select 1 from public.matches m
     where m.id = messages.match_id
       and (select auth.uid()) in (m.user_a, m.user_b)
  ));
create policy "messages insert member" on public.messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.matches m
       where m.id = messages.match_id
         and (select auth.uid()) in (m.user_a, m.user_b)
    )
  );

-- blocks: manage your own block list.
drop policy if exists "blocks read own"   on public.blocks;
drop policy if exists "blocks insert own" on public.blocks;
drop policy if exists "blocks delete own" on public.blocks;
create policy "blocks read own"   on public.blocks for select to authenticated using (blocker = (select auth.uid()));
create policy "blocks insert own" on public.blocks for insert to authenticated with check (blocker = (select auth.uid()));
create policy "blocks delete own" on public.blocks for delete to authenticated using (blocker = (select auth.uid()));

-- reports: you can file reports; nobody can read them from the app
-- (you read them in the Supabase dashboard -> Table Editor -> reports).
drop policy if exists "reports insert own" on public.reports;
create policy "reports insert own" on public.reports for insert to authenticated
  with check (reporter = (select auth.uid()));


-- ---------------------------------------------------------------------
-- 5. REAL-TIME CHAT
-- ---------------------------------------------------------------------

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;


-- ---------------------------------------------------------------------
-- 6. PHOTO STORAGE
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "photos upload own" on storage.objects;
drop policy if exists "photos read own"   on storage.objects;
drop policy if exists "photos delete own" on storage.objects;

create policy "photos upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "photos read own" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "photos delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Done! You should see "Success. No rows returned".
