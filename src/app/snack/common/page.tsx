import { SnackLab } from "@/components/snack/SnackLab";
import { commonSnacks } from "@/lib/snack-data";

export default function CommonSnackPage() {
  return <SnackLab snacks={commonSnacks} title="공통 간식 데이터" />;
}
