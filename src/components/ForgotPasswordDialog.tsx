import { useId, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

export default function ForgotPasswordDialog() {
  const emailId = useId();
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");

  return (
    <Dialog onOpenChange={() => { setEmail(""); setNotice(""); }}>
      <DialogTrigger asChild>
        <button type="button" className="text-sm text-primary hover:underline">
          비밀번호 찾기
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl p-8">
        <DialogHeader>
          <DialogTitle className="text-xl">비밀번호 찾기</DialogTitle>
          <DialogDescription>
            가입할 때 사용한 이메일 주소를 입력해 주세요.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-5 mt-2"
          onSubmit={(event) => {
            event.preventDefault();
            // 비밀번호 재설정 API 연결 위치
            setNotice("비밀번호 재설정 메일 전송은 준비 중입니다. 아직 메일이 발송되지 않았습니다.");
          }}
        >
          <div className="space-y-2">
            <label htmlFor={emailId} className="text-sm font-medium">이메일</label>
            <Input
              id={emailId}
              type="email"
              autoComplete="email"
              placeholder="example@email.com"
              required
              value={email}
              onChange={(event) => { setEmail(event.target.value); setNotice(""); }}
              className="h-11 rounded-lg"
            />
          </div>
          <p className="text-sm text-muted-foreground">메일 전송 기능은 현재 준비 중입니다.</p>
          {notice && <p role="status" className="text-sm text-primary">{notice}</p>}
          <div className="flex gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="flex-1">취소</Button>
            </DialogClose>
            <Button type="submit" className="flex-1">재설정 메일 요청</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
