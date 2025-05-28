import { describe, it, expect } from "vitest";

import { checkUncommittedChanges } from "../src-electron/helpers/git.js";

describe("checkUncommittedChanges()", () => {
  it("git 체크", async () => {
    const result = await checkUncommittedChanges(
      "/Users/siche/Documents/numpick/v2/api"
    );
    console.log("분석 결과:", result); // ✅ 여기서 결과 확인
    expect(result).toBeDefined(); // 또는 어떤 값이든 체크할 수 있음
  });
});
