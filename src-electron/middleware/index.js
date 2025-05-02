import { app } from "electron";
import path from "path";
import { Worker } from "worker_threads";

import { readDB, updateDBSection } from "../db/lowdb";

function getWorkerPath(name) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "workers", name);
  } else {
    return path.resolve(__dirname, `../../src-electron/workers/${name}`);
  }
}

let autoWorker = null;
let isScanCanceled = false;

export const getProjectCount = async (event, folderPath, type = "settings") => {
  if (interval !== null && type !== "init") {
    // 자동 새로고침이 켜져있고, 수동 스캔일 경우 (현재는 감시 폴드 추가시)
    stopAutoProjectCount();
  }
  return new Promise((resolve, reject) => {
    const workerPath = getWorkerPath("projectCountWorker.js");

    try {
      const worker = new Worker(workerPath);
      if (type === "init") {
        autoWorker = worker;
      }

      worker.on("message", (result) => {
        worker.terminate();
        resolve(result);
      });

      worker.on("error", (error) => {
        worker.terminate();
        reject(error);
      });

      worker.on("exit", (code) => {
        if (code !== 0) {
          console.error(`Worker stopped with exit code ${code}`);
        }
      });
      worker.postMessage(folderPath);
    } catch (error) {
      console.error("Failed to create worker:", error);
      reject(error);
    }
  });
};

let isRunningScan = false;
export async function runFullScanFolder(type = "manual") {
  if (isRunningScan) {
    return {
      success: false,
      error: "현재 스캔 중입니다.",
    };
  }
  isRunningScan = true;
  try {
    const db = await readDB();
    const folders = db.folders || [];
    const result = [];

    for (const folder of folders) {
      if (isScanCanceled) {
        // 스캔이 취소된 경우
        isScanCanceled = false;
        isRunningScan = false;
        return {
          success: false,
          error: "스캔이 취소되었습니다.",
        };
      }
      try {
        const projectInfo = await getProjectCount(null, folder.path, type);
        result.push({
          path: folder.path,
          count: projectInfo.count,
          list: projectInfo.list,
        });
      } catch (err) {
        throw new Error("Project count failed");
      }
    }
    isRunningScan = false;
    updateDBSection("folders", result);
    return {
      success: true,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
    };
  }
}

let interval = null;
export async function startAutoProjectCount(type = "init") {
  if (interval) return; // 이미 돌고 있으면 무시
  console.log("📦 Starting Auto Project Count...");

  // 처음 한번 실행
  if (type === "init") {
    isScanCanceled = false;
    isRunningScan = false;
    await runFullScanFolder(type);
  }

  // 5분마다 실행
  interval = setInterval(() => {
    runFullScanFolder(type);
  }, 5 * 60 * 1000);
}

function cancalScan() {
  isScanCanceled = true;
  isRunningScan = false;
  if (autoWorker) {
    autoWorker.terminate();
    autoWorker = null;
  }
}

export function stopAutoProjectCount() {
  // 현재 돌고 있는게 있으면 중지
  cancalScan();

  if (interval) {
    clearInterval(interval);
    interval = null;
    console.log("🛑 Stopped Auto Project Count.");
  }
}
