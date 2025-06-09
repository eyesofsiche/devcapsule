import fs from "fs/promises";
import path from "path";

import { readSection } from "../db/lowdb";
import { getUserDataPath } from "../utils/getPath.js";

export async function content() {
  try {
    const projectsDB = await readSection("projects");
    const rows = projectsDB.map((proj) => {
      const name = proj.name;
      const id = proj.id;
      const time = new Date(proj.lastSynced).toLocaleString();
      const envFiles = [];
      for (const env of proj.envs) {
        envFiles.push(`[${env} 보기](./${id}/${env})`);
      }
      const file = envFiles.join("<br>");

      return `| \`${name}\` | ${time} | ${file} |`;
    });
    return `# 📦 DevCapsule 프로젝트 목록\n\n| 이름 | 마지막 동기화 | 링크 |\n|------|-------------|------|\n${rows.join(
      "\n"
    )}\n`;
  } catch (error) {
    console.error("Error in updateIndexMD:", error);
    return "# 📦 DevCapsule 프로젝트 목록\n\n오류 발생: " + error.message;
  }
}

export async function updateIndexMD() {
  const indexPath = path.join(getUserDataPath(), "envs/index.md");
  await fs.writeFile(indexPath, await content(), "utf8");
}
