import crypto from "crypto";
import { existsSync } from "fs";
import fs from "fs/promises";
import path from "path";

import { removeSection } from "../db/lowdb/index.js";
import { analyzeProject } from "../helpers/analyzeProject.js";
import { copyEnv } from "./copyEnv.js";
import { updateIndexMD } from "./updateIndexMD.js";
import { updateProject } from "./updateProject.js";
import { addProjectWatcher } from "./watchingEnv.js";

/**
 * 프로젝트 등록
 * @param {String} folderPath   프로젝트 경로
 * @param {String} projectName  프로젝트 이름
 * @returns
 */
export async function registerProject(folderPath, projectName = "no title") {
  const devcapsulePath = path.join(folderPath, ".devcapsule");

  // 기존 파일 로드 or 새로 생성
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

  // ID 없는 경우 새로 생성
  if (!devcapsule.id) {
    devcapsule.id = crypto.randomUUID();
  }

  // 분석 및 캐시 갱신
  const analysis = await analyzeProject(folderPath);
  if (analysis.success === false) {
    throw new Error("프로젝트 분석 실패");
  }

  // devcapsule 파일 생성
  writeDevcapsuleFile(folderPath, devcapsule);

  // .env 파일 복사 및 md 파일 업데이트, 실패시 local DB 롤백. env 파일이 없으면 무시
  if (analysis.envs.length > 0) {
    try {
      await copyEnv(folderPath, devcapsule.id, analysis.envs);
    } catch (error) {
      await removeSection("projects", devcapsule.id);
      throw new Error("프로젝트 등록 중 오류 발생: " + error.message);
    }
  }

  const project = {
    id: devcapsule.id,
    name: projectName,
    folderPath,
    git: analysis.git,
    envs: analysis.envs,
    envPatterns: analysis.envPatterns,
  };

  // local DB 등록
  await updateProject(project);

  // watcher 등록
  addProjectWatcher(project);

  // index.md 파일 업데이트
  await updateIndexMD();

  return {
    success: true,
    id: devcapsule.id,
    path: folderPath,
    fromCache: false,
  };
}

export async function writeDevcapsuleFile(folderPath, devcapsule) {
  const result = {
    id: devcapsule.id,
  };
  const devcapsulePath = path.join(folderPath, ".devcapsule");
  await fs.writeFile(devcapsulePath, JSON.stringify(result, null, 2), "utf8");
}
