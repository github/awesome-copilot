---
title: "레슨 6 - 이슈 및 세션으로 작업하기"
description: "범위가 명확한 백로그를 만들고, 이슈를 선택하고, 격리된 워크트리에서 구현한 뒤 변경 사항을 직접 검토합니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

에이전트에 범위가 명확한 제품 개선 사항을 제안하도록 요청하고, 아이디어를 GitHub 이슈로 만든 다음 격리된 세션에서 이슈 하나를 구현합니다.

이 레슨에서는 다음 작업을 수행합니다.

- Space Quiz를 위한 범위가 명확한 이슈 3개를 만듭니다.
- **Issues**에서 백로그를 살펴봅니다.
- 이슈에서 새 워크트리(Worktree)의 세션을 시작합니다.
- **Changes** 탭에서 변경 사항을 검토하고 기능을 검증합니다.

## Issues에서 백로그 만들기

다음 프롬프트를 보냅니다.

```plaintext
Review the space quiz and suggest three focused feature ideas that could each be completed in a short session. Create a separate GitHub issue for each idea with a clear title, user-focused description, and acceptance criteria. Do not implement them yet.
```

**Issues**를 열고 이슈 3개를 검토한 다음, 가치가 명확하고 범위를 감당할 수 있는 이슈 하나를 선택합니다.

![Copilot app의 Issues 화면 일러스트레이션. 사이드바에는 New, Pull requests, Issues, Automations, Customize, More 및 space-quiz 프로젝트가 나열되어 있습니다. 주요 영역에는 Assigned to me, Created by me, Mentioning me, Done 탭, 검색란, State 및 Assignee 필터, space-quiz 리포지토리의 열린 이슈 3개 목록이 있습니다.](/images/learning-hub/copilot-workshops/first-steps-app-issues.svg)

**Issues**는 모든 리포지토리의 GitHub 이슈를 앱으로 가져오고 **Assigned to me**, **Created by me**, **Mentioning me**, **Done**으로 필터링합니다.

## 이슈 구현

1. **Issues**에서 선택한 이슈를 엽니다.
2. **New session**을 선택합니다.
3. 메시지가 표시되면 **new worktree**를 선택합니다.
4. **Interactive** 모드와 선호하는 모델을 사용합니다.
5. 다음 프롬프트를 보냅니다.

   ```plaintext
   Implement this issue completely. Keep the single-file, dependency-free design, test the behavior in the integrated browser, and summarize the changes when finished.
   ```

새 워크트리는 검토하고 병합할 준비가 될 때까지 이 기능을 기본 브랜치와 격리합니다.

## 변경 사항 직접 검토하기

에이전트가 결과를 보고하면 보고 내용만 믿고 넘어가지 않습니다.

1. 오른쪽 플라이아웃 패널을 열고 **Changes** 탭을 선택합니다.
2. 세션에서 수정한 모든 파일의 변경 사항을 읽습니다.
3. 통합 브라우저에서 기능을 테스트하고 이슈의 인수 기준을 충족하는지 확인합니다.

![오른쪽 플라이아웃 패널에 Changes 탭이 열린 Copilot app 세션 일러스트레이션. 변경된 파일 1개인 index.html에 142줄 추가 및 8줄 삭제가 표시되며, 세션 대화 옆에 인라인 변경 사항이 나타납니다.](/images/learning-hub/copilot-workshops/first-steps-app-changes-tab.svg)

**Changes** 탭에는 세션에서 수정한 모든 파일과 인라인 변경 사항이 나열됩니다.

## 요약 및 다음 단계

백로그를 만들고, 격리된 세션에서 이슈 하나를 구현하고, 변경 사항을 검토했습니다. [레슨 7: 편집 전에 계획하기][next-lesson]를 계속 진행합니다.

[next-lesson]: /ko-kr/learning-hub/copilot-workshops/first-steps/copilot-app/7-plan-mode/
