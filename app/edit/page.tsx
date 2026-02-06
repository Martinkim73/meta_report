"use client";

import { useState, useEffect, useCallback } from "react";

interface AdCreative {
  id: string;
  name: string;
  thumbnailUrl?: string;
}

interface Ad {
  id: string;
  name: string;
  status: string;
  adsetId: string;
  creative: AdCreative | null;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
}

interface Adset {
  id: string;
  name: string;
  status: string;
}

interface MediaSlot {
  label: string;
  ratio: string;
  file: File | null;
  preview: string | null;
}

interface Creative {
  id: string; // 임시 ID
  adId: string; // 교체할 광고 ID
  media: MediaSlot[];
  searchQuery: string; // 광고 검색어 (소재별)
}

const DA_SLOTS = [
  { label: "4:5 피드", ratio: "4:5" },
  { label: "9:16 스토리", ratio: "9:16" },
  { label: "9:16 릴스", ratio: "9:16" },
  { label: "1:1 기본", ratio: "1:1" },
];

const VA_SLOTS = [
  { label: "4:5 피드", ratio: "4:5" },
  { label: "9:16 스토리/릴스", ratio: "9:16" },
  { label: "1:1 기본", ratio: "1:1" },
];

function getImageAspectRatio(file: File): Promise<number> {
  return new Promise((resolve) => {
    if (file.type.startsWith("video/")) {
      const video = document.createElement("video");
      video.onloadedmetadata = () => {
        resolve(video.videoWidth / video.videoHeight);
        URL.revokeObjectURL(video.src);
      };
      video.onerror = () => resolve(1);
      video.src = URL.createObjectURL(file);
    } else {
      const img = new Image();
      img.onload = () => {
        resolve(img.width / img.height);
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => resolve(1);
      img.src = URL.createObjectURL(file);
    }
  });
}

async function detectSlotIndex(file: File, slots: typeof DA_SLOTS | typeof VA_SLOTS): Promise<number> {
  const ratio = await getImageAspectRatio(file);

  // 비율로 매칭
  if (ratio >= 0.75 && ratio <= 0.85) return 0; // 4:5
  if (ratio >= 0.5 && ratio <= 0.65) return 1; // 9:16 (스토리 또는 스토리/릴스)
  if (ratio >= 0.95 && ratio <= 1.05) return slots.length === 4 ? 3 : 2; // 1:1

  return -1;
}

export default function EditPage() {
  const [clients, setClients] = useState<string[]>([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [adsets, setAdsets] = useState<Adset[]>([]);
  const [selectedAdsetId, setSelectedAdsetId] = useState("");
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");

  // 탭 (DA/VA)
  const [activeTab, setActiveTab] = useState<"DA" | "VA">("DA");

  // 소재 배열
  const [creatives, setCreatives] = useState<Creative[]>([
    {
      id: crypto.randomUUID(),
      adId: "",
      media: DA_SLOTS.map((s) => ({ ...s, file: null, preview: null })),
      searchQuery: "",
    },
  ]);

  // Load clients
  useEffect(() => {
    fetch("/api/clients")
      .then((res) => res.json())
      .then((data) => {
        const names = (data.clients || []).map((c: { name: string }) => c.name);
        setClients(names);
        if (names.length > 0) setSelectedClient(names[0]);
      })
      .catch(() => setClients([]));
  }, []);

  // Load campaigns
  useEffect(() => {
    if (!selectedClient) return;
    setLoading(true);
    setCampaigns([]);
    setSelectedCampaignId("");
    setAdsets([]);
    setSelectedAdsetId("");
    setAds([]);

    fetch(`/api/campaigns?client=${encodeURIComponent(selectedClient)}`)
      .then((res) => res.json())
      .then((data) => setCampaigns(data.campaigns || []))
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
  }, [selectedClient]);

  // Load adsets
  useEffect(() => {
    if (!selectedClient || !selectedCampaignId) {
      setAdsets([]);
      setSelectedAdsetId("");
      setAds([]);
      return;
    }
    setLoading(true);

    fetch(`/api/adsets?client=${encodeURIComponent(selectedClient)}&campaign_id=${selectedCampaignId}`)
      .then((res) => res.json())
      .then((data) => setAdsets(data.adsets || []))
      .catch(() => setAdsets([]))
      .finally(() => setLoading(false));
  }, [selectedClient, selectedCampaignId]);

  // Load ads
  useEffect(() => {
    if (!selectedClient || !selectedAdsetId) {
      setAds([]);
      return;
    }
    setLoading(true);

    fetch(`/api/ads?client=${encodeURIComponent(selectedClient)}&adset_id=${selectedAdsetId}`)
      .then((res) => res.json())
      .then((data) => setAds(data.ads || []))
      .catch(() => setAds([]))
      .finally(() => setLoading(false));
  }, [selectedClient, selectedAdsetId]);

  // 탭 변경시 소재 초기화
  useEffect(() => {
    const slots = activeTab === "DA" ? DA_SLOTS : VA_SLOTS;
    setCreatives([
      {
        id: crypto.randomUUID(),
        adId: "",
        media: slots.map((s) => ({ ...s, file: null, preview: null })),
        searchQuery: "",
      },
    ]);
  }, [activeTab]);

  const addCreative = () => {
    const slots = activeTab === "DA" ? DA_SLOTS : VA_SLOTS;
    setCreatives([
      ...creatives,
      {
        id: crypto.randomUUID(),
        adId: "",
        media: slots.map((s) => ({ ...s, file: null, preview: null })),
        searchQuery: "",
      },
    ]);
  };

  const removeCreative = (id: string) => {
    setCreatives(creatives.filter((c) => c.id !== id));
  };

  const updateCreativeAd = (id: string, adId: string) => {
    setCreatives(creatives.map((c) => (c.id === id ? { ...c, adId } : c)));
  };

  const updateCreativeSearch = (id: string, searchQuery: string) => {
    setCreatives(creatives.map((c) => (c.id === id ? { ...c, searchQuery } : c)));
  };

  // 광고 필터링 (검색어 + 정렬) - 소재별
  const getFilteredAds = (searchQuery: string) => {
    return ads
      .filter((ad) => ad.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        // 활성화된 광고 우선
        if (a.status === "ACTIVE" && b.status !== "ACTIVE") return -1;
        if (a.status !== "ACTIVE" && b.status === "ACTIVE") return 1;
        return 0;
      });
  };

  const handleFileUpload = async (creativeId: string, slotIndex: number, files: FileList) => {
    const creative = creatives.find((c) => c.id === creativeId);
    if (!creative) return;

    const file = files[0];
    if (!file) return;

    const newMedia = [...creative.media];
    newMedia[slotIndex] = {
      ...newMedia[slotIndex],
      file,
      preview: URL.createObjectURL(file),
    };

    setCreatives(creatives.map((c) => (c.id === creativeId ? { ...c, media: newMedia } : c)));
  };

  const handleMultipleFiles = async (creativeId: string, files: FileList) => {
    const creative = creatives.find((c) => c.id === creativeId);
    if (!creative) return;

    const slots = activeTab === "DA" ? DA_SLOTS : VA_SLOTS;
    const fileArray = Array.from(files);
    const newMedia = [...creative.media];
    const usedSlots = new Set<number>();

    newMedia.forEach((m, i) => {
      if (m.file) usedSlots.add(i);
    });

    for (const file of fileArray) {
      let slotIndex = await detectSlotIndex(file, slots);
      if (slotIndex === -1 || usedSlots.has(slotIndex)) {
        slotIndex = newMedia.findIndex((_, i) => !usedSlots.has(i));
      }
      if (slotIndex !== -1 && !usedSlots.has(slotIndex)) {
        newMedia[slotIndex] = {
          ...newMedia[slotIndex],
          file,
          preview: URL.createObjectURL(file),
        };
        usedSlots.add(slotIndex);
      }
    }

    setCreatives(creatives.map((c) => (c.id === creativeId ? { ...c, media: newMedia } : c)));
  };

  const clearSlot = (creativeId: string, slotIndex: number) => {
    const creative = creatives.find((c) => c.id === creativeId);
    if (!creative) return;

    const newMedia = [...creative.media];
    if (newMedia[slotIndex].preview) {
      URL.revokeObjectURL(newMedia[slotIndex].preview!);
    }
    newMedia[slotIndex] = { ...newMedia[slotIndex], file: null, preview: null };

    setCreatives(creatives.map((c) => (c.id === creativeId ? { ...c, media: newMedia } : c)));
  };

  const handleSubmit = async () => {
    // 유효성 검사
    for (const creative of creatives) {
      if (!creative.adId) {
        alert("모든 소재에서 교체할 광고를 선택해주세요");
        return;
      }
      const filledCount = creative.media.filter((m) => m.file).length;
      if (filledCount === 0) {
        alert("모든 소재에 미디어를 업로드해주세요");
        return;
      }
    }

    setIsSubmitting(true);
    setUploadProgress("");

    try {
      const results = [];
      const totalCreatives = creatives.length;

      for (let creativeIndex = 0; creativeIndex < creatives.length; creativeIndex++) {
        const creative = creatives[creativeIndex];
        const creativeNum = creativeIndex + 1;

        // Phase 1: 미디어 업로드 (순차적으로 한 번에 하나씩!)
        setUploadProgress(`${creativeNum}번 소재: 미디어 업로드 중... (0/${creative.media.filter(m => m.file).length})`);

        const mediaPayload = [];
        const mediaFiles = creative.media.filter((m) => m.file);

        for (let mediaIndex = 0; mediaIndex < mediaFiles.length; mediaIndex++) {
          const m = mediaFiles[mediaIndex];
          const mediaNum = mediaIndex + 1;
          const mediaType = activeTab === "VA" ? "video" : "image";

          setUploadProgress(
            `${creativeNum}번 소재: ${mediaType === "video" ? "영상" : "이미지"} 업로드 중... (${mediaNum}/${mediaFiles.length}) - ${m.label}`
          );

          // FormData로 파일 직접 전송 (Vercel 4.5MB 제한 우회)
          const formData = new FormData();
          formData.append("file", m.file!);
          formData.append("clientName", selectedClient);
          formData.append("mediaType", mediaType);

          const res = await fetch("/api/upload-image", {
            method: "POST",
            body: formData,  // Content-Type 자동 설정됨
          });

          const result = await res.json();
          if (!res.ok) throw new Error(result.error || "업로드 실패");

          mediaPayload.push({
            slot: m.label,
            ratio: m.ratio,
            mediaType,
            hash: result.hash,
            videoId: result.videoId,
          });
        }

        // Phase 2: 광고 업데이트
        setUploadProgress(`${creativeNum}번 소재: 광고 업데이트 중...`);

        const response = await fetch("/api/ads/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientName: selectedClient,
            adIds: [creative.adId],
            media: mediaPayload,
          }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "업데이트 실패");

        results.push(result);
        setUploadProgress(`${creativeNum}번 소재 완료! (${creativeNum}/${totalCreatives})`);
      }

      setUploadProgress("모든 소재 교체 완료! ✅");
      setTimeout(() => {
        alert(`${creatives.length}개 소재 교체 완료!`);
      }, 500);

      // 초기화
      const slots = activeTab === "DA" ? DA_SLOTS : VA_SLOTS;
      setCreatives([
        {
          id: crypto.randomUUID(),
          adId: "",
          media: slots.map((s) => ({ ...s, file: null, preview: null })),
          searchQuery: "",
        },
      ]);

      // 광고 목록 새로고침
      if (selectedAdsetId) {
        const adsRes = await fetch(
          `/api/ads?client=${encodeURIComponent(selectedClient)}&adset_id=${selectedAdsetId}`
        );
        const adsData = await adsRes.json();
        setAds(adsData.ads || []);
      }
    } catch (error) {
      alert(`오류: ${error instanceof Error ? error.message : "알 수 없는 오류"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl">
      <h1 className="text-3xl font-bold mb-2">소재 교체</h1>
      <p className="text-muted mb-8">광고별로 이미지/영상을 개별 교체하세요</p>

      {/* 필터 영역 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">광고주</label>
          <select
            className="toss-input text-sm"
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
          >
            {clients.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">캠페인</label>
          <select
            className="toss-input text-sm"
            value={selectedCampaignId}
            onChange={(e) => setSelectedCampaignId(e.target.value)}
          >
            <option value="">선택하세요</option>
            {campaigns
              .sort((a, b) => (a.status === "ACTIVE" ? -1 : 1))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.status === "PAUSED" ? "(일시중지)" : ""}
                </option>
              ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">광고세트</label>
          <select
            className="toss-input text-sm"
            value={selectedAdsetId}
            onChange={(e) => setSelectedAdsetId(e.target.value)}
            disabled={!selectedCampaignId}
          >
            <option value="">선택하세요</option>
            {adsets
              .sort((a, b) => (a.status === "ACTIVE" ? -1 : 1))
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} {a.status === "PAUSED" ? "(일시중지)" : ""}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 mb-6 border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("DA")}
          className={`px-6 py-3 font-bold transition-all ${
            activeTab === "DA"
              ? "text-primary border-b-2 border-primary"
              : "text-muted hover:text-foreground"
          }`}
        >
          DA 소재 교체 (이미지 4개)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("VA")}
          className={`px-6 py-3 font-bold transition-all ${
            activeTab === "VA"
              ? "text-primary border-b-2 border-primary"
              : "text-muted hover:text-foreground"
          }`}
        >
          VA 소재 교체 (영상 3개)
        </button>
      </div>

      {/* 소재 목록 */}
      <div className="space-y-6">
        {creatives.map((creative, index) => {
          const filledCount = creative.media.filter((m) => m.file).length;
          const totalSlots = activeTab === "DA" ? 4 : 3;
          const filteredAds = getFilteredAds(creative.searchQuery);

          return (
            <div key={creative.id} className="toss-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">
                  {activeTab} 소재 #{index + 1}
                </h3>
                {creatives.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCreative(creative.id)}
                    className="text-sm text-red-500 hover:underline"
                  >
                    삭제
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* 왼쪽: 광고 선택 */}
                <div>
                  <label className="block text-sm font-medium mb-2">교체할 광고 선택</label>

                  {/* 검색 입력 */}
                  {ads.length > 0 && (
                    <input
                      type="text"
                      placeholder="광고명 검색..."
                      className="toss-input text-sm mb-2"
                      value={creative.searchQuery}
                      onChange={(e) => updateCreativeSearch(creative.id, e.target.value)}
                    />
                  )}

                  {/* 로딩 상태 */}
                  {loading && ads.length === 0 && (
                    <div className="p-3 bg-gray-50 rounded-lg mb-4 text-center">
                      <p className="text-sm text-muted">광고 불러오는 중...</p>
                    </div>
                  )}

                  <select
                    className="toss-input text-sm mb-4"
                    value={creative.adId}
                    onChange={(e) => updateCreativeAd(creative.id, e.target.value)}
                    disabled={loading || ads.length === 0}
                  >
                    <option value="">
                      {!selectedAdsetId
                        ? "광고세트를 먼저 선택하세요"
                        : ads.length === 0
                        ? "광고 목록이 비어있습니다"
                        : "선택하세요"}
                    </option>
                    {filteredAds.map((ad) => (
                      <option key={ad.id} value={ad.id}>
                        {ad.status === "ACTIVE" ? "🟢" : "⏸️"} {ad.name}
                      </option>
                    ))}
                  </select>

                  {creative.searchQuery && filteredAds.length === 0 && ads.length > 0 && (
                    <p className="text-xs text-muted mb-2">
                      검색 결과 없음 ({ads.length}개 중 0개)
                    </p>
                  )}

                  {!creative.searchQuery && ads.length > 0 && (
                    <p className="text-xs text-muted mb-2">총 {ads.length}개 광고</p>
                  )}

                  {creative.adId && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-muted mb-1">선택된 광고</p>
                      <p className="text-sm font-medium">
                        {ads.find((a) => a.id === creative.adId)?.name || creative.adId}
                      </p>
                    </div>
                  )}
                </div>

                {/* 오른쪽: 미디어 업로드 */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    {activeTab === "DA" ? "이미지" : "영상"} ({filledCount}/{totalSlots})
                  </label>

                  {/* 드래그앤드롭 */}
                  <div
                    className="relative border-2 border-dashed rounded-xl p-3 mb-3 transition-all cursor-pointer border-gray-200 hover:border-primary"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files.length > 0) {
                        handleMultipleFiles(creative.id, e.dataTransfer.files);
                      }
                    }}
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = activeTab === "DA" ? "image/*" : "video/*";
                      input.multiple = true;
                      input.onchange = (e) => {
                        const files = (e.target as HTMLInputElement).files;
                        if (files) handleMultipleFiles(creative.id, files);
                      };
                      input.click();
                    }}
                  >
                    <div className="text-center py-2">
                      <div className="text-xl mb-1">
                        {activeTab === "DA" ? "🖼️" : "🎬"}
                      </div>
                      <p className="text-xs font-medium">
                        {activeTab === "DA" ? "이미지" : "영상"}를 드래그하거나 클릭
                      </p>
                    </div>
                  </div>

                  {/* 미디어 슬롯 */}
                  <div className={`grid ${activeTab === "DA" ? "grid-cols-4" : "grid-cols-3"} gap-2`}>
                    {creative.media.map((slot, i) => (
                      <div
                        key={i}
                        className={`relative rounded-lg overflow-hidden border-2 ${
                          slot.file ? "border-primary" : "border-gray-200 border-dashed"
                        }`}
                      >
                        <div className="relative bg-gray-100" style={{ paddingBottom: "125%" }}>
                          {slot.preview ? (
                            <>
                              {activeTab === "VA" ? (
                                <video
                                  src={slot.preview}
                                  className="absolute inset-0 w-full h-full object-contain bg-gray-900"
                                  controls={false}
                                  muted
                                />
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={slot.preview}
                                  alt={slot.label}
                                  className="absolute inset-0 w-full h-full object-contain bg-gray-900"
                                />
                              )}
                              <button
                                type="button"
                                className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs"
                                onClick={() => clearSlot(creative.id, i)}
                              >
                                ✕
                              </button>
                            </>
                          ) : (
                            <div
                              className="absolute inset-0 flex items-center justify-center cursor-pointer hover:bg-gray-200"
                              onClick={() => {
                                const input = document.createElement("input");
                                input.type = "file";
                                input.accept = activeTab === "DA" ? "image/*" : "video/*";
                                input.onchange = (e) => {
                                  const files = (e.target as HTMLInputElement).files;
                                  if (files) handleFileUpload(creative.id, i, files);
                                };
                                input.click();
                              }}
                            >
                              <span className="text-xl opacity-30">
                                {activeTab === "DA" ? "🖼" : "🎬"}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="p-1.5 bg-white text-center">
                          <div className="text-[10px] font-medium truncate">{slot.label}</div>
                          <div className="text-[9px] text-muted">{slot.ratio}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 소재 추가 버튼 */}
      <button
        type="button"
        onClick={addCreative}
        className="w-full py-3 mt-4 border-2 border-dashed border-gray-300 rounded-xl text-muted hover:border-primary hover:text-primary transition-all"
      >
        + 소재 추가
      </button>

      {/* 하단 제출 버튼 */}
      <div className="sticky bottom-0 bg-background py-4 mt-6 border-t border-border">
        {/* 진행 상태 표시 */}
        {uploadProgress && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <p className="text-sm font-medium text-blue-800">{uploadProgress}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">{creatives.length}개 소재 준비됨</p>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`px-8 py-3 rounded-xl font-bold transition-all ${
              !isSubmitting
                ? "bg-primary text-white hover:bg-secondary"
                : "bg-gray-100 text-muted cursor-not-allowed"
            }`}
          >
            {isSubmitting ? "교체 중..." : `${creatives.length}개 소재 일괄 교체`}
          </button>
        </div>
      </div>
    </div>
  );
}
