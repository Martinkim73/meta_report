export default function Home() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">오늘도 광고비를 지켜드릴게요</h1>
      <p className="text-muted mb-8">등록된 광고주를 선택하고 분석을 실행하세요</p>

      {/* 서비스 소개 */}
      <div className="toss-card mb-6">
        <h2 className="text-lg font-bold mb-4">📌 이 서비스는 무엇인가요?</h2>
        <div className="space-y-4 text-sm">
          <p className="text-muted">
            <strong className="text-foreground">메타 광고 성과 자동 분석 도구</strong>입니다.
          </p>

          <div>
            <h3 className="font-bold text-foreground mb-2">주요 기능</h3>
            <ul className="space-y-1 text-muted">
              <li>🔍 <strong>저효율 광고 자동 탐지</strong> - ROAS 85% 미만 광고 찾기</li>
              <li>📊 <strong>DA/VA 소재 분석</strong> - 동적/정적 소재별 성과 비교</li>
              <li>💰 <strong>예산 규칙 점검</strong> - 캠페인 예산 ON/OFF 확인</li>
              <li>📨 <strong>디스코드 리포트</strong> - 분석 결과 자동 전송</li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-foreground mb-2">사용 방법</h3>
            <ol className="space-y-1 text-muted list-decimal list-inside">
              <li><strong>광고주 관리</strong> 탭에서 광고주 추가</li>
              <li><strong>홈</strong> 탭에서 분석 실행</li>
              <li><strong>분석 결과</strong> 탭에서 결과 확인</li>
              <li>디스코드로 리포트 전송</li>
            </ol>
          </div>

          <div>
            <h3 className="font-bold text-foreground mb-2">용어 설명</h3>
            <div className="grid grid-cols-2 gap-4 text-muted">
              <div>
                <strong className="text-foreground">ROAS</strong> (Return On Ad Spend)
                <br />
                광고비 대비 매출 비율 (매출/광고비 × 100%)
              </div>
              <div>
                <strong className="text-foreground">CPA</strong> (Cost Per Action)
                <br />
                전환당 비용 (광고비/전환수)
              </div>
              <div>
                <strong className="text-foreground">DA 소재</strong>
                <br />
                동적 광고 (Dynamic Ads) - 자동 최적화 소재
              </div>
              <div>
                <strong className="text-foreground">VA 소재</strong>
                <br />
                정적 광고 (Video/Image Ads) - 수동 제작 소재
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 광고주 선택 및 분석 실행 */}
      <div className="toss-card">
        <h2 className="text-lg font-bold mb-4">분석 시작하기</h2>
        <p className="text-sm text-muted mb-4">
          먼저 <strong>광고주 관리</strong> 탭에서 광고주를 등록해주세요.
        </p>
        <button className="toss-button" disabled>
          분석 실행 (준비 중)
        </button>
      </div>
    </div>
  );
}
