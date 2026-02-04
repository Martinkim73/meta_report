"use client";

import { useState, useRef, useEffect } from "react";

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
  music: string;
}

const MUSIC_PRESETS = [
  { value: "", label: "음악 없음" },
  { value: "the_girl_in_blue", label: "The Girl in Blue" },
  { value: "same_old", label: "Same Old" },
  { value: "the_snapper_jumbo", label: "The Snapper_Jumbo" },
  { value: "when_u_leave_tash", label: "When U Leave_Tash" },
  { value: "you_kiri_t", label: "You - Kiri T" },
];

const DA_MEDIA_SLOTS = [
  { label: "피드 이미지", ratio: "1:1" },
  { label: "스토리 이미지", ratio: "9:16" },
  { label: "릴스 이미지", ratio: "9:16" },
  { label: "기본 이미지", ratio: "1:1" },
];

const VA_MEDIA_SLOTS = [
  { label: "기본 영상", ratio: "자유" },
  { label: "스토리/릴스 영상", ratio: "9:16" },
  { label: "피드 영상", ratio: "1:1" },
];

function createEmptyCreative(type: CreativeType): Creative {
  const slots = type === "DA" ? DA_MEDIA_SLOTS : VA_MEDIA_SLOTS;
  return {
    id: crypto.randomUUID(),
    name: "",
    body: "",
    title: "",
    media: slots.map((s) => ({ ...s, file: null, preview: null })),
    music: "the_girl_in_blue",
  };
}

function MediaUploadSlot({
  slot,
  type,
  onChange,
}: {
  slot: MediaSlot;
  type: CreativeType;
  onChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isImage = type === "DA";
  const accept = isImage ? "image/*" : "video/*";

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    onChange(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0] || null;
    if (file) onChange(file);
  };

  return (
    <div
      className={`
        relative border-2 border-dashed rounded-xl p-3 text-center cursor-pointer
        transition-all hover:border-primary hover:bg-blue-50/50
        ${slot.file ? "border-primary bg-blue-50/30" : "border-gray-200"}
      `}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFile}
      />

      {slot.preview ? (
        <div className="space-y-2">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={slot.preview}
              alt={slot.label}
              className="w-full h-20 object-cover rounded-lg"
            />
          ) : (
            <div className="w-full h-20 bg-gray-900 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs">
                {slot.file?.name}
              </span>
            </div>
          )}
          <button
            type="button"
            className="text-xs text-error hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
          >
            삭제
          </button>
        </div>
      ) : (
        <div className="py-2">
          <div className="text-2xl mb-1">{isImage ? "🖼" : "🎬"}</div>
          <div className="text-xs font-medium text-foreground">
            {slot.label}
          </div>
          <div className="text-[10px] text-muted mt-0.5">{slot.ratio}</div>
        </div>
      )}
    </div>
  );
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
  const updateMedia = (slotIndex: number, file: File | null) => {
    const newMedia = [...creative.media];
    newMedia[slotIndex] = {
      ...newMedia[slotIndex],
      file,
      preview: file ? URL.createObjectURL(file) : null,
    };
    onUpdate({ ...creative, media: newMedia });
  };

  return (
    <div className="toss-card group">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary text-white text-sm font-bold">
            {index + 1}
          </span>
          <span className="font-bold text-foreground">소재 {index + 1}</span>
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

      {/* Media uploads */}
      <div
        className={`grid gap-3 mb-5 ${
          type === "DA" ? "grid-cols-4" : "grid-cols-3"
        }`}
      >
        {creative.media.map((slot, i) => (
          <MediaUploadSlot
            key={i}
            slot={slot}
            type={type}
            onChange={(file) => updateMedia(i, file)}
          />
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
            <label className="block text-sm font-medium mb-1.5">배경 음악</label>
            <select
              className="toss-input text-sm"
              value={creative.music}
              onChange={(e) =>
                onUpdate({ ...creative, music: e.target.value })
              }
            >
              {MUSIC_PRESETS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted mt-1">
              릴스/스토리에 적용되는 음악이에요
            </p>
          </div>
        </div>
      </div>
    </div>
  );
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

  useEffect(() => {
    fetch("/api/clients")
      .then((res) => res.json())
      .then((data) => {
        setClients(data.clients || []);
        if (data.clients?.length > 0) {
          setSelectedClient(data.clients[0]);
        }
      })
      .catch(() => setClients([]));
  }, []);

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
      // Convert files to base64
      const creativesPayload = await Promise.all(
        creatives
          .filter((c) => c.name && c.body && c.title && c.media.every((m) => m.file))
          .map(async (c) => ({
            name: c.name,
            body: c.body,
            title: c.title,
            music: c.music,
            media: await Promise.all(
              c.media.map(async (m) => {
                const buffer = await m.file!.arrayBuffer();
                const bytes = new Uint8Array(buffer);
                let binary = "";
                bytes.forEach((b) => (binary += String.fromCharCode(b)));
                const base64 = btoa(binary);
                return {
                  slot: m.label,
                  ratio: m.ratio,
                  base64,
                  filename: m.file!.name,
                  mimeType: m.file!.type,
                };
              })
            ),
          }))
      );

      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          clientName: selectedClient,
          creatives: creativesPayload,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "업로드 실패");
      }

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
    <div className="max-w-4xl">
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
                ? "이미지 4장 (피드, 스토리, 릴스, 기본)"
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
                <p className="font-medium">연결됨</p>
              </div>
              <div>
                <span className="text-muted">CTA 버튼</span>
                <p className="font-medium">자세히 알아보기</p>
              </div>
              <div>
                <span className="text-muted">랜딩 URL</span>
                <p className="font-medium truncate">clients.json 설정값</p>
              </div>
            </div>
            <div>
              <span className="text-muted">UTM 파라미터</span>
              <p className="font-medium text-xs text-muted">
                자동 생성 (source=facebook, medium=paid)
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
                  ? "피드(1:1), 스토리(9:16), 릴스(9:16), 기본(1:1) 자동 매핑"
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
        <div className="flex items-center justify-between max-w-4xl">
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
