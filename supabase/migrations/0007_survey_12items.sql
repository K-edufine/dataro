-- 데이터 시민 프로젝트 · 6차시 설문 개편: 12문항(소비 6 + 저축 6), 5점 척도
-- 0001~0006 을 먼저 실행한 뒤 이 파일을 실행하세요.
-- ※ 한 번만 실행하세요. 이 파일은 기존 설문 응답과 그것으로 만든 7차시 결과를 지웁니다.
-- 참고: "select ... into 변수" 형태는 쓰지 않았다 (대시보드 SQL Editor 오류 방지).

-- ============================================================ 기존 설문 정리
-- 문항 수와 점수 범위가 달라져(8문항 4점 → 12문항 5점) 이전 응답과 섞일 수 없다.
delete from public.survey_responses;
-- 이전 설문으로 만든 7차시 확정 결과와, 그 그룹에 학생들이 붙인 이름도 다시 해야 한다.
-- (8·9차시의 선택·성찰 기록은 지우지 않는다)
delete from public.cluster_labels;
delete from public.cluster_results;

-- ============================================================ 설문 제출: 5점 척도(1~5)
-- 앞 절반 문항 = 소비, 뒤 절반 = 저축. 각 합계가 소비 점수(X), 저축 점수(Y). (12문항이면 각각 6~30)
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
  -- 5점 척도(1~5). 척도를 바꾸면 여기의 5 도 같이 바꿀 것
  if v_n is null or v_n < 2 or v_n > 40 or v_n % 2 <> 0
     or exists (select 1 from unnest(p_answers) a where a is null or a not between 1 and 5) then
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
