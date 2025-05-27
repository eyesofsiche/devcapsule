import fs from "fs/promises";
import path from "path";

import { readSection } from "../db/lowdb";
import { getUserDataPath } from "../utils/userData.js";

export async function updateIndexMD() {
  const indexPath = path.join(getUserDataPath(), "envs/index.md");
  const projectsDB = await readSection("projects");
  const rows = projectsDB.map((proj) => {
    const name = proj.name;
    const id = proj.id;
    const file = proj.envFile || ".env";
    const time = new Date(proj.lastSynced || proj.createdAt).toLocaleString();
    return `| \`${name}\` | ${time} | [보기](./${id}/${file}) |`;
  });
  const content = `# 📦 DevCapsule 프로젝트 목록\n\n| 이름 | 마지막 커밋 | 링크 |\n|------|-------------|------|\n${rows.join(
    "\n"
  )}\n`;
  await fs.writeFile(indexPath, content, "utf8");
}
