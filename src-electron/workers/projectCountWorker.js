require("module").Module._initPaths();

const { glob } = require("glob");
const path = require("path");
const { parentPort } = require("worker_threads");

parentPort.on("message", async (folderPath) => {
  try {
    // node_modules를 제외하고 .env로 시작하는 모든 파일 검색
    const envFiles = glob.sync(path.join(folderPath, "./**/.env*"), {
      ignore: [`${folderPath}/**/node_modules/**`],
    });

    // .env 파일들의 디렉토리 경로만 추출하고 중복 제거
    const projectDirs = [
      ...new Set(envFiles.map((file) => path.dirname(file))),
    ];

    parentPort.postMessage({
      success: true,
      count: projectDirs.length,
      list: projectDirs,
    });
  } catch (error) {
    parentPort.postMessage({ success: false, error: error.message, list: [] });
  }
});
