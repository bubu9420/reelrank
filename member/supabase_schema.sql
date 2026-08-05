-- ============================================================
-- 影剪辑账号系统（Supabase PostgreSQL）
-- 在 Supabase Dashboard -> SQL Editor 里整体执行一次即可
-- 注意：SECRET 必须与 member/gen_codes.cjs 里的 SECRET 一致
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- 表 ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  nickname text default '',
  vip_plan text,
  vip_expires_at timestamptz,
  last_bonus_date date,
  created_at timestamptz default now()
);

create table if not exists public.codes (
  id bigserial primary key,
  code_hash text unique not null,          -- 激活码校验和（8 位大写 hex）
  plan text not null,                      -- M / Y / L
  status text not null default 'unused',   -- unused / used
  bound_to uuid references auth.users(id) on delete set null,
  activated_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  tool text not null,
  content text not null,
  author_name text not null default '用户',
  created_at timestamptz default now()
);

create table if not exists public.replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  author_name text not null default '用户',
  created_at timestamptz default now()
);

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.codes enable row level security;
alter table public.posts enable row level security;
alter table public.replies enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "posts_select_all" on public.posts;
create policy "posts_select_all" on public.posts
  for select using (true);
drop policy if exists "posts_insert_own" on public.posts;
create policy "posts_insert_own" on public.posts
  for insert with check (auth.uid() = user_id);
drop policy if exists "posts_delete_own" on public.posts;
create policy "posts_delete_own" on public.posts
  for delete using (auth.uid() = user_id);

drop policy if exists "replies_select_all" on public.replies;
create policy "replies_select_all" on public.replies
  for select using (true);
drop policy if exists "replies_insert_own" on public.replies;
create policy "replies_insert_own" on public.replies
  for insert with check (auth.uid() = user_id);
drop policy if exists "replies_delete_own" on public.replies;
create policy "replies_delete_own" on public.replies
  for delete using (auth.uid() = user_id);

-- ---------- 触发器：发帖/回复自动填昵称 ----------
create or replace function public.set_author_name()
returns trigger language plpgsql security definer set search_path = public as $$
declare uname text;
begin
  if new.user_id is null then
    return new; /* 种子帖/匿名帖保留原始作者名 */
  end if;
  select coalesce(nullif(p.nickname, ''), split_part(p.email, '@', 1), '用户')
    into uname from public.profiles p where p.id = auth.uid();
  new.author_name := coalesce(uname, '用户');
  return new;
end $$;

drop trigger if exists trg_posts_author on public.posts;
create trigger trg_posts_author before insert on public.posts
  for each row execute function public.set_author_name();
drop trigger if exists trg_replies_author on public.replies;
create trigger trg_replies_author before insert on public.replies
  for each row execute function public.set_author_name();

-- ---------- 激活码绑定（服务端校验，密钥不暴露给前端） ----------
create or replace function public.activate_code(p_code text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  v_uid uuid := auth.uid();
  v_plan text;
  v_payload text;
  v_hash text;
  v_days int;
  v_cur timestamptz;
  v_new timestamptz;
  v_code record;
begin
  if v_uid is null then
    return json_build_object('ok', false, 'msg', '请先登录');
  end if;
  if p_code !~ '^YC-[MLY]-[A-Z0-9]{6}-[A-Z0-9]{8}$' then
    return json_build_object('ok', false, 'msg', '激活码格式不正确');
  end if;
  v_plan := substring(p_code from 4 for 1);
  v_payload := substring(p_code from 6 for 6);
  v_hash := upper(substring(encode(digest('yingclip-vip-s2f9a7c4' || v_plan || v_payload, 'sha256'), 'hex') from 1 for 8));

  select * into v_code from public.codes where code_hash = v_hash;
  if not found then
    return json_build_object('ok', false, 'msg', '激活码不存在或已失效');
  end if;
  if v_code.status = 'used' and v_code.bound_to = v_uid then
    return json_build_object('ok', false, 'msg', '该激活码已绑定你的账号');
  end if;
  if v_code.status = 'used' and v_code.bound_to is null then
    return json_build_object('ok', false, 'msg', '该激活码已被使用，无法再次激活');
  end if;
  if v_code.status = 'used' then
    return json_build_object('ok', false, 'msg', '该激活码已绑定其他账号');
  end if;

  update public.codes set status = 'used', bound_to = v_uid, activated_at = now()
    where id = v_code.id;

  v_days := case v_plan when 'M' then 30 when 'Y' then 365 else 36500 end;
  select vip_expires_at into v_cur from public.profiles where id = v_uid;
  v_new := greatest(coalesce(v_cur, now()), now()) + (v_days || ' days')::interval;
  insert into public.profiles (id, email, nickname, vip_plan, vip_expires_at)
    values (v_uid, (select email from auth.users where id = v_uid), '', v_plan, v_new)
    on conflict (id) do update set
      vip_plan = excluded.vip_plan,
      vip_expires_at = excluded.vip_expires_at;
  return json_build_object('ok', true, 'plan', v_plan, 'expires_at', v_new);
end $$;
grant execute on function public.activate_code(text) to authenticated;

-- ---------- 登录奖励：每天登录 +5 次 VIP 功能免费额度 ----------
create or replace function public.claim_bonus()
returns json language plpgsql security definer set search_path = public, extensions as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return json_build_object('ok', false, 'msg', '请先登录');
  end if;
  insert into public.profiles (id, email, nickname, last_bonus_date)
    values (v_uid, (select email from auth.users where id = v_uid), '', current_date)
    on conflict (id) do nothing;
  if exists (select 1 from public.profiles where id = v_uid and last_bonus_date = current_date) then
    return json_build_object('ok', true, 'bonus', 5, 'date', current_date::text);
  end if;
  update public.profiles set last_bonus_date = current_date where id = v_uid;
  return json_build_object('ok', true, 'bonus', 5, 'date', current_date::text);
end $$;
grant execute on function public.claim_bonus() to authenticated;

-- ---------- 我的资料（登录后同步会员状态） ----------
create or replace function public.my_profile()
returns json language sql stable security definer set search_path = public, extensions as $$
  select json_build_object(
    'nickname', coalesce(nullif(p.nickname, ''), split_part(p.email, '@', 1)),
    'vip_plan', p.vip_plan,
    'vip_expires_at', p.vip_expires_at,
    'last_bonus_date', p.last_bonus_date
  ) from public.profiles p where p.id = auth.uid();
$$;
grant execute on function public.my_profile() to authenticated;

-- ---------- 预置激活码（站长终身码 + 测试码） ----------
insert into public.codes (code_hash, plan) values
  ('1E67D9EC', 'L'),  -- YC-L-DBFO7G-1E67D9EC 站长终身码
  ('CBBDDFD2', 'Y'),  -- YC-Y-T9S8O4-CBBDDFD2 测试年卡
  ('DCF24FAC', 'M'),  -- YC-M-R14Q0H-DCF24FAC 测试月卡
  ('DB26A2FC', 'L')   -- YC-L-T5AZR7-DB26A2FC 测试终身
on conflict (code_hash) do nothing;
