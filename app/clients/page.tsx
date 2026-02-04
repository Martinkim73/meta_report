"use client";

import { useState, useEffect } from "react";

interface Client {
  name: string;
  adAccountId: string;
  targetCampaigns: string[];
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    accessToken: "",
    adAccountId: "",
    targetCampaigns: "",
    minSpend: 250000,
    lowRoasThreshold: 85,
    budgetRulePct: 50,
    discordWebhook: "",
    pageId: "",
    instagramActorId: "",
  });

  // 광고주 목록 조회
  const fetchClients = async () => {
    try {
      const res = await fetch("/api/clients");
      const data = await res.json();
      setClients(data.clients || []);
    } catch (error) {
      console.error("Failed to fetch clients:", error);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: data.message });
        setFormData({
          name: "",
          accessToken: "",
          adAccountId: "",
          targetCampaigns: "",
          minSpend: 250000,
          lowRoasThreshold: 85,
          budgetRulePct: 50,
          discordWebhook: "",
          pageId: "",
          instagramActorId: "",
        });
        fetchClients();
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch (error) {
      console.error("Failed to add client:", error);
      setMessage({ type: "error", text: "광고주 추가 중 오류가 발생했습니다" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm(`"${name}" 광고주를 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch(`/api/clients?name=${encodeURIComponent(name)}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: data.message });
        fetchClients();
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch (error) {
      console.error("Failed to delete client:", error);
      setMessage({ type: "error", text: "광고주 삭제 중 오류가 발생했습니다" });
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">광고주 관리</h1>
      <p className="text-muted mb-8">광고주를 추가하거나 설정을 변경하세요</p>

      {/* 메시지 표시 */}
      {message && (
        <div
          className={`rounded-xl p-4 mb-6 ${
            message.type === "success"
              ? "bg-green-50 border border-green-200 text-green-900"
              : "bg-red-50 border border-red-200 text-red-900"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 등록된 광고주 목록 */}
      {clients.length > 0 && (
        <div className="toss-card mb-8">
          <h3 className="font-bold text-lg mb-4">📋 등록된 광고주</h3>
          <div className="space-y-3">
            {clients.map((client) => (
              <div
                key={client.name}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
              >
                <div>
                  <div className="font-medium">{client.name}</div>
                  <div className="text-sm text-muted">
                    {client.adAccountId} · 캠페인 {client.targetCampaigns?.length || 0}개
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(client.name)}
                  className="text-red-500 hover:text-red-700 text-sm font-medium"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
              <label className="block text-sm font-medium mb-2">광고주 이름 *</label>
              <input
                type="text"
                className="toss-input"
                placeholder="예: AI코딩밸리"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
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
                Meta Access Token (장기 토큰) *
              </label>
              <input
                type="password"
                className="toss-input"
                value={formData.accessToken}
                onChange={(e) =>
                  setFormData({ ...formData, accessToken: e.target.value })
                }
                required
              />
              <p className="text-xs text-muted mt-1">
                👉 Meta Business Suite → 시스템 사용자 → 토큰 생성 (60일 유효)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">광고 계정 ID *</label>
              <input
                type="text"
                className="toss-input"
                placeholder="act_XXXXXXXXXX"
                value={formData.adAccountId}
                onChange={(e) =>
                  setFormData({ ...formData, adAccountId: e.target.value })
                }
                required
              />
              <p className="text-xs text-muted mt-1">
                👉 Meta 광고 관리자 → 설정에서 확인 (act_로 시작)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">페이지 ID</label>
              <input
                type="text"
                className="toss-input"
                placeholder="페이스북 페이지 ID"
                value={formData.pageId}
                onChange={(e) =>
                  setFormData({ ...formData, pageId: e.target.value })
                }
              />
              <p className="text-xs text-muted mt-1">
                👉 광고 소재 업로드 시 필요 (페이지 설정 → 페이지 ID)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Instagram Actor ID</label>
              <input
                type="text"
                className="toss-input"
                placeholder="인스타그램 계정 ID"
                value={formData.instagramActorId}
                onChange={(e) =>
                  setFormData({ ...formData, instagramActorId: e.target.value })
                }
              />
              <p className="text-xs text-muted mt-1">
                👉 인스타그램 광고 게재 시 필요 (선택)
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

        <button type="submit" className="toss-button w-full" disabled={loading}>
          {loading ? "추가 중..." : "광고주 추가"}
        </button>
      </form>
    </div>
  );
}
