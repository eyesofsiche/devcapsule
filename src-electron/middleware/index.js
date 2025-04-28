import { glob } from "glob";
import path from "path";

export const getProjectCount = async (event, folderPath) => {
  try {
    // node_modules를 제외하고 .env로 시작하는 모든 파일 검색
    console.log("getProjectCount", folderPath);
    const envFiles = glob.sync(path.join(folderPath, `./**/.env*`), {
      ignore: [`${folderPath}/**/node_modules/**`],
    });

    // .env 파일들의 디렉토리 경로만 추출하고 중복 제거
    const projectDirs = [
      ...new Set(envFiles.map((file) => path.dirname(file))),
    ];

    console.log(projectDirs);
    return { success: true, count: projectDirs.length };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
