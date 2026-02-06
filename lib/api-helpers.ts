/**
 * Meta Graph API 응답 안전하게 파싱
 * "Request Entity Too Large" 등의 HTML 오류를 제대로 핸들링
 */
export async function safeJsonParse(response: Response, context: string = "API call"): Promise<any> {
  // HTTP 상태 확인
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`${context} failed:`, response.status, errorText.substring(0, 500));

    // 일반적인 오류 메시지 추출 시도
    if (errorText.includes("Request Entity Too Large")) {
      throw new Error(`파일 크기가 너무 큽니다. 파일을 압축하거나 작은 파일을 사용해주세요. (최대 4.5MB)`);
    }

    if (errorText.includes("Request Timeout")) {
      throw new Error(`요청 시간이 초과되었습니다. 파일 크기를 줄이거나 다시 시도해주세요.`);
    }

    throw new Error(`${context} failed (${response.status}): ${errorText.substring(0, 200)}`);
  }

  // Content-Type 확인
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    const text = await response.text();
    console.error(`${context} returned non-JSON:`, text.substring(0, 500));
    throw new Error(`Meta API가 JSON이 아닌 응답을 반환했습니다: ${text.substring(0, 100)}`);
  }

  // JSON 파싱
  try {
    const result = await response.json();

    // Meta API 에러 체크
    if (result.error) {
      const errorMsg = result.error.error_user_msg || result.error.message || "Unknown error";
      console.error(`${context} Meta API error:`, result.error);
      throw new Error(`Meta API 오류: ${errorMsg}`);
    }

    return result;
  } catch (error) {
    if (error instanceof SyntaxError) {
      const text = await response.text();
      console.error(`${context} JSON parse error:`, text.substring(0, 500));
      throw new Error(`응답을 파싱할 수 없습니다: ${text.substring(0, 100)}`);
    }
    throw error;
  }
}
