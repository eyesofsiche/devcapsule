import { removeSection } from "../db/lowdb/index.js";
import { analyzeProject } from "../helpers/analyzeProject.js";
import { copyEnv } from "./copyEnv.js";
import { commitAndPushEnvs } from "./gitRepo.js";
import { updateProject } from "./updateProject.js";
import { updateReadmeMD } from "./updateReadmeMD.js";
import { addProjectWatcher } from "./watchingEnv.js";

/**
 * 기존 프로젝트 연결
 * @param {*} projectId
 * @param {*} folderPath
 * @returns
 */
export async function connectProject(projectId, folderPath) {
  // 분석 및 캐시 갱신
  const analysis = await analyzeProject(folderPath);
  if (analysis.success === false) {
    throw new Error("프로젝트 분석 실패");
  }

  // .env 파일 복사 및 md 파일 업데이트, 실패시 local DB 롤백. env 파일이 없으면 무시
  if (analysis.envs.length > 0) {
    try {
      await copyEnv(folderPath, projectId, analysis.envs);
    } catch (error) {
      await removeSection("projects", projectId);
      throw new Error("프로젝트 등록 중 오류 발생: " + error.message);
    }
  }

  const project = {
    id: projectId,
    path: folderPath,
    isFileExists: true,

    version: analysis.version,
    description: analysis.description,
    license: analysis.license,
    git: analysis.git,
    size: analysis.size,
    envs: analysis.envs,
    envPatterns: analysis.envPatterns,
  };

  // local DB 등록
  await updateProject(project, false);

  // watcher 등록
  addProjectWatcher(project);

  // 후처리: README 업데이트, Git 백업 (비동기 처리)
  postRegisterSideEffects(analysis.name).catch((err) => {
    console.error("postRegisterSideEffects 실패:", err);
  });

  return {
    success: true,
    id: projectId,
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
    await commitAndPushEnvs("Connect project: " + projectName);
  } catch (err) {
    console.error("Git 백업 실패:", err);
  }
}
