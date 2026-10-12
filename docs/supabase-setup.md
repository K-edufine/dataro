# Supabase 설정 안내 (2단계)

처음 한 번만 하면 됩니다. 약 10분 걸려요.

## 1. 프로젝트 만들기
1. https://supabase.com 에 가입·로그인 → **New project**
2. 이름(예: `dataro`), DB 비밀번호, 지역(가까운 곳: Northeast Asia/Seoul)을 정하고 만듭니다.

## 2. 테이블·보안 규칙 만들기
1. 왼쪽 메뉴 **SQL Editor → New query**
2. 이 저장소의 `supabase/migrations/0001_init.sql` 내용을 전부 붙여 넣고 **Run**
3. 오류 없이 "Success"가 나오면 끝입니다.

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
- [ ] `npm run dev` 후 `/teacher` → 가입/로그인 → 학급 만들기 → 5자리 코드가 나온다
- [ ] 학급 화면에서 4차시, 6차시를 **열림**으로 바꾼다
- [ ] (다른 브라우저/시크릿 창) `/` 에서 코드를 입력하면 `s1` 로 입장하고, 다시 들어가도 `s1` 이다
- [ ] 다른 시크릿 창에서 같은 코드로 들어가면 `s2` 가 된다
- [ ] 학생이 4차시에서 간식 5개 이상을 저장하고 `/snack/mine` 에서 군집 체험이 된다
- [ ] 학생이 6차시 설문을 제출하면 교사의 학급 화면에 점수가 보인다
- [ ] 차시를 **닫힘**으로 바꾸면 학생 화면(10초 안에)에 🔒가 보이고 저장도 막힌다
- [ ] 다른 학급 코드를 모르는 학생 브라우저는 다른 학급 데이터를 읽지 못한다

## 알아 둘 점
- 학생 계정은 **브라우저에 저장된 익명 로그인**입니다. 브라우저 데이터를 지우거나 다른 기기로 옮기면 같은 번호(s1…)를 되찾을 수 없고 새 번호를 받습니다. 수업은 같은 태블릿을 쓰는 것을 권장해요.
- 오래 쓰면 익명 계정이 쌓입니다. Supabase **Authentication → Users** 에서 정리할 수 있어요.
- 교사 가입은 누구나 할 수 있습니다. 학급 데이터는 만든 교사에게만 보이지만, 가입을 막고 싶다면 **Sign In / Providers → Email → Allow new users to sign up** 을 끄고 교사 계정을 대시보드에서 직접 만드세요.
