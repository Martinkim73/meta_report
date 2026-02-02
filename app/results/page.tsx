export default function ResultsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">분석 결과</h1>
      <p className="text-muted mb-8">리포트를 확인하고 디스코드로 전송하세요</p>

      {/* 용어 설명 */}
      <details className="toss-card mb-6">
        <summary className="cursor-pointer font-bold text-lg">
          📖 용어 설명
        </summary>
        <div className="grid grid-cols-2 gap-6 mt-4 text-sm">
          <div>
            <h4 className="font-bold text-foreground mb-2">
              ROAS (Return On Ad Spend)
            </h4>
            <ul className="text-muted space-y-1">
              <li>• 광고비 대비 매출 비율</li>
              <li>• 계산: (매출 / 광고비) × 100%</li>
              <li>• 예: ROAS 150% = 10만원 광고비로 15만원 매출</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-foreground mb-2">
              CPA (Cost Per Action)
            </h4>
            <ul className="text-muted space-y-1">
              <li>• 전환 1건당 비용</li>
              <li>• 계산: 광고비 / 전환수</li>
              <li>• 낮을수록 효율적</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-foreground mb-2">
              DA 소재 (Dynamic Ads)
            </h4>
            <ul className="text-muted space-y-1">
              <li>• 동적 광고 소재</li>
              <li>• Meta가 자동으로 최적화</li>
              <li>• 이름에 'DA', 'dynamic', 'auto' 포함</li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-foreground mb-2">
              VA 소재 (Video/Image Ads)
            </h4>
            <ul className="text-muted space-y-1">
              <li>• 정적 광고 소재 (수동 제작)</li>
              <li>• 직접 디자인한 이미지/비디오</li>
              <li>• DA가 아닌 모든 소재</li>
            </ul>
          </div>
        </div>
      </details>

      {/* 분석 결과 없음 */}
      <div className="toss-card text-center py-16">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-bold mb-2">아직 분석 결과가 없어요</h3>
        <p className="text-muted text-sm">
          "홈"에서 분석을 실행해주세요
        </p>
      </div>
    </div>
  );
}
