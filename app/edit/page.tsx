"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Creative {
  id: string;
  name: string;
  thumbnailUrl?: string;
}

interface Ad {
  id: string;
  name: string;
  status: string;
  adsetId: string;
  creative: Creative | null;
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
  mediaType: "image" | "video";
  file: File | null;
  preview: string | null;
}

const MEDIA_SLOTS = [
  { label: "피드 이미지", ratio: "4:5", mediaType: "image" as const, keywords: ["4x5", "4_5", "feed", "피드"] },
  { label: "스토리 이미지", ratio: "9:16", mediaType: "image" as const, keywords: ["9x16", "9_16", "story", "스토리"] },
  { label: "릴스 이미지", ratio: "9:16", mediaType: "image" as const, keywords: ["reel", "릴스"] },
  { label: "기본 이미지", ratio: "1:1", mediaType: "image" as const, keywords: ["1x1", "1_1", "square", "기본", "default"] },
  { label: "영상", ratio: "9:16", mediaType: "video" as const, keywords: ["video", "영상", "mp4", "mov"] },
];

function getImageAspectRatio(file: File): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve(img.width / img.height);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => resolve(1);
    img.src = URL.createObjectURL(file);
  });
}

async function detectSlotIndex(file: File): Promise<number> {
  const filename = file.name.toLowerCase();
  const isVideo = file.type.startsWith("video/");

  // 영상이면 마지막 슬롯 (index 4)
  if (isVideo) return 4;

  const ratio = await getImageAspectRatio(file);

  // 비율로 매칭
  if (ratio >= 0.75 && ratio <= 0.85) return 0; // 4:5
  if (ratio >= 0.5 && ratio <= 0.65) {
    const isReels = filename.includes("reel") || filename.includes("릴스");
    return isReels ? 2 : 1; // 릴스 or 스토리
  }
  if (ratio >= 0.95 && ratio <= 1.05) return 3; // 1:1

  // 파일명으로 매칭
  if (filename.includes("4x5") || filename.includes("feed")) return 0;
  if (filename.includes("reel") || filename.includes("릴스")) return 2;
  if (filename.includes("9x16") || filename.includes("story")) return 1;
  if (filename.includes("1x1") || filename.includes("square")) return 3;

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
  const [selectedAdIds, setSelectedAdIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 새 미디어 (이미지 + 영상)
  const [media, setMedia] = useState<MediaSlot[]>(
    MEDIA_SLOTS.map((s) => ({ label: s.label, ratio: s.ratio, mediaType: s.mediaType, file: null, preview: null }))
  );
  const dropRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

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
    setSelectedAdIds([]);

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
      setSelectedAdIds([]);
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
      setSelectedAdIds([]);
      return;
    }
    setLoading(true);

    fetch(`/api/ads?client=${encodeURIComponent(selectedClient)}&adset_id=${selectedAdsetId}`)
      .then((res) => res.json())
      .then((data) => setAds(data.ads || []))
      .catch(() => setAds([]))
      .finally(() => setLoading(false));
  }, [selectedClient, selectedAdsetId]);

  const handleMultipleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newMedia = [...media];
    const usedSlots = new Set<number>();

    newMedia.forEach((m, i) => {
      if (m.file) usedSlots.add(i);
    });

    for (const file of fileArray) {
      let slotIndex = await detectSlotIndex(file);
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
    setMedia(newMedia);
  }, [media]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleMultipleFiles(e.dataTransfer.files);
    }
  }, [handleMultipleFiles]);

  const clearSlot = (index: number) => {
    const newMedia = [...media];
    if (newMedia[index].preview) URL.revokeObjectURL(newMedia[index].preview!);
    newMedia[index] = { ...newMedia[index], file: null, preview: null };
    setMedia(newMedia);
  };

  const filledCount = media.filter((m) => m.file).length;

  const handleSubmit = async () => {
    if (selectedAdIds.length === 0) {
      alert("수정할 광고를 선택해주세요");
      return;
    }
    if (filledCount === 0) {
      alert("새 이미지 또는 영상을 업로드해주세요");
      return;
    }

    setIsSubmitting(true);

    try {
      // Phase 1: 미디어 업로드 (이미지 + 영상)
      const mediaPayload = await Promise.all(
        media
          .filter((m) => m.file)
          .map(async (m) => {
            const buffer = await m.file!.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            let binary = "";
            bytes.forEach((b) => (binary += String.fromCharCode(b)));
            const base64 = btoa(binary);

            const res = await fetch("/api/upload-image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                clientName: selectedClient,
                base64,
                filename: m.file!.name,
                mediaType: m.mediaType,
              }),
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || `${m.mediaType === "video" ? "영상" : "이미지"} 업로드 실패`);

            return {
              slot: m.label,
              ratio: m.ratio,
              mediaType: m.mediaType,
              hash: result.hash,
              videoId: result.videoId,
            };
          })
      );

      // Phase 2: 광고 업데이트
      const response = await fetch("/api/ads/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: selectedClient,
          adIds: selectedAdIds,
          media: mediaPayload,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "업데이트 실패");

      alert(result.message);

      // 성공 후 초기화
      setSelectedAdIds([]);
      setMedia(MEDIA_SLOTS.map((s) => ({ label: s.label, ratio: s.ratio, mediaType: s.mediaType, file: null, preview: null })));

      // 광고 목록 새로고침
      if (selectedAdsetId) {
        const adsRes = await fetch(`/api/ads?client=${encodeURIComponent(selectedClient)}&adset_id=${selectedAdsetId}`);
        const adsData = await adsRes.json();
        setAds(adsData.ads || []);
      }
    } catch (error) {
      alert(`오류: ${error instanceof Error ? error.message : "알 수 없는 오류"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAdSelection = (adId: string) => {
    setSelectedAdIds((prev) =>
      prev.includes(adId) ? prev.filter((id) => id !== adId) : [...prev, adId]
    );
  };

  const selectAllAds = () => {
    if (selectedAdIds.length === ads.length) {
      setSelectedAdIds([]);
    } else {
      setSelectedAdIds(ads.map((a) => a.id));
    }
  };

  return (
    <div className="max-w-5xl">
      <h1 className="text-3xl font-bold mb-2">소재 교체</h1>
      <p className="text-muted mb-8">기존 광고의 이미지를 한번에 교체하세요</p>

      {/* 필터 영역 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {/* 광고주 */}
        <div>
          <label className="block text-sm font-medium mb-2">광고주</label>
          <select
            className="toss-input text-sm"
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
          >
            {clients.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* 캠페인 */}
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

        {/* 광고세트 */}
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

        {/* 선택된 광고 수 */}
        <div className="flex items-end">
          <div className="toss-input text-sm bg-gray-50 text-center">
            선택: <span className="font-bold text-primary">{selectedAdIds.length}</span>개
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* 왼쪽: 광고 목록 */}
        <div className="toss-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold">광고 목록</h2>
            {ads.length > 0 && (
              <button
                type="button"
                onClick={selectAllAds}
                className="text-xs text-primary hover:underline"
              >
                {selectedAdIds.length === ads.length ? "전체 해제" : "전체 선택"}
              </button>
            )}
          </div>

          {loading ? (
            <p className="text-muted text-sm py-8 text-center">불러오는 중...</p>
          ) : ads.length === 0 ? (
            <p className="text-muted text-sm py-8 text-center">
              {selectedAdsetId ? "광고가 없습니다" : "캠페인과 광고세트를 선택하세요"}
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {ads.map((ad) => (
                <label
                  key={ad.id}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                    selectedAdIds.includes(ad.id)
                      ? "bg-blue-50 border-2 border-primary"
                      : "bg-gray-50 border-2 border-transparent hover:bg-gray-100"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedAdIds.includes(ad.id)}
                    onChange={() => toggleAdSelection(ad.id)}
                    className="w-5 h-5 text-primary rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{ad.name}</p>
                    <p className="text-xs text-muted">
                      {ad.status === "ACTIVE" ? "🟢 활성" : "⏸️ 일시중지"}
                    </p>
                  </div>
                  {ad.creative?.thumbnailUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={ad.creative.thumbnailUrl}
                      alt=""
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                  )}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* 오른쪽: 새 미디어 업로드 */}
        <div className="toss-card">
          <h2 className="font-bold mb-4">새 미디어 ({filledCount}/5)</h2>

          {/* 드래그앤드롭 */}
          <div
            ref={dropRef}
            className={`relative border-2 border-dashed rounded-xl p-4 mb-4 transition-all cursor-pointer ${
              isDragging ? "border-primary bg-blue-50" : "border-gray-200 hover:border-primary"
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && handleMultipleFiles(e.target.files)}
            />
            <div className="text-center py-2">
              <div className="text-2xl mb-1">🖼️🎬</div>
              <p className="text-sm font-medium">이미지/영상을 드래그하거나 클릭</p>
              <p className="text-xs text-muted">비율/파일명으로 자동 분류</p>
            </div>
          </div>

          {/* 미디어 슬롯 */}
          <div className="grid grid-cols-5 gap-2">
            {media.map((slot, i) => (
              <div
                key={i}
                className={`relative rounded-lg overflow-hidden border-2 ${
                  slot.file ? "border-primary" : "border-gray-200 border-dashed"
                }`}
              >
                <div className="relative bg-gray-100" style={{ paddingBottom: "125%" }}>
                  {slot.preview ? (
                    <>
                      {slot.mediaType === "video" ? (
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
                        onClick={() => clearSlot(i)}
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl opacity-30">{slot.mediaType === "video" ? "🎬" : "🖼"}</span>
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

      {/* 하단 버튼 */}
      <div className="sticky bottom-0 bg-background py-4 mt-6 border-t border-border">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted">
            {selectedAdIds.length}개 광고 선택됨 · {filledCount}개 미디어 준비됨
          </p>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={selectedAdIds.length === 0 || filledCount === 0 || isSubmitting}
            className={`px-8 py-3 rounded-xl font-bold transition-all ${
              selectedAdIds.length > 0 && filledCount > 0 && !isSubmitting
                ? "bg-primary text-white hover:bg-secondary"
                : "bg-gray-100 text-muted cursor-not-allowed"
            }`}
          >
            {isSubmitting ? "수정 중..." : `${selectedAdIds.length}개 광고 소재 교체`}
          </button>
        </div>
      </div>
    </div>
  );
}
