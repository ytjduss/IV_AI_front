import { resumeToText, type ResumeFields } from "../type/resume";

const fields: ResumeFields = {
  name: "홍길동",
  job: "프론트엔드 개발자",
  email: "hong@example.com",
  education: "한국대학교 컴퓨터공학과 졸업\n2022.03 ~ 2026.02",
  experience: "웹 서비스 개발 인턴 · 2025.07 ~ 2025.12\nReact 기반 서비스 화면 개발 및 사용자 피드백을 반영한 UI 개선",
  projects: "AI 면접 코칭 서비스 · 프론트엔드 개발\nReact, TypeScript를 활용한 면접 화면 및 분석 결과 대시보드 구현\n카메라·마이크 장비 테스트와 REST API 연동",
  certificates: "정보처리기사 · 2026.06",
  introduction: "사용자가 편리하게 사용할 수 있는 서비스를 만드는 프론트엔드 개발자입니다.\n팀 프로젝트에서 기획·디자인·백엔드 담당자와 협업하며 화면 구현부터 API 연동까지 경험했습니다. 사용자 피드백을 바탕으로 작은 불편함을 꾸준히 개선하고자 합니다.",
};

export const EXAMPLE_RESUME = {
  id: "example-resume",
  title: "홍길동 · 프론트엔드 개발자",
  date: "2026-09-01T10:00:00+09:00",
  fields,
  text: resumeToText(fields),
};
