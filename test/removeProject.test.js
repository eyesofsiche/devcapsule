import { describe, it, expect } from "vitest";

import { removeProject } from "../src-electron/services/removeProject.js";

describe("removeProject()", () => {
  it("프로젝트 삭제 테스트", async () => {
    expect(await removeProject("31d2c86b-d637-4e32-b67f-c9bc6aed624f"));
  });
});

// // scripts/remove-project.js
// async function main() {
//   // 이 시점에야 ESM 모듈을 로드
//   const { removeProject } = await import(
//     "../src-electron/services/removeProject.cjs"
//   );
//   const id = process.argv[2];
//   if (!id) {
//     console.error("Usage: npm run rmproj <projectId>");
//     process.exit(1);
//   }
//   const result = await removeProject(id);
//   console.log("removeProject 결과:", result);
// }

// main().catch((err) => {
//   console.error(err);
//   process.exit(1);
// });
