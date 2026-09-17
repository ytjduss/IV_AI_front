import { ChevronDown } from "lucide-react";
import { useState } from "react";
import {
    Screen,
    MY_SCREENS,
    SCREENS,
    SCREEN_LABELS,
}
from "../type/screen";

function NavBar({ currentScreen, onNavigate }: { currentScreen: Screen; onNavigate: (s: Screen) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
   
          <span className="font-bold text-xl text-foreground" onClick={() => onNavigate("main")}>
            IV-Coach
          </span>
        

        {currentScreen !== "main" && currentScreen !== "login" && !MY_SCREENS.includes(currentScreen) && currentScreen !== "report-detail" && <div className="hidden md:flex items-center gap-2">
          {SCREENS.map((s, index) => (
            <button
              key={s}
              onClick={() => onNavigate(s)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${currentScreen === s ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${currentScreen === s ? "bg-primary text-white" : "bg-muted"}`}>{index + 1}</span>
              {SCREEN_LABELS[s]}
            </button>
          ))}
        </div>}
        
        <div className="flex items-center gap-1 sm:gap-3">
        <div className="relative flex items-center">
          <button onClick={() => { onNavigate("profile"); setOpen(false); }} className="p-2 rounded-lg hover:bg-muted transition-colors text-sm font-semibold whitespace-nowrap">
            마이페이지
          </button>
          <button onClick={() => setOpen(!open)} aria-label="마이페이지 메뉴" aria-expanded={open} className="p-1 rounded-lg hover:bg-muted transition-colors">
            <ChevronDown className="w-4 h-4" />
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-lg py-1 z-50">
              {MY_SCREENS.map((s) => (
                <button
                  key={s}
                  onClick={() => { onNavigate(s); setOpen(false); }}
                  className={`w-full text-left px-4 py-2 text-sm transition-colors ${(currentScreen === s || (currentScreen === "report-detail" && s === "reports")) ? "text-primary font-semibold bg-accent" : "text-foreground hover:bg-muted"}`}
                >
                  {SCREEN_LABELS[s]}
                </button>
              ))}
            </div>
          )}
        </div>
          {(currentScreen === "main" || currentScreen === "login") && (
            <div className="flex items-center gap-1 sm:gap-3">
              <button onClick={() => onNavigate("login")} className="px-2 sm:px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-primary whitespace-nowrap">로그인</button>
              <button onClick={() => onNavigate("signup")} className="px-3 sm:px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold whitespace-nowrap">회원가입</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export { NavBar };