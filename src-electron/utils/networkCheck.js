import { net } from "electron";

/**
 * 범용 네트워크 연결 확인 (Electron net 모듈 사용)
 * @param {string[]} urls - 체크할 URL 목록 (기본: 여러 안정적인 서버들)
 * @param {number} timeout - 타임아웃 (기본: 5000ms)
 * @returns {Promise<boolean>} 네트워크 연결 가능 여부
 */
export async function checkNetworkConnection(
  urls = [
    "https://www.cloudflare.com", // Cloudflare (글로벌 CDN)
    "https://www.github.com", // GitHub (개발자 친화적)
    "https://www.microsoft.com", // Microsoft (기업 환경)
  ],
  timeout = 5000
) {
  // 여러 URL 중 하나라도 성공하면 온라인으로 판단
  const checkPromises = urls.map((url) => checkSingleUrl(url, timeout));

  try {
    // Promise.any: 하나라도 성공하면 true 반환
    await Promise.any(checkPromises);
    return true;
  } catch (err) {
    // 모든 요청이 실패한 경우
    console.log("⚠️ 네트워크 연결 없음 - 오프라인 모드");
    return false;
  }
}

/**
 * 단일 URL 네트워크 체크 (내부 헬퍼)
 */
function checkSingleUrl(url, timeout) {
  return new Promise((resolve, reject) => {
    const request = net.request({
      method: "HEAD",
      url: url,
    });

    const timeoutId = setTimeout(() => {
      request.abort();
      reject(new Error(`Timeout: ${url}`));
    }, timeout);

    request.on("response", (response) => {
      clearTimeout(timeoutId);
      // 2xx, 3xx 응답이면 네트워크 연결 OK
      if (response.statusCode >= 200 && response.statusCode < 400) {
        resolve(true);
      } else {
        reject(new Error(`HTTP ${response.statusCode}`));
      }
    });

    request.on("error", (error) => {
      clearTimeout(timeoutId);
      reject(error);
    });

    request.end();
  });
}

/**
 * Git 원격 저장소 연결 확인
 * @param {import('simple-git').SimpleGit} git - simple-git 인스턴스
 * @param {string} branch - 체크할 브랜치
 * @param {number} timeout - 타임아웃 (기본: 5000ms)
 * @returns {Promise<boolean>} Git 원격 저장소 접근 가능 여부
 */
export async function checkGitRemoteConnection(git, branch, timeout = 5000) {
  try {
    await git.raw(["ls-remote", "--exit-code", "--heads", "origin", branch], {
      timeout,
    });
    return true;
  } catch (err) {
    if (
      err.message?.includes("timed out") ||
      err.message?.includes("Could not resolve host") ||
      err.message?.includes("Failed to connect") ||
      err.message?.includes("Network is unreachable")
    ) {
      console.log("⚠️ Git 원격 저장소 연결 없음");
      return false;
    }
    // 다른 에러 (인증 실패 등)는 네트워크 문제가 아님
    return true;
  }
}
