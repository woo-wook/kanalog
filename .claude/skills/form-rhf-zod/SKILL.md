---
name: form-rhf-zod
description: React Hook Form + Zod 로 타입 안전한 폼을 만들 때 사용. "폼", "React Hook Form", "zodResolver", "폼 검증", "로그인 폼" 요청에 사용.
---

# React Hook Form + Zod 폼

스키마 1개로 검증 + 타입을 동시에 얻는다.

## 템플릿

```tsx
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/shared/ui/button";

const loginSchema = z.object({
  email: z.string().email("이메일 형식을 확인해 주세요"),
  password: z.string().min(8, "8자 이상 입력해 주세요"),
});
type LoginInput = z.infer<typeof loginSchema>;

export function LoginForm({ onSubmit }: { onSubmit: (v: LoginInput) => Promise<void> }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <input aria-label="이메일" {...register("email")} />
        {errors.email && <p role="alert">{errors.email.message}</p>}
      </div>
      <div>
        <input type="password" aria-label="비밀번호" {...register("password")} />
        {errors.password && <p role="alert">{errors.password.message}</p>}
      </div>
      <Button type="submit" disabled={isSubmitting}>로그인</Button>
    </form>
  );
}
```

## 규칙

- 스키마는 `model/` 에, 폼 컴포넌트는 `ui/`
- 제출 핸들러는 상위(feature)가 주입 → 서버 에러는 `setError` 로 필드/폼에 반영
- 에러는 `role="alert"` 로 노출(접근성·테스트)

## 관련 스킬

[ui-component-pattern](../ui-component-pattern/SKILL.md) · [api-error-mapping](../api-error-mapping/SKILL.md) · [testing-library-component](../testing-library-component/SKILL.md)
