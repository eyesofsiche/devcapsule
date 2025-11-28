import crypto from "crypto";
import { existsSync } from "fs";
import fs from "fs/promises";
import path from "path";

import { removeSection } from "../db/lowdb/index.js";
import { analyzeProject } from "../helpers/analyzeProject.js";
import { copyEnv } from "./copyEnv.js";
import { commitAndPushEnvs } from "./gitRepo.js";
import { updateProject } from "./updateProject.js";
import { updateReadmeMD } from "./updateReadmeMD.js";
import { addProjectWatcher } from "./watchingEnv.js";

/**
 * 프로젝트 등록
 * @param {String} folderPath   프로젝트 경로
 * @param {String} projectName  프로젝트 이름
 * @returns
 */
export async function registerProject(folderPath, projectName = "no title") {
  const devcapsuleId = crypto.randomUUID();

  // 분석 및 캐시 갱신
  const analysis = await analyzeProject(folderPath);
  if (analysis.success === false) {
    throw new Error("프로젝트 분석 실패");
  }

  // .env 파일 복사 및 md 파일 업데이트, 실패시 local DB 롤백. env 파일이 없으면 무시
  if (analysis.envs.length > 0) {
    try {
      await copyEnv(folderPath, devcapsuleId, analysis.envs);
    } catch (error) {
      await removeSection("projects", devcapsuleId);
      throw new Error("프로젝트 등록 중 오류 발생: " + error.message);
    }
  }

  const project = {
    id: devcapsuleId,
    projectName,
    name: projectName,
    path: folderPath,
    git: analysis.git,
    envs: analysis.envs,
    envPatterns: analysis.envPatterns,
  };

  // local DB 등록
  await updateProject(project, false);

  // watcher 등록
  addProjectWatcher(project);

  // 후처리: README 업데이트, Git 백업 (비동기 처리)
  postRegisterSideEffects(projectName).catch((err) => {
    console.error("postRegisterSideEffects 실패:", err);
  });

  return {
    success: true,
    id: devcapsuleId,
    path: folderPath,
    fromCache: false,
  };
}

async function postRegisterSideEffects(projectName) {
  try {
    // README.md 파일 업데이트
    await updateReadmeMD();
  } catch (err) {
    console.error("README 업데이트 실패:", err);
  }

  try {
    // Git 백업 (push는 네트워크 상태/락 매니저를 내부에서 처리)
    await commitAndPushEnvs("Registered project: " + projectName);
  } catch (err) {
    console.error("Git 백업 실패:", err);
  }
}
