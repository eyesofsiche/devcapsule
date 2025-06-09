import path from "path";
import { Worker } from "worker_threads";

import { readSection, writeSection } from "../db/lowdb/index.js";
import { getResourcesPath } from "../utils/getPath.js";

export class ScanProject {
  constructor() {
    this.isRunning = false;
    this.abortScan = false;
    this.autoTimer = null;
    this.currentWorker = null;
  }

  // 단일 폴더 스캔 (Worker)
  async scanFolder(folderPath) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(
        getResourcesPath("workers/projectCountWorker.js"),
        {
          env: {
            ...process.env,
            NODE_PATH: path.join(
              process.resourcesPath,
              "app.asar.unpacked",
              "node_modules"
            ),
          },
        }
      );
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
          if (this.abortScan) {
            const error = new Error("스캔이 취소되었습니다.");
            error.cancel = true;
            reject(error);
          }
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

    const watchsDB = await readSection("watchs");
    const result = [];

    const projectsDB = await readSection("projects");
    const projectList = projectsDB.map((project) => project.path);

    for (const { path: folderPath } of watchsDB) {
      // 중간 취소 체크
      if (this.abortScan) {
        this.isRunning = false;
        return { success: false, error: "스캔이 취소되었습니다." };
      }

      try {
        const info = await this.scanFolder(folderPath);
        const list = info.list.filter((path) => !projectList.includes(path));
        result.push({
          path: folderPath,
          count: list.length,
          list,
        });
      } catch (err) {
        this.isRunning = false;
        if (err.cancel) {
          return { success: false, cancel: true };
        }
        return { success: false, error: err.message };
      }
    }

    // 결과 기록
    await writeSection("watchs", result);
    this.isRunning = false;
    return { success: true, result };
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
    if (this.isRunning) {
      this.abortScan = true;
      if (this.currentWorker) {
        this.currentWorker.terminate();
        this.currentWorker = null;
      }
      // 2) 이전 스캔이 완전히 멈출 때까지 대기
      await new Promise((resolve) => {
        const check = () => {
          console.log("this.isRunning", this.isRunning);
          if (!this.isRunning) return resolve();
          setTimeout(check, 50);
        };
        check();
      });
    }
    this.stopAuto();
    const res = await this.fullScan({ type: "manual" });
    // 필요하다면 설정값을 읽어서 auto가 on 상태면 재시작
    const settingDB = await readSection("settings");
    if (settingDB.autoRefresh) {
      this.startAuto();
    }
    return res;
  }
}

// 싱글톤 인스턴스
export const scanner = new ScanProject();
