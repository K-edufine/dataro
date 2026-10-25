-- 데이터 시민 프로젝트 · 8·9차시: 용돈 선택(1·2차)과 AI 결과에 대한 성찰
-- 0001~0004 를 먼저 실행한 뒤 이 파일을 실행하세요.
-- SQL Editor 에서 "RLS 켤지" 창이 뜨면 "RLS 없이 실행"을 고르세요. (RLS 는 이 파일이 직접 켭니다)
-- 참고: "select ... into 변수" 형태는 쓰지 않았다 (대시보드 SQL Editor 오류 방지).

-- 용돈을 소비/저축으로 나눈 선택. 저축 금액 = total_amount - consume_amount.
-- round: 1·2 = 8차시 1·2차 선택, 3 = 10차시 3차 선택(나중에 사용)
create table public.choices (
  id              uuid primary key default gen_random_uuid(),
  class_id        uuid not null references public.classes(id) on delete cascade,
  student_id      uuid not null references public.students(id) on delete cascade,
  round           smallint not null check (round between 1 and 3),
  total_amount    int not null check (total_amount between 1000 and 100000),
  consume_amount  int not null check (consume_amount >= 0),
  reason          text not null default '' check (char_length(reason) <= 60),
  updated_at      timestamptz not null default now(),
  unique (student_id, round),
  check (consume_amount <= total_amount)
);
create index choices_class_idx on public.choices(class_id);

-- 9차시: 컴퓨터(AI)가 나눈 내 그룹에 대한 나의 생각
create table public.ai_reflections (
  id             uuid primary key default gen_random_uuid(),
  class_id       uuid not null references public.classes(id) on delete cascade,
  student_id     uuid not null unique references public.students(id) on delete cascade,
  agree          smallint not null check (agree between 1 and 5),   -- 동의 정도 ★1~5
  reason         text not null default '' check (char_length(reason) <= 200),
  unknown_me     text not null default '' check (char_length(unknown_me) <= 200),  -- 컴퓨터가 모르는 나의 모습
  critical_note  text not null default '' check (char_length(critical_note) <= 200), -- 받은 정보에서 한쪽 이야기만 한 부분 (선택)
  updated_at     timestamptz not null default now()
);
create index ai_reflections_class_idx on public.ai_reflections(class_id);

alter table public.choices        enable row level security;
alter table public.ai_reflections enable row level security;

-- 본인 것 + 담임교사만 읽는다. 쓰기는 함수로만.
create policy choices_select on public.choices for select to authenticated
  using (public.owns_student(student_id) or public.is_class_teacher(class_id));
create policy ai_reflections_select on public.ai_reflections for select to authenticated
  using (public.owns_student(student_id) or public.is_class_teacher(class_id));
grant select on public.choices, public.ai_reflections to authenticated;

-- 학생: 선택 저장.
--  - 1·2차는 8차시, 3차는 10차시가 열려 있어야 한다.
--  - 2차는 1차가 있어야 하고, 2차를 저장한 뒤에는 1차를 고칠 수 없다. (3차도 같은 규칙)
--  - 금액은 0~총액, 100원 단위. 총액은 한 학생의 모든 라운드에서 같아야 한다.
create function public.save_choice(
  p_class_id uuid, p_round int, p_total int, p_consume int, p_reason text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_stu   public.students;
  v_first public.choices;
begin
  v_stu := (select s from public.students s where s.class_id = p_class_id and s.user_id = auth.uid());
  if v_stu.id is null then raise exception 'not_member'; end if;
  if p_round is null or p_round not between 1 and 3 then raise exception 'invalid_input'; end if;
  if not exists (
    select 1 from public.classes c
     where c.id = p_class_id and (case when p_round = 3 then 10 else 8 end) = any (c.open_lessons)
  ) then
    raise exception 'lesson_closed';
  end if;
  if p_total is null or p_total not between 1000 and 100000
     or p_consume is null or p_consume not between 0 and p_total or p_consume % 100 <> 0
     or char_length(btrim(coalesce(p_reason, ''))) > 60 then
    raise exception 'invalid_input';
  end if;

  v_first := (select c from public.choices c where c.student_id = v_stu.id and c.round = 1);
  if p_round = 1 then
    if exists (select 1 from public.choices c where c.student_id = v_stu.id and c.round = 2) then
      raise exception 'locked';
    end if;
  else
    if v_first.id is null then raise exception 'need_first'; end if;
    if p_total <> v_first.total_amount then raise exception 'invalid_input'; end if;
    if p_round = 2 and exists (select 1 from public.choices c where c.student_id = v_stu.id and c.round = 3) then
      raise exception 'locked';
    end if;
    if p_round = 3 and not exists (select 1 from public.choices c where c.student_id = v_stu.id and c.round = 2) then
      raise exception 'need_second';
    end if;
  end if;

  insert into public.choices (class_id, student_id, round, total_amount, consume_amount, reason)
  values (p_class_id, v_stu.id, p_round, p_total, p_consume, btrim(coalesce(p_reason, '')))
  on conflict (student_id, round) do update
    set total_amount = excluded.total_amount, consume_amount = excluded.consume_amount,
        reason = excluded.reason, updated_at = now();
end $$;

-- 학생: 9차시 성찰 저장 (다시 저장하면 덮어씀). 9차시가 열려 있어야 한다.
create function public.save_ai_reflection(
  p_class_id uuid, p_agree int, p_reason text, p_unknown_me text, p_critical_note text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_stu public.students;
begin
  v_stu := (select s from public.students s where s.class_id = p_class_id and s.user_id = auth.uid());
  if v_stu.id is null then raise exception 'not_member'; end if;
  if not exists (select 1 from public.classes c where c.id = p_class_id and 9 = any (c.open_lessons)) then
    raise exception 'lesson_closed';
  end if;
  if p_agree is null or p_agree not between 1 and 5
     or char_length(btrim(coalesce(p_reason, ''))) > 200
     or char_length(btrim(coalesce(p_unknown_me, ''))) > 200
     or char_length(btrim(coalesce(p_critical_note, ''))) > 200 then
    raise exception 'invalid_input';
  end if;

  insert into public.ai_reflections (class_id, student_id, agree, reason, unknown_me, critical_note)
  values (p_class_id, v_stu.id, p_agree, btrim(coalesce(p_reason, '')), btrim(coalesce(p_unknown_me, '')), btrim(coalesce(p_critical_note, '')))
  on conflict (student_id) do update
    set agree = excluded.agree, reason = excluded.reason, unknown_me = excluded.unknown_me,
        critical_note = excluded.critical_note, updated_at = now();
end $$;

revoke all on function public.save_choice(uuid, int, int, int, text)          from public, anon;
revoke all on function public.save_ai_reflection(uuid, int, text, text, text) from public, anon;
grant execute on function public.save_choice(uuid, int, int, int, text)          to authenticated;
grant execute on function public.save_ai_reflection(uuid, int, text, text, text) to authenticated;
