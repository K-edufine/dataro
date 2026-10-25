# Supabase 설정 안내 (2단계)

처음 한 번만 하면 됩니다. 약 10분 걸려요.

## 1. 프로젝트 만들기
1. https://supabase.com 에 가입·로그인 → **New project**
2. 이름(예: `dataro`), DB 비밀번호, 지역(가까운 곳: Northeast Asia/Seoul)을 정하고 만듭니다.

## 2. 테이블·보안 규칙 만들기 (SQL 파일 2개를 순서대로)
1. 왼쪽 메뉴 **SQL Editor → New query**
2. 이 저장소의 `supabase/migrations/0001_init.sql` 내용을 전부 붙여 넣고 **Run**
   - 이어서 **새 쿼리**로 `supabase/migrations/0002_school_login.sql` 도 같은 방법으로 실행합니다. (학교·학년반·번호 입장 방식)
   - 그다음 **새 쿼리**로 `supabase/migrations/0003_k_trials.sql` 도 실행합니다. (5차시 K 판단 저장)
   - 이어서 `supabase/migrations/0004_class_clusters.sql` 도 실행합니다. (6차시 설문 4점 합계, 7차시 학급 군집 저장) **기존 설문 응답은 모두 지워집니다.**
   - 이어서 `supabase/migrations/0005_choices.sql` 도 실행합니다. (8차시 용돈 선택 1·2차, 9차시 성찰 저장)
   - 이어서 `supabase/migrations/0006_climate.sql` 도 실행합니다. (고학년 4차시 기후 데이터, 5차시 K=2~6 + 직접/자동 구분)
   - 이미 0001 을 실행한 프로젝트라면 **없는 것만** 순서대로 실행하면 됩니다. 0002 는 테스트 학급 데이터를 모두 지웁니다.
3. "RLS를 켤까요?" 창이 뜨면 **"RLS 없이 실행(Run without RLS)"** 을 고르세요.
   - 이 SQL이 네 테이블의 RLS를 직접 켭니다. "RLS 켜고 실행"을 고르면 대시보드가 함수 안의 `select ... into` 를 테이블 생성으로 오해해 SQL을 망가뜨립니다. (`unterminated dollar-quoted string` 오류)
4. 오류 없이 "Success"가 나오면 끝입니다. Table Editor 에서 네 테이블에 RLS가 켜져 있는지 확인하세요.

## 3. 로그인 방식 설정 (Authentication)
- **Sign In / Providers → Allow anonymous sign-ins** 를 **켭니다.** (학생 입장에 필요)
- **Email** 로그인은 켜져 있어야 합니다. (교사용)
- 교사 가입 때 확인 메일을 생략하려면 **Email → Confirm email** 을 끕니다. (선택)
  - 켜 두면 교사가 가입 후 메일의 링크를 눌러야 로그인할 수 있어요.

## 4. 환경변수 연결
**Project Settings → API** 에서 `Project URL` 과 `anon public` 키를 복사합니다.

- 로컬: `.env.example` 을 `.env.local` 로 복사해 값을 채웁니다.
  ```
  NEXT_PUBLIC_SUPABASE_URL=...
  NEXT_PUBLIC_SUPABASE_ANON_KEY=...
  ```
- Vercel: **Project → Settings → Environment Variables** 에 같은 두 값을 넣고 다시 배포합니다.

> `anon` 키는 공개되어도 괜찮은 키입니다. 데이터는 DB의 RLS 규칙이 지킵니다. `service_role` 키는 절대 넣지 마세요.

## 5. 동작 확인 체크리스트
- [ ] `/teacher` → 가입/로그인 → **새 학급 열기**에서 학교·학년·반을 고르면 미리 등록된 학생 수가 들어가고 학급이 만들어진다
- [ ] 학급 화면에서 4차시, 6차시를 **열림**으로 바꾼다
- [ ] (다른 브라우저/시크릿 창) `/` 에서 학교 → 학년반 → 번호를 고르면 입장하고, 화면에 "삼상초 3학년 1반 8번"과 `s8` 이 보인다
- [ ] 같은 번호로 다시 입장하면 같은 학생(자료 이어짐), 다른 번호로 입장하면 새 학생이다
- [ ] 학생이 4차시에서 간식 10개의 선호도를 저장한다
- [ ] 5차시를 열면 K=2→3→4→5 순서로 직접 묶고, 컴퓨터가 다듬는 애니메이션을 보고, 판단을 저장한다 (교사 명단에 K 판단이 표시됨)
- [ ] 학생이 6차시 설문(4점 척도, 4문항씩)을 제출하면 소비·저축 합계(4~16점)가 보이고 교사의 학급 화면 번호 명단에도 보인다
- [ ] 교사: 학급 화면 → **7차시 학급 군집화 열기** → (먼저 "연습용 가상 학생"으로 K=2·3·4 확인) → 설문 응답이 모이면 **이 결과로 확정하기**
- [ ] 8차시를 열면 학생이 용돈 10,000원을 소비/저축으로 나눠 1차 선택 → 내 그룹 안내 → 2차 선택(1차 값에서 시작)을 저장할 수 있다
- [ ] 9차시를 열면 1·2차 비교 → 다른 그룹 학습지 체크 → 별점·이유·"컴퓨터가 모르는 나"를 저장할 수 있다
- [ ] 교사 학급 화면 → **8·9차시 선택 변화와 성찰 보기**에서 학생별 1→2차 화살표, 요약, 성찰 내용이 보인다
- [ ] 확정 전에는 학생의 7차시 화면에 "선생님이 아직 결과를 정하지 않았어요", 확정 후에는 학급 친구들의 점과 내 점(빨간 테두리), 그룹 이름 붙이기가 된다
- [ ] 차시를 **닫힘**으로 바꾸면 학생 화면(10초 안에)에 🔒가 보이고 저장도 막힌다
- [ ] 학교 목록을 고쳐야 하면 `src/data/schools.json` 을 수정한다

## 고학년(5~6학년) 확인 체크리스트
- [ ] 교사: 5~6학년 학급(예: 옥정초 6학년 5반)을 열면 학급 화면에 **4·5차시 토글만** 보이고, 학생 첫 화면에도 4·5차시만 보인다
- [ ] 4차시를 열면 학생이 25개 도시(국가·도시 미리 채움)의 기온·강수량을 입력한다. 영하는 − 버튼, 쓰는 대로 이 기기에 임시 저장, [저장하기]로 서버에 저장
- [ ] 5차시를 열면(기후 데이터 10개 이상) K를 하나 골라 직접 묶고, 나머지 K는 컴퓨터가 자동으로 묶는 과정을 보며 K=2~6 판단을 저장한다
- [ ] 교사 학급 화면 → **기후 데이터 확인하기**에서 입력 현황과 의심 값(같은 도시를 3명 이상 입력했을 때 중앙값과 크게 다른 값)이 보인다
- 25개 도시 목록은 `src/data/climate-cities.json` 에서 고친다 (임시 목록)

## 알아 둘 점
- 학생은 이름 없이 **학교·학년반·번호**로만 입장합니다. 브라우저 데이터를 지우거나 다른 기기로 옮겨도 같은 번호로 입장하면 자료가 이어집니다. 비밀번호가 없으므로 친구 번호를 누르면 그 친구 자료에 들어갈 수 있어요. 수업 전에 지도해 주세요.
- 번호를 새로 고른 기기는 이전 번호와의 연결이 풀립니다. 태블릿을 돌려 써도 안전해요.
- 오래 쓰면 익명 계정이 쌓입니다. Supabase **Authentication → Users** 에서 정리할 수 있어요.
- 교사 가입은 누구나 할 수 있습니다. 학급 데이터는 만든 교사에게만 보이지만, 가입을 막고 싶다면 **Sign In / Providers → Email → Allow new users to sign up** 을 끄고 교사 계정을 대시보드에서 직접 만드세요.

## 문제 해결
- **`unterminated dollar-quoted string` 오류**: 대시보드 SQL Editor 가 함수 본문을 잘못 자르는 경우입니다. 최신 `0001_init.sql` 은 이를 피하도록 작성되어 있으니 파일을 다시 복사해 쓰세요. 그래도 같으면 SQL 을 `create function` 단위로 나눠 하나씩 실행해 보세요.
- **`already exists` 오류**: 이전 시도로 일부가 만들어진 상태입니다. 새 쿼리에서 아래를 먼저 실행한 뒤 다시 실행하세요.
  ```sql
  drop table if exists public.survey_responses, public.snack_data, public.students, public.classes cascade;
  drop function if exists public.create_class(text), public.join_class(text), public.save_my_snacks(uuid, jsonb), public.submit_survey(uuid, int[]), public.is_class_teacher(uuid), public.is_class_member(uuid), public.owns_student(uuid);
  ```
