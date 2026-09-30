import { CAPTURE_MODE } from "./lib/captureMode";
import { useState } from "react";
import { NavBar } from "./components/navBar";
import type { Screen } from "./type/screen";
import MainScreen from "./screens/MainScreen";
import LoginScreen from "./screens/LoginScreen";
import JobSelectScreen from "./screens/JobSelectScreen";
import DeviceTestScreen from "./screens/DeviceTestScreen";
import InterviewScreen from "./screens/InterviewScreen";
import AnalyzingScreen from "./screens/AnalyzingScreen";
import DashboardScreen from "./screens/DashboardScreen";
import QuestionAnalysisScreen from "./screens/QuestionAnalysisScreen";
import ManagementScreen from "./screens/ManagementScreen";
import {
  MY_SCREENS,
  SCREENS,
  SCREEN_LABELS,
} from "./type/screen";

export default function App() {
  const [screen, setScreen] = useState<Screen>("main");
  const [startWithCameraOff, setStartWithCameraOff] = useState(false);

  const navigate = (next: Screen) => {
    const requiresLogin = ["job-select", "device-test", "interview"].includes(next);
    if (!CAPTURE_MODE && requiresLogin && !localStorage.getItem("access_token")) {
      setScreen("login");
      return;
    }
    // 새 면접 결과 화면에 이전에 선택한 서버 리포트가 남지 않도록 초기화합니다.
    if (["job-select", "device-test", "interview"].includes(next)) {
      sessionStorage.removeItem("iv-report-session-id");
    }
    setScreen(next);
  };

  const renderScreen = () => {
    switch (screen) {
      case "profile-edit":
      case "resume-edit":
      case "profile":
      case "history":
      case "resumes":
      case "reports":
      case "report-detail":
      case "tips":
        return (
          <ManagementScreen
            key={screen}
            screen={screen}
            onNavigate={navigate}
          />
        );
      case "main":
        return <MainScreen onNavigate={navigate} />;
      case "login":
      case "signup":
        return (
          <LoginScreen
            key={screen}
            initialTab={screen}
            onNavigate={navigate}
          />
        );
      case "job-select":
        return <JobSelectScreen onNavigate={navigate} />;
      case "device-test":
        return (
          <DeviceTestScreen
            onNavigate={(next) => {
              setStartWithCameraOff(false);
              navigate(next);
            }}
            onStartWithoutCamera={() => {
              setStartWithCameraOff(true);
              navigate("interview");
            }}
          />
        );
      case "interview":
        return (
          <InterviewScreen
            initialCameraOff={startWithCameraOff}
            onNavigate={(next) => {
              setStartWithCameraOff(false);
              navigate(next);
            }}
          />
        );
      case "analyzing":
        return <AnalyzingScreen onNavigate={navigate} />;
      case "dashboard":
        return <DashboardScreen onNavigate={navigate} />;
      case "question-analysis":
        return <QuestionAnalysisScreen onNavigate={navigate} />;
    }
  };

  return (
    <div
      className="min-h-screen bg-background"
      style={{ fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif" }}
    >
      {screen !== "interview" && screen !== "analyzing" && (
        <NavBar currentScreen={screen} onNavigate={navigate} />
      )}
      {renderScreen()}
    </div>
  );
}
