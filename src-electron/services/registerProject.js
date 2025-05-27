import crypto from "crypto";
import { existsSync } from "fs";
import fs from "fs/promises";
import path from "path";

import { removeSection } from "../db/lowdb/index.js";
import { analyzeProject } from "../helpers/analyzeProject.js";
import { copyEnv } from "./copyEnv.js";
import { updateIndexMD } from "./updateIndexMD.js";
import { updateProject } from "./updateProject.js";

/**
 * 프로젝트 등록
 * @param {String} folderPath   프로젝트 경로
 * @param {String} projectName  프로젝트 이름
 * @returns
 */
export async function registerProject(folderPath, projectName = "no title") {
  const devcapsulePath = path.join(folderPath, ".devcapsule");

  // 1. 기존 파일 로드 or 새로 생성
  let devcapsule = {};
  if (existsSync(devcapsulePath)) {
    try {
      const raw = await fs.readFile(devcapsulePath, "utf8");
      devcapsule = JSON.parse(raw);
    } catch {
      console.error("⚠️ .devcapsule 파싱 실패");
      devcapsule = {};
    }
  }

  // 2. ID 없는 경우 새로 생성
  if (!devcapsule.id) {
    devcapsule.id = crypto.randomUUID();
  }

  // 3. 분석 및 캐시 갱신
  const analysis = await analyzeProject(folderPath);
  if (analysis.success === false) {
    throw new Error("프로젝트 분석 실패");
  }
  analysis.success = undefined;
  devcapsule.cache = {
    ...analysis,
  };

  await fs.writeFile(
    devcapsulePath,
    JSON.stringify(devcapsule, null, 2),
    "utf8"
  );

  // 4. git 정보 추출
  const git = analysis.git.remotes.find((remote) => remote.name === "origin");

  // 6. .env 파일 복사 및 md 파일 업데이트, 실패시 local DB 롤백
  try {
    await copyEnv(folderPath, devcapsule.id, [".env"]);
  } catch (error) {
    await removeSection("projects", devcapsule.id);
    throw new Error("프로젝트 등록 중 오류 발생: " + error.message);
  }

  // 5. local DB에 등록
  await updateProject({
    id: devcapsule.id,
    name: projectName,
    folderPath,
    git: git.url,
  });
  await updateIndexMD();

  return {
    success: true,
    id: devcapsule.id,
    path: folderPath,
    fromCache: false,
  };
}
