import { app } from "electron";
import path from "path";
import { Worker } from "worker_threads";

import { readDB, updateDBSection } from "../db/lowdb.js";

function getWorkerPath(name) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "workers", name);
  } else {
    return path.resolve(__dirname, `../../src-electron/workers/${name}`);
  }
}

export class ProjectScanner {
  constructor() {
    this.isRunning = false;
    this.abortScan = false;
    this.autoTimer = null;
    this.currentWorker = null;
  }

  // 단일 폴더 스캔 (Worker)
  async scanFolder(folderPath) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(getWorkerPath("projectCountWorker.js"));
      const self = this;
      this.currentWorker = worker;

      // 정상 결과
      worker.on("message", (result) => {
        cleanup();
        resolve(result);
      });

      // 에러
      worker.on("error", (err) => {
        cleanup();
        reject(err);
      });

      // 워커가 종료(exit)될 때
      worker.on("exit", (code) => {
        cleanup();
        if (code !== 0) {
          reject(new Error(`Worker exited with code ${code}`));
        }
      });

      // 공통 정리 함수
      function cleanup() {
        worker.removeAllListeners();
        worker.terminate();
        if (self.currentWorker === worker) {
          self.currentWorker = null;
        }
      }

      worker.postMessage(folderPath);
    });
  }

  // 전체 폴더 스캔
  async fullScan({ type = "auto" } = {}) {
    // auto 스캔 중복 방지
    if (this.isRunning && type === "auto") {
      return { success: false, error: "이미 자동 스캔 중입니다." };
    }

    // 시작
    this.abortScan = false;
    this.isRunning = true;

    const db = await readDB();
    const folders = db.folders || [];
    const result = [];

    for (const { path: folderPath } of folders) {
      // 중간 취소 체크
      if (this.abortScan) {
        this.isRunning = false;
        return { success: false, error: "스캔이 취소되었습니다." };
      }

      try {
        const info = await this.scanFolder(folderPath);
        result.push({
          path: folderPath,
          count: info.count,
          list: info.list,
        });
      } catch (err) {
        this.isRunning = false;
        return { success: false, error: err.message };
      }
    }

    // 결과 기록
    await updateDBSection("folders", result);
    this.isRunning = false;
    return { success: true };
  }

  // 자동 스캔 시작
  startAuto(intervalMs = 5 * 60 * 1000) {
    if (this.autoTimer) return;

    // 즉시 한번
    this.fullScan({ type: "auto" }).catch(() => {});

    // 스케줄링
    this.autoTimer = setInterval(() => {
      this.fullScan({ type: "auto" }).catch(() => {});
    }, intervalMs);
  }

  // 자동 스캔 중단
  stopAuto() {
    this.abortScan = true;
    if (this.currentWorker) {
      this.currentWorker.terminate();
      this.currentWorker = null;
    }
    if (this.autoTimer) {
      clearInterval(this.autoTimer);
      this.autoTimer = null;
    }
    this.isRunning = false;
  }

  // 수동 스캔 (자동 스캔 강제 중단 → 스캔 → 자동 재시작)
  async manualScan() {
    this.stopAuto();
    const res = await this.fullScan({ type: "manual" });
    // 필요하다면 설정값을 읽어서 auto가 on 상태면 재시작
    const db = await readDB();
    if (db.settings?.autoRefresh) {
      this.startAuto();
    }
    return res;
  }
}

// 싱글톤 인스턴스
export const scanner = new ProjectScanner();
