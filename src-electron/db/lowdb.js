import { app } from "electron";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import path from "path";

let db;

// ✨ 초기 기본 데이터 (파일이 없거나 비었을 때)
const defaultData = {
  settings: {
    autoRun: false,
    autoRefresh: false,
    theme: "dark",
    language: "ko",
  },
  folders: [],
  projects: [],
  version: 1,
};

// 📦 DB 초기화
export async function initDB() {
  // 저장할 db.json 파일 경로
  const dbFile = path.join(app.getPath("userData"), "db.json");

  // Lowdb 어댑터 생성
  const adapter = new JSONFile(dbFile);
  db = new Low(adapter, defaultData);

  await db.read();
  if (!db.data) {
    db.data = defaultData;
    await db.write();
  }
}

// 📖 데이터 읽기
export async function readDB() {
  await db.read();
  return db.data;
}

// 📝 데이터 덮어쓰기
export async function writeDB(newData) {
  db.data = newData;
  await db.write();
}

// 🔥 특정 경로 데이터 병합 (예시: settings만 일부 업데이트)
export async function updateDBSection(section, patch) {
  await db.read();
  if (!db.data) db.data = defaultData;

  if (
    Array.isArray(db.data[section]) ||
    ["folders", "projects"].includes(section)
  ) {
    // 원래 배열이었으면 통째로 교체
    db.data[section] = patch || [];
  } else {
    // 객체면 머지
    db.data[section] = {
      ...(db.data[section] || {}),
      ...patch,
    };
  }

  await db.write();
}
