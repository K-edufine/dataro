import { redirect } from "next/navigation";

// 간식 모드 선택 화면은 없앴다. 3차시는 공통 데이터, 4·5차시는 차시 선택 화면에서 바로 들어간다.
export default function SnackIndex() {
  redirect("/snack/common");
}
