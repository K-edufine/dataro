import { LinkButton } from "@/components/ui/Button";

// TODO(2단계): 학급 코드 입력 화면으로 교체
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 p-6 text-center">
      <h1 className="text-5xl font-extrabold">데이터 시민 탐험</h1>
      <p className="text-xl text-slate-700">점들을 모아 비슷한 친구끼리 묶어 보는 K-평균 군집화를 체험해요.</p>
      <div className="grid w-full gap-4 sm:grid-cols-2">
        <LinkButton href="/snack" className="min-h-32 flex-col text-2xl">
          <span className="text-4xl" aria-hidden>🍪</span>① 간식 모드
        </LinkButton>
        <div
          aria-disabled
          className="flex min-h-32 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-slate-300 text-2xl font-bold text-slate-400"
        >
          <span className="text-4xl" aria-hidden>💰</span>② 성향 모드
          <span className="text-base font-normal">6차시부터 열려요</span>
        </div>
      </div>
    </main>
  );
}
