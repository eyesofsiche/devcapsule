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

export const getProjectCount = async (event, folderPath) => {
  return new Promise((resolve, reject) => {
    const workerPath = getWorkerPath("projectCountWorker.js");

    try {
      const worker = new Worker(workerPath);
      console.log("Worker created successfully");

      worker.on("message", (result) => {
        console.log("Worker message received:", result);
        worker.terminate();
        resolve(result);
      });

      worker.on("error", (error) => {
        console.error("Worker error:", error);
        worker.terminate();
        reject(error);
      });

      worker.on("exit", (code) => {
        if (code !== 0) {
          console.error(`Worker stopped with exit code ${code}`);
        }
      });

      console.log("Sending message to worker:", folderPath);
      worker.postMessage(folderPath);
    } catch (error) {
      console.error("Failed to create worker:", error);
      reject(error);
    }
  });
};

let isRunningScan = false;
export async function runFullScanFolder() {
  if (isRunningScan) {
    return {
      success: false,
      error: "이미 스캔 중입니다.",
    };
  }
  isRunningScan = true;
  try {
    const db = await readDB();
    const folders = db.folders || [];
    const result = [];

    for (const folder of folders) {
      try {
        const projectInfo = await getProjectCount(null, folder.path);
        console.log(`Folder ${folder.path}: ${projectInfo} projects found.`);
        result.push({
          path: folder.path,
          count: projectInfo.count,
          list: projectInfo.list,
        });
      } catch (err) {
        console.error("❌ Project count failed:", err);
      }
    }
    updateDBSection("folders", result);
    isRunningScan = false;
    console.log("✅ Project count updated in DB.");
    return {
      success: true,
    };
  } catch (err) {
    console.error("❌ Project count failed:", err);
    return {
      success: false,
      error: err.message,
    };
  }
}

let interval = null;
export async function startAutoProjectCount() {
  if (interval) return; // 이미 돌고 있으면 무시

  console.log("📦 Starting Auto Project Count...");

  // const runScan = async () => {
  //   const db = await readDB();
  //   const folders = db.folders || [];
  //   const result = [];

  //   for (const folder of folders) {
  //     try {
  //       const projectInfo = await getProjectCount(null, folder.path);
  //       console.log(`Folder ${folder.path}: ${projectInfo} projects found.`);
  //       result.push({
  //         path: folder.path,
  //         count: projectInfo.count,
  //         list: projectInfo.list,
  //       });
  //     } catch (err) {
  //       console.error("❌ Project count failed:", err);
  //     }
  //   }
  //   updateDBSection("folders", result);
  //   console.log("✅ Project count updated in DB.");
  // };

  // 처음 한번 실행
  await runFullScanFolder();

  // 5분마다 실행
  interval = setInterval(runFullScanFolder, 5 * 60 * 1000);
}

export function stopAutoProjectCount() {
  if (interval) {
    clearInterval(interval);
    interval = null;
    console.log("🛑 Stopped Auto Project Count.");
  }
}
