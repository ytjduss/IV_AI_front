import { authenticatedRequest } from "./client";

// 인증 서버는 기존 localhost를 기본값으로 사용하며 배포 환경에서 변경할 수 있습니다.
export const AUTH_API_BASE_URL = (import.meta.env.VITE_AUTH_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");

//signup
export const signup = async (
    email : string,
    password : string,
) =>
{
    const response = await fetch(
        `${AUTH_API_BASE_URL}/auth/signup`,
        {
            method : "POST",
       headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.detail ??
        data?.message ??
        "회원가입에 실패. 다시 시도 해주세요.",
    );
  }

  return data;
};

//login
export const login = async (
  email: string,
  password: string,
) => {
  const response = await fetch(
    `${AUTH_API_BASE_URL}/auth/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.detail ??
        data?.message ??
        "로그인에 실패했습니다.",
    );
  }

  return data;
};

//logout
export const logout = async () => {
    const token = localStorage.getItem("access_token");

    const response = await fetch(
    `${AUTH_API_BASE_URL}/auth/logout`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },  
  );

  if (!response.ok) {
    throw new Error("로그아웃 요청에 실패했습니다.");
  }

  return response.json().catch(() => null);
};

// 회원정보 조회: 화면 이동 시 signal로 오래된 요청을 취소합니다.
export const getMyInfo = (signal?: AbortSignal) =>
  authenticatedRequest<MyInfo>("/auth/me", { signal }, undefined, AUTH_API_BASE_URL);

export type MyInfo = {
  user_id: number;
  email: string;
  created_at: string;
};

// 포함된 항목만 변경됩니다. 빈 비밀번호를 전송하면 안 됩니다.
export type UpdateMyInfoPayload = { email?: string; password?: string };
export const updateMyInfo = (payload: UpdateMyInfoPayload) =>
  authenticatedRequest<{ success: boolean }>("/auth/me", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }, undefined, AUTH_API_BASE_URL);

// 204 No Content는 본문이 없는 정상 응답입니다. 공통 request가 null로 처리합니다.
// 서버는 계정·이력서만 삭제하고 면접 세션·리포트는 보존합니다.
export const deleteAccount = () =>
  authenticatedRequest<null>("/auth/me", { method: "DELETE" }, undefined, AUTH_API_BASE_URL);
