import { spawn } from "child_process";

export function getRealUserPath() {
  return new Promise((resolve, reject) => {
    // macOS에서 GUI 앱의 환경변수를 가져오는 방법
    const child = spawn("/bin/launchctl", ["getenv", "PATH"], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let output = "";
    let error = "";

    child.stdout.on("data", (data) => {
      output += data.toString();
    });

    child.stderr.on("data", (data) => {
      error += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0 && output.trim()) {
        resolve(output.trim());
      } else {
        // launchctl이 실패하면 사용자 쉘에서 가져오기 시도
        getUserPathFromShell().then(resolve).catch(reject);
      }
    });
  });
}

function getUserPathFromShell() {
  return new Promise((resolve, reject) => {
    const homeDir = require("os").homedir();

    // 여러 쉘 설정 파일을 순서대로 시도
    const shellConfigs = [
      `${homeDir}/.zshrc`,
      `${homeDir}/.bash_profile`,
      `${homeDir}/.bashrc`,
      `${homeDir}/.profile`,
    ];

    const sourceCommands = shellConfigs
      .map((config) => `source ${config} 2>/dev/null || true`)
      .join("; ");

    const command = `${sourceCommands}; echo $PATH`;

    const child = spawn("/bin/zsh", ["-c", command], {
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        HOME: homeDir,
        USER: require("os").userInfo().username,
        SHELL: "/bin/zsh",
      },
    });

    let output = "";
    child.stdout.on("data", (data) => {
      output += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error("Failed to get PATH from shell"));
      }
    });
  });
}
