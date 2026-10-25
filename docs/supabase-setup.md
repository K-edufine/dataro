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
- [ ] 학생이 6차시 설문을 제출하면 교사의 학급 화면 번호 명단에 점수가 보인다
- [ ] 차시를 **닫힘**으로 바꾸면 학생 화면(10초 안에)에 🔒가 보이고 저장도 막힌다
- [ ] 학교 목록을 고쳐야 하면 `src/data/schools.json` 을 수정한다

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
