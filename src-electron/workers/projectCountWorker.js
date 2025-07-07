require("module").Module._initPaths();

const { glob } = require("glob");
const path = require("path");
const { parentPort } = require("worker_threads");

parentPort.on("message", async (folderPath) => {
  try {
    // package.json 파일을 찾기 위한 glob 패턴
    const pkgFiles = glob.sync(path.join(folderPath, "**/package.json"), {
      ignore: [
        `${folderPath}/**/node_modules/**`,
        `${folderPath}/**/dist/**`,
        `${folderPath}/**/.git/**`,
      ],
    });

    // package.json이 있는 디렉토리 경로만 추출
    let pkgDirs = pkgFiles.map((file) => path.dirname(file));

    // 디렉토리 경로를 경로 깊이 기준으로 정렬 (루트 → 하위)
    pkgDirs.sort((a, b) => a.split(path.sep).length - b.split(path.sep).length);

    // 상위 디렉토리만 유지, 하위 디렉토리는 제거
    const filteredDirs = [];
    for (const dir of pkgDirs) {
      const isSubdir = filteredDirs.some((parent) =>
        dir.startsWith(parent + path.sep)
      );
      if (!isSubdir) {
        filteredDirs.push(dir);
      }
    }

    parentPort.postMessage({
      success: true,
      count: filteredDirs.length,
      list: filteredDirs,
    });
  } catch (error) {
    parentPort.postMessage({ success: false, error: error.message, list: [] });
  }
});
