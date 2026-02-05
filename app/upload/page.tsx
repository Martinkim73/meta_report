"use client";

import { useState, useRef, useEffect, useCallback } from "react";

type CreativeType = "DA" | "VA";

interface MediaSlot {
  label: string;
  ratio: string;
  file: File | null;
  preview: string | null;
}

interface Creative {
  id: string;
  name: string;
  body: string;
  title: string;
  media: MediaSlot[];
  musicIds: string[];
}

const MUSIC_PRESETS = [
  { id: "the_girl_in_blue", label: "The Girl in Blue" },
  { id: "same_old", label: "Same Old" },
  { id: "the_snapper_jumbo", label: "The Snapper_Jumbo" },
  { id: "when_u_leave_tash", label: "When U Leave_Tash" },
  { id: "you_kiri_t", label: "You - Kiri T" },
];

const DEFAULT_MUSIC_IDS = MUSIC_PRESETS.map((m) => m.id);

const DA_MEDIA_SLOTS = [
  { label: "피드 이미지", ratio: "4:5", keywords: ["4x5", "4_5", "feed", "피드"] },
  { label: "스토리 이미지", ratio: "9:16", keywords: ["9x16", "9_16", "story", "스토리"] },
  { label: "릴스 이미지", ratio: "9:16", keywords: ["reel", "릴스"] },
  { label: "기본 이미지", ratio: "1:1", keywords: ["1x1", "1_1", "square", "기본", "default"] },
];

const VA_MEDIA_SLOTS = [
  { label: "기본 영상", ratio: "자유", keywords: ["default", "기본"] },
  { label: "스토리/릴스 영상", ratio: "9:16", keywords: ["9x16", "9_16", "story", "reel", "스토리", "릴스"] },
  { label: "피드 영상", ratio: "1:1", keywords: ["1x1", "1_1", "feed", "피드", "square"] },
];

function createEmptyCreative(type: CreativeType): Creative {
  const slots = type === "DA" ? DA_MEDIA_SLOTS : VA_MEDIA_SLOTS;
  return {
    id: crypto.randomUUID(),
    name: "",
    body: "",
    title: "🔥 지금 무료체험 + 74% 할인!",
    media: slots.map((s) => ({ label: s.label, ratio: s.ratio, file: null, preview: null })),
    musicIds: [...DEFAULT_MUSIC_IDS], // 기본 5개 음악 모두 선택
  };
}

// 파일명 또는 이미지 비율로 슬롯 매핑
async function detectSlotIndex(file: File, type: CreativeType): Promise<number> {
  const filename = file.name.toLowerCase();

  if (type === "DA" && file.type.startsWith("image/")) {
    const ratio = await getImageAspectRatio(file);

    // 1. 먼저 비율로 대분류
    // 4:5 = 0.8
    if (ratio >= 0.75 && ratio <= 0.85) {
      return 0; // 피드 4:5
    }

    // 9:16 = 0.5625 - 스토리 또는 릴스
    if (ratio >= 0.5 && ratio <= 0.65) {
      // 파일명에 reel, 릴스, reels가 있으면 릴스 슬롯
      const isReels = filename.includes("reel") || filename.includes("릴스");
      return isReels ? 2 : 1; // 2: 릴스, 1: 스토리
    }

    // 1:1 = 1.0
    if (ratio >= 0.95 && ratio <= 1.05) {
      return 3; // 기본 1:1
    }

    // 비율로 매칭 안되면 파일명으로 시도
    if (filename.includes("4x5") || filename.includes("4_5") || filename.includes("feed") || filename.includes("피드")) {
      return 0;
    }
    if (filename.includes("reel") || filename.includes("릴스")) {
      return 2;
    }
    if (filename.includes("9x16") || filename.includes("9_16") || filename.includes("story") || filename.includes("스토리")) {
      return 1;
    }
    if (filename.includes("1x1") || filename.includes("1_1") || filename.includes("square") || filename.includes("기본")) {
      return 3;
    }
  }

  // VA 타입은 파일명으로만 매칭
  if (type === "VA") {
    const slots = VA_MEDIA_SLOTS;
    for (let i = 0; i < slots.length; i++) {
      if (slots[i].keywords.some((kw) => filename.includes(kw.toLowerCase()))) {
        return i;
      }
    }
  }

  // 매칭 안되면 -1 (빈 슬롯에 배치)
  return -1;
}

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

function CreativeCard({
  creative,
  index,
  type,
  onUpdate,
  onRemove,
  onDuplicate,
}: {
  creative: Creative;
  index: number;
  type: CreativeType;
  onUpdate: (updated: Creative) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const dropRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const updateMedia = (slotIndex: number, file: File | null) => {
    const newMedia = [...creative.media];
    newMedia[slotIndex] = {
      ...newMedia[slotIndex],
      file,
      preview: file ? URL.createObjectURL(file) : null,
    };
    onUpdate({ ...creative, media: newMedia });
  };

  const handleMultipleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newMedia = [...creative.media];
    const usedSlots = new Set<number>();

    // 이미 파일이 있는 슬롯은 사용된 것으로 표시
    newMedia.forEach((m, i) => {
      if (m.file) usedSlots.add(i);
    });

    for (const file of fileArray) {
      let slotIndex = await detectSlotIndex(file, type);

      // 감지된 슬롯이 이미 사용중이면 다음 빈 슬롯 찾기
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

    onUpdate({ ...creative, media: newMedia });
  }, [creative, type, onUpdate]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleMultipleFiles(e.dataTransfer.files);
    }
  }, [handleMultipleFiles]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleMultipleFiles(e.target.files);
    }
  };

  const filledCount = creative.media.filter((m) => m.file).length;
  const totalSlots = creative.media.length;

  return (
    <div className="toss-card group">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary text-white text-sm font-bold">
            {index + 1}
          </span>
          <span className="font-bold text-foreground">소재 {index + 1}</span>
          <span className="text-xs text-muted">
            ({filledCount}/{totalSlots} 이미지)
          </span>
        </div>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={onDuplicate}
            className="text-xs text-primary hover:underline"
          >
            복제
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-error hover:underline"
          >
            삭제
          </button>
        </div>
      </div>

      {/* 드래그앤드롭 영역 */}
      <div
        ref={dropRef}
        className={`
          relative border-2 border-dashed rounded-xl p-4 mb-4 transition-all cursor-pointer
          ${isDragging ? "border-primary bg-blue-50" : "border-gray-200 hover:border-primary hover:bg-blue-50/30"}
        `}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={type === "DA" ? "image/*" : "video/*"}
          multiple
          className="hidden"
          onChange={handleFileInput}
        />
        <div className="text-center py-2">
          <div className="text-3xl mb-2">{type === "DA" ? "🖼" : "🎬"}</div>
          <p className="font-medium text-foreground">
            이미지를 드래그하거나 클릭해서 선택
          </p>
          <p className="text-xs text-muted mt-1">
            여러 장 한번에 올리면 파일명/비율로 자동 분류됩니다
          </p>
          <p className="text-xs text-primary mt-2">
            파일명에 4x5, 9x16, reel, story, feed 포함시 자동 매핑
          </p>
        </div>
      </div>

      {/* 미디어 미리보기 그리드 */}
      <div className={`grid gap-3 mb-5 ${type === "DA" ? "grid-cols-4" : "grid-cols-3"}`}>
        {creative.media.map((slot, i) => (
          <div
            key={i}
            className={`
              relative rounded-xl overflow-hidden border-2 transition-all
              ${slot.file ? "border-primary" : "border-gray-200 border-dashed"}
            `}
          >
            {/* 비율에 맞는 컨테이너 */}
            <div
              className="relative bg-gray-100"
              style={{
                paddingBottom: slot.ratio === "4:5" ? "125%"
                  : slot.ratio === "9:16" ? "177.78%"
                  : slot.ratio === "1:1" ? "100%"
                  : slot.ratio === "자유" ? "100%"
                  : "100%"
              }}
            >
              {slot.preview ? (
                <>
                  {type === "DA" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={slot.preview}
                      alt={slot.label}
                      className="absolute inset-0 w-full h-full object-contain bg-gray-900"
                    />
                  ) : (
                    <video
                      src={slot.preview}
                      className="absolute inset-0 w-full h-full object-contain bg-gray-900"
                      muted
                    />
                  )}
                  {/* 삭제 버튼 */}
                  <button
                    type="button"
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs font-bold hover:bg-red-600"
                    onClick={() => updateMedia(i, null)}
                  >
                    ✕
                  </button>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-2">
                  <span className="text-2xl opacity-30">{type === "DA" ? "🖼" : "🎬"}</span>
                </div>
              )}
            </div>
            {/* 라벨 */}
            <div className="p-2 bg-white text-center">
              <div className="text-xs font-medium truncate">{slot.label}</div>
              <div className="text-[10px] text-muted">{slot.ratio}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Text fields */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1.5">소재 이름</label>
          <input
            type="text"
            className="toss-input text-sm"
            placeholder="예: branding_year-end_v2_img"
            value={creative.name}
            onChange={(e) => onUpdate({ ...creative, name: e.target.value })}
          />
          <p className="text-xs text-muted mt-1">
            광고 관리자에서 구분할 수 있는 이름을 적어주세요
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            본문 (훅 문구)
          </label>
          <textarea
            className="toss-input text-sm resize-none"
            rows={4}
            placeholder="첫 줄이 가장 중요해요. 스크롤을 멈추게 할 한 줄을 적어보세요"
            value={creative.body}
            onChange={(e) => onUpdate({ ...creative, body: e.target.value })}
          />
          <p className="text-xs text-muted mt-1">
            첫 줄 훅 + 본문 내용. 나머지 공통 문구는 자동으로 붙어요
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">제목</label>
            <input
              type="text"
              className="toss-input text-sm"
              placeholder="예: [74% 할인] 지금 시작하기"
              value={creative.title}
              onChange={(e) =>
                onUpdate({ ...creative, title: e.target.value })
              }
            />
            <p className="text-xs text-muted mt-1">
              링크 아래에 표시되는 짧은 제목이에요
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              배경 음악 ({creative.musicIds.length}/5)
            </label>
            <div className="space-y-2 p-3 bg-gray-50 rounded-xl">
              {MUSIC_PRESETS.map((m) => (
                <label key={m.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={creative.musicIds.includes(m.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        if (creative.musicIds.length < 5) {
                          onUpdate({ ...creative, musicIds: [...creative.musicIds, m.id] });
                        }
                      } else {
                        onUpdate({ ...creative, musicIds: creative.musicIds.filter((id) => id !== m.id) });
                      }
                    }}
                    className="w-4 h-4 text-primary rounded"
                  />
                  <span className="text-sm">{m.label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted mt-1">
              릴스/스토리에 적용 (최대 5개)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
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
  compatible: boolean;
  isOmnichannel: boolean;
  isApp: boolean;
  warning: string | null;
}

export default function UploadPage() {
  const [type, setType] = useState<CreativeType>("DA");
  const [creatives, setCreatives] = useState<Creative[]>([
    createEmptyCreative("DA"),
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCommon, setShowCommon] = useState(false);
  const [clients, setClients] = useState<string[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("");

  // Campaign & Adset selection
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);
  const [adsets, setAdsets] = useState<Adset[]>([]);
  const [selectedAdsetIds, setSelectedAdsetIds] = useState<string[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [loadingAdsets, setLoadingAdsets] = useState(false);

  // Load clients
  useEffect(() => {
    fetch("/api/clients")
      .then((res) => res.json())
      .then((data) => {
        // API returns [{name, adAccountId, ...}], extract names only
        const clientNames = (data.clients || []).map((c: { name: string }) => c.name);
        setClients(clientNames);
        if (clientNames.length > 0) {
          setSelectedClient(clientNames[0]);
        }
      })
      .catch(() => setClients([]));
  }, []);

  // Load campaigns when client changes
  useEffect(() => {
    if (!selectedClient) return;
    setLoadingCampaigns(true);
    setCampaigns([]);
    setSelectedCampaignIds([]);
    setAdsets([]);
    setSelectedAdsetIds([]);

    fetch(`/api/campaigns?client=${encodeURIComponent(selectedClient)}`)
      .then((res) => res.json())
      .then((data) => {
        setCampaigns(data.campaigns || []);
      })
      .catch(() => setCampaigns([]))
      .finally(() => setLoadingCampaigns(false));
  }, [selectedClient]);

  // Load adsets when campaigns change
  useEffect(() => {
    if (!selectedClient || selectedCampaignIds.length === 0) {
      setAdsets([]);
      setSelectedAdsetIds([]);
      return;
    }
    setLoadingAdsets(true);

    // Fetch adsets from all selected campaigns
    Promise.all(
      selectedCampaignIds.map((campaignId) =>
        fetch(`/api/adsets?client=${encodeURIComponent(selectedClient)}&campaign_id=${campaignId}`)
          .then((res) => res.json())
          .then((data) => data.adsets || [])
      )
    )
      .then((results) => {
        // Flatten and dedupe adsets from all campaigns
        const allAdsets = results.flat();
        const uniqueAdsets = allAdsets.filter(
          (a: Adset, index: number, self: Adset[]) =>
            index === self.findIndex((b) => b.id === a.id)
        );
        setAdsets(uniqueAdsets);
        // Auto-select compatible and active adsets
        const compatibleActive = uniqueAdsets
          .filter((a: Adset) => a.compatible && a.status === "ACTIVE")
          .map((a: Adset) => a.id);
        setSelectedAdsetIds(compatibleActive);
      })
      .catch(() => setAdsets([]))
      .finally(() => setLoadingAdsets(false));
  }, [selectedClient, selectedCampaignIds]);

  const handleTypeChange = (newType: CreativeType) => {
    if (newType === type) return;
    setType(newType);
    setCreatives([createEmptyCreative(newType)]);
  };

  const addCreative = () => {
    setCreatives([...creatives, createEmptyCreative(type)]);
  };

  const duplicateCreative = (index: number) => {
    const source = creatives[index];
    const dup: Creative = {
      ...source,
      id: crypto.randomUUID(),
      name: source.name ? `${source.name}_copy` : "",
      media: source.media.map((s) => ({ ...s, file: null, preview: null })),
    };
    const updated = [...creatives];
    updated.splice(index + 1, 0, dup);
    setCreatives(updated);
  };

  const removeCreative = (index: number) => {
    if (creatives.length <= 1) return;
    setCreatives(creatives.filter((_, i) => i !== index));
  };

  const updateCreative = (index: number, updated: Creative) => {
    const arr = [...creatives];
    arr[index] = updated;
    setCreatives(arr);
  };

  const filledCount = creatives.filter(
    (c) => c.name && c.body && c.title && c.media.every((m) => m.file)
  ).length;

  const handleSubmit = async () => {
    if (filledCount === 0) return;
    setIsSubmitting(true);

    try {
      const readyCreatives = creatives.filter(
        (c) => c.name && c.body && c.title && c.media.every((m) => m.file)
      );

      // Phase 1: 각 이미지/영상을 개별로 업로드 → 해시 수집
      const creativesPayload = await Promise.all(
        readyCreatives.map(async (c) => {
          const media = await Promise.all(
            c.media.map(async (m) => {
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
                  mediaType: type === "VA" ? "video" : "image",
                }),
              });

              const uploadResult = await res.json();
              if (!res.ok) {
                throw new Error(uploadResult.error || "이미지 업로드 실패");
              }

              return {
                slot: m.label,
                ratio: m.ratio,
                hash: uploadResult.hash,
                videoId: uploadResult.videoId,
              };
            })
          );

          return {
            name: c.name,
            body: c.body,
            title: c.title,
            musicIds: c.musicIds,
            media,
          };
        })
      );

      // Phase 2: 해시로 크리에이티브 + 광고 생성
      const selectedAdsets = adsets
        .filter((a) => selectedAdsetIds.includes(a.id))
        .map((a) => ({ id: a.id, name: a.name, isOmnichannel: a.isOmnichannel, isApp: a.isApp }));

      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          clientName: selectedClient,
          adsets: selectedAdsets,
          creatives: creativesPayload,
        }),
      });

      const resultText = await response.text();
      if (!response.ok) {
        let errorMsg = `HTTP ${response.status}`;
        try {
          errorMsg = JSON.parse(resultText).error || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }

      const result = JSON.parse(resultText);
      alert(`${result.message}\n\n사용된 광고세트: ${result.adsetsUsed?.join(", ")}`);

      // Reset form on success
      setCreatives([createEmptyCreative(type)]);
    } catch (error) {
      alert(`오류: ${error instanceof Error ? error.message : "알 수 없는 오류"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl">
      <h1 className="text-3xl font-bold mb-2">소재 등록</h1>
      <p className="text-muted mb-8">
        여러 소재를 한번에 만들어보세요
      </p>

      {/* Client selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">광고주 선택</label>
        <select
          className="toss-input"
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
        >
          {clients.length === 0 ? (
            <option value="">광고주를 불러오는 중...</option>
          ) : (
            clients.map((client) => (
              <option key={client} value={client}>
                {client}
              </option>
            ))
          )}
        </select>
        <p className="text-xs text-muted mt-1">
          소재를 등록할 광고주를 선택하세요
        </p>
      </div>

      {/* Campaign & Adset selector */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Campaign selector - multi-select */}
        <div>
          <label className="block text-sm font-medium mb-2">
            캠페인 선택 ({selectedCampaignIds.length}개)
          </label>
          <div className="toss-input h-auto max-h-40 overflow-y-auto p-2">
            {loadingCampaigns ? (
              <p className="text-sm text-muted">캠페인 불러오는 중...</p>
            ) : campaigns.length === 0 ? (
              <p className="text-sm text-muted">캠페인이 없습니다</p>
            ) : (
              [...campaigns]
                .sort((a, b) => {
                  // ACTIVE first, then PAUSED
                  if (a.status === "ACTIVE" && b.status !== "ACTIVE") return -1;
                  if (a.status !== "ACTIVE" && b.status === "ACTIVE") return 1;
                  return 0;
                })
                .map((c) => (
                  <label
                    key={c.id}
                    className={`flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 rounded ${c.status !== "ACTIVE" ? "opacity-50" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCampaignIds.includes(c.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCampaignIds([...selectedCampaignIds, c.id]);
                        } else {
                          setSelectedCampaignIds(selectedCampaignIds.filter((id) => id !== c.id));
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm flex-1">
                      {c.name}
                      {c.status === "PAUSED" && <span className="text-muted"> (일시중지)</span>}
                    </span>
                  </label>
                ))
            )}
          </div>
        </div>

        {/* Adset selector */}
        <div>
          <label className="block text-sm font-medium mb-2">
            광고세트 선택 ({selectedAdsetIds.length}개)
          </label>
          <div className="toss-input h-auto max-h-40 overflow-y-auto p-2">
            {loadingAdsets ? (
              <p className="text-sm text-muted">광고세트 불러오는 중...</p>
            ) : adsets.length === 0 ? (
              <p className="text-sm text-muted">캠페인을 먼저 선택하세요</p>
            ) : (
              [...adsets]
                .sort((a, b) => {
                  // 1. Compatible + ACTIVE first
                  // 2. Compatible + PAUSED
                  // 3. Incompatible (warning) last
                  const aScore = (a.compatible ? 0 : 100) + (a.status === "ACTIVE" ? 0 : 10);
                  const bScore = (b.compatible ? 0 : 100) + (b.status === "ACTIVE" ? 0 : 10);
                  return aScore - bScore;
                })
                .map((a) => (
                  <label
                    key={a.id}
                    className={`flex items-center gap-2 py-1 cursor-pointer ${!a.compatible || a.status !== "ACTIVE" ? "opacity-50" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAdsetIds.includes(a.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAdsetIds([...selectedAdsetIds, a.id]);
                        } else {
                          setSelectedAdsetIds(selectedAdsetIds.filter((id) => id !== a.id));
                        }
                      }}
                      disabled={!a.compatible}
                      className="w-4 h-4"
                    />
                    <span className="text-sm flex-1">
                      {a.name}
                      {a.status === "PAUSED" && <span className="text-muted"> (일시중지)</span>}
                    </span>
                    {a.isOmnichannel && (
                      <span className="text-xs text-orange-500" title="Omnichannel 세트는 DPA만 호환 — 수동 소재 업로드 불가">⚠️OMNI</span>
                    )}
                    {a.warning && !a.isOmnichannel && (
                      <span className="text-xs text-orange-500" title={a.warning}>⚠️</span>
                    )}
                  </label>
                ))
            )}
          </div>
        </div>
      </div>

      {/* Type selector */}
      <div className="flex gap-3 mb-6">
        {(["DA", "VA"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => handleTypeChange(t)}
            className={`
              flex-1 py-4 rounded-2xl font-bold text-center transition-all
              ${
                type === t
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "bg-white text-muted border border-border hover:border-primary hover:text-primary"
              }
            `}
          >
            <div className="text-lg">{t === "DA" ? "🖼 DA 이미지" : "🎬 VA 영상"}</div>
            <div className={`text-xs mt-1 font-normal ${type === t ? "text-blue-100" : ""}`}>
              {t === "DA"
                ? "이미지 4장 (피드 4:5, 스토리 9:16, 릴스 9:16, 기본 1:1)"
                : "영상 3개 (기본, 스토리/릴스, 피드)"}
            </div>
          </button>
        ))}
      </div>

      {/* Common settings (collapsible) */}
      <div className="toss-card mb-6">
        <button
          type="button"
          className="w-full flex items-center justify-between"
          onClick={() => setShowCommon(!showCommon)}
        >
          <div>
            <span className="font-bold text-foreground">공통 설정</span>
            <span className="text-xs text-muted ml-2">
              자동으로 적용돼요
            </span>
          </div>
          <span
            className={`text-muted transition-transform ${
              showCommon ? "rotate-180" : ""
            }`}
          >
            ▼
          </span>
        </button>

        {showCommon && (
          <div className="mt-4 pt-4 border-t border-border space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-muted">페이스북 페이지</span>
                <p className="font-medium">AI코딩밸리</p>
              </div>
              <div>
                <span className="text-muted">인스타그램 계정</span>
                <p className="font-medium">ai_codingvalley</p>
              </div>
              <div>
                <span className="text-muted">CTA 버튼</span>
                <p className="font-medium">자세히 알아보기</p>
              </div>
              <div>
                <span className="text-muted">랜딩 URL</span>
                <p className="font-medium truncate text-xs">codingvalley.com/ldm/7</p>
              </div>
            </div>
            <div>
              <span className="text-muted">UTM 파라미터</span>
              <p className="font-medium text-xs">
                source=meta, medium=cpc, campaign=fbig_web_cretest_YYMMDD
              </p>
            </div>
            <div>
              <span className="text-muted">기본 텍스트</span>
              <p className="font-medium text-xs">
                Title: 🔥 지금 무료체험 + 74% 할인! | Desc: AI 시대 성공 전략, AI 코딩밸리
              </p>
            </div>
            <div>
              <span className="text-muted">개선사항 (Advantage+)</span>
              <p className="font-medium">음악만 활성, 나머지 미설정</p>
            </div>
            <div>
              <span className="text-muted">노출 위치 매핑</span>
              <p className="font-medium">
                {type === "DA"
                  ? "피드(4:5), 스토리(9:16), 릴스(9:16), 기본(1:1) 자동 매핑"
                  : "기본(자유), 스토리/릴스(9:16), 피드(1:1) 자동 매핑"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Creative list */}
      <div className="space-y-4 mb-6">
        {creatives.map((creative, index) => (
          <CreativeCard
            key={creative.id}
            creative={creative}
            index={index}
            type={type}
            onUpdate={(updated) => updateCreative(index, updated)}
            onRemove={() => removeCreative(index)}
            onDuplicate={() => duplicateCreative(index)}
          />
        ))}
      </div>

      {/* Add button */}
      <button
        type="button"
        onClick={addCreative}
        className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-muted
          hover:border-primary hover:text-primary hover:bg-blue-50/50 transition-all mb-6"
      >
        + 소재 추가
      </button>

      {/* Submit area */}
      <div className="sticky bottom-0 bg-background py-4 border-t border-border -mx-8 px-8">
        <div className="flex items-center justify-between max-w-5xl">
          <div className="text-sm">
            <span className="text-muted">준비된 소재</span>{" "}
            <span className="font-bold text-primary">{filledCount}개</span>
            <span className="text-muted"> / {creatives.length}개</span>
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={filledCount === 0 || isSubmitting}
            className={`
              px-8 py-3 rounded-xl font-bold transition-all
              ${
                filledCount > 0 && !isSubmitting
                  ? "bg-primary text-white hover:bg-secondary shadow-md shadow-primary/20"
                  : "bg-gray-100 text-muted cursor-not-allowed"
              }
            `}
          >
            {isSubmitting
              ? "등록 중..."
              : filledCount > 0
              ? `${filledCount}개 소재 등록하기`
              : "소재를 채워주세요"}
          </button>
        </div>
      </div>
    </div>
  );
}
