import fs from "fs/promises";
import path from "path";

import { readSection, updateSection, writeSection } from "../db/lowdb/index.js";
import { getUserDataPath } from "../utils/getPath.js";
import { commitAndPushEnvs } from "./gitRepo.js";
import { updateIndexMD } from "./updateIndexMD.js";
import { readIndexMD } from "./updateIndexMD.js";

export async function updateProject({
  id,
  name,
  projectName,
  path,
  version,
  description,
  license,
  size,
  git,
  envs,
  envPatterns,
}) {
  if (!id) {
    throw new Error("Project id is required.");
  }
  const projectsDB = await readSection("projects");
  const existingProject = projectsDB.find((p) => p.id === id);
  if (!existingProject) {
    if (!path) {
      throw new Error("path is required for new projects.");
    }
    await excludeFolderList(path);
  }

  const project = {
    id,
    name: name ?? existingProject?.name ?? "no title",
    projectName:
      projectName ?? existingProject?.projectName ?? existingProject?.name,
    path: path ?? existingProject?.path ?? "",
    lastSynced: new Date().toISOString(),
    isFileExists: existingProject?.isFileExists ?? true,
    version: version ?? existingProject?.version ?? "",
    description: description ?? existingProject?.description ?? "",
    license: license ?? existingProject?.license ?? "",
    size: size ?? existingProject?.size ?? "",
    git: git ?? existingProject?.git ?? "",
    envs: envs ?? existingProject?.envs ?? [],
    envPatterns: envPatterns ?? existingProject?.envPatterns ?? [],
  };

  await updateSection("projects", project);

  await updateIndexMD();

  // Git 백업
  await commitAndPushEnvs("Updated project: " + project.projectName);
}

export async function excludeFolderList(folderPath) {
  const watchsDB = await readSection("watchs");
  watchsDB.forEach((watchs) => {
    if (watchs.list.includes(folderPath)) {
      watchs.list = watchs.list.filter((item) => item !== folderPath);
      watchs.count -= 1;
    }
  });

  await writeSection("watchs", watchsDB);
}

export async function updateProjectFileExists(projectId, exists = false) {
  const projectsDB = await readSection("projects");
  const project = projectsDB.find((p) => p.id === projectId);
  if (project) {
    project.isFileExists = exists;
  }
  await updateSection("projects", {
    ...project,
  });
  return null;
}

export async function syncProjectsWithIndexMD() {
  const indexData = await readIndexMD();
  const projectsDB = await readSection("projects");

  const indexMap = new Map(indexData.map((item) => [item.id, item]));

  const updatedProjects = projectsDB.map((project) => {
    const indexItem = indexMap.get(project.id);

    if (indexItem) {
      // ID 일치 → projectName, envs 업데이트
      console.log(`🔄 업데이트: ${project.id}`);
      indexMap.delete(project.id); // 처리된 항목 제거

      return {
        ...project,
        projectName: indexItem.projectName,
        envs: indexItem.envs,
        lastSynced: indexItem.lastSynced,
      };
    }

    // ID 불일치 → 기존 데이터 유지
    return project;
  });

  // indexMap에 남은 항목 = projectsDB에 없는 새 프로젝트
  for (const [id, indexItem] of indexMap.entries()) {
    console.log(`➕ 새 프로젝트 추가: ${id}`);
    updatedProjects.push({
      id: indexItem.id,
      name: indexItem.projectName,
      projectName: indexItem.projectName,
      path: "", // 기본값 (나중에 채워야 함)
      lastSynced: indexItem.lastSynced,
      isFileExists: false, // Git에서 온 것이므로 로컬 파일 없음
      version: null,
      description: null,
      license: null,
      size: null,
      git: null,
      envs: indexItem.envs,
      envPatterns: null,
    });
  }

  // 순차적으로 DB 업데이트 (하나씩 완료 후 다음 진행)
  for (const project of updatedProjects) {
    // console.log("✅ 최종 병합 결과:", project);
    await updateSection("projects", {
      ...project,
    });
  }
}

// DB에 없는 파일 폴더를 찾아서 projects DB에 추가
// (Git Pull 후 로컬 DB에 등록 안된 경우)
export async function syncProjectsFromFiles() {
  try {
    const projectsDB = await readSection("projects");
    const envsBase = path.join(getUserDataPath(), "envs");
    const filesDir = path.join(envsBase, "files");

    // files 폴더가 없으면 종료
    try {
      await fs.access(filesDir);
    } catch {
      console.log("📍 files 폴더 없음 - 건너뛰기");
      return;
    }

    const entries = await fs.readdir(filesDir, { withFileTypes: true });

    // DB에 없는 폴더만 필터링
    const missingProjects = entries.filter(
      (entry) =>
        entry.isDirectory() && // 폴더만
        !projectsDB.some((p) => p.id === entry.name) // DB에 없는 것만
    );

    if (missingProjects.length === 0) {
      console.log("📍 DB와 files 폴더 동기화됨");
      return;
    }

    console.log(`📍 DB에 없는 프로젝트 ${missingProjects.length}개 발견`);

    // 각 프로젝트를 DB에 추가
    for (const entry of missingProjects) {
      const projectDir = path.join(filesDir, entry.name);
      const envFiles = await fs.readdir(projectDir, { withFileTypes: true });

      const newProject = {
        id: entry.name,
        name: "unknown", // index.md에서 업데이트 필요
        projectName: "unknown",
        path: "", // 실제 경로는 나중에 사용자가 지정
        lastSynced: new Date().toISOString(), // Pull 시점
        isFileExists: false, // 로컬 경로 없음
        version: null,
        description: null,
        license: null,
        size: null,
        git: null,
        envs: envFiles.filter((f) => f.isFile()).map((f) => f.name),
        envPatterns: null,
      };

      console.log(`➕ DB 추가: ${entry.name}`);
      await updateSection("projects", newProject);
    }

    console.log(`✅ ${missingProjects.length}개 프로젝트 DB 추가 완료`);
  } catch (err) {
    console.error("❌ syncProjectsFromFiles 실패:", err);
  }
}
