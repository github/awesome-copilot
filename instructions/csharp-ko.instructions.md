---
description: 'C# 애플리케이션 개발을 위한 코드 작성 규칙 by @jgkim999'
applyTo: '**/*.cs'
---

# C# 코드 작성 규칙

## 명명 규칙 (Naming Conventions)

일관된 명명 규칙은 코드 가독성의 핵심입니다. Microsoft의 가이드라인을 따르는 것을 권장합니다.

| 요소 | 명명 규칙 | 예시 |
|------|-----------|------|
| 인터페이스 | 접두사 'I' + PascalCase | `IAsyncRepository`, `ILogger` |
| 공개(public) 멤버 | 파스칼 케이스 (PascalCase) | `public int MaxCount;`, `public void GetData()` |
| 매개변수, 지역 변수 | 카멜 케이스 (camelCase) | `int userCount`, `string customerName` |
| 비공개/내부 필드 | 밑줄(_) + 카멜 케이스 | `private string _connectionString;` |
| 상수 (const) | 파스칼 케이스 (PascalCase) | `public const int DefaultTimeout = 5000;` |
| 제네릭 형식 매개변수 | 접두사 'T' + 설명적인 이름 | `TKey`, `TValue`, `TResult` |
| 비동기 메서드 | 'Async' 접미사 | `GetUserAsync`, `DownloadFileAsync` |

## 코드 서식 및 가독성 (Formatting & Readability)

일관된 서식은 코드를 시각적으로 파싱하기 쉽게 만듭니다.

| 항목 | 규칙 | 설명 |
|------|------|------|
| 들여쓰기 | 4개의 공백 사용 | 탭 대신 4개의 공백을 사용합니다. cs 파일은 반드시 4개의 공백을 사용합니다. |
| 괄호 | 항상 중괄호 {} 사용 | 제어문(if, for, while 등)이 한 줄이더라도 항상 중괄호를 사용합니다. |
| 빈 줄 | 논리적 분리 | 메서드 정의, 속성 정의, 논리적으로 분리된 코드 블록 사이에 빈 줄을 추가합니다. |
| 문장 작성 | 한 줄에 하나의 문장 | 한 줄에는 하나의 문장만 작성합니다. |
| var 키워드 | 형식이 명확할 때만 사용 | 변수의 형식을 오른쪽에서 명확하게 유추할 수 있을 때만 var를 사용합니다. |
| 네임스페이스 | 파일 범위 네임스페이스 사용 | C# 10 이상에서는 파일 범위 네임스페이스를 사용하여 불필요한 들여쓰기를 줄입니다. |
| 주석 | XML 형식 주석 작성 | 작성한 class나 함수에 항상 xml 형식의 주석을 작성합니다. |

## 언어 기능 사용 (Language Features)

최신 C# 기능을 활용하여 코드를 더 간결하고 효율적으로 만드세요.

| 기능 | 설명 | 예시/참고 |
|------|------|------|
| 비동기 프로그래밍 | I/O 바운드 작업에 async/await 사용 | `async Task<string> GetDataAsync()` |
| ConfigureAwait | 라이브러리 코드에서 컨텍스트 전환 오버헤드 감소 | `await SomeMethodAsync().ConfigureAwait(false)` |
| LINQ | 컬렉션 데이터 쿼리 및 조작 | `users.Where(u => u.IsActive).ToList()` |
| 표현식 기반 멤버 | 간단한 메서드/속성을 간결하게 표현 | `public string Name => _name;` |
| Nullable Reference Types | 컴파일 타임 NullReferenceException 방지 | `#nullable enable` |
| using 선언 | IDisposable 객체의 간결한 처리 | `using var stream = new FileStream(...);` |

## 성능 및 예외 처리 (Performance & Exception Handling)

견고하고 빠른 애플리케이션을 위한 지침입니다.

### 예외 처리

처리할 수 있는 구체적인 예외만 catch 하세요. catch (Exception)와 같이 일반적인 예외를 잡는 것은 피해야 합니다.

예외는 프로그램 흐름 제어를 위해 사용하지 마세요. 예외는 예상치 못한 오류 상황에만 사용되어야 합니다.

### 성능
s
문자열을 반복적으로 연결할 때는 + 연산자 대신 StringBuilder를 사용하세요.

Entity Framework Core 사용 시, 읽기 전용 쿼리에는 .AsNoTracking()을 사용하여 성능을 향상시키세요.

불필요한 객체 할당을 피하고, 특히 루프 내에서는 주의하세요.

## 보안 (Security)

안전한 코드를 작성하기 위한 기본 원칙입니다.

| 보안 영역 | 규칙 | 설명 |
|------|------|------|
| 입력 유효성 검사 | 모든 외부 데이터 검증 | 외부(사용자, API 등)로부터 들어오는 모든 데이터는 신뢰하지 않고 항상 유효성을 검사하세요. |
| SQL 삽입 방지 | 매개변수화된 쿼리 사용 | 항상 매개변수화된 쿼리나 Entity Framework와 같은 ORM을 사용하여 SQL 삽입 공격을 방지하세요. |
| 민감한 데이터 보호 | 구성 관리 도구 사용 | 비밀번호, 연결 문자열, API 키 등은 소스 코드에 하드코딩하지 말고 Secret Manager, Azure Key Vault 등을 사용하세요. |

이 규칙들을 프로젝트의 .editorconfig 파일과 팀의 코드 리뷰 프로세스에 통합하여 지속적으로 고품질 코드를 유지하는 것을 목표로 해야 합니다.
