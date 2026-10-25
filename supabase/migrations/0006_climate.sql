-- 데이터 시민 프로젝트 · 고학년(5~6학년) 4·5차시: 국가별 기후 데이터
-- 0001~0005 를 먼저 실행한 뒤 이 파일을 실행하세요.
-- SQL Editor 에서 "RLS 켤지" 창이 뜨면 "RLS 없이 실행"을 고르세요. (RLS 는 이 파일이 직접 켭니다)
-- 참고: "select ... into 변수" 형태는 쓰지 않았다 (대시보드 SQL Editor 오류 방지).

-- ============================================================ 4차시: 기후 데이터
create table public.climate_data (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes(id) on delete cascade,
  student_id  uuid not null references public.students(id) on delete cascade,
  sort_order  int  not null default 0,
  country     text not null check (char_length(country) between 1 and 20),
  city        text not null check (char_length(city) between 1 and 20),
  temp        numeric(4,1) not null check (temp between -60 and 60),   -- 연평균 기온(℃)
  rain        int  not null check (rain between 0 and 12000)           -- 연강수량(mm)
);
create index climate_data_student_idx on public.climate_data(student_id);
create index climate_data_class_idx on public.climate_data(class_id);

alter table public.climate_data enable row level security;
create policy climate_select on public.climate_data for select to authenticated
  using (public.owns_student(student_id) or public.is_class_teacher(class_id));
grant select on public.climate_data to authenticated;

-- 학생: 내 기후 데이터 저장 (통째로 교체). 고학년(5~6학년) 학급이고 4차시가 열려 있어야 한다.
-- p_rows: [{ country, city, temp, rain }, ...]  (1~30행)
create function public.save_my_climate(p_class_id uuid, p_rows jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_stu public.students;
begin
  v_stu := (select s from public.students s where s.class_id = p_class_id and s.user_id = auth.uid());
  if v_stu.id is null then raise exception 'not_member'; end if;
  if not exists (select 1 from public.classes c where c.id = p_class_id and c.grade_band = 'high') then
    raise exception 'not_high';
  end if;
  if not exists (select 1 from public.classes c where c.id = p_class_id and 4 = any (c.open_lessons)) then
    raise exception 'lesson_closed';
  end if;
  if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) not between 1 and 30 then
    raise exception 'invalid_count';
  end if;

  delete from public.climate_data where student_id = v_stu.id;
  insert into public.climate_data (class_id, student_id, sort_order, country, city, temp, rain)
  select p_class_id, v_stu.id, (e.ord - 1)::int,
         btrim(e.obj ->> 'country'), btrim(e.obj ->> 'city'),
         (e.obj ->> 'temp')::numeric, (e.obj ->> 'rain')::int
    from jsonb_array_elements(p_rows) with ordinality as e(obj, ord);
end $$;

-- ============================================================ 5차시: K 를 2~6 까지, 직접/자동 구분
alter table public.k_trials drop constraint if exists k_trials_k_check;
alter table public.k_trials add constraint k_trials_k_check check (k between 2 and 6);
-- manual = 학생이 직접 묶음, auto = 컴퓨터가 자동으로 묶음 (고학년은 한 번만 직접 묶는다)
alter table public.k_trials add column mode text not null default 'manual'
  check (mode in ('manual', 'auto'));

drop function public.save_k_trial(uuid, int, text, int[], int[], numeric, numeric);

create function public.save_k_trial(
  p_class_id uuid, p_k int, p_judgment text,
  p_initial int[], p_final int[], p_mean_distance numeric, p_max_radius numeric,
  p_mode text default 'manual'
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_stu public.students;
begin
  v_stu := (select s from public.students s where s.class_id = p_class_id and s.user_id = auth.uid());
  if v_stu.id is null then raise exception 'not_member'; end if;
  if not exists (select 1 from public.classes c where c.id = p_class_id and 5 = any (c.open_lessons)) then
    raise exception 'lesson_closed';
  end if;
  if p_k not between 2 and 6
     or p_judgment not in ('wide', 'good', 'split')
     or p_mode not in ('manual', 'auto')
     or array_length(p_initial, 1) is distinct from array_length(p_final, 1)
     or array_length(p_initial, 1) not between 5 and 30
     or exists (select 1 from unnest(p_initial) g where g is null or g not between 0 and p_k - 1)
     or exists (select 1 from unnest(p_final) g where g is null or g not between 0 and p_k - 1) then
    raise exception 'invalid_input';
  end if;

  insert into public.k_trials (class_id, student_id, k, judgment, initial_groups, final_groups, mean_distance, max_radius, mode)
  values (p_class_id, v_stu.id, p_k, p_judgment, p_initial::smallint[], p_final::smallint[], p_mean_distance, p_max_radius, p_mode)
  on conflict (student_id, k) do update
    set judgment = excluded.judgment, initial_groups = excluded.initial_groups,
        final_groups = excluded.final_groups, mean_distance = excluded.mean_distance,
        max_radius = excluded.max_radius, mode = excluded.mode, updated_at = now();
end $$;

revoke all on function public.save_my_climate(uuid, jsonb) from public, anon;
revoke all on function public.save_k_trial(uuid, int, text, int[], int[], numeric, numeric, text) from public, anon;
grant execute on function public.save_my_climate(uuid, jsonb) to authenticated;
grant execute on function public.save_k_trial(uuid, int, text, int[], int[], numeric, numeric, text) to authenticated;
