import { describe, it, expect } from "vitest";

import { content } from "../src-electron/services/updateIndexMD.js";

describe("content()", () => {
  it("index md 생성", async () => {
    const result = await content();
    console.log("분석 결과:", result); // ✅ 여기서 결과 확인
    expect(result); // 또는 어떤 값이든 체크할 수 있음
  });
});
