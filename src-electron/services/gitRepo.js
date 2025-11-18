import { existsSync } from "fs";
import fs from "fs/promises";
import os from "os";
import path from "path";
import simpleGit from "simple-git";

import { getUserDataPath } from "../utils/getPath.js";
import { readIndexMD, updateIndexMD } from "./updateIndexMD.js";
import {
  syncProjectsWithIndexMD,
  syncProjectsFromFiles,
} from "./updateProject.js";

// DevCapsule 전용 파일 패턴
const ALLOWED_PATTERNS = ["index.md", "files"];
// DevCapsule 전용 브랜치명
const DEVCAPSULE_BRANCH = "devcapsule";

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
    // .git, index.md, files 폴더만 허용
    if (name === ".git" || ALLOWED_PATTERNS.includes(name)) {
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
    if (file === "index.md") {
      // index.md: 타임스탬프 기반 병합
      console.log("⚠️ index.md 충돌 - 타임스탬프 기반 병합");
      await mergeIndexMD(git, envsBase);
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
  await git.commit("Resolve conflicts: merge index.md, use remote for files");
  console.log("✅ 충돌 해결 완료");
}

// index.md 병합: 타임스탬프 기반
async function mergeIndexMD(git, envsBase) {
  try {
    // 1. 로컬 index.md (현재 작업 중)
    const localIndexPath = path.join(envsBase, "index.md");
    const localContent = await fs.readFile(localIndexPath, "utf8");
    const localProjects = await parseIndexMD(localContent);

    // 2. 원격 index.md (origin/devcapsule)
    const remoteContent = await git.show([
      `origin/${DEVCAPSULE_BRANCH}:index.md`,
    ]);
    const remoteProjects = await parseIndexMD(remoteContent);

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

    // 4. DB 업데이트 (syncProjectsWithIndexMD 활용)
    const mergedProjects = Array.from(mergedMap.values());
    await syncProjectsWithIndexMD(mergedProjects);

    // 5. 병합된 데이터로 index.md 재생성
    await updateIndexMD();

    // 6. 충돌 해결 완료 표시
    await git.add("index.md");

    console.log(
      `✅ index.md 병합 완료 (총 ${mergedProjects.length}개 프로젝트)`
    );
  } catch (err) {
    console.error("❌ index.md 병합 실패:", err);
    // 실패 시 원격 우선으로 fallback
    await git.raw(["checkout", "--theirs", "index.md"]);
  }
}

// Markdown 파싱 (readIndexMD와 동일한 로직)
async function parseIndexMD(content) {
  const lines = content.split("\n");
  const projects = [];
  let inTable = false;

  for (const line of lines) {
    if (line.startsWith("|---") || line.startsWith("| ---")) {
      inTable = true;
      continue;
    }

    if (inTable && line.startsWith("|")) {
      const columns = line
        .split("|")
        .map((col) => col.trim())
        .filter((col) => col);

      if (columns.length >= 2) {
        const projectName = columns[0].replace(/`/g, "").trim();
        const id = columns[1].replace(/`/g, "").trim();
        const lastSynced =
          columns.length >= 3 && columns[2]
            ? new Date(columns[2]).toISOString()
            : new Date().toISOString();

        const envs = [];
        if (columns.length >= 4 && columns[3]) {
          const linkPattern = /\[(.+?)\s보기\]\(\.\/files\/[^\/]+\/([^)]+)\)/g;
          let match;
          while ((match = linkPattern.exec(columns[3])) !== null) {
            envs.push(match[2]);
          }
        }

        if (projectName && id) {
          projects.push({ id, projectName, envs, lastSynced });
        }
      }
    }
  }

  return projects;
}

// 동기화 작업: index.md ↔ DB ↔ files/
async function syncLocalData() {
  await syncProjectsWithIndexMD(); // index.md → DB
  await syncProjectsFromFiles(); // files/ → DB
  await updateIndexMD(); // DB → index.md
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
      // 원격에 devcapsule 브랜치 없음 - 로컬 데이터로 새로 생성
      console.log(`📍 ${DEVCAPSULE_BRANCH} orphan 브랜치 생성 (로컬 → 원격)`);

      await git.raw(["checkout", "--orphan", DEVCAPSULE_BRANCH]);
      await git.raw(["rm", "-rf", "."]).catch(() => {});

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
    await git.push("origin", DEVCAPSULE_BRANCH);

    console.log("✅ Git 저장소 동기화 완료");
    return { success: true };
  } catch (err) {
    console.error("❌ Git 저장소 설정 실패:", err);
    return { success: false, error: err.message };
  }
}

// envs 백업 디렉토리의 변경사항을 커밋하고 push
export async function commitAndPushEnvs(message = "Update envs") {
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

    // 현재 브랜치 확인 (안전장치)
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
    await git.push("origin", DEVCAPSULE_BRANCH);

    console.log("✅ Commit & Push 완료");
    return { success: true };
  } catch (err) {
    console.error("❌ Commit & Push 실패:", err);
    return { success: false, error: err.message };
  }
}

// envs 백업 디렉토리의 원격 변경사항을 pull
export async function pullEnvs() {
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

    // 현재 브랜치 확인 (안전장치)
    await currentBranchCheck(git);

    // 로컬 변경사항 확인
    const status = await git.status();
    if (status.files.length > 0) {
      console.log("⚠️ 로컬 변경사항 있음 - 자동 커밋");
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
    let hasChanges = false;
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
      await git.push("origin", DEVCAPSULE_BRANCH);
      console.log("✅ Push 완료");
    }

    console.log("✅ Pull 완료");
    return { success: true };
  } catch (err) {
    console.error("❌ Pull 실패:", err);
    return { success: false, error: err.message };
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
