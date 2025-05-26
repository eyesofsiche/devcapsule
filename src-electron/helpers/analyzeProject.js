import fastFolderSize from "fast-folder-size";
import { existsSync, statSync } from "fs";
import fs from "fs/promises";
import path from "path";
import simpleGit from "simple-git";

export async function analyzeProject(projectPath) {
  const result = {
    success: true,
    path: projectPath,
    name: null,
    version: null,
    description: null,
    license: null,
    // dependencies: [],
    // devDependencies: [],
    // engines: {},
    // hasEnv: false,
    // hasDvc: false,
    // dvcMeta: null,
    // hasGit: false,
    git: null,
    size: null,
    // scripts: {},
    // hasGitignore: false,
    // hasLockFile: false,
  };

  const readJson = async (filePath) => {
    try {
      const content = await fs.readFile(filePath, "utf8");
      return JSON.parse(content);
    } catch {
      return null;
    }
  };

  // 1. package.json
  const pkgPath = path.join(projectPath, "package.json");
  if (existsSync(pkgPath)) {
    const pkg = await readJson(pkgPath);
    if (pkg) {
      result.name = pkg.name || null;
      result.version = pkg.version || null;
      result.description = pkg.description || null;
      result.license = pkg.license || null;
      // result.dependencies = pkg.dependencies
      //   ? Object.keys(pkg.dependencies)
      //   : [];
      // result.devDependencies = pkg.devDependencies
      //   ? Object.keys(pkg.devDependencies)
      //   : [];
      // result.engines = pkg.engines || {};
      // result.scripts = pkg.scripts || {};
    }
  }

  // 2. .env / .devcapsule
  // result.hasEnv = existsSync(path.join(projectPath, ".env"));
  // const dvcPath = path.join(projectPath, ".devcapsule");
  // result.hasDvc = existsSync(dvcPath);
  // if (result.hasDvc) {
  //   result.dvcMeta = await readJson(dvcPath);
  // }

  // 3. git 정보
  const gitPath = path.join(projectPath, ".git");
  if (existsSync(gitPath)) {
    try {
      const git = simpleGit({ baseDir: projectPath });
      const remotes = await git.getRemotes(true);
      const status = await git.status();
      const log = await git.log({ n: 1 });

      // result.hasGit = true;
      result.git = {
        currentBranch: status.current,
        isDirty: status.files.length > 0,
        remotes: remotes.map((r) => ({
          name: r.name,
          url: r.refs.fetch,
        })),
        lastCommit: log.latest,
      };
    } catch {
      // git이 초기화는 되어있지만 내부 구조가 망가졌을 수도 있음
      result.git = null;
    }
  }

  // 4. 기타 파일 여부
  // result.hasGitignore = existsSync(path.join(projectPath, ".gitignore"));
  // result.hasLockFile =
  //   existsSync(path.join(projectPath, "package-lock.json")) ||
  //   existsSync(path.join(projectPath, "yarn.lock")) ||
  //   existsSync(path.join(projectPath, "pnpm-lock.yaml"));

  // 5. 폴더 사이즈
  result.size = await new Promise((resolve) => {
    fastFolderSize(projectPath, (err, bytes) => {
      if (err) resolve(null);
      else resolve((bytes / 1024 / 1024).toFixed(1) + " MB");
    });
  });

  return result;
}
