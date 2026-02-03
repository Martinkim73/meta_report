"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  {
    href: "/",
    icon: "🏠",
    label: "홈",
    description: "분석 실행",
    help: "등록된 광고주를 선택하고 분석을 실행합니다",
  },
  {
    href: "/clients",
    icon: "👥",
    label: "광고주 관리",
    description: "설정",
    help: "Meta 광고 계정 정보를 관리합니다",
  },
  {
    href: "/upload",
    icon: "🎨",
    label: "소재 등록",
    description: "업로드",
    help: "DA/VA 소재를 한번에 등록합니다",
  },
  {
    href: "/results",
    icon: "📊",
    label: "분석 결과",
    description: "리포트",
    help: "최근 분석한 저효율 광고를 확인합니다",
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  const currentMenu = menuItems.find((item) => item.href === pathname);

  return (
    <aside className="w-80 bg-white border-r border-border p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">📊 Meta 광고 분석</h1>
      </div>

      <nav className="space-y-2">
        <p className="text-sm text-muted mb-3">메뉴를 선택하세요</p>
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                block px-4 py-3 rounded-xl transition-colors
                ${
                  isActive
                    ? "bg-blue-50 text-primary font-medium"
                    : "text-foreground hover:bg-gray-50"
                }
              `}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{item.icon}</span>
                <div>
                  <div className="font-medium">{item.label}</div>
                  <div className="text-xs text-muted">{item.description}</div>
                </div>
              </div>
            </Link>
          );
        })}
      </nav>

      {currentMenu && (
        <div className="mt-6 p-4 bg-blue-50 rounded-xl">
          <div className="text-sm text-primary font-medium mb-1">
            현재 메뉴: {currentMenu.label}
          </div>
          <div className="text-xs text-muted">{currentMenu.help}</div>
        </div>
      )}

      <div className="mt-auto pt-8 border-t border-border">
        <p className="text-xs text-muted">
          Meta Ads Performance Analyzer
          <br />
          v2.0 (Next.js)
        </p>
      </div>
    </aside>
  );
}
