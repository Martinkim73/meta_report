export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8">개인정보처리방침</h1>

      <div className="prose prose-gray">
        <p className="text-muted mb-6">
          최종 수정일: 2025년 2월 4일
        </p>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">1. 개인정보의 수집 및 이용 목적</h2>
          <p className="text-foreground leading-relaxed">
            AI코딩밸리(이하 &quot;회사&quot;)는 Meta 광고 관리 서비스 제공을 위해
            최소한의 개인정보를 수집하고 있습니다. 수집된 정보는 다음의 목적으로만 사용됩니다:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Meta 광고 계정 연동 및 광고 소재 업로드</li>
            <li>광고 성과 분석 및 리포트 생성</li>
            <li>서비스 개선 및 사용자 지원</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">2. 수집하는 개인정보 항목</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Meta 광고 계정 정보 (광고 계정 ID)</li>
            <li>Facebook 페이지 정보</li>
            <li>Instagram 비즈니스 계정 정보</li>
            <li>광고 소재 (이미지, 영상, 텍스트)</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">3. 개인정보의 보유 및 이용 기간</h2>
          <p className="text-foreground leading-relaxed">
            회사는 서비스 제공 기간 동안 개인정보를 보유하며,
            사용자가 서비스 해지를 요청할 경우 즉시 삭제합니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">4. 개인정보의 제3자 제공</h2>
          <p className="text-foreground leading-relaxed">
            회사는 사용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다.
            단, Meta 플랫폼 API를 통한 광고 서비스 연동을 위해 Meta에 필요한 정보가 전달될 수 있습니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">5. 개인정보의 파기</h2>
          <p className="text-foreground leading-relaxed">
            보유 기간이 만료되거나 처리 목적이 달성된 경우,
            해당 개인정보를 지체 없이 파기합니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">6. 이용자의 권리</h2>
          <p className="text-foreground leading-relaxed">
            이용자는 언제든지 자신의 개인정보에 대해 열람, 정정, 삭제,
            처리정지를 요청할 수 있습니다.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">7. 연락처</h2>
          <p className="text-foreground leading-relaxed">
            개인정보 관련 문의사항이 있으시면 아래로 연락해 주세요.
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>이메일: support@aicodingvalley.com</li>
            <li>서비스명: AI코딩밸리 Meta 광고 관리</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">8. 개인정보처리방침 변경</h2>
          <p className="text-foreground leading-relaxed">
            이 개인정보처리방침은 법령, 정책 또는 서비스 변경에 따라
            수정될 수 있으며, 변경 시 본 페이지를 통해 공지합니다.
          </p>
        </section>
      </div>
    </div>
  );
}
