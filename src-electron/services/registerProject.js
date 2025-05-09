import crypto from "crypto";
import { existsSync } from "fs";
import fs from "fs/promises";
import path from "path";

import { readDB, writeDB } from "../db/lowdb.js";
import { analyzeProject } from "../helpers/analyzeProject.js";

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
    devcapsule.createdAt = new Date().toISOString();
    devcapsule.registeredAt = new Date().toISOString();
  }

  // 3. 분석 및 캐시 갱신
  const analysis = await analyzeProject(folderPath);
  devcapsule.cache = {
    cachedAt: new Date().toISOString(),
    ...analysis,
  };

  await fs.writeFile(
    devcapsulePath,
    JSON.stringify(devcapsule, null, 2),
    "utf8"
  );

  // 4. local DB에 등록
  const db = await readDB();
  const alreadyExists = db.projects?.some((p) => p.id === devcapsule.id);

  if (!alreadyExists) {
    db.projects = db.projects || [];
    db.projects.push({
      id: devcapsule.id,
      name: projectName,
      path: folderPath,
      enabled: true,
      watching: true,
      lastSynced: null,
    });

    // folders list에 경로 제거
    db.folders.forEach((folder) => {
      if (folder.list.includes(folderPath)) {
        folder.list = folder.list.filter((item) => item !== folderPath);
        folder.count -= 1;
      }
    });
    await writeDB(db);
  }

  return {
    success: true,
    id: devcapsule.id,
    path: folderPath,
    fromCache: false,
  };
}
