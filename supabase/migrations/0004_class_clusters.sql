-- 데이터 시민 프로젝트 · 6·7차시: 설문 합계(4점 척도) + 학급 군집 결과 저장
-- 0001~0003 을 먼저 실행한 뒤 이 파일을 실행하세요.
-- SQL Editor 에서 "RLS 켤지" 창이 뜨면 "RLS 없이 실행"을 고르세요. (RLS 는 이 파일이 직접 켭니다)
-- 주의: 설문 척도가 바뀌어(5점 평균 → 4점 합계) 기존 설문 응답은 모두 지워집니다.
-- 참고: "select ... into 변수" 형태는 쓰지 않았다 (대시보드 SQL Editor 오류 방지).

-- ============================================================ 6차시 설문: 4점 척도 합계
delete from public.survey_responses;

-- 문항 수는 설문 JSON 에서 바꾸므로 8개 고정 제한을 푼다 (함수가 검사한다)
alter table public.survey_responses drop constraint if exists survey_responses_answers_check;
-- 합계는 평균보다 크다 (예: 4~16, 문항을 늘려도 충분히 들어가는 크기)
alter table public.survey_responses alter column consume_score type numeric(5,2);
alter table public.survey_responses alter column save_score type numeric(5,2);

-- 앞 절반 문항 = 소비, 뒤 절반 = 저축. 각 합계가 소비 점수(X), 저축 점수(Y).
create or replace function public.submit_survey(p_class_id uuid, p_answers int[]) returns public.survey_responses
language plpgsql security definer set search_path = public as $$
declare
  v_stu  public.students;
  v_n    int;
  v_half int;
  v_c    numeric;
  v_s    numeric;
begin
  v_stu := (select s from public.students s where s.class_id = p_class_id and s.user_id = auth.uid());
  if v_stu.id is null then raise exception 'not_member'; end if;
  if not exists (select 1 from public.classes c where c.id = p_class_id and 6 = any (c.open_lessons)) then
    raise exception 'lesson_closed';
  end if;

  v_n := array_length(p_answers, 1);
  -- 4점 척도(1~4). 척도를 바꾸면 여기의 4 도 같이 바꿀 것
  if v_n is null or v_n < 2 or v_n > 40 or v_n % 2 <> 0
     or exists (select 1 from unnest(p_answers) a where a is null or a not between 1 and 4) then
    raise exception 'invalid_answers';
  end if;
  v_half := v_n / 2;
  v_c := (select coalesce(sum(a), 0) from unnest(p_answers[1:v_half]) a);
  v_s := (select coalesce(sum(a), 0) from unnest(p_answers[v_half + 1:v_n]) a);

  insert into public.survey_responses (class_id, student_id, answers, consume_score, save_score)
  values (p_class_id, v_stu.id, p_answers::smallint[], v_c, v_s)
  on conflict (student_id) do update
    set answers = excluded.answers, consume_score = excluded.consume_score,
        save_score = excluded.save_score, updated_at = now();
  return (select r from public.survey_responses r where r.student_id = v_stu.id);
end $$;

-- ============================================================ 7차시: 학급 군집 결과
-- 8~10차시에서 쓸 대표 K (교사가 확정할 때 함께 정한다)
alter table public.classes add column main_k int not null default 4
  check (main_k between 2 and 4);

-- 교사가 확정한 학급 결과. 확정하면 새로고침해도 바뀌지 않는다.
create table public.cluster_results (
  id             uuid primary key default gen_random_uuid(),
  class_id       uuid not null references public.classes(id) on delete cascade,
  k              int  not null check (k between 2 and 4),
  seed           int  not null,
  assignments    jsonb not null,   -- { "s8": 0, "s3": 2, ... } 번호표 → 그룹 번호
  centroids      jsonb not null,   -- [[소비, 저축], ...]
  group_types    jsonb not null,   -- ["low-low", "high-low", ...] 교사가 고칠 수 있음
  student_count  int  not null,
  confirmed_at   timestamptz not null default now(),
  unique (class_id, k)
);

-- 학생이 K별로 그룹마다 붙인 이름
create table public.cluster_labels (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes(id) on delete cascade,
  student_id  uuid not null references public.students(id) on delete cascade,
  k           int  not null check (k between 2 and 4),
  names       jsonb not null,      -- ["이름1", "이름2", ...] 그룹 번호 순서
  updated_at  timestamptz not null default now(),
  unique (student_id, k)
);

alter table public.cluster_results enable row level security;
alter table public.cluster_labels  enable row level security;

create policy cluster_results_select on public.cluster_results for select to authenticated
  using (public.is_class_teacher(class_id) or public.is_class_member(class_id));
create policy cluster_labels_select on public.cluster_labels for select to authenticated
  using (public.owns_student(student_id) or public.is_class_teacher(class_id));
grant select on public.cluster_results, public.cluster_labels to authenticated;

-- 같은 학급 친구들의 번호표와 점수 (이름은 원래 저장하지 않는다).
-- 담임교사, 또는 7~10차시가 열려 있을 때 같은 학급 학생에게만 돌려준다.
create function public.class_scores(p_class_id uuid)
returns table (anon_code text, number int, consume numeric, save numeric)
language sql stable security definer set search_path = public as $$
  select s.anon_code, s.number, r.consume_score, r.save_score
    from public.survey_responses r
    join public.students s on s.id = r.student_id
   where r.class_id = p_class_id
     and (
       public.is_class_teacher(p_class_id)
       or (
         public.is_class_member(p_class_id)
         and exists (select 1 from public.classes c where c.id = p_class_id and c.open_lessons && array[7, 8, 9, 10])
       )
     )
   order by s.number;
$$;

-- 교사: 학급 군집 결과 확정 (다시 확정하면 덮어쓰고, 그룹이 바뀔 수 있어 학생들이 붙인 이름은 지운다)
-- p_results: [{ k, seed, assignments, centroids, group_types, student_count }, ...]
create function public.confirm_clusters(p_class_id uuid, p_results jsonb, p_main_k int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_class_teacher(p_class_id) then raise exception 'teacher_only'; end if;
  if jsonb_typeof(p_results) is distinct from 'array' or jsonb_array_length(p_results) not between 1 and 3
     or p_main_k not between 2 and 4 then
    raise exception 'invalid_input';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_results)
      as r(k int, seed int, assignments jsonb, centroids jsonb, group_types jsonb, student_count int)
     where r.k is null or r.k not between 2 and 4 or r.seed is null or r.student_count is null
        or jsonb_typeof(r.assignments) is distinct from 'object'
        or jsonb_typeof(r.centroids) is distinct from 'array' or jsonb_array_length(r.centroids) <> r.k
        or jsonb_typeof(r.group_types) is distinct from 'array' or jsonb_array_length(r.group_types) <> r.k
        or exists (
          select 1 from jsonb_array_elements(r.group_types) e
           where jsonb_typeof(e) <> 'string'
              or (e #>> '{}') not in ('low-low', 'high-low', 'low-high', 'high-high')
        )
  ) then
    raise exception 'invalid_input';
  end if;
  if not exists (select 1 from jsonb_to_recordset(p_results) as r(k int) where r.k = p_main_k) then
    raise exception 'invalid_main_k';
  end if;

  delete from public.cluster_labels where class_id = p_class_id;
  delete from public.cluster_results where class_id = p_class_id;
  insert into public.cluster_results (class_id, k, seed, assignments, centroids, group_types, student_count)
  select p_class_id, r.k, r.seed, r.assignments, r.centroids, r.group_types, r.student_count
    from jsonb_to_recordset(p_results)
      as r(k int, seed int, assignments jsonb, centroids jsonb, group_types jsonb, student_count int);
  update public.classes set main_k = p_main_k where id = p_class_id;
end $$;

-- 교사: 확정한 뒤에 그룹의 4유형만 고친다 (학생들이 붙인 이름은 그대로 둔다)
create function public.set_group_types(p_class_id uuid, p_k int, p_types jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_class_teacher(p_class_id) then raise exception 'teacher_only'; end if;
  if jsonb_typeof(p_types) is distinct from 'array' or jsonb_array_length(p_types) <> p_k
     or exists (
       select 1 from jsonb_array_elements(p_types) e
        where jsonb_typeof(e) <> 'string'
           or (e #>> '{}') not in ('low-low', 'high-low', 'low-high', 'high-high')
     ) then
    raise exception 'invalid_input';
  end if;
  update public.cluster_results set group_types = p_types where class_id = p_class_id and k = p_k;
  if not found then raise exception 'not_confirmed'; end if;
end $$;

-- 학생: 그룹 이름 저장 (같은 K 를 다시 저장하면 덮어씀). 7차시가 열려 있어야 한다.
create function public.save_cluster_labels(p_class_id uuid, p_k int, p_names jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_stu public.students;
begin
  v_stu := (select s from public.students s where s.class_id = p_class_id and s.user_id = auth.uid());
  if v_stu.id is null then raise exception 'not_member'; end if;
  if not exists (select 1 from public.classes c where c.id = p_class_id and 7 = any (c.open_lessons)) then
    raise exception 'lesson_closed';
  end if;
  if not exists (select 1 from public.cluster_results cr where cr.class_id = p_class_id and cr.k = p_k) then
    raise exception 'not_confirmed';
  end if;
  if jsonb_typeof(p_names) is distinct from 'array' or jsonb_array_length(p_names) <> p_k
     or exists (
       select 1 from jsonb_array_elements(p_names) e
        where jsonb_typeof(e) <> 'string' or char_length(e #>> '{}') > 12
     ) then
    raise exception 'invalid_input';
  end if;

  insert into public.cluster_labels (class_id, student_id, k, names)
  values (p_class_id, v_stu.id, p_k, p_names)
  on conflict (student_id, k) do update set names = excluded.names, updated_at = now();
end $$;

revoke all on function public.class_scores(uuid)                          from public, anon;
revoke all on function public.confirm_clusters(uuid, jsonb, int)          from public, anon;
revoke all on function public.save_cluster_labels(uuid, int, jsonb)       from public, anon;
revoke all on function public.set_group_types(uuid, int, jsonb)           from public, anon;
grant execute on function public.class_scores(uuid)                    to authenticated;
grant execute on function public.confirm_clusters(uuid, jsonb, int)    to authenticated;
grant execute on function public.save_cluster_labels(uuid, int, jsonb) to authenticated;
grant execute on function public.set_group_types(uuid, int, jsonb)     to authenticated;
