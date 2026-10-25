-- 데이터 시민 프로젝트 · 로그인 개편
-- 학교 → 학년반 선택 + 번호 입장 (학급 코드·이름 없음)
-- 0001_init.sql 을 먼저 실행한 뒤 이 파일을 실행하세요.
-- SQL Editor 에서 "RLS 켤지" 창이 뜨면 "RLS 없이 실행"을 고르세요. (새 테이블은 없습니다)

-- 테스트 데이터 정리 (학생·간식·설문은 함께 삭제됨)
delete from public.classes;

drop function if exists public.create_class(text);
drop function if exists public.join_class(text);

-- ============================================================ classes
alter table public.classes drop column code;
alter table public.classes drop column name;

alter table public.classes add column school text not null
  check (char_length(school) between 1 and 30);
alter table public.classes add column grade int not null
  check (grade between 3 and 6);
alter table public.classes add column class_no int not null
  check (class_no between 1 and 30);
alter table public.classes add column student_count int not null
  check (student_count between 1 and 60);
-- 3~4학년은 저학년용, 5~6학년은 고학년용 (자동)
alter table public.classes add column grade_band text
  generated always as (case when grade <= 4 then 'low' else 'high' end) stored;

alter table public.classes add constraint classes_school_grade_class_key
  unique (school, grade, class_no);

-- 교사는 열린 차시만 바꿀 수 있고, 학급은 삭제할 수 있다
revoke update on public.classes from authenticated;
grant update (open_lessons) on public.classes to authenticated;
grant delete on public.classes to authenticated;

-- ============================================================ students
alter table public.students add column number int not null
  check (number between 1 and 60);
-- 태블릿을 돌려 쓰면 연결이 풀릴 수 있어 user_id 는 비워 둘 수 있다.
-- 익명 계정이 정리돼도 학생 자료는 지워지지 않게 set null 로 바꾼다.
alter table public.students alter column user_id drop not null;
alter table public.students drop constraint students_user_id_fkey;
alter table public.students add constraint students_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;
alter table public.students add constraint students_class_number_key
  unique (class_id, number);

-- ============================================================ RPC 함수
-- 참고: 대시보드 SQL Editor 가 "select ... into 변수" 형태를 잘못 처리하는 경우가 있어
-- 변수 대입(:=) 방식으로만 작성했다.

-- 교사: 학급 만들기 (익명 로그인 계정은 불가)
create function public.create_class(
  p_school text, p_grade int, p_class_no int, p_student_count int
) returns public.classes
language plpgsql security definer set search_path = public as $$
declare
  v_row public.classes;
begin
  if auth.uid() is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'teacher_only';
  end if;
  p_school := btrim(coalesce(p_school, ''));
  if char_length(p_school) not between 1 and 30
     or p_grade not between 3 and 6
     or p_class_no not between 1 and 30
     or p_student_count not between 1 and 60 then
    raise exception 'invalid_input';
  end if;
  begin
    insert into public.classes (school, grade, class_no, student_count, teacher_id)
    values (p_school, p_grade, p_class_no, p_student_count, auth.uid());
  exception when unique_violation then
    raise exception 'class_exists';
  end;
  v_row := (select c from public.classes c
             where c.school = p_school and c.grade = p_grade and c.class_no = p_class_no);
  return v_row;
end $$;

-- 학생(로그인 전): 학교에 개설된 학급 목록. 학급 id 와 인원만 돌려준다.
create function public.list_classes(p_school text)
returns table (id uuid, grade int, class_no int, student_count int)
language sql stable security definer set search_path = public as $$
  select c.id, c.grade, c.class_no, c.student_count
    from public.classes c
   where c.school = p_school
   order by c.grade, c.class_no;
$$;

-- 학생: 학급과 번호로 입장. 같은 번호로 다시 들어오면 같은 학생으로 이어진다.
create function public.join_class(p_class_id uuid, p_number int) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_class public.classes;
  v_stu   public.students;
begin
  if auth.uid() is null then raise exception 'not_signed_in'; end if;
  v_class := (select c from public.classes c where c.id = p_class_id);
  if v_class.id is null then raise exception 'class_not_found'; end if;
  if p_number is null or p_number < 1 or p_number > v_class.student_count then
    raise exception 'invalid_number';
  end if;

  -- 같은 학급에 동시에 입장해도 꼬이지 않게 잠근다 (트랜잭션이 끝나면 풀림)
  perform pg_advisory_xact_lock(hashtext(v_class.id::text));

  -- 이 기기에 묶여 있던 다른 번호는 풀어 준다 (태블릿 돌려 쓰기 대비)
  update public.students
     set user_id = null
   where class_id = v_class.id and user_id = auth.uid() and number <> p_number;

  v_stu := (select s from public.students s where s.class_id = v_class.id and s.number = p_number);
  if v_stu.id is null then
    insert into public.students (class_id, user_id, number, anon_code)
    values (v_class.id, auth.uid(), p_number, 's' || p_number);
  else
    update public.students set user_id = auth.uid() where id = v_stu.id;
  end if;
  v_stu := (select s from public.students s where s.class_id = v_class.id and s.number = p_number);

  return json_build_object(
    'class_id', v_class.id, 'school', v_class.school, 'grade', v_class.grade,
    'class_no', v_class.class_no, 'grade_band', v_class.grade_band,
    'student_count', v_class.student_count,
    'student_id', v_stu.id, 'number', v_stu.number, 'anon_code', v_stu.anon_code,
    'open_lessons', v_class.open_lessons
  );
end $$;

revoke all on function public.create_class(text, int, int, int) from public, anon;
revoke all on function public.list_classes(text)                from public;
revoke all on function public.join_class(uuid, int)             from public, anon;
grant execute on function public.create_class(text, int, int, int) to authenticated;
grant execute on function public.list_classes(text)                to anon, authenticated;
grant execute on function public.join_class(uuid, int)             to authenticated;
