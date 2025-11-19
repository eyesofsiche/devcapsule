import fs from "fs/promises";
import path from "path";

import { readSection } from "../db/lowdb";
import { getUserDataPath } from "../utils/getPath.js";

export async function content(projectsDB) {
  try {
    const rows = projectsDB.map((proj) => {
      const projectName = proj.projectName;
      const id = proj.id;
      const time = new Date(proj.lastSynced).toLocaleString();
      const envFiles = [];
      for (const env of proj.envs) {
        envFiles.push(`[${env} 보기](./files/${id}/${env})`);
      }
      const file = envFiles.join("<br>");

      return `| \`${projectName}\` | \`${id}\` | ${time} | ${file} |`;
    });
    return `### 📦 DevCapsule 프로젝트 목록\n\n| 이름 | 아이디 | 마지막 동기화 | 링크 |\n| ------ | ------ | ------------- | ------ |\n${rows.join(
      "\n"
    )}\n`;
  } catch (error) {
    console.error("Error in updateIndexMD:", error);
    return "# 📦 DevCapsule 프로젝트 목록\n\n오류 발생: " + error.message;
  }
}

export async function updateIndexMD() {
  const projectsDB = await readSection("projects");
  const indexPath = path.join(getUserDataPath(), "envs/index.md");
  await fs.writeFile(indexPath, await content(projectsDB), "utf8");

  const projectsPath = path.join(getUserDataPath(), "envs/db/projects.json");
  await fs.mkdir(path.dirname(projectsPath), { recursive: true });
  const projectList = projectsDB.map((project) => {
    const git = {
      remotes: project.git?.remotes || [],
    };
    return {
      id: project.id,
      name: project.name,
      projectName: project.projectName,
      lastSynced: project.lastSynced,
      git,
      envs: project.envs,
    };
  });
  await fs.writeFile(
    projectsPath,
    JSON.stringify(projectList, null, 2),
    "utf8"
  );
}

export async function readIndexMD() {
  try {
    const indexPath = path.join(getUserDataPath(), "envs/index.md");
    const content = await fs.readFile(indexPath, "utf8");

    // Markdown 테이블 파싱
    const lines = content.split("\n");
    const projects = [];

    // 테이블 헤더 이후 줄부터 파싱 (| 이름 | 아이디 | ... 다음 줄부터)
    let inTable = false;
    for (const line of lines) {
      if (line.startsWith("|---") || line.startsWith("| ---")) {
        inTable = true;
        continue;
      }

      if (inTable && line.startsWith("|")) {
        // | `projectName` | `id` | ... | 형식 파싱
        const columns = line
          .split("|")
          .map((col) => col.trim())
          .filter((col) => col);

        if (columns.length >= 2) {
          const projectName = columns[0].replace(/`/g, "").trim(); // `projectName` → projectName
          const id = columns[1].replace(/`/g, "").trim(); // `id` → id

          // lastSynced 파싱: "2025. 5. 27. 오후 3:59:59" 형식을 ISO로 변환
          const lastSynced =
            columns.length >= 3 && columns[2]
              ? new Date(columns[2]).toISOString()
              : new Date().toISOString();

          // envs 파싱: [.env 보기](./files/id/.env)<br>[.env.local 보기]... 형식
          const envs = [];
          if (columns.length >= 4 && columns[3]) {
            // 링크 패턴에서 파일명 추출: [.env 보기](./files/id/.env)
            const linkPattern =
              /\[(.+?)\s보기\]\(\.\/files\/[^\/]+\/([^)]+)\)/g;
            let match;
            while ((match = linkPattern.exec(columns[3])) !== null) {
              envs.push(match[2]); // .env, .env.local 등
            }
          }

          if (projectName && id) {
            projects.push({ id, projectName, envs, lastSynced });
          }
        }
      }
    }

    return projects;
  } catch (error) {
    console.error("Error reading index.md:", error);
    return [];
  }
}
