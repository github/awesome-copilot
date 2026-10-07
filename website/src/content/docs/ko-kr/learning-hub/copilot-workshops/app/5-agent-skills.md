---
title: "레슨 5 - quality-checks 스킬 사용자 지정 및 사용"
description: "기존 quality-checks 스킬을 살펴보고 보고서 형식을 사용자 지정한 다음 필터링을 검증합니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

코드 작성에는 코드 자체를 작성하는 것보다 더 많은 작업이 필요합니다. 코드가 작동하는지 수동으로 검증하고 지침 파일을 사용하여 표준을 따르게 했습니다. 하지만 테스트, 린트, 그 밖의 지속적 통합(CI) 요소는 어떻게 처리해야 할까요?

이러한 작업에는 **에이전트 스킬**이 가장 적합합니다. 스킬은 Copilot이 이런 작업을 올바르게 실행하는 방법을 이해하도록 돕습니다.

이 레슨에서는 다음 작업을 수행합니다.

- 기존 `quality-checks` 스킬을 살펴봅니다.
- 결과 형식을 사용자 지정합니다.
- 스킬을 실행하고 출력을 검토합니다.

## 시나리오

Tailspin Toys는 단위 테스트, 린트, 타입 검사에 `quality-checks` 스킬을 사용합니다. 팀은 결과를 더 쉽게 읽을 수 있도록 보고서를 개선하려고 합니다.

## 지침, 스크립트, 리소스

에이전트 스킬은 에이전트가 필요할 때 불러오는 재사용 가능한 작업 지침, 실행 가능한 스크립트, 보조 리소스를 묶습니다. 기본적으로 스킬 이름의 폴더와 `SKILL.md`라는 Markdown 파일로 구성됩니다. Markdown에는 스킬의 이름과 설명을 정의하는 프런트매터, 스킬의 기능 개요, 호출 시점에 관한 지침이 포함됩니다. 스킬 폴더에는 스크립트와 기타 리소스를 담는 하위 폴더도 포함할 수 있습니다.

> [!NOTE]
> 스킬에 추가 폴더와 파일이 반드시 필요한 것은 아닙니다. 이 예제의 스킬은 `npm` 명령으로 테스트와 린터를 실행하므로 추가 보조 파일이 필요하지 않습니다.

스킬은 프로젝트의 `.github/skills` 폴더에 두어 팀에서 공유하고 재사용하는 리포지토리 자산으로 만들거나, 일반적으로 `~/.copilot/skills`인 Copilot 루트 폴더에 둘 수 있습니다.

## 스킬 살펴보기

Tailspin Toys 팀이 단위 테스트, 린트, 타입 검사 실행을 위해 만든 `quality-checks` 스킬을 살펴봅니다.

1. **Files** 캔버스가 열려 있지 않으면 검토 패널에서 **+**, **File**을 차례로 선택합니다.
2. `.github/skills/quality-checks/SKILL.md`를 검색합니다.
3. 상단의 `name`과 `description`을 읽습니다. 설명은 Copilot이 스킬 호출 시점을 이해하는 데 도움이 됩니다.
4. 지침을 읽고 테스트와 린트 프로세스를 통해 Copilot을 안내하는 방식을 확인합니다.

## 변경 전 스킬 실행

스킬은 슬래시(`/`) 명령으로 직접 호출하거나 자연어로 호출할 수 있습니다. 스킬의 세 가지 검사를 실행하도록 Copilot에 요청합니다.

1. 모드 드롭다운에서 **Interactive**를 선택하여 Copilot이 해당 모드인지 확인합니다.
2. 다음 프롬프트로 스킬을 호출합니다.

    ```plaintext
    Run the quality-checks skill for unit tests, lint, and type checks.
    ```

3. 마지막에 표시되는 보고서를 확인합니다.

## 보고서 사용자 지정

무엇을 실행했는지, 성공했는지, 도구가 실제로 무엇을 보고했는지 보여 주는 더 나은 보고서를 원합니다. 이 보고서를 생성하도록 스킬을 업데이트합니다.

1. **Files** 캔버스로 돌아갑니다.
2. 아직 열려 있지 않으면 `.github/skills/quality-checks/SKILL.md`를 엽니다.
3. 파일 끝에 다음 섹션을 추가합니다.

    ```markdown
    ## Results output formatting

    Upon completion, report each command that ran and whether it passed, failed, or was blocked. Include test counts, durations, errors, warnings, and other metrics only when the tool reports them. Identify the next action for any failure or blocker, and never describe a skipped or incomplete check as passed.
    ```

파일이 자동으로 저장됩니다.

## 업데이트된 스킬 실행

변경 사항을 적용했으므로 같은 프롬프트를 사용하여 스킬을 실행해 봅니다.

1. 모드 드롭다운에서 **Interactive**를 선택하여 Copilot이 해당 모드인지 확인합니다.
2. 다음 프롬프트로 스킬을 호출합니다.

    ```plaintext
    Run the quality-checks skill for unit tests, lint, and type checks.
    ```

3. 마지막에 표시되는 보고서를 확인합니다.

## 요약 및 다음 단계

기존 에이전트 스킬을 사용자 지정하고 사용했습니다. 이 레슨에서는 다음 작업을 수행했습니다.

- 단위 테스트, 린트, 타입 검사를 위한 `quality-checks` 스킬을 살펴봤습니다.
- 결과 형식을 사용자 지정했습니다.
- 스킬을 실행하고 출력을 검토했습니다.

이 변경은 기능 PR에서 필터링과 함께 포함됩니다. 다음으로 Copilot이 [Playwright MCP 서버를 통해][next-lesson] 사이트와 직접 상호 작용하게 합니다.

## 더 많은 스킬 예제

이 커뮤니티 예제는 참고 자료이며 추가 작업이 아닙니다. 채택하기 전에 필수 조건과 동작을 검토합니다.

- [Agent Skills 명세][skill-spec].
- [기여 워크플로: `make-repo-contribution`][contribution-example].
- [요구 사항 문서: `prd`][prd-example].
- [다이어그램과 함께 제공되는 내보내기 스크립트: `drawio`][drawio-example].
- [브라우저 테스트: `webapp-testing`][browser-example].

업스트림 기여 예제의 이름은 `make-repo-contribution`이며, 이전 Tailspin 템플릿은 `make-contribution`이라는 다른 이름을 사용했습니다. 이 워크숍은 두 기여 스킬 중 어느 것에도 의존하지 않습니다.

[next-lesson]: /ko-kr/learning-hub/copilot-workshops/app/6-mcp-playwright/
[skill-spec]: https://agentskills.io/specification
[contribution-example]: https://github.com/github/awesome-copilot/tree/main/skills/make-repo-contribution
[prd-example]: https://github.com/github/awesome-copilot/tree/main/skills/prd
[drawio-example]: https://github.com/github/awesome-copilot/tree/main/skills/drawio
[browser-example]: https://github.com/github/awesome-copilot/tree/main/skills/webapp-testing
