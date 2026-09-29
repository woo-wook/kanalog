---
name: shadcn-component
description: shadcn/ui 컴포넌트를 추가하고 cn 유틸·CVA variants 로 구성할 때 사용. "shadcn", "Button 컴포넌트", "cn 유틸", "CVA variants" 요청에 사용.
---

# shadcn/ui 컴포넌트

복사-소유 방식 컴포넌트를 `shared/ui` 에 둔다. variant 는 CVA, 클래스 병합은 `cn`.

## cn 유틸

```ts
// src/shared/lib/cn.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
```

## 컴포넌트 (예: Button)

```tsx
// src/shared/ui/button.tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/shared/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-white hover:bg-primary/90",
        outline: "border border-input bg-background hover:bg-accent",
        ghost: "hover:bg-accent",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
      },
      size: { sm: "h-8 px-3", md: "h-10 px-4", lg: "h-11 px-6" },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
```

## 규칙

- shadcn CLI: `pnpm dlx shadcn@latest add button` (출력 위치를 `src/shared/ui` 로 설정)
- variant 는 CVA 로 표준화, `className` override 허용
- 컴포넌트 규약은 [ui-component-pattern](../ui-component-pattern/SKILL.md)

## 관련 스킬

[tailwind-setup](../tailwind-setup/SKILL.md) · [ui-component-pattern](../ui-component-pattern/SKILL.md) · [testing-library-component](../testing-library-component/SKILL.md)
