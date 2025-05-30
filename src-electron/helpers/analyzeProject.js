import fastFolderSize from "fast-folder-size";
import fg from "fast-glob";
import { existsSync } from "fs";
import fs from "fs/promises";
import path from "path";

import { getGitInfo } from "../helpers/git.js";

async function getEnvPatterns(folderPath) {
  const gitignorePath = path.join(folderPath, ".gitignore");
  if (!existsSync(gitignorePath)) {
    return [];
  }

  const content = await fs.readFile(gitignorePath, "utf8");
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        !line.startsWith("#") &&
        (line === ".env" || line.startsWith(".env"))
    );
}

async function findEnvFiles(folderPath, patterns) {
  if (patterns.length === 0) {
    // gitignore에 env 관련 패턴이 없으면 .env 파일은 백업하지 않음.
    return [];
  }
  // fast-glob으로 실제 존재하는 파일만 가져오기
  return fg(patterns, {
    cwd: folderPath,
    dot: true,
    onlyFiles: true,
  });
}

export async function analyzeProject(projectPath) {
  const result = {
    success: true,
    path: projectPath,
    name: null,
    version: null,
    description: null,
    license: null,
    git: null,
    size: null,
  };

  const readJson = async (filePath) => {
    try {
      const content = await fs.readFile(filePath, "utf8");
      return JSON.parse(content);
    } catch {
      return null;
    }
  };

  // 백업할 .env 파일 찾기
  const envPatterns = await getEnvPatterns(projectPath);
  const envFiles = await findEnvFiles(projectPath, envPatterns);
  result.envs = envFiles;

  // package 정보
  const pkgPath = path.join(projectPath, "package.json");
  if (existsSync(pkgPath)) {
    const pkg = await readJson(pkgPath);
    if (pkg) {
      result.name = pkg.name || null;
      result.version = pkg.version || null;
      result.description = pkg.description || null;
      result.license = pkg.license || null;
    }
  }

  // git 정보
  result.git = await getGitInfo(projectPath);

  // 용량 체크
  result.size = await new Promise((resolve) => {
    fastFolderSize(projectPath, (err, bytes) => {
      if (err) resolve(null);
      else resolve((bytes / 1024 / 1024).toFixed(1) + " MB");
    });
  });

  return result;
}
