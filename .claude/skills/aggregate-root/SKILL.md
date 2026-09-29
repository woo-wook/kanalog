---
name: aggregate-root
description: 비즈니스 불변식을 가진 애그리거트 루트 엔티티를 만들 때 사용. "엔티티 생성", "애그리거트", "도메인 모델", "@Entity", "불변식/규칙을 가진 엔티티" 요청에 사용.
---

# 애그리거트 루트 엔티티

JPA `@Entity` 를 `domain` 패키지에 두되, 비즈니스 규칙/불변식을 엔티티 안에 캡슐화한다.

## 규칙

- `BaseJpaEntity` 상속 (감사 필드 자동) → [base-jpa-entity](../base-jpa-entity/SKILL.md)
- ID 는 [uuid-generator](../uuid-generator/SKILL.md)로 기본값 생성
- 컬렉션은 `private val _items` 백킹 필드 + 읽기전용 `get()` 노출, 변경은 의도된 메서드로만
- 불변식은 `init { require(...) }` 와 도메인 메서드 내부 `require(...)` 로 강제
- 값 객체는 `@Embedded` ([value-object](../value-object/SKILL.md))

## 템플릿

```kotlin
@Entity
@Table(name = "d_<name>", schema = "<schema>")
@DynamicUpdate
class <Aggregate>(
    @Id
    @Column(name = "<name>_id", nullable = false, length = 36)
    val id: String = UUIDGenerator.generate(),
    @Column(name = "title", nullable = false, length = 200)
    var title: String,
) : BaseJpaEntity() {

    @OneToMany(mappedBy = "<aggregate>", cascade = [CascadeType.ALL], orphanRemoval = true, fetch = FetchType.LAZY)
    private val _items: MutableList<<Child>> = mutableListOf()
    val items: List<<Child>> get() = _items.toList()

    init {
        require(title.isNotBlank()) { "제목은 비어있을 수 없습니다." }
    }

    fun addItem(item: <Child>) {
        require(_items.none { it.key == item.key }) { "이미 존재하는 항목입니다: ${item.key}" }
        _items.add(item)
    }
}
```

## 관련 스킬

[value-object](../value-object/SKILL.md) · [base-jpa-entity](../base-jpa-entity/SKILL.md) · [domain-factory](../domain-factory/SKILL.md)

## 차용 원본

`account/.../domain/member/Member.kt`, `account/.../domain/term/Term.kt`
