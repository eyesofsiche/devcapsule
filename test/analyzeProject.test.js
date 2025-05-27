import { describe, it, expect } from "vitest";

import { analyzeProject } from "../src-electron/helpers/analyzeProject.js";

describe("analyzeProject()", () => {
  it("프로젝트 검토", async () => {
    const result = await analyzeProject(
      "/Users/siche/Documents/numpick/v2/api"
    );
    console.log("분석 결과:", result); // ✅ 여기서 결과 확인
    expect(result).toBeDefined(); // 또는 어떤 값이든 체크할 수 있음
  });
});
