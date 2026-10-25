-- 데이터 시민 프로젝트 · 5차시 K 판단 저장
-- 0001, 0002 를 먼저 실행한 뒤 이 파일을 실행하세요.
-- SQL Editor 에서 "RLS 켤지" 창이 뜨면 "RLS 없이 실행"을 고르세요. (RLS 는 이 파일이 직접 켭니다)

-- 학생이 K(2~5)마다 직접 묶어 본 그룹과, 그 결과에 대한 판단을 저장한다.
create table public.k_trials (
  id              uuid primary key default gen_random_uuid(),
  class_id        uuid not null references public.classes(id) on delete cascade,
  student_id      uuid not null references public.students(id) on delete cascade,
  k               int  not null check (k between 2 and 5),
  -- 학생이 보고 고른 판단: wide=넓어요, good=알맞아요, split=잘게 나눴어요
  judgment        text not null check (judgment in ('wide', 'good', 'split')),
  -- 간식 순서대로의 그룹 번호(0부터). 학생이 처음 묶은 것 / 컴퓨터가 다듬은 최종 결과
  initial_groups  smallint[] not null,
  final_groups    smallint[] not null,
  mean_distance   numeric(5,3) not null,   -- 0~1 정규화 거리
  max_radius      numeric(5,3) not null,
  updated_at      timestamptz not null default now(),
  unique (student_id, k)
);
create index k_trials_class_idx on public.k_trials(class_id);

alter table public.k_trials enable row level security;

-- 본인 것 + 담임교사만 읽는다. 쓰기는 save_k_trial() 로만.
create policy k_trials_select on public.k_trials for select to authenticated
  using (public.owns_student(student_id) or public.is_class_teacher(class_id));
grant select on public.k_trials to authenticated;

-- 학생: K 판단 저장 (같은 K 를 다시 하면 덮어씀). 5차시가 열려 있어야 한다.
create function public.save_k_trial(
  p_class_id uuid, p_k int, p_judgment text,
  p_initial int[], p_final int[], p_mean_distance numeric, p_max_radius numeric
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
  if p_k not between 2 and 5
     or p_judgment not in ('wide', 'good', 'split')
     or array_length(p_initial, 1) is distinct from array_length(p_final, 1)
     or array_length(p_initial, 1) not between 5 and 30
     or exists (select 1 from unnest(p_initial) g where g is null or g not between 0 and p_k - 1)
     or exists (select 1 from unnest(p_final) g where g is null or g not between 0 and p_k - 1) then
    raise exception 'invalid_input';
  end if;

  insert into public.k_trials (class_id, student_id, k, judgment, initial_groups, final_groups, mean_distance, max_radius)
  values (p_class_id, v_stu.id, p_k, p_judgment, p_initial::smallint[], p_final::smallint[], p_mean_distance, p_max_radius)
  on conflict (student_id, k) do update
    set judgment = excluded.judgment, initial_groups = excluded.initial_groups,
        final_groups = excluded.final_groups, mean_distance = excluded.mean_distance,
        max_radius = excluded.max_radius, updated_at = now();
end $$;

revoke all on function public.save_k_trial(uuid, int, text, int[], int[], numeric, numeric) from public, anon;
grant execute on function public.save_k_trial(uuid, int, text, int[], int[], numeric, numeric) to authenticated;
