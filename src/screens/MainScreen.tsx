import { Button } from "../components/ui/button";
import {
  type Screen,
  MY_SCREENS,
  SCREENS,
  SCREEN_LABELS,
} from "../type/screen";

interface MainScreenProps {
  onNavigate: (s: Screen) => void;
}

/*로그인연결*/
function MainScreen({ onNavigate }: MainScreenProps) {
  return (
    <div className="min-h-[calc(100vh-5rem)] bg-gradient-to-b from-[#effcf9] to-white flex flex-col items-center justify-center px-4 pb-20">
      <p className="text-primary font-bold text-6xl tracking-wide">IV-COACH</p>
      <br></br>
      <div>
        <Button
          className="px-10 py-6 text-xl rounded-xl bg-primary text-white font-bold hover:bg-primary/90"
          onClick={() => onNavigate("job-select")}
        >
          면접 시작
        </Button>
      </div>
    </div>
  );
}

export default MainScreen;
