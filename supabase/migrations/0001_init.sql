-- 데이터 시민 프로젝트 · 2단계 스키마
-- Supabase 대시보드 > SQL Editor 에 붙여 넣고 실행하세요.
-- 학생은 "익명 로그인"(auth.uid() 보유), 교사는 이메일 로그인입니다.

-- ============================================================ 테이블

create table public.classes (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  name          text not null check (char_length(name) between 1 and 30),
  teacher_id    uuid not null references auth.users(id) on delete cascade,
  -- 학생에게 열려 있는 차시 (3~10). 교사가 토글한다.
  open_lessons  int[] not null default '{}'
                check (open_lessons <@ array[3,4,5,6,7,8,9,10]),
  created_at    timestamptz not null default now()
);

create table public.students (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  anon_code   text not null,                 -- s1, s2, ...
  created_at  timestamptz not null default now(),
  unique (class_id, user_id),
  unique (class_id, anon_code)
);

create table public.snack_data (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes(id) on delete cascade,
  student_id  uuid not null references public.students(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 20),
  price       int  not null check (price between 1 and 1000000),
  taste       numeric(2,1) not null check (taste between 1 and 5),
  sort_order  int  not null default 0
);
create index snack_data_student_idx on public.snack_data(student_id);

create table public.survey_responses (
  id             uuid primary key default gen_random_uuid(),
  class_id       uuid not null references public.classes(id) on delete cascade,
  student_id     uuid not null unique references public.students(id) on delete cascade,
  answers        smallint[] not null check (array_length(answers, 1) = 8),
  consume_score  numeric(3,2) not null,      -- 소비 4문항 평균 (X)
  save_score     numeric(3,2) not null,      -- 저축 4문항 평균 (Y)
  updated_at     timestamptz not null default now()
);
create index survey_responses_class_idx on public.survey_responses(class_id);

-- ============================================================ 도우미 함수 (RLS 재귀 방지용)

create function public.is_class_teacher(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.classes where id = cid and teacher_id = auth.uid());
$$;

create function public.is_class_member(cid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.students where class_id = cid and user_id = auth.uid());
$$;

create function public.owns_student(sid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.students where id = sid and user_id = auth.uid());
$$;

-- ============================================================ RLS

alter table public.classes          enable row level security;
alter table public.students         enable row level security;
alter table public.snack_data       enable row level security;
alter table public.survey_responses enable row level security;

-- classes: 교사는 자기 학급, 학생은 자기가 입장한 학급만 읽는다. 수정은 교사만.
create policy classes_select on public.classes for select to authenticated
  using (teacher_id = auth.uid() or public.is_class_member(id));
create policy classes_update on public.classes for update to authenticated
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
create policy classes_delete on public.classes for delete to authenticated
  using (teacher_id = auth.uid());
-- insert 정책 없음: create_class() 함수로만 만든다.

-- 교사는 이름과 열린 차시만 바꿀 수 있다 (code, teacher_id 변경 금지)
revoke update on public.classes from authenticated;
grant update (name, open_lessons) on public.classes to authenticated;

-- students: 본인 행 + 교사. (학급 친구의 익명 코드 공개는 3단계에서 추가)
create policy students_select on public.students for select to authenticated
  using (user_id = auth.uid() or public.is_class_teacher(class_id));

-- snack_data / survey_responses: 본인 것 + 교사. 쓰기는 함수로만.
create policy snack_select on public.snack_data for select to authenticated
  using (public.owns_student(student_id) or public.is_class_teacher(class_id));
create policy survey_select on public.survey_responses for select to authenticated
  using (public.owns_student(student_id) or public.is_class_teacher(class_id));
-- TODO(3단계): 7차시 학급 군집화를 위해 같은 학급 설문 결과를 익명으로 읽는 방법 추가

-- ============================================================ RPC 함수

-- 교사: 학급 만들기 (익명 로그인 계정은 불가). 5자리 코드를 자동 발급한다.
create function public.create_class(p_name text) returns public.classes
language plpgsql security definer set search_path = public as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- 헷갈리는 0/O, 1/I/L 제외
  v_code text;
  v_row  public.classes;
begin
  if auth.uid() is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'teacher_only';
  end if;
  p_name := btrim(coalesce(p_name, ''));
  if char_length(p_name) not between 1 and 30 then
    raise exception 'invalid_name';
  end if;
  loop
    v_code := '';
    for i in 1..5 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    begin
      insert into public.classes (code, name, teacher_id)
      values (v_code, p_name, auth.uid()) returning * into v_row;
      exit;
    exception when unique_violation then
      null; -- 코드 중복이면 다시 뽑는다
    end;
  end loop;
  return v_row;
end $$;

-- 학생: 학급 코드로 입장. 이미 입장한 적 있으면 같은 익명 코드를 돌려준다.
create function public.join_class(p_code text) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_class public.classes;
  v_stu   public.students;
  v_next  int;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  select * into v_class from public.classes
   where code = upper(btrim(coalesce(p_code, ''))) for update; -- 번호 중복 방지용 잠금
  if not found then raise exception 'class_not_found'; end if;

  select * into v_stu from public.students
   where class_id = v_class.id and user_id = auth.uid();
  if not found then
    select coalesce(max(substr(anon_code, 2)::int), 0) + 1 into v_next
      from public.students where class_id = v_class.id;
    insert into public.students (class_id, user_id, anon_code)
    values (v_class.id, auth.uid(), 's' || v_next) returning * into v_stu;
  end if;

  return json_build_object(
    'class_id', v_class.id, 'class_name', v_class.name, 'class_code', v_class.code,
    'student_id', v_stu.id, 'anon_code', v_stu.anon_code,
    'open_lessons', v_class.open_lessons
  );
end $$;

-- 학생: 내 간식 목록 저장 (통째로 교체). 4차시가 열려 있어야 한다.
create function public.save_my_snacks(p_class_id uuid, p_snacks jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_stu public.students;
  v_cnt int;
begin
  select * into v_stu from public.students where class_id = p_class_id and user_id = auth.uid();
  if not found then raise exception 'not_member'; end if;
  if not (4 = any (select unnest(open_lessons) from public.classes where id = p_class_id)) then
    raise exception 'lesson_closed';
  end if;
  v_cnt := coalesce(jsonb_array_length(p_snacks), 0);
  if v_cnt not between 5 and 30 then raise exception 'invalid_count'; end if;

  delete from public.snack_data where student_id = v_stu.id;
  insert into public.snack_data (class_id, student_id, name, price, taste, sort_order)
  select p_class_id, v_stu.id,
         btrim(e.obj ->> 'name'), (e.obj ->> 'price')::int, (e.obj ->> 'taste')::numeric, (e.ord - 1)::int
    from jsonb_array_elements(p_snacks) with ordinality as e(obj, ord);
end $$;

-- 학생: 6차시 설문 제출 (재제출하면 덮어씀). 점수는 서버에서 계산한다.
create function public.submit_survey(p_class_id uuid, p_answers int[]) returns public.survey_responses
language plpgsql security definer set search_path = public as $$
declare
  v_stu public.students;
  v_row public.survey_responses;
  v_c numeric;
  v_s numeric;
begin
  select * into v_stu from public.students where class_id = p_class_id and user_id = auth.uid();
  if not found then raise exception 'not_member'; end if;
  if not (6 = any (select unnest(open_lessons) from public.classes where id = p_class_id)) then
    raise exception 'lesson_closed';
  end if;
  if array_length(p_answers, 1) is distinct from 8
     or exists (select 1 from unnest(p_answers) a where a is null or a not between 1 and 5) then
    raise exception 'invalid_answers';
  end if;

  v_c := round((p_answers[1] + p_answers[2] + p_answers[3] + p_answers[4]) / 4.0, 2); -- 소비
  v_s := round((p_answers[5] + p_answers[6] + p_answers[7] + p_answers[8]) / 4.0, 2); -- 저축

  insert into public.survey_responses (class_id, student_id, answers, consume_score, save_score)
  values (p_class_id, v_stu.id, p_answers::smallint[], v_c, v_s)
  on conflict (student_id) do update
    set answers = excluded.answers, consume_score = excluded.consume_score,
        save_score = excluded.save_score, updated_at = now()
  returning * into v_row;
  return v_row;
end $$;

revoke all on function public.create_class(text)           from public, anon;
revoke all on function public.join_class(text)             from public, anon;
revoke all on function public.save_my_snacks(uuid, jsonb)  from public, anon;
revoke all on function public.submit_survey(uuid, int[])   from public, anon;
grant execute on function public.create_class(text)          to authenticated;
grant execute on function public.join_class(text)            to authenticated;
grant execute on function public.save_my_snacks(uuid, jsonb) to authenticated;
grant execute on function public.submit_survey(uuid, int[])  to authenticated;

-- ============================================================ 권한 명시
-- 프로젝트 생성 시 "Automatically expose new tables and functions"를 꺼 두어도
-- 동작하도록 필요한 권한을 직접 준다. (읽기 범위는 위의 RLS 정책이 제한한다.)
grant usage on schema public to authenticated;
grant select on public.classes, public.students, public.snack_data, public.survey_responses to authenticated;
grant execute on function public.is_class_teacher(uuid), public.is_class_member(uuid), public.owns_student(uuid) to authenticated;
