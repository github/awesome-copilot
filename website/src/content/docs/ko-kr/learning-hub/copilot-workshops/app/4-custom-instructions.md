---
title: "레슨 4 - 사용자 지정 지침으로 Copilot 안내"
description: "리포지토리 지침을 살펴보고 문서화 표준을 추가한 다음 필터링 코드에 적용합니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

생성형 AI를 사용할 때는 컨텍스트가 중요합니다. 작업을 특정 방식으로 수행해야 한다면 Copilot이 해당 지침을 사용할 수 있어야 합니다. [지침 파일][instruction-files]은 원하는 코드의 *내용*뿐 아니라 코드의 *구조*도 설명합니다. 필터링을 구축했으므로 이제 Copilot이 사용한 지침을 살펴보고 문서화 표준을 추가한 다음 코드에 적용합니다.

이 레슨에서는 다음 작업을 수행합니다.

- 리포지토리 지침과 경로 범위 지침 파일이 에이전트에 전달되는 방식을 살펴봅니다.
- 코딩 표준을 준수하도록 지침 파일을 업데이트합니다.
- 지침 파일이 코드에 미치는 영향을 확인합니다.

## 시나리오

모범적인 개발 조직인 Tailspin Toys에는 개발 방식에 관한 지침과 요구 사항이 있습니다. 여기에는 다음 항목이 포함됩니다.

- 주석은 코드를 다시 설명하기보다 의도와 명확하지 않은 결정을 설명해야 합니다.
- `db/`와 `src/lib/`에서 내보내는 함수는 TSDoc/JSDoc으로 목적, 매개 변수, 반환값을 문서화하고, 주입 가능한 `db` 인수가 있다면 함께 설명해야 합니다.
- 재사용 가능한 Astro 구성 요소는 `Props` 계약을 문서화하고, 관련 코드가 바뀌면 주석도 최신 상태로 유지해야 합니다.
- 기존 서식과 린트 지침을 보존해야 합니다.

지침 파일을 사용하면 Copilot이 이러한 관행에 맞게 작업하는 데 필요한 정보를 제공할 수 있습니다.

## 지침 파일

사용자 지정 지침은 Copilot에 컨텍스트와 기본 설정을 제공하여 코딩 스타일과 요구 사항을 더 잘 이해하게 합니다. 이 기능을 사용하면 Copilot이 더 관련성 높은 제안과 코드 조각을 생성하도록 안내할 수 있습니다. 선호하는 코딩 규칙과 라이브러리는 물론 코드에 포함할 주석 유형까지 지정할 수 있습니다. 리포지토리 전체에 적용되는 지침이나 작업 수준의 컨텍스트를 제공하는 특정 파일 유형용 지침을 만들 수 있습니다.

지침 파일에는 두 가지 유형이 있습니다.

- `.github/copilot-instructions.md`는 리포지토리의 **모든** 요청에서 Copilot에 전달되는 단일 지침 파일입니다. 이 파일에는 Copilot에 보내는 대부분의 채팅 또는 CLI 요청과 관련된 프로젝트 수준 정보를 포함해야 합니다. 사용 중인 기술 스택, 구축 중인 항목의 개요, 모범 사례, 기타 전역 지침을 포함할 수 있습니다.
- 특정 작업이나 파일 유형에 맞게 `.github/instructions/*.instructions.md` 파일을 만들 수 있습니다. TypeScript 또는 Astro 같은 특정 언어나 UI 구성 요소 또는 새 단위 테스트 집합 만들기와 같은 작업에 관한 지침을 제공할 수 있습니다.

> [!NOTE]
> 다른 지침 형식과 지원 여부는 하네스에 따라 다릅니다. 특정 형식에 의존하기 전에 [사용자 지정 지침 지원 참조][custom-instructions-support]를 확인합니다.

## 프로젝트의 사용자 지정 지침 파일 살펴보기

시작을 돕기 위해 시작 프로젝트에는 지침 파일 모음이 이미 포함되어 있습니다. 변경하기 전에 기존 내용을 살펴보고 그 영향을 확인합니다.

1. 이전 레슨의 세션으로 돌아갑니다.
2. 검토 패널이 표시되지 않으면 오른쪽 위의 **Toggle review panel**을 선택하여 엽니다.

   ![Create PR 오른쪽의 Toggle review panel 버튼을 화살표로 가리키는 GitHub Copilot app 위쪽 도구 모음](/images/learning-hub/copilot-workshops/app-2-review-panel.png)

3. **+** 아이콘을 선택하여 새 캔버스를 패널에서 엽니다.
4. **Files**를 선택합니다.
5. **Gear** 아이콘을 선택하고 **Show hidden files**에 체크 표시가 있는지 확인합니다.
6. `.github/copilot-instructions.md`로 이동합니다.
7. 파일을 살펴봅니다. 프로젝트에 관한 간단한 설명과 **Agent notes**, **Code standards**, **Scripts**, **Repository Structure** 같은 섹션을 확인합니다. **Code standards** 아래에서 중첩된 **GitHub Actions Workflows** 지침을 확인합니다. 이 내용은 Copilot과의 모든 상호 작용에 적용됩니다.
8. `.github/instructions` 폴더로 이동하여 파일을 살펴봅니다. Astro 파일, Drizzle 데이터 계층, 테스트 등에 관한 지침이 있습니다.
9. `.github/instructions/unit-tests.instructions.md`를 엽니다. 위쪽의 `applyTo` 필드는 지침이 적용되는 파일을 결정하는 glob을 리포지토리 루트 기준으로 설정합니다. 여기서는 TypeScript 테스트 파일(예: `**/*.test.ts`와 일치하는 파일)이 모두 일치합니다.
10. 이 프로젝트의 단위 테스트 작성에 관한 구체적인 지침을 확인합니다.
11. 마지막으로 `.github/instructions/drizzle.instructions.md`를 열고 아래쪽으로 스크롤합니다. 다른 지침 파일(예: `unit-tests.instructions.md`)과 프로젝트의 기존 파일로 연결되는 링크를 확인합니다. 이를 통해 큰 지침 집합을 더 작고 재사용 가능한 파일로 나누고 Copilot이 코드를 생성할 때 따를 예제를 지정할 수 있습니다. 이 경로는 리포지토리 루트가 아니라 지침 파일을 기준으로 합니다.

## 팀 지침에 맞게 지침 파일 업데이트

기존 파일은 좋은 출발점이지만 아직 부족한 부분이 있습니다. 새로 생성하는 TypeScript 파일에 [TSDoc 주석][tsdoc]을 추가하도록 핵심 `copilot-instructions.md` 파일을 수정합니다.

> [!NOTE]
> 지침 파일은 Copilot이 생성하는 코드에 큰 영향을 주므로 Copilot을 명확하게 안내하는지 주의 깊게 확인해야 합니다. Copilot으로 초안을 만든 다음 요구 사항을 충족하는지 직접 검토할 수 있습니다. 좋은 출발점이 되는 [Awesome Copilot의 지침 파일 모음][awesome-copilot]도 확인할 수 있습니다.

1. 동일한 파일 캔버스에서 `.github/copilot-instructions.md`로 이동합니다.
2. 파일 중간쯤에 있는 **Code formatting requirements** 헤더를 찾습니다.
3. 해당 헤더 아래의 마지막 글머리 기호로 다음 내용을 추가합니다.

   ```plaintext
   All new TypeScript should contain TSDocs comments for documentation purposes.
   ```

파일이 자동으로 저장되어 사용할 준비가 됩니다.

## 업데이트된 지침 사용

지침 파일을 업데이트했으므로 Copilot에 업데이트를 검토하고 필요한 변경을 수행하도록 요청하여 코드에 미치는 영향을 확인합니다.

> [!NOTE]
> 방금 지침 파일을 변경했으므로 Copilot에 명시적으로 사용하도록 요청합니다. 지침 파일이 이미 있는 상태에서 코드를 만들면 별도로 요청하지 않아도 Copilot이 자동으로 사용합니다.

1. 다음 프롬프트로 지침 파일을 사용하여 새 요구 사항에 맞게 코드를 업데이트하도록 Copilot에 요청합니다.

   ```plaintext
   We just updated our instructions and code guidance. Can you please update the code you generated to match that guidance?
   ```

2. 오른쪽 위의 **Changes**를 선택하여 코드 변경 내용을 엽니다.

   ![Changes 탭을 화살표로 가리키는 GitHub Copilot app 세션 패널 탭](/images/learning-hub/copilot-workshops/app-select-changes.png)

3. TypeScript 파일을 살펴보고 새로 생성된 TSDoc 주석을 확인합니다.

## 요약 및 다음 단계

앱이 지침 파일에서 컨텍스트를 가져오는 방식을 살펴보고 새 표준을 기능에 적용했습니다. 구체적으로 다음 작업을 수행했습니다.

- 리포지토리의 `copilot-instructions.md`와 경로 범위 `*.instructions.md` 파일을 살펴봤습니다.
- 코딩 표준을 준수하도록 지침 파일을 업데이트했습니다.
- 지침 파일이 생성된 코드에 미치는 영향을 확인했습니다.

다음으로 린트와 테스트를 일관되게 실행하도록 [재사용 가능한 quality-checks 스킬을 사용자 지정하고 실행][next-lesson]합니다.

## 리소스

- [GitHub Copilot 사용자 지정을 위한 지침 파일][instruction-files]
- [GitHub Copilot app 사용자 지정][customize-app]
- [사용자 지정 지침 만들기 모범 사례][instructions-best-practices]
- [Awesome Copilot의 지침 파일 및 기타 리소스 모음][awesome-copilot]

[next-lesson]: /ko-kr/learning-hub/copilot-workshops/app/5-agent-skills/
[instruction-files]: https://docs.github.com/copilot/customizing-copilot/about-customizing-github-copilot-chat-responses
[customize-app]: https://docs.github.com/copilot/how-tos/github-copilot-app/customize-github-copilot-app
[instructions-best-practices]: https://docs.github.com/copilot/concepts/prompting/response-customization#writing-effective-custom-instructions
[awesome-copilot]: https://awesome-copilot.github.com/
[custom-instructions-support]: https://docs.github.com/copilot/reference/custom-instructions-support
[tsdoc]: https://tsdoc.org/
[ui-instructions]: https://github.com/github-samples/tailspin-toys/blob/main/.github/instructions/ui.instructions.md
[astro-instructions]: https://github.com/github-samples/tailspin-toys/blob/main/.github/instructions/astro.instructions.md
[managing-issues-prs]: https://docs.github.com/copilot/how-tos/github-copilot-app/managing-issues-and-pull-requests