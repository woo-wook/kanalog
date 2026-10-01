# 실제 브라우저 E2E

이 스펙은 API를 모킹하지 않는다. 실행 전에 별도 테스트 DB와 미디어 볼륨으로 앱을 기동하고, 전용 계정을 만들고, JLPT MAX N5 어휘 덱을 가져온다. 계정에는 오늘 학습할 카드가 적어도 두 장 남아 있어야 한다. 테스트는 평가 한 건을 실제 DB에 기록하며 설정을 잠시 바꾼 뒤 복구한다. 운영 계정을 사용하지 않는다.

Playwright Chromium을 설치하고 다음 환경변수를 준비한다.

- `E2E_BASE_URL`: 기동 중인 앱 주소. 예: `http://localhost:3000`.
- `E2E_EMAIL`: 전용 테스트 계정의 이메일.
- `E2E_PASSWORD`: 전용 테스트 계정 비밀번호. 셸 기록에 남기지 않도록 비밀 저장소나 숨김 입력으로 전달한다.

```sh
cd frontend
pnpm exec playwright install chromium
pnpm test:e2e
```

환경변수가 없으면 설정 로딩 단계에서 오류를 내며 테스트를 통과로 표시하지 않는다. 실제 백엔드와 DB가 없는 이 작업 환경에서는 테스트 실행을 하지 않았다. `pnpm exec playwright test --list`에서 네 스펙이 발견되는 것만 확인했다.
