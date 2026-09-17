export type Screen =
  | "profile-edit" | "resume-edit" | "profile" | "history" | "resumes" | "reports" | "report-detail" | "tips"
  | "main"
  | "login"
  | "job-select"
  | "signup"
  | "device-test"
  | "interview"
  | "analyzing"
  | "dashboard"
  | "question-analysis"
  | "voice-analysis"
  | "followup-flow";

export const MY_SCREENS: Screen[] = ["profile", "profile-edit", "resume-edit", "resumes", "reports"];

export const SCREENS: Screen[] = ["job-select", "device-test", "interview", "dashboard"];

export const SCREEN_LABELS: Record<Screen, string> = {
  "profile-edit": "회원정보 수정", "resume-edit": "이력서 수정", profile: "회원정보 조회", history: "면접 내역", resumes: "이력서 조회", reports: "리포트 목록 조회", "report-detail": "리포트 조회", tips: "면접 TIP",
  main: "메인",
  login: "로그인",
  "job-select": "직무 선택",
  signup: "회원가입",
  "device-test": "장비 테스트",
  interview: "면접 진행",
  analyzing: "분석 대기",
  dashboard: "결과 대시보드",
  "question-analysis": "질문별 분석",
  "voice-analysis": "음성·영상 분석",
  "followup-flow": "꼬리질문 흐름",
};
