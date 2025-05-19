import { ipcRenderer } from "electron";

export function invokeWithReply(channel, payload = {}, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const replyChannel = `${channel}-reply-${crypto.randomUUID()}`;

    // 응답 리스너
    const listener = (event, data) => {
      clearTimeout(timer);
      ipcRenderer.removeListener(replyChannel, listener);
      resolve(data);
    };

    // 타임아웃 타이머
    const timer = setTimeout(() => {
      ipcRenderer.removeListener(replyChannel, listener);
      reject(new Error(`IPC invoke timeout: ${channel}`));
    }, timeout);

    ipcRenderer.once(replyChannel, listener);

    ipcRenderer.send(channel, {
      ...payload,
      replyChannel,
    });
  });
}
