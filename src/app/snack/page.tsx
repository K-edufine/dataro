import { BackLink } from "@/components/ui/BackLink";
import { LinkButton } from "@/components/ui/Button";

export default function SnackHome() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 p-6 text-center">
      <div className="self-start"><BackLink /></div>
      <h1 className="text-4xl font-extrabold">🍪 간식 모드</h1>
      <p className="text-xl text-slate-700">어떤 간식 데이터로 시작할까요?</p>
      <div className="grid w-full gap-4 sm:grid-cols-2">
        <LinkButton href="/snack/common" className="min-h-32 text-2xl">공통 데이터 불러오기</LinkButton>
        <LinkButton href="/snack/input" variant="secondary" className="min-h-32 text-2xl">내 데이터 입력하기<span className="block text-base font-normal">(학급 코드가 필요해요)</span></LinkButton>
      </div>
      <LinkButton href="/snack/mine" variant="ghost">내가 만든 데이터 이어서 보기</LinkButton>
    </main>
  );
}
