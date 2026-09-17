---
title: "Lesson 4 - Autopilot으로 기능 구축"
description: "GitHub Copilot app의 Plan 및 Autopilot 모드로 정적 클라이언트 쪽 필터링 기능을 구축하고, 문서화 표준이 적용되는지 확인하고, 에이전트 스킬로 검증합니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-08-03
---

지금까지 프로젝트를 작게 몇 차례 업데이트했습니다. 하지만 더 큰 변경에는 더 탄탄한 프로세스가 필요합니다. GitHub Copilot app은 기존 흐름과 함께 작동하도록 구축되어 올바른 항목을 올바른 방식으로 만들 수 있게 합니다. 이 레슨은 일반적인 개발 프로세스를 따르는 세 레슨 중 첫 번째입니다. 이슈를 사용하여 새 기능을 생성하고 에이전트 스킬로 검증 테스트와 린터를 실행합니다.

이 레슨에서는 다음 작업을 수행합니다.

- 필터링 이슈에서 새 세션을 시작합니다.
- **Plan** 모드로 기능을 계획한 다음 **Autopilot**으로 구축합니다.
- 생성된 코드가 이전에 병합한 문서화 표준을 따르는지 확인합니다.
- 프로젝트의 `quality-checks` 스킬로 작업을 검증합니다.

## 시나리오

홈페이지에는 모든 게임이 표시되지만 방문자는 목록을 좁힐 수 없습니다. 필터링 이슈에서는 **category**와 **publisher**로 게임을 필터링할 수 있게 해 달라고 요청합니다. Copilot을 사용하여 이 기능을 구현합니다.

## 배경

AI 코딩 에이전트를 개발 흐름에 도입해도 기본 원칙은 달라지지 않습니다. 오히려 더 중요해집니다. 대부분의 개발자는 다음과 비슷한 흐름을 따릅니다.

1. 수행할 작업의 세부 정보가 담긴 이슈를 엽니다.
2. 구축할 항목을 계획합니다.
3. 코드를 구축하고 검토합니다.
4. 테스트를 실행하여 코드를 검증합니다.
5. 새 기능을 수동으로 검증합니다.
6. 끌어오기 요청(PR)을 만듭니다.
7. 코드를 검토하고 지속적 통합 프로세스가 성공하면 코드를 병합합니다.

> [!NOTE]
> 정확한 세부 사항은 팀과 조직에 따라 달라지지만 대부분 위 주제의 변형입니다.

이 표준 접근 방식을 따르면 AI가 생성한 코드가 요구 사항을 충족하고 사람이 작성한 코드와 동일한 검증 과정을 거치게 할 수 있습니다.

## 세션 모드

**세션 모드**는 에이전트의 자율성 수준을 제어합니다. 프롬프트 필드 아래의 드롭다운에서 설정하고 언제든지 변경할 수 있습니다.

- **Interactive**: 사용자와 에이전트가 함께 작업합니다. 에이전트는 변경을 제안하고 진행하기 전에 사용자의 입력을 기다립니다.
- **Plan**: 에이전트가 먼저 계획을 만듭니다. 에이전트가 실행하기 전에 계획을 검토하고 승인합니다.
- **Autopilot**: 에이전트가 입력을 기다리지 않고 코드 작성, 테스트 실행, 반복 작업을 완전히 자율적으로 수행합니다.

## 필터링 기능 계획

잠재적인 문제는 코드를 작성하기 전에 발견하는 것이 가장 좋으며, 사전 계획이 이를 돕습니다. Copilot에 계획을 요청하면 단계와 접근 방식을 문서화합니다. 계획을 검토하고 개선 제안을 한 후 해당 계획을 바탕으로 Copilot이 코드를 생성하게 할 수 있습니다.

이슈를 열고 새 세션을 시작한 다음 Plan 모드로 전환하여 계획을 만듭니다.

1. 탐색 탭에서 **My work**를 선택합니다.
2. **Allow users to filter games by category and publisher** 이슈를 선택합니다.
3. 오른쪽 위의 **New session**을 선택합니다.

   ![오른쪽 위의 New session 버튼을 화살표로 가리키는 GitHub Copilot app 이슈 보기](/images/learning-hub/copilot-workshops/app-new-session-from-issue.png)

4. 모드에 **Plan**이 표시될 때까지 <kbd>Shift</kbd>+<kbd>Tab</kbd>을 선택합니다.

   ![Plan으로 설정된 모드 선택기를 화살표로 가리키는 GitHub Copilot app 프롬프트 상자](/images/learning-hub/copilot-workshops/app-4-plan-mode.png)

5. 다음 프롬프트를 보냅니다. 이슈에서 세션을 시작했으므로 필터링 이슈는 이미 세션의 컨텍스트에 있습니다.

   ```plaintext
   Plan the work based on the requirements documented in the issue. Please ask any clarifying questions you might have as you build the plan.
   ```

6. 에이전트가 계획을 세우면서 후속 질문을 할 수 있습니다. 기능을 구축할 방식에 따라 답변합니다.

> [!NOTE]
> Copilot은 확률적으로 작동하므로 정확한 후속 질문은 달라질 수 있으며 질문을 하지 않을 수도 있습니다. 이는 정상입니다.

7. 완료되면 Copilot이 계획 요약을 제공합니다. 계획을 검토합니다. 쿼리 구축, 필터 컨트롤 추가, 테스트를 제안해야 합니다. 원하는 경우 피드백을 제공하여 구체화할 수 있으며 에이전트는 제안을 새 버전에 반영합니다.

## Autopilot으로 구축

계획을 만들었으므로 Copilot이 구현을 구축하게 합니다.

1. **Plan summary** 대화 상자의 옵션 목록에서 **Approve and implement with autopilot**과 가장 가까운 옵션을 선택합니다.

Copilot이 구현 작업을 시작합니다.

> [!NOTE]
> Copilot이 필요한 코드를 자동으로 만들기 시작하지 않으면 "Go ahead and start building out the plan!" 같은 프롬프트로 요청할 수 있습니다.
>
> 필요한 업데이트를 만드는 데 몇 분 정도 걸립니다. 에이전트는 파일을 편집하고 만들며, 테스트를 작성하고 실행하고, 반복해서 개선합니다. 지금까지 살펴본 내용을 돌아보거나 잠시 쉬어도 좋습니다.

## 변경 내용 검토

AI가 생성한 모든 코드는 병합 전에 검토해야 합니다. 코드를 검토하고 사이트를 실행하여 올바르게 작동하는지 확인합니다.

1. 오른쪽 위의 **Changes**를 선택하여 코드 변경 내용을 엽니다.

   ![Changes 탭을 화살표로 가리키는 GitHub Copilot app 세션 패널 탭](/images/learning-hub/copilot-workshops/app-select-changes.png)

2. 변경 내용을 검토합니다. 새 TypeScript, Astro, 테스트 파일이 표시되어야 합니다. 새 도우미 함수에 TSDoc doc comments와 파일 헤더 주석이 있는지 확인합니다. 레슨 3에서 병합한 문서화 표준이 요청 없이 자동으로 적용된 것입니다.
3. Copilot app 오른쪽의 검토 패널에서 **Terminal**을 선택합니다. **Terminal** 버튼이 없으면 **+**(**Open in panel** 레이블)를 선택한 다음 **Terminal**을 선택합니다.

   ![GitHub Copilot app 검토 패널의 Terminal 버튼](/images/learning-hub/copilot-workshops/app-terminal-screenshot.png)

4. 터미널 창에 다음 명령을 입력하여 웹앱의 개발 서버를 시작합니다.

   ```shell
   npm run dev
   ```

5. 서버가 시작되면 브라우저 창을 엽니다. 잠시만 기다리면 됩니다.
6. [http://localhost:4321](http://localhost:4321)로 이동합니다.
7. 이제 랜딩 페이지에 필터가 표시되어야 합니다.
8. 올바르게 보이지 않는 항목이 있으면 Copilot에 업데이트를 요청할 수 있습니다.
9. 만족하면 터미널 창으로 돌아갑니다.
10. <kbd>Ctrl</kbd>+<kbd>C</kbd>를 선택하여 개발 서버를 중지합니다.

## quality-checks 스킬로 작업 검증

diff를 눈으로 확인하고 끝낼 수도 있지만 팀에는 정해진 품질 기준과 이를 반복해서 확인하는 방법이 있습니다.

**에이전트 스킬(Agent skills)**은 테스트 실행, 빌드 생성, 끌어오기 요청 만들기처럼 반복 가능한 작업을 수행하는 방법을 Copilot에 안내합니다. 스킬은 에이전트가 필요할 때 불러올 수 있는 지침, 스크립트, 리소스가 담긴 폴더입니다. [Agent Skills는 공개 표준][agent-skills-repo]이며 다양한 에이전트에서 사용되므로 동일한 스킬을 에이전트 모드의 Copilot Chat, Copilot cloud agent, Copilot CLI, GitHub Copilot app에서 사용할 수 있습니다.

스킬은 프로젝트의 `.github/skills` 폴더 또는 전역 `~/.copilot/skills`에 있습니다. 각 스킬은 YAML frontmatter의 `name`과 `description` 뒤에 Markdown 지침이 이어지는 `SKILL.md` 파일을 포함하는 폴더입니다.

```yaml
---
name: quality-checks
description: Run the project's test suites and linter to verify code changes are ready to commit, push, or merge.
---
```

스킬에는 스크립트, 자산, 참조 자료가 담긴 하위 폴더도 포함할 수 있습니다. 전체 구조는 [에이전트 스킬 사양][agent-skills-spec]에서 확인할 수 있습니다.

> [!TIP]
> 스킬은 동적으로 불러옵니다. 에이전트는 `description` 필드를 바탕으로 적용할 스킬을 결정하므로, 명확하고 시나리오에 맞는 설명이 있어야 스킬을 제대로 사용할 수 있습니다.

## quality-checks 스킬 살펴보기

스킬의 작동 방식을 살펴봅니다.

1. 검토 패널이 표시되지 않으면 오른쪽 위의 **Toggle review panel**을 선택하여 엽니다.

   ![Create PR 오른쪽의 Toggle review panel 버튼을 화살표로 가리키는 GitHub Copilot app 위쪽 도구 모음](/images/learning-hub/copilot-workshops/app-2-review-panel.png)

2. 검토 패널에 새 항목을 추가하려면 **+**를 선택합니다.
3. **File**을 선택합니다.
4. `SKILL.md`를 검색합니다.
5. 파일 목록에서 `SKILL.md .github/skills/quality-checks`를 선택하여 엽니다.
6. `name`과 `description`을 확인합니다. 설명은 커밋, 푸시, 병합 전에 코드 변경을 테스트하거나 린팅하거나 검증할 때 이 스킬을 사용하라고 에이전트에 알려 줍니다.
7. 스킬을 읽습니다. 어떤 스크립트가 어떤 도구 모음(단위 테스트, Playwright 엔드투엔드 테스트, ESLint)을 어떤 순서로 실행하는지, 일반적인 실패를 디버그하는 방법은 무엇인지 확인합니다. 따라서 에이전트가 추측하지 않고 팀의 방식대로 검사를 실행합니다.

## 검사 실행

동일한 필터링 세션에서 에이전트에게 작업을 검증하도록 요청합니다. 스킬 이름을 설명하지 않아도 에이전트가 요청과 일치시킵니다.

1. Copilot app으로 돌아갑니다.
2. 슬래시 명령 `/quality-checks`를 사용하여 스킬을 직접 호출하고 <kbd>Enter</kbd>를 선택합니다.
3. 에이전트는 스킬에 따라 단위 테스트, 린터, 엔드투엔드 테스트를 실행하고 결과를 보고합니다. 실패하는 항목이 있으면 문제를 수정하고 모두 통과할 때까지 검사를 다시 실행하도록 요청합니다.
4. **이 세션을 열어 둡니다.** 다음 레슨에서 Playwright MCP 서버를 추가하고 실제 브라우저에서 필터링 기능이 작동하는지 확인합니다.

## 요약 및 다음 단계

실제 기능을 처음부터 끝까지 구축하고 팀의 품질 기준에 맞게 검증했습니다. 구체적으로 다음 작업을 수행했습니다.

- 최신 프로젝트의 필터링 이슈에서 새 세션을 시작했습니다.
- Plan 모드로 기능을 계획하고 Autopilot으로 구축했습니다.
- 생성된 도우미가 레슨 3에서 병합한 문서화 표준을 따르는지 확인했습니다.
- `quality-checks` 스킬로 작업을 검증했습니다.

다음으로 Playwright MCP 서버를 연결하고 에이전트에게 실제 브라우저에서 필터링 기능을 살펴보도록 요청합니다. [레슨 5 - Playwright MCP 서버로 테스트][next-lesson]를 계속 진행합니다.

## 리소스

- [GitHub Copilot app에서 에이전트 세션 사용][agent-sessions]
- [Agent Skills 정보][about-agent-skills]
- [GitHub Copilot app 사용자 지정][customize-app]
- [GitHub Copilot용 클라우드 및 로컬 샌드박스 정보][sandboxes]

[ex0]: /ko-kr/learning-hub/copilot-workshops/app/0-prerequisites/
[ex2]: /ko-kr/learning-hub/copilot-workshops/app/2-add-star-rating/
[ex3]: /ko-kr/learning-hub/copilot-workshops/app/3-custom-instructions/
[next-lesson]: /ko-kr/learning-hub/copilot-workshops/app/5-mcp-playwright/
[agent-sessions]: https://docs.github.com/copilot/how-tos/github-copilot-app/agent-sessions
[about-agent-skills]: https://docs.github.com/copilot/concepts/agents/about-agent-skills
[customize-app]: https://docs.github.com/copilot/how-tos/github-copilot-app/customize-github-copilot-app
[sandboxes]: https://docs.github.com/copilot/concepts/about-cloud-and-local-sandboxes
[agent-skills-repo]: https://github.com/agentskills/agentskills
[agent-skills-spec]: https://agentskills.io/specification