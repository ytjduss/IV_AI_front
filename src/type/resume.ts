export type ResumeFields = {
  name?: string;
  job?: string;
  email?: string;
  phone?: string;
  education?: string;
  experience?: string;
  projects?: string;
  certificates?: string;
  introduction?: string;
};

export function resumeToText(fields: ResumeFields): string {
  return RESUME_FIELDS
    .filter((field) => fields[field.key]?.trim())
    .map(
      (field) =>
        `${field.label}\n${fields[field.key]!.trim()}`
    )
    .join("\n\n");
} 
export function getResumeFields(
  resume: {
    fields?: ResumeFields;
    text?: string;
  }
): ResumeFields {
  return resume.fields ?? {
    introduction: resume.text ?? "",
  };
}
export const RESUME_FIELDS = [
  {
    key: "name",
    label: "이름",
    placeholder: "홍길동",
  },
  {
    key: "job",
    label: "직무",
    placeholder: "예: 백엔드 개발자",
  },
  {
    key: "email",
    label: "이메일",
    placeholder: "example@email.com",
  },
  {
    key: "phone",
    label: "연락처",
    placeholder: "010-1234-5678",
  },
  {
    key: "education",
    label: "학력",
    placeholder: "학교, 전공, 재학/졸업 여부를 입력해 주세요.",
    rows: 3,
  },
  {
    key: "experience",
    label: "경력",
    placeholder: "인턴, 아르바이트, 실무 경험 등을 입력해 주세요.",
    rows: 4,
  },
  {
    key: "projects",
    label: "프로젝트 및 활동",
    placeholder: "프로젝트명, 역할, 사용 기술, 주요 활동 등을 입력해 주세요.",
    rows: 5,
  },
  {
    key: "certificates",
    label: "보유 자격증",
    placeholder: "보유한 자격증을 입력해 주세요.",
    rows: 3,
  },
  {
    key: "introduction",
    label: "자기소개",
    placeholder: "자기소개 내용을 입력해 주세요.",
    rows: 6,
  },
] satisfies {
  key: keyof ResumeFields;
  label: string;
  placeholder: string;
  rows?: number;
}[];




