import { existsSync } from "fs";
import fs from "fs/promises";
import path from "path";

/**
 * 프로젝트의 .devcapsule 파일에서 캐시된 분석 정보를 읽어온다
 * @param {string} projectPath - 프로젝트 폴더 경로
 * @returns {Promise<object|null>} - cache 객체 또는 null
 */
export async function readCacheFromFile(projectPath) {
  console.log("readCacheFromFile called with:", projectPath);
  const devcapsulePath = path.join(projectPath, ".devcapsule");

  if (!existsSync(devcapsulePath)) {
    return null;
  }

  try {
    const raw = await fs.readFile(devcapsulePath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed || null;
  } catch (err) {
    console.error("readCacheFromFile 실패:", err);
    return null;
  }
}
