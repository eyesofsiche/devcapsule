import { existsSync } from "fs";
import fs from "fs/promises";
import os from "os";
import path from "path";
import simpleGit from "simple-git";

import { getUserDataPath } from "../utils/userData.js";

export async function prepareGitAuthScript() {
  const authScriptDir = path.join(getUserDataPath(), "git-auth");
  await fs.mkdir(authScriptDir, { recursive: true });

  const platform = os.platform();

  if (platform === "win32") {
    const bat = `@echo off
echo GitHub 인증을 시작합니다...
gh auth login
pause`;
    await fs.writeFile(path.join(authScriptDir, "auth-github.bat"), bat);
  } else {
    const sh = `#!/bin/bash
echo "GitHub 인증을 시작합니다..."
gh auth login
read -p "엔터를 눌러 종료합니다..."`;
    const filePath = path.join(authScriptDir, "auth-github.sh");
    await fs.writeFile(filePath, sh);
    await fs.chmod(filePath, 0o755); // 실행 권한 부여
  }
}

export async function getGitInfo(folderPath) {
  const gitPath = path.join(folderPath, ".git");
  if (existsSync(gitPath)) {
    try {
      const git = simpleGit({ baseDir: folderPath });
      const remotes = await git.getRemotes(true);
      const status = await git.status();
      const log = await git.log({ n: 1 });

      return {
        currentBranch: status.current,
        isDirty: status.files.length > 0,
        remotes: remotes.map((r) => ({
          name: r.name,
          url: r.refs.fetch,
        })),
        lastCommit: log.latest,
      };
    } catch (error) {
      console.error("Git 정보 가져오기 실패:", error);
      return null;
    }
  } else {
    return null;
  }
}

export async function checkUncommittedChanges(folderPath) {
  const gitPath = path.join(folderPath, ".git");
  if (!existsSync(gitPath)) return null;

  try {
    const git = simpleGit({ baseDir: folderPath });

    const status = await git.status();
    const log = await git.log(["--branches", "--not", "--remotes"]); // 로컬에만 있는 커밋

    return {
      hasUncommittedChanges: status.files.length > 0,
      hasUnpushedCommits: log.total > 0,
    };
  } catch (err) {
    console.error("커밋 상태 확인 실패:", err);
    return null;
  }
}

export async function checkGitAccess(gitUrl) {
  return new Promise((resolve) => {
    exec(`git ls-remote ${gitUrl}`, (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Git 인증 체크 실패:", stderr.trim());
        resolve({ success: false, error: stderr.trim() || error.message });
      } else {
        resolve({ success: true });
      }
    });
  });
}
