import fsd from "@feature-sliced/steiger-plugin";
import { defineConfig } from "steiger";

export default defineConfig([
  ...fsd.configs.recommended,
  {
    rules: {
      // 도메인 화면(views/widgets)이 추후 추가되기 전까지 일부 슬라이스는
      // 단일 참조일 수 있으므로 기반 단계에서는 비활성화한다.
      "fsd/insignificant-slice": "off",
    },
  },
]);
