import * as projects from "./projects.js";
import * as settings from "./settings.js";
import * as watchs from "./watchs.js";

const modules = {
  settings,
  projects,
  watchs,
};

export async function initAllDB() {
  await Promise.all([settings.initDB(), projects.initDB(), watchs.initDB()]);
}

export function getDB(name) {
  if (!modules[name]) throw new Error(`Unknown DB module: ${name}`);
  return modules[name].getDB();
}

export async function readSection(name, type) {
  if (!modules[name]) throw new Error(`Unknown DB module: ${name}`);
  return await modules[name].read(type);
}

export async function writeSection(name, data) {
  if (!modules[name]) throw new Error(`Unknown DB module: ${name}`);
  return await modules[name].write(data);
}

export async function updateSection(name, patch) {
  if (!modules[name]) throw new Error(`Unknown DB module: ${name}`);
  return await modules[name].update(patch);
}

export async function removeSection(name, id) {
  if (!modules[name]) throw new Error(`Unknown DB module: ${name}`);
  return await modules[name].remove(id);
}
