import { existsSync } from "fs";
import path from "path";
import simpleGit from "simple-git";

export async function getGitInfo(folderPath) {
  const gitPath = path.join(folderPath, ".git");
  if (existsSync(gitPath)) {
    try {
      const git = simpleGit({ baseDir: folderPath });
      const remotes = await git.getRemotes(true);
      const status = await git.status();
      const log = await git.log({ n: 1 });

      return {
        currentBranch: status.current,
        isDirty: status.files.length > 0,
        remotes: remotes.map((r) => ({
          name: r.name,
          url: r.refs.fetch,
        })),
        lastCommit: log.latest,
      };
    } catch (error) {
      console.error("Git 정보 가져오기 실패:", error);
      return null;
    }
  } else {
    return null;
  }
}

export async function checkUncommittedChanges(folderPath) {
  const gitPath = path.join(folderPath, ".git");
  if (!existsSync(gitPath)) return null;

  try {
    const git = simpleGit({ baseDir: folderPath });

    const status = await git.status();
    const log = await git.log(["--branches", "--not", "--remotes"]); // 로컬에만 있는 커밋

    return {
      hasUncommittedChanges: status.files.length > 0,
      hasUnpushedCommits: log.total > 0,
    };
  } catch (err) {
    console.error("커밋 상태 확인 실패:", err);
    return null;
  }
}
