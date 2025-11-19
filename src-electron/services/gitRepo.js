import { existsSync } from "fs";
import fs from "fs/promises";
import os from "os";
import path from "path";
import simpleGit from "simple-git";

import { getUserDataPath } from "../utils/getPath.js";
import { checkGitRemoteConnection } from "../utils/networkCheck.js";
import { updateIndexMD } from "./updateIndexMD.js";
import { syncProjectsFromDB } from "./updateProject.js";

// DevCapsule 전용 파일 패턴
const ALLOWED_PATTERNS = [".git", "db", "index.md", "files"];
// DevCapsule 전용 브랜치명
const DEVCAPSULE_BRANCH = "devcapsule";

// Git 작업 락 (동시 실행 방지)
let gitOperationLock = false;
const gitOperationQueue = [];

// 락 획득 대기
async function acquireLock(operationName) {
  return new Promise((resolve) => {
    if (!gitOperationLock) {
      gitOperationLock = true;
      console.log(`🔒 [${operationName}] Git 락 획득`);
      resolve();
    } else {
      console.log(`⏳ [${operationName}] 대기 중... (다른 Git 작업 진행 중)`);
      gitOperationQueue.push({ operationName, resolve });
    }
  });
}

// 락 해제
function releaseLock(operationName) {
  console.log(`🔓 [${operationName}] Git 락 해제`);

  if (gitOperationQueue.length > 0) {
    const next = gitOperationQueue.shift();
    gitOperationLock = true;
    console.log(`🔒 [${next.operationName}] Git 락 획득 (대기에서)`);
    next.resolve();
  } else {
    gitOperationLock = false;
  }
}

async function currentBranchCheck(git) {
  const currentBranch = await git.revparse(["--abbrev-ref", "HEAD"]);
  if (currentBranch !== DEVCAPSULE_BRANCH) {
    console.log(
      `⚠️ 현재 브랜치: ${currentBranch} → ${DEVCAPSULE_BRANCH}로 전환`
    );
    await git.checkout(DEVCAPSULE_BRANCH);
  }
}

// 허용되지 않은 파일들 삭제 (보안)
async function cleanUnauthorizedFiles(envsBase) {
  const entries = await fs.readdir(envsBase, { withFileTypes: true });
  const removed = [];

  for (const entry of entries) {
    const name = entry.name;
    // 허용된 파일/폴더만 유지
    if (ALLOWED_PATTERNS.includes(name)) {
      continue;
    }

    const fullPath = path.join(envsBase, name);
    await fs.rm(fullPath, { recursive: true, force: true });
    removed.push(name);
    console.log(`🗑️  unauthorized 파일 삭제: ${name}`);
  }

  return removed;
}

// 충돌 해결: 파일별 전략
async function resolveConflicts(git, envsBase) {
  const status = await git.status();
  console.log(`📍 충돌 파일: ${status.conflicted.join(", ")}`);

  for (const file of status.conflicted) {
    if (file === "db/projects.json") {
      // db/projects.json: 타임스탬프 기반 병합 (가장 중요!)
      console.log("⚠️ db/projects.json 충돌 - 타임스탬프 기반 병합");
      await mergeProjectsDB(git, envsBase);
    } else if (file === "index.md") {
      // index.md: 로컬 버전 (나중에 DB 기준으로 재생성됨)
      console.log("⚠️ index.md 충돌 - 로컬 유지 (DB 기준 재생성 예정)");
      await git.raw(["checkout", "--ours", file]);
    } else if (file.startsWith("files/")) {
      // .env 파일: 원격 우선 (다른 PC가 최신)
      console.log(`⚠️ ${file} 충돌 - 원격 버전 선택 (최신)`);
      await git.raw(["checkout", "--theirs", file]);
    } else {
      // 기타 파일: 원격 우선 (안전)
      console.log(`⚠️ ${file} 충돌 - 원격 버전 선택`);
      await git.raw(["checkout", "--theirs", file]);
    }
  }

  await git.add(".");
  await git.commit("Resolve conflicts: merge db/projects.json");
  console.log("✅ 충돌 해결 완료");
}

// db/projects.json 병합: 타임스탬프 기반
async function mergeProjectsDB(git, envsBase) {
  try {
    // 1. 로컬 db/projects.json
    const localDBPath = path.join(envsBase, "db", "projects.json");
    const localContent = await fs.readFile(localDBPath, "utf8");
    const localProjects = JSON.parse(localContent);

    // 2. 원격 db/projects.json
    const remoteContent = await git.show([
      `origin/${DEVCAPSULE_BRANCH}:db/projects.json`,
    ]);
    const remoteProjects = JSON.parse(remoteContent);

    // 3. 타임스탬프 기반 병합
    const mergedMap = new Map();

    // 로컬 프로젝트 추가
    for (const proj of localProjects) {
      mergedMap.set(proj.id, proj);
    }

    // 원격 프로젝트 병합 (더 최신이면 덮어쓰기)
    for (const proj of remoteProjects) {
      const existing = mergedMap.get(proj.id);
      if (!existing) {
        // 원격에만 있음 → 추가
        mergedMap.set(proj.id, proj);
        console.log(`  → ${proj.projectName}: 원격 프로젝트 추가`);
      } else {
        // 둘 다 있음 → 타임스탬프 비교
        const localTime = new Date(existing.lastSynced).getTime();
        const remoteTime = new Date(proj.lastSynced).getTime();

        if (remoteTime > localTime) {
          console.log(
            `  → ${proj.projectName}: 원격이 더 최신 (${proj.lastSynced})`
          );
          mergedMap.set(proj.id, proj);
        } else {
          console.log(
            `  → ${proj.projectName}: 로컬 유지 (${existing.lastSynced})`
          );
        }
      }
    }

    // 4. 병합된 데이터로 db/projects.json 재생성
    const mergedProjects = Array.from(mergedMap.values());
    await fs.writeFile(
      localDBPath,
      JSON.stringify(mergedProjects, null, 2),
      "utf8"
    );

    // 5. 충돌 해결 완료 표시
    await git.add("db/projects.json");

    console.log(
      `✅ db/projects.json 병합 완료 (총 ${mergedProjects.length}개 프로젝트)`
    );
  } catch (err) {
    console.error("❌ db/projects.json 병합 실패:", err);
    // 실패 시 원격 우선으로 fallback
    await git.raw(["checkout", "--theirs", "db/projects.json"]);
  }
}

// 동기화 작업: db/projects.json → DB → index.md
async function syncLocalData() {
  await syncProjectsFromDB(); // envs/db/projects.json → DB (최우선!)
  await updateIndexMD(); // DB → index.md (DB 기준으로 재생성)
}

// Git 저장소 설정 및 원격과 동기화
export async function settingGitRepo(gitPath) {
  try {
    const envsBase = path.join(getUserDataPath(), "envs");
    const git = simpleGit({ baseDir: envsBase });
    const gitDir = path.join(envsBase, ".git");

    // Git 저장소 초기화 (devcapsule 브랜치로 시작)
    if (!existsSync(gitDir)) {
      console.log("📍 로컬 Git 저장소 초기화 (devcapsule 브랜치)");
      await git.init();
      await git.raw(["checkout", "-b", DEVCAPSULE_BRANCH]);

      // 빈 커밋 생성 (브랜치를 실제로 생성하기 위해)
      await git.commit("Initialize devcapsule branch", {
        "--allow-empty": null,
      });
    }

    // Remote 설정
    console.log("📍 원격 저장소 설정");
    const remotes = await git.getRemotes();
    if (remotes.find((r) => r.name === "origin")) {
      await git.removeRemote("origin");
    }
    await git.addRemote("origin", gitPath);

    // 원격 저장소 fetch
    console.log("📍 원격 저장소 확인");
    await git.fetch("origin").catch(() => {
      // 빈 저장소면 fetch 실패 - 무시
    });

    // 원격 브랜치 확인
    const branches = await git.branch(["-r"]).catch(() => ({ all: [] }));
    const remoteBranches = branches.all.filter((b) => b.includes("origin/"));
    const hasDevCapsuleBranch = remoteBranches.some((b) =>
      b.includes(`origin/${DEVCAPSULE_BRANCH}`)
    );

    if (!hasDevCapsuleBranch) {
      // 원격에 devcapsule 브랜치 없음 - 로컬 데이터를 원격으로 Push
      console.log(`📍 ${DEVCAPSULE_BRANCH} 브랜치 Push (로컬 → 원격)`);

      // 이미 devcapsule 브랜치에 있으므로 바로 add & commit & push
      await git.add(".");
      await git.commit("Initial DevCapsule envs backup", {
        "--allow-empty": null,
      });
      await git.push("origin", DEVCAPSULE_BRANCH, { "--set-upstream": null });

      console.log("✅ Git 저장소 연결 완료 (로컬 데이터 Push)");
      return { success: true };
    }

    // 원격에 devcapsule 브랜치 있음 - Pull 우선!
    console.log(`📍 ${DEVCAPSULE_BRANCH} 브랜치 데이터 가져오기 (원격 → 로컬)`);

    // 현재 브랜치 확인
    const currentBranch = await git
      .revparse(["--abbrev-ref", "HEAD"])
      .catch(() => "");

    if (currentBranch !== DEVCAPSULE_BRANCH) {
      console.log(`📍 ${DEVCAPSULE_BRANCH} 브랜치로 전환`);

      // 로컬 파일 백업 (충돌 방지)
      const status = await git.status();
      if (status.files.length > 0) {
        console.log("⚠️ 로컬 파일 임시 커밋");
        await git.add(".");
        await git.commit("Temp commit before checkout");
      }

      // 원격 브랜치 기반으로 로컬 브랜치 생성
      await git.checkoutBranch(
        DEVCAPSULE_BRANCH,
        `origin/${DEVCAPSULE_BRANCH}`
      );
    }

    // 로컬 변경사항 있으면 먼저 커밋 (Pull 충돌 방지)
    const statusBeforePull = await git.status();
    if (statusBeforePull.files.length > 0) {
      console.log("⚠️ 로컬 변경사항 감지 - 먼저 커밋");
      await git.add(".");
      await git.commit("Save local changes before pull");
    }

    // Pull (최신 원격 데이터 가져오기)
    console.log("📥 Pull 시작 (최신 원격 데이터)");
    try {
      await git.pull("origin", DEVCAPSULE_BRANCH, {
        "--no-edit": null,
        "--rebase": "false",
        "--allow-unrelated-histories": null,
      });
    } catch (pullErr) {
      // 충돌 발생 시 파일별 전략으로 해결
      if (pullErr.message && pullErr.message.includes("CONFLICT")) {
        console.log("⚠️ 충돌 발생 - 파일별 전략으로 해결");
        await resolveConflicts(git, envsBase);
      } else {
        throw pullErr; // 다른 에러는 상위로 전달
      }
    }

    console.log("✅ 원격 데이터 다운로드 완료");

    // 보안: 허용되지 않은 파일 정리
    const removed = await cleanUnauthorizedFiles(envsBase);
    if (removed.length > 0) {
      console.log(`⚠️  unauthorized 파일 ${removed.length}개 삭제됨`);
      await git.add(".");
      await git.commit(`Clean unauthorized files: ${removed.join(", ")}`);
    }

    // 최종 동기화 정리 작업
    await syncLocalData();

    // 최종 Push
    await git.add(".");
    await git.commit("Sync with remote", { "--allow-empty": null });
    await git.push("origin", DEVCAPSULE_BRANCH, {
      "--no-verify": null,
    });

    console.log("✅ Git 저장소 동기화 완료");
    return { success: true };
  } catch (err) {
    console.error("❌ Git 저장소 설정 실패:", err);
    return { success: false, error: err.message };
  }
}

// envs 백업 디렉토리의 변경사항을 커밋하고 push
export async function commitAndPushEnvs(message = "Update envs") {
  // 🔒 락 획득 (다른 Git 작업과 충돌 방지)
  await acquireLock("commitAndPushEnvs");

  try {
    const envsBase = path.join(getUserDataPath(), "envs");
    const gitDir = path.join(envsBase, ".git");

    // Git 저장소가 초기화되어 있는지 확인
    if (!existsSync(gitDir)) {
      return {
        success: false,
        error: "Git 저장소가 초기화되지 않았습니다. 먼저 설정을 완료해주세요.",
      };
    }

    const git = simpleGit({ baseDir: envsBase });

    // 네트워크 연결 확인
    const isOnline = await checkGitRemoteConnection(git, DEVCAPSULE_BRANCH);
    if (!isOnline) {
      console.log("⚠️ 오프라인 모드 - Git 작업 스킵");
      return {
        success: false,
        offline: true,
        message: "네트워크 연결이 없습니다. 온라인일 때 자동으로 동기화됩니다.",
      };
    }

    // 🔐 현재 브랜치 확인 (안전장치)
    await currentBranchCheck(git);

    // Pull 먼저 (원격 최신 상태 확보)
    console.log("📥 Pull 시작 (최신 원격 데이터)");
    try {
      await git.pull("origin", DEVCAPSULE_BRANCH, {
        "--no-edit": null,
        "--rebase": "false",
        "--allow-unrelated-histories": null,
      });
    } catch (pullErr) {
      // 충돌 발생 시 파일별 전략으로 해결
      if (pullErr.message && pullErr.message.includes("CONFLICT")) {
        console.log("⚠️ 충돌 발생 - 파일별 전략으로 해결");
        await resolveConflicts(git, envsBase);
      } else {
        throw pullErr; // 다른 에러는 상위로 전달
      }
    }

    console.log("✅ 원격 데이터 다운로드 완료");

    // 보안: 허용되지 않은 파일 정리
    const removed = await cleanUnauthorizedFiles(envsBase);
    if (removed.length > 0) {
      console.log(`⚠️  unauthorized 파일 ${removed.length}개 삭제됨`);
      await git.add(".");
      await git.commit(`Clean unauthorized files: ${removed.join(", ")}`);
    }

    // 최종 동기화 정리 작업
    await syncLocalData();

    // 변경사항 확인
    const status = await git.status();
    if (status.files.length === 0) {
      console.log("📍 변경사항 없음");
      return { success: true, message: "변경사항이 없습니다." };
    }

    console.log(`📍 변경된 파일: ${status.files.length}개`);

    // 모든 파일 추가
    await git.add(".");

    // 커밋
    console.log(`📍 커밋: ${message}`);
    await git.commit(message);

    // Push
    console.log(`📍 Push 시작 (${DEVCAPSULE_BRANCH})`);
    await git.push("origin", DEVCAPSULE_BRANCH, {
      "--no-verify": null, // pre-push hook 스킵
    });

    console.log("✅ Commit & Push 완료");

    // 🔄 타이머 리셋 (Push 완료 후)
    try {
      const { gitSyncManager } = await import("./gitSyncManager.js");
      gitSyncManager.reset();
    } catch (err) {
      // gitSyncManager가 없어도 무시 (초기화 전일 수 있음)
    }

    return { success: true };
  } catch (err) {
    console.error("❌ Commit & Push 실패:", err);

    // Push는 성공했지만 워킹 트리 업데이트 실패 시 (실제로는 성공)
    if (err.message && err.message.includes("fast-forward")) {
      console.log("⚠️ Push는 성공했지만 워킹 트리 경고 발생 (무시)");

      // 타이머 리셋 (Push는 성공했으므로)
      try {
        const { gitSyncManager } = await import("./gitSyncManager.js");
        gitSyncManager.reset();
      } catch {}

      return { success: true };
    }

    return { success: false, error: err.message };
  } finally {
    // 🔓 락 해제 (다음 작업 허용)
    releaseLock("commitAndPushEnvs");
  }
}

// envs 백업 디렉토리의 원격 변경사항을 pull
export async function pullEnvs() {
  // 🔒 락 획득 (다른 Git 작업과 충돌 방지)
  await acquireLock("pullEnvs");

  try {
    const envsBase = path.join(getUserDataPath(), "envs");
    const gitDir = path.join(envsBase, ".git");

    // Git 저장소가 초기화되어 있는지 확인
    if (!existsSync(gitDir)) {
      return {
        success: false,
        error: "Git 저장소가 초기화되지 않았습니다. 먼저 설정을 완료해주세요.",
      };
    }

    const git = simpleGit({ baseDir: envsBase });

    // 네트워크 연결 확인
    const isOnline = await checkGitRemoteConnection(git, DEVCAPSULE_BRANCH);
    if (!isOnline) {
      console.log("⚠️ 오프라인 모드 - Git 작업 스킵");
      return {
        success: false,
        offline: true,
        message: "네트워크 연결이 없습니다. 온라인일 때 자동으로 동기화됩니다.",
      };
    }

    // 현재 브랜치 확인 (안전장치)
    await currentBranchCheck(git);

    let hasChanges = false;

    // 로컬 변경사항 확인
    const status = await git.status();
    if (status.files.length > 0) {
      console.log("⚠️ 로컬 변경사항 있음 - 자동 커밋");
      hasChanges = true;
      await git.add(".");
      await git.commit("Auto commit before pull");
    }

    // Pull
    console.log("📥 Pull 시작 (최신 원격 데이터)");
    try {
      await git.pull("origin", DEVCAPSULE_BRANCH, {
        "--no-edit": null,
        "--rebase": "false",
        "--allow-unrelated-histories": null,
      });
    } catch (pullErr) {
      // 충돌 발생 시 파일별 전략으로 해결
      if (pullErr.message && pullErr.message.includes("CONFLICT")) {
        console.log("⚠️ 충돌 발생 - 파일별 전략으로 해결");
        await resolveConflicts(git, envsBase);
      } else {
        throw pullErr; // 다른 에러는 상위로 전달
      }
    }

    console.log("✅ 원격 데이터 다운로드 완료");

    // 보안: 허용되지 않은 파일 정리
    const removed = await cleanUnauthorizedFiles(envsBase);
    if (removed.length > 0) {
      console.log(`⚠️  unauthorized 파일 ${removed.length}개 삭제됨`);
      hasChanges = true;
      await git.add(".");
      await git.commit(`Clean unauthorized files: ${removed.join(", ")}`);
    }

    // 최종 동기화 정리 작업
    await syncLocalData();

    const statusAfterSync = await git.status();
    if (statusAfterSync.files.length > 0) {
      hasChanges = true;
      await git.add(".");
      await git.commit("Sync local data changes");
    }

    // 변경사항이 있었다면 push
    if (hasChanges) {
      await git.push("origin", DEVCAPSULE_BRANCH, {
        "--no-verify": null,
      });
      console.log("✅ Push 완료");
    }

    console.log("✅ Pull 완료");
    return { success: true };
  } catch (err) {
    console.error("❌ Pull 실패:", err);
    return { success: false, error: err.message };
  } finally {
    // 🔓 락 해제 (다음 작업 허용)
    releaseLock("pullEnvs");
  }
}

// 설정 전에 미리 테스트
export async function testGitConnection(gitPath) {
  const tempDir = path.join(os.tmpdir(), `git-test-${Date.now()}`);

  try {
    console.log(tempDir);
    await fs.mkdir(tempDir, { recursive: true });

    const git = simpleGit({ baseDir: tempDir });
    await git.init();
    await git.addRemote("origin", gitPath);
    await git.fetch("origin", { "--dry-run": null }); // 실제 다운로드 없이 테스트
    return { success: true };
  } catch (err) {
    console.log("error????", err);

    // simple-git 에러 객체 구조: err.message가 비어있고 실제 메시지는 다른 곳에
    const errorMessage = err.message || err.toString() || "알 수 없는 에러";

    return {
      success: false,
      error: errorMessage,
      errorType: errorMessage.toLowerCase().includes("git")
        ? "GIT_NOT_FOUND"
        : errorMessage.toLowerCase().includes("authentication") ||
          errorMessage.toLowerCase().includes("access")
        ? "AUTH_FAILED"
        : "UNKNOWN",
    };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

// 원격 저장소에 변경사항이 있는지 확인
export async function checkGitStatus() {
  try {
    const envsBase = path.join(getUserDataPath(), "envs");
    const gitDir = path.join(envsBase, ".git");

    // Git 저장소가 초기화되어 있는지 확인
    if (!existsSync(gitDir)) {
      return {
        success: false,
        hasChanges: false,
        error: "Git 저장소가 초기화되지 않았습니다.",
      };
    }

    const git = simpleGit({ baseDir: envsBase });

    // 현재 브랜치 확인 (안전장치)
    await currentBranchCheck(git);

    // 로컬 커밋
    const localCommit = await git.revparse([DEVCAPSULE_BRANCH]);

    // 원격 커밋 (ls-remote - fetch보다 훨씬 빠름!)
    console.log("📡 원격 저장소 상태 확인 중...");
    const remoteRefs = await git.listRemote([
      "--heads",
      "origin",
      `refs/heads/${DEVCAPSULE_BRANCH}`,
    ]);

    if (!remoteRefs) {
      // 원격 브랜치가 없음
      console.log("⚠️ 원격에 devcapsule 브랜치가 없습니다.");
      return { success: true, hasChanges: false };
    }

    // "abc1234567890...\trefs/heads/devcapsule\n" 형식에서 커밋 해시 추출
    const remoteCommit = remoteRefs.split("\t")[0].trim();

    const hasChanges = localCommit !== remoteCommit;

    if (hasChanges) {
      console.log("📥 원격 저장소에 새로운 변경사항이 있습니다.");
      console.log(`  로컬: ${localCommit.substring(0, 7)}`);
      console.log(`  원격: ${remoteCommit.substring(0, 7)}`);
    } else {
      console.log("✅ 원격 저장소와 동기화 상태입니다.");
    }

    return { success: true, hasChanges };
  } catch (err) {
    console.error("❌ Git 상태 확인 실패:", err);
    return { success: false, hasChanges: false, error: err.message };
  }
}
