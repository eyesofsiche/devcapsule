import { app } from "electron";
import path from "path";
import { Worker } from "worker_threads";

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
