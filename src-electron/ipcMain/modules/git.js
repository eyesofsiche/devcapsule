import { exec } from "child_process";
import { ipcMain } from "electron";
import { existsSync } from "fs";
import os from "os";
import path from "path";

export default function registerGitHandlers(mainWindow) {
  ipcMain.handle("cmd:git-auth-check", async (_, gitUrl) => {
    try {
      const isSSH = gitUrl.startsWith("git@");

      // 1. SSH 인증 확인
      if (isSSH) {
        // ssh -T git@github.com 형식으로 인증 테스트
        const sshHost = gitUrl.split(":")[0]; // git@github.com
        return new Promise((resolve) => {
          exec(
            `ssh -T -o BatchMode=yes ${sshHost}`,
            (error, stdout, stderr) => {
              if (error) {
                resolve({
                  success: false,
                  method: "ssh",
                  error: `SSH 인증이 필요합니다 (${sshHost})`,
                });
              } else {
                resolve({ success: true, method: "ssh" });
              }
            }
          );
        });
      }

      // 2. HTTPS 인증 확인
      return new Promise((resolve) => {
        exec(`git ls-remote ${gitUrl}`, (error, stdout, stderr) => {
          if (error) {
            const host = getGitHost(gitUrl);
            runGitAuthScript(host);
            resolve({
              success: false,
              method: "https",
              error: `${host} 인증이 필요합니다. 로그인 스크립트를 실행합니다.`,
            });
          } else {
            resolve({ success: true, method: "https" });
          }
        });
      });
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Helper: Git 호스트 추출
  function getGitHost(url) {
    if (url.includes("github.com")) return "github";
    if (url.includes("gitlab.com")) return "gitlab";
    if (url.includes("bitbucket.org")) return "bitbucket";
    return "generic";
  }

  // Helper: 로그인 스크립트 실행
  function runGitAuthScript(service) {
    const platform = os.platform();
    const scriptDir = path.join(getUserDataPath(), "git-auth");

    if (platform === "win32") {
      const script = path.join(scriptDir, `auth-${service}.bat`);
      exec(`start cmd.exe /K "${script}"`);
    } else {
      const script = path.join(scriptDir, `auth-${service}.sh`);
      const terminalCmd =
        platform === "darwin"
          ? `open -a Terminal "${script}"`
          : `gnome-terminal -- bash "${script}"`;
      exec(terminalCmd);
    }
  }
}
