"use client";

import { useState } from "react";

export default function ClientsPage() {
  const [formData, setFormData] = useState({
    name: "",
    accessToken: "",
    adAccountId: "",
    targetCampaigns: "",
    minSpend: 250000,
    lowRoasThreshold: 85,
    budgetRulePct: 50,
    discordWebhook: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("광고주 추가 기능은 API 연동 후 구현됩니다");
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">광고주 관리</h1>
      <p className="text-muted mb-8">광고주를 추가하거나 설정을 변경하세요</p>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <p className="text-sm text-blue-900">
          💡 <strong>광고주 추가 가이드</strong>: Meta 광고 계정 정보를 입력하여 자동 분석을
          시작하세요
        </p>
      </div>

      <form onSubmit={handleSubmit} className="toss-card space-y-6">
        {/* 기본 정보 */}
        <div>
          <h3 className="font-bold text-lg mb-4">📝 기본 정보</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">광고주 이름</label>
              <input
                type="text"
                className="toss-input"
                placeholder="예: AI코딩밸리"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
              <p className="text-xs text-muted mt-1">
                👉 식별하기 쉬운 광고주 이름을 입력하세요
              </p>
            </div>
          </div>
        </div>

        <hr className="border-border" />

        {/* Meta API 인증 */}
        <div>
          <h3 className="font-bold text-lg mb-4">🔑 Meta API 인증</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Meta Access Token (장기 토큰)
              </label>
              <input
                type="password"
                className="toss-input"
                value={formData.accessToken}
                onChange={(e) =>
                  setFormData({ ...formData, accessToken: e.target.value })
                }
              />
              <p className="text-xs text-muted mt-1">
                👉 Meta Business Suite → 시스템 사용자 → 토큰 생성 (60일 유효)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">광고 계정 ID</label>
              <input
                type="text"
                className="toss-input"
                placeholder="act_XXXXXXXXXX"
                value={formData.adAccountId}
                onChange={(e) =>
                  setFormData({ ...formData, adAccountId: e.target.value })
                }
              />
              <p className="text-xs text-muted mt-1">
                👉 Meta 광고 관리자 → 설정에서 확인 (act_로 시작)
              </p>
            </div>
          </div>
        </div>

        <hr className="border-border" />

        {/* 분석 대상 */}
        <div>
          <h3 className="font-bold text-lg mb-4">🎯 분석 대상</h3>
          <div>
            <label className="block text-sm font-medium mb-2">
              타겟 캠페인 (줄바꿈으로 구분)
            </label>
            <textarea
              className="toss-input resize-none"
              rows={4}
              placeholder="fbig_web_purchase_250613&#10;fbig_app_purchase_250910"
              value={formData.targetCampaigns}
              onChange={(e) =>
                setFormData({ ...formData, targetCampaigns: e.target.value })
              }
            />
            <p className="text-xs text-muted mt-1">
              👉 Meta 광고 관리자에서 캠페인 이름을 정확히 복사하여 한 줄에 하나씩 입력하세요
            </p>
          </div>
        </div>

        <hr className="border-border" />

        {/* 분석 기준 설정 */}
        <div>
          <h3 className="font-bold text-lg mb-4">⚙️ 분석 기준 설정</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                최소 지출 기준 (원)
              </label>
              <input
                type="number"
                className="toss-input"
                value={formData.minSpend}
                onChange={(e) =>
                  setFormData({ ...formData, minSpend: Number(e.target.value) })
                }
              />
              <p className="text-xs text-muted mt-1">
                💰 이 금액 이상 소진한 광고만 분석
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                저효율 ROAS 기준 (%)
              </label>
              <input
                type="number"
                className="toss-input"
                value={formData.lowRoasThreshold}
                onChange={(e) =>
                  setFormData({ ...formData, lowRoasThreshold: Number(e.target.value) })
                }
              />
              <p className="text-xs text-muted mt-1">
                📉 이 ROAS 미만인 광고를 저효율로 판단
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                규칙 OFF 판단 비율 (%)
              </label>
              <input
                type="number"
                className="toss-input"
                value={formData.budgetRulePct}
                onChange={(e) =>
                  setFormData({ ...formData, budgetRulePct: Number(e.target.value) })
                }
              />
              <p className="text-xs text-muted mt-1">
                ⚠️ 예산의 이 비율 이하 소진 시 경고
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                디스코드 웹훅 URL (선택)
              </label>
              <input
                type="password"
                className="toss-input"
                placeholder="https://discord.com/api/webhooks/..."
                value={formData.discordWebhook}
                onChange={(e) =>
                  setFormData({ ...formData, discordWebhook: e.target.value })
                }
              />
              <p className="text-xs text-muted mt-1">
                📨 분석 결과를 자동으로 전송할 웹훅 URL
              </p>
            </div>
          </div>
        </div>

        <button type="submit" className="toss-button w-full">
          광고주 추가
        </button>
      </form>
    </div>
  );
}
