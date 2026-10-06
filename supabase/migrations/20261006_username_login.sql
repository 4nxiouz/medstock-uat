-- ล็อกอินด้วยชื่อผู้ใช้ (username) แทนอีเมล
-- วิธีใช้: Supabase → SQL Editor → วางทั้งไฟล์ → Run (รันครั้งเดียวพอ รันซ้ำได้ไม่พัง)
-- ชื่อผู้ใช้จะถูกเก็บใน Supabase Auth เป็น <username>@mookata.local
-- สร้างบัญชีเจ้าของร้าน: admin / 123456  (เข้าระบบแล้วกด 🔑 เปลี่ยนรหัส ทันที)

create or replace function public._new_auth_user(p_username text, p_password text)
returns uuid language plpgsql security definer set search_path to '' as $$
declare uid uuid := gen_random_uuid(); em text;
begin
  p_username := lower(trim(p_username));
  if p_username !~ '^[a-z0-9._-]{3,30}$' then raise exception 'ชื่อผู้ใช้ใช้ได้เฉพาะ a-z 0-9 . _ - ยาว 3–30 ตัว'; end if;
  if length(coalesce(p_password, '')) < 6 then raise exception 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัว'; end if;
  em := p_username || '@mookata.local';
  if exists (select 1 from auth.users where lower(email) = em) then raise exception 'ชื่อผู้ใช้นี้มีแล้ว'; end if;
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', em,
    extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('username', p_username), now(), now(),
    '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), uid, uid::text,
    jsonb_build_object('sub', uid::text, 'email', em, 'email_verified', true), 'email', now(), now(), now());
  return uid;
end $$;
revoke all on function public._new_auth_user(text, text) from public, anon, authenticated;

-- เจ้าของร้านสร้างบัญชีพนักงานจากหน้า ตั้งค่า
create or replace function public.create_staff_account(p_username text, p_password text, p_role text default 'staff', p_name text default '')
returns json language plpgsql security definer set search_path to '' as $$
declare uid uuid;
begin
  if not public.is_owner() then raise exception 'เฉพาะเจ้าของร้าน'; end if;
  if p_role not in ('owner', 'staff') then raise exception 'สิทธิ์ไม่ถูกต้อง'; end if;
  uid := public._new_auth_user(p_username, p_password);
  insert into public.staff(user_id, display_name, role) values (uid, coalesce(p_name, ''), p_role);
  return json_build_object('ok', true);
end $$;
revoke all on function public.create_staff_account(text, text, text, text) from public, anon;
grant execute on function public.create_staff_account(text, text, text, text) to authenticated;

-- เจ้าของร้านตั้งรหัสใหม่ให้พนักงานที่ลืมรหัส
create or replace function public.reset_staff_password(p_user_id uuid, p_password text)
returns json language plpgsql security definer set search_path to '' as $$
begin
  if not public.is_owner() then raise exception 'เฉพาะเจ้าของร้าน'; end if;
  if length(coalesce(p_password, '')) < 6 then raise exception 'รหัสผ่านต้องยาวอย่างน้อย 6 ตัว'; end if;
  if not exists (select 1 from public.staff where user_id = p_user_id) then raise exception 'ไม่พบพนักงาน'; end if;
  update auth.users set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')), updated_at = now()
  where id = p_user_id;
  return json_build_object('ok', true);
end $$;
revoke all on function public.reset_staff_password(uuid, text) from public, anon;
grant execute on function public.reset_staff_password(uuid, text) to authenticated;

-- list_staff: เพิ่มคอลัมน์ username
drop function if exists public.list_staff();
create function public.list_staff()
returns table(user_id uuid, email text, username text, display_name text, role text, created_at timestamptz)
language plpgsql stable security definer set search_path to '' as $$
begin
  if not public.is_staff() then raise exception 'ไม่มีสิทธิ์'; end if;
  return query select s.user_id, u.email::text,
    case when u.email like '%@mookata.local' then split_part(u.email, '@', 1) else u.email::text end,
    s.display_name, s.role, s.created_at
  from public.staff s join auth.users u on u.id = s.user_id
  order by s.created_at;
end $$;
revoke all on function public.list_staff() from public, anon;
grant execute on function public.list_staff() to authenticated;

-- บัญชีเจ้าของร้านเริ่มต้น: admin / 123456
do $$
declare uid uuid;
begin
  if not exists (select 1 from auth.users where email = 'admin@mookata.local') then
    uid := public._new_auth_user('admin', '123456');
    insert into public.staff(user_id, display_name, role) values (uid, 'แอดมิน', 'owner');
  end if;
end $$;
