import fs from "fs/promises";
import path from "path";

import { readSection, updateSection, writeSection } from "../db/lowdb/index.js";
import { getUserDataPath } from "../utils/getPath.js";
import { commitAndPushEnvs } from "./gitRepo.js";
import { updateReadmeMD, readReadmeMD } from "./updateReadmeMD.js";
import { addProjectWatcher, removeProjectWatcher } from "./watchingEnv.js";

export async function updateProject(
  {
    id,
    name,
    projectName,
    path,
    isFileExists,
    version,
    description,
    license,
    size,
    git,
    envs,
    envPatterns,
  },
  sync = true
) {
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
    isFileExists: isFileExists ?? existingProject?.isFileExists ?? true,
    version: version ?? existingProject?.version ?? "",
    description: description ?? existingProject?.description ?? "",
    license: license ?? existingProject?.license ?? "",
    size: size ?? existingProject?.size ?? "",
    git: git ?? existingProject?.git ?? "",
    envs: envs ?? existingProject?.envs ?? [],
    envPatterns: envPatterns ?? existingProject?.envPatterns ?? [],
  };

  await updateSection("projects", project);

  if (!sync) return;
  await updateReadmeMD();
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

export async function updateProjectFileExists(
  projectId,
  exists = false,
  clonePath = null
) {
  const projectsDB = await readSection("projects");
  const project = projectsDB.find((p) => p.id === projectId);
  if (project) {
    project.isFileExists = exists;
    if (clonePath) {
      project.path = clonePath;
    }
    if (exists) {
      // watcher 추가
      addProjectWatcher(project);
    } else {
      // watcher 제거
      removeProjectWatcher(project.path, project.envs);
    }
    await updateSection("projects", {
      ...project,
    });
  }
}

export async function syncProjectsWithReadmeMD() {
  const readmeData = await readReadmeMD();
  const projectsDB = await readSection("projects");

  const readmeMap = new Map(readmeData.map((item) => [item.id, item]));
  const updatedProjects = projectsDB.map((project) => {
    const readmeItem = readmeMap.get(project.id);

    if (readmeItem) {
      // ID 일치 → projectName, envs 업데이트
      console.log(`🔄 업데이트: ${project.id}`);
      readmeMap.delete(project.id); // 처리된 항목 제거

      return {
        ...project,
        projectName: readmeItem.projectName,
        envs: readmeItem.envs,
        lastSynced: readmeItem.lastSynced,
      };
    }

    // ID 불일치 → 기존 데이터 유지
    return project;
  });

  // readmeMap에 남은 항목 = projectsDB에 없는 새 프로젝트
  for (const [id, readmeItem] of readmeMap.entries()) {
    console.log(`➕ 새 프로젝트 추가: ${id}`);
    updatedProjects.push({
      id: readmeItem.id,
      name: readmeItem.projectName,
      projectName: readmeItem.projectName,
      path: "", // 기본값 (나중에 채워야 함)
      lastSynced: readmeItem.lastSynced,
      isFileExists: false, // Git에서 온 것이므로 로컬 파일 없음
      version: null,
      description: null,
      license: null,
      size: null,
      git: null,
      envs: readmeItem.envs,
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
        name: "unknown", // README.md에서 업데이트 필요
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

// Git에서 받은 db/projects.json으로 로컬 DB 동기화
export async function syncProjectsFromDB() {
  try {
    const envsBase = path.join(getUserDataPath(), "envs");
    const dbFilePath = path.join(envsBase, "db", "projects.json");

    // db/projects.json 파일 존재 확인
    try {
      await fs.access(dbFilePath);
    } catch {
      console.log("📍 envs/db/projects.json 없음 - 건너뛰기");
      return;
    }

    // Git 백업 DB 읽기
    const fileContent = await fs.readFile(dbFilePath, "utf8");
    const gitProjects = JSON.parse(fileContent);

    // 로컬 DB 읽기
    const localProjects = await readSection("projects");

    // Git DB를 기준으로 병합
    const gitProjectsMap = new Map(gitProjects.map((p) => [p.id, p]));
    const localProjectsMap = new Map(localProjects.map((p) => [p.id, p]));

    const mergedProjects = [];

    // 1. Git DB에 있는 모든 프로젝트 처리
    for (const [id, gitProject] of gitProjectsMap.entries()) {
      const localProject = localProjectsMap.get(id);

      if (localProject) {
        // 둘 다 있음 → Git 데이터로 업데이트 (git, envs 우선)
        console.log(`🔄 업데이트: ${gitProject.projectName}`);
        mergedProjects.push({
          ...localProject, // 로컬 데이터 (path, isFileExists 등)
          projectName: gitProject.projectName, // Git 우선
          name: gitProject.name || localProject.name,
          lastSynced: gitProject.lastSynced, // Git 타임스탬프
          git: gitProject.git, // Git 정보 (중요!)
          envs: gitProject.envs, // Git의 .env 목록
        });
        localProjectsMap.delete(id); // 처리 완료
      } else {
        // Git에만 있음 → 새 프로젝트 추가
        console.log(`➕ 새 프로젝트 추가: ${gitProject.projectName}`);
        mergedProjects.push({
          id: gitProject.id,
          name: gitProject.name,
          projectName: gitProject.projectName,
          path: "", // 로컬 경로 없음 (나중에 복구 시 지정)
          lastSynced: gitProject.lastSynced,
          isFileExists: false, // 아직 로컬에 clone 안됨
          version: null,
          description: null,
          license: null,
          size: null,
          git: gitProject.git, // Git 정보 복원!
          envs: gitProject.envs,
          envPatterns: [],
        });
      }
    }

    // 2. 로컬에만 있는 프로젝트 (Git 백업 안된 것) → 유지
    for (const [id, localProject] of localProjectsMap.entries()) {
      console.log(`📍 로컬 전용: ${localProject.projectName}`);
      mergedProjects.push(localProject);
    }

    // 3. DB 업데이트
    for (const project of mergedProjects) {
      await updateSection("projects", project);
    }

    console.log(`✅ ${gitProjects.length}개 프로젝트 동기화 완료`);
  } catch (err) {
    console.error("❌ syncProjectsFromDB 실패:", err);
  }
}
