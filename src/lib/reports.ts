import { readLocal } from "./storage";

export function getReports(): any[] {
  const saved = readLocal<any[]>("iv-reports", []);
  const history = readLocal<any[]>("iv-history", []);
  return [
    ...saved,
    ...history.filter((item) => !saved.some((report) => report.id === item.id)),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function saveReport(analysis: unknown) {
  const id = sessionStorage.getItem("iv-current-id") ?? "preview";
  const reports = readLocal<any[]>("iv-reports", []);
  const report = {
    id,
    title: "AI 면접 분석 리포트",
    date: new Date().toISOString(),
    analysis,
  };
  localStorage.setItem(
    "iv-reports",
    JSON.stringify([report, ...reports.filter((item) => item.id !== id)]),
  );
}
