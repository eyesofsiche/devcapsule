import { checkGitStatus, pullEnvs } from "./gitRepo.js";

// Git 동기화 매니저 (싱글톤)
class GitSyncManager {
  constructor() {
    this.intervalId = null;
    this.intervalMs = 5 * 60 * 1000; // 5분
    this.isRunning = false;
  }

  // 주기적 체크 시작
  start() {
    if (this.isRunning) {
      console.log("⚠️ Git 동기화 매니저 이미 실행 중");
      return;
    }

    console.log("🔄 Git 동기화 매니저 시작 (5분마다)");
    this.isRunning = true;
    this._scheduleNext();
  }

  // 타이머 중지
  stop() {
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log("⏸️ Git 동기화 매니저 중지");
  }

  // 타이머 리셋 (Push 후 호출)
  reset() {
    if (!this.isRunning) {
      return;
    }

    console.log("🔄 Git 동기화 타이머 리셋");

    // 기존 타이머 취소
    if (this.intervalId) {
      clearTimeout(this.intervalId);
    }

    // 새 타이머 시작
    this._scheduleNext();
  }

  // 다음 체크 예약
  _scheduleNext() {
    this.intervalId = setTimeout(async () => {
      await this._checkAndPull();
      this._scheduleNext(); // 다음 체크 예약
    }, this.intervalMs);
  }

  // 원격 체크 및 Pull
  async _checkAndPull() {
    try {
      console.log("📡 [GitSyncManager] 원격 저장소 체크 중...");
      const gitCheck = await checkGitStatus();

      if (gitCheck.hasChanges) {
        console.log("📥 [GitSyncManager] 변경사항 감지 - Pull 시작");
        await pullEnvs();
        console.log("✅ [GitSyncManager] Pull 완료");
      } else {
        console.log("✅ [GitSyncManager] 동기화 상태 유지");
      }
    } catch (err) {
      console.error("❌ [GitSyncManager] 동기화 실패:", err);
    }
  }
}

// 싱글톤 인스턴스
export const gitSyncManager = new GitSyncManager();
