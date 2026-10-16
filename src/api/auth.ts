export const AUTH_API_BASE_URL = (import.meta.env.VITE_AUTH_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "");

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
        "ngrok-skip-browser-warning": "true",
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
        "ngrok-skip-browser-warning": "true",
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
        "ngrok-skip-browser-warning": "true",
        Authorization: `Bearer ${token}`,
      },
    },  
  );

  if (!response.ok) {
    throw new Error("로그아웃 요청에 실패했습니다.");
  }

  return response.json().catch(() => null);
};

//me
export const getMyInfo = async (signal: AbortSignal) => {
  const token = localStorage.getItem("access_token");

  const response = await fetch(
    `${AUTH_API_BASE_URL}/auth/me`,
    {
      method: "GET",
      signal,
      headers: {
        "ngrok-skip-browser-warning": "true",
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.detail ??
        data?.message ??
        "회원정보 조회에 실패했습니다.",
    );
  }

  return data;
};

//me 응답 타입
export type MyInfo = {
  user_id: number;
  email: string;
  created_at: string;
};

//update info
export const updateMyInfo = async (data: {
  email?: string;
  password?: string;
}) => {
  const token = localStorage.getItem("access_token");

  const response = await fetch(
    `${AUTH_API_BASE_URL}/auth/me`,
    {
      method: "PATCH",
      headers: {
        "ngrok-skip-browser-warning": "true",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    },
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result?.detail ??
        result?.message ??
        "회원정보 수정에 실패했습니다.",
    );
  }

  return result;
};

//session
export const getMySessions = async () => {
  const token = localStorage.getItem("access_token");

  const response = await fetch(
    `${AUTH_API_BASE_URL}/auth/me/sessions`,
    {
      method: "GET",
      headers: {
        "ngrok-skip-browser-warning": "true",
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.detail ??
        data?.message ??
        "면접 내역 조회에 실패했습니다.",
    );
  }

  return data;
};

//delete 계정
export const deleteAccount = async () => {
  const token = localStorage.getItem("access_token");

  const response = await fetch(
    `${AUTH_API_BASE_URL}/auth/me`,
    {
      method: "DELETE",
      headers: {
        "ngrok-skip-browser-warning": "true",
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.detail ??
        data?.message ??
        "회원 탈퇴에 실패했습니다.",
    );
  }

  return data;
};