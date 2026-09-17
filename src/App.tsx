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
            onNavigate={setScreen}
          />
        );
      case "main":
        return <MainScreen onNavigate={(next) => setScreen(next)} />;
      case "login":
      case "signup":
        return (
          <LoginScreen
            key={screen}
            initialTab={screen}
            onNavigate={setScreen}
          />
        );
      case "job-select":
        return <JobSelectScreen onNavigate={setScreen} />;
      case "device-test":
        return (
          <DeviceTestScreen
            onNavigate={(next) => {
              setStartWithCameraOff(false);
              setScreen(next);
            }}
            onStartWithoutCamera={() => {
              setStartWithCameraOff(true);
              setScreen("interview");
            }}
          />
        );
      case "interview":
        return (
          <InterviewScreen
            initialCameraOff={startWithCameraOff}
            onNavigate={(next) => {
              setStartWithCameraOff(false);
              setScreen(next);
            }}
          />
        );
      case "analyzing":
        return <AnalyzingScreen onNavigate={setScreen} />;
      case "dashboard":
        return <DashboardScreen onNavigate={setScreen} />;
      case "question-analysis":
        return <QuestionAnalysisScreen onNavigate={setScreen} />;
    }
  };

  return (
    <div
      className="min-h-screen bg-background"
      style={{ fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif" }}
    >
      {screen !== "interview" && screen !== "analyzing" && (
        <NavBar currentScreen={screen} onNavigate={setScreen} />
      )}
      {renderScreen()}
    </div>
  );
}
