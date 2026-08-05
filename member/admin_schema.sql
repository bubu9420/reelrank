-- ============================================================
-- 影剪辑管理后台（Supabase）
-- 在 SQL Editor 执行一次即可。管理员由 email 识别，请把站长邮箱加入 admins 表。
-- ============================================================

create table if not exists public.admins (
  email text primary key,
  created_at timestamptz default now()
);
alter table public.admins enable row level security;
-- 不建任何策略：普通用户无法读写 admins，只有下面的 security definer 函数可访问

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from public.admins where email = auth.jwt() ->> 'email');
$$;
grant execute on function public.is_admin() to authenticated;

create or replace function public.admin_stats()
returns json language plpgsql security definer set search_path = public, extensions as $$
declare v json;
begin
  if not public.is_admin() then return json_build_object('ok', false, 'msg', '无权限'); end if;
  select json_build_object(
    'users',        (select count(*) from auth.users),
    'vip_users',    (select count(*) from public.profiles where vip_expires_at > now()),
    'posts',        (select count(*) from public.posts),
    'replies',      (select count(*) from public.replies),
    'codes_unused', (select count(*) from public.codes where status = 'unused'),
    'codes_used',   (select count(*) from public.codes where status = 'used')
  ) into v;
  return json_build_object('ok', true, 'data', v);
end $$;
grant execute on function public.admin_stats() to authenticated;

create or replace function public.admin_list_users()
returns json language plpgsql security definer set search_path = public, extensions as $$
declare v json;
begin
  if not public.is_admin() then return json_build_object('ok', false, 'msg', '无权限'); end if;
  select json_agg(row_to_json(t)) into v from (
    select u.id, u.email, u.created_at,
           p.nickname, p.vip_plan, p.vip_expires_at, p.last_bonus_date,
           (select count(*) from public.posts where user_id = u.id) as posts
    from auth.users u
    left join public.profiles p on p.id = u.id
    order by u.created_at desc
  ) t;
  return json_build_object('ok', true, 'data', coalesce(v, '[]'::json));
end $$;
grant execute on function public.admin_list_users() to authenticated;

create or replace function public.admin_set_vip(p_user_id uuid, p_plan text, p_days int)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare v_cur timestamptz;
        v_new timestamptz;
begin
  if not public.is_admin() then return json_build_object('ok', false, 'msg', '无权限'); end if;
  if p_plan not in ('M', 'Y', 'L') then
    return json_build_object('ok', false, 'msg', '套餐参数错误');
  end if;
  select vip_expires_at into v_cur from public.profiles where id = p_user_id;
  v_new := greatest(coalesce(v_cur, now()), now()) + (p_days || ' days')::interval;
  insert into public.profiles (id, email, nickname, vip_plan, vip_expires_at)
    values (p_user_id, (select email from auth.users where id = p_user_id), '', p_plan, v_new)
    on conflict (id) do update set
      vip_plan = excluded.vip_plan,
      vip_expires_at = excluded.vip_expires_at;
  return json_build_object('ok', true, 'expires_at', v_new);
end $$;
grant execute on function public.admin_set_vip(uuid, text, int) to authenticated;

create or replace function public.admin_delete_user(p_user_id uuid)
returns json language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.is_admin() then return json_build_object('ok', false, 'msg', '无权限'); end if;
  if p_user_id = auth.uid() then
    return json_build_object('ok', false, 'msg', '不能删除当前登录账号');
  end if;
  delete from public.posts where user_id = p_user_id;
  delete from public.replies where user_id = p_user_id;
  delete from public.codes where bound_to = p_user_id;
  delete from auth.users where id = p_user_id;
  return json_build_object('ok', true);
end $$;
grant execute on function public.admin_delete_user(uuid) to authenticated;

create or replace function public.admin_list_codes()
returns json language plpgsql security definer set search_path = public, extensions as $$
declare v json;
begin
  if not public.is_admin() then return json_build_object('ok', false, 'msg', '无权限'); end if;
  select json_agg(row_to_json(t)) into v from (
    select c.id, c.code_hash, c.plan, c.status, c.activated_at, c.created_at,
           u.email as bound_email
    from public.codes c
    left join auth.users u on u.id = c.bound_to
    order by c.id desc
  ) t;
  return json_build_object('ok', true, 'data', coalesce(v, '[]'::json));
end $$;
grant execute on function public.admin_list_codes() to authenticated;

create or replace function public.admin_list_posts(p_limit int default 200)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare v json;
begin
  if not public.is_admin() then return json_build_object('ok', false, 'msg', '无权限'); end if;
  select json_agg(row_to_json(t)) into v from (
    select id, user_id, tool, author_name, content, created_at
    from public.posts
    order by created_at desc
    limit greatest(1, least(p_limit, 500))
  ) t;
  return json_build_object('ok', true, 'data', coalesce(v, '[]'::json));
end $$;
grant execute on function public.admin_list_posts(int) to authenticated;

create or replace function public.admin_delete_post(p_post_id uuid)
returns json language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.is_admin() then return json_build_object('ok', false, 'msg', '无权限'); end if;
  delete from public.posts where id = p_post_id;
  return json_build_object('ok', true);
end $$;
grant execute on function public.admin_delete_post(uuid) to authenticated;

-- 站长邮箱（改成你自己的邮箱即可；注册该邮箱账号后即为管理员）
insert into public.admins (email) values ('yibulayinjiang@gmail.com')
  on conflict (email) do nothing;
