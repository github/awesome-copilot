---
title: "레슨 9 - 캔버스 살펴보기 및 만들기"
description: "기존 Database Explorer 캔버스를 사용한 다음, 리포지토리에 저장되는 이슈 분류 캔버스를 만들고 검토합니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

지금까지 채팅을 통해 에이전트를 지시했습니다. 하지만 많은 작업은 대화가 아니라 보드, 문서, 검사 목록에서 이루어집니다. **캔버스**는 바로 이러한 작업을 위해 앱 안에서 사용자와 에이전트가 함께 사용하는 화면을 제공합니다. 이 레슨에서는 먼저 Tailspin Toys에 포함된 캔버스를 사용한 다음, 지금까지 처리한 백로그용 캔버스를 만듭니다.

이 레슨에서는 다음 작업을 수행합니다.

- 캔버스의 개념과 사용 시점을 이해합니다.
- 기존 Database Explorer 캔버스로 프로젝트 데이터를 살펴봅니다.
- 백로그를 분류하는 공유 Kanban 보드 캔버스를 만듭니다.
- 다른 기능을 구현하지 않고 새 캔버스를 살펴보고 사용해 봅니다.

## 시나리오

Tailspin Toys에는 데이터베이스를 살펴보는 캔버스가 이미 포함되어 있습니다. 캔버스가 프로젝트 데이터를 대화형 화면으로 바꾸는 방식을 확인한 다음, 다른 기능을 시작하지 않고 다음 작업을 선택할 수 있는 재사용 가능한 보드를 만듭니다.

## 캔버스란?

[캔버스][canvas-docs]는 계획, 분류 보드, 릴리스 검사 목록, 대시보드, 문서 같은 작업 산출물을 위한 공유 대화형 화면입니다. 채팅은 의도를 설명하고 모호한 부분을 함께 추론하는 데 유용하지만 대부분의 작업은 *화면*에서 이루어집니다. 캔버스를 사용하면 해당 화면에서 에이전트와 직접 협업할 수 있습니다.

캔버스는 **양방향**입니다. 에이전트가 작업하면서 캔버스를 업데이트할 수 있고 사용자도 동일한 화면을 편집할 수 있습니다. 캔버스를 만들면 에이전트가 프롬프트와 워크플로를 바탕으로 구축하며, 진행하면서 기능을 추가하거나 제거하거나 수정하도록 요청할 수 있습니다. 캔버스를 만들면 앱의 오른쪽 패널에서 열립니다.

일반적인 예는 다음과 같습니다.

- 하루를 계획하고 이슈와 끌어오기 요청의 우선순위를 정하는 **Markdown 캔버스**
- 사용자와 에이전트가 카드를 추가하고 열 사이에서 작업을 이동하는 **에이전트 Kanban 보드**
- 리포지토리의 주요 이슈와 반복되는 주제를 요약하는 **이슈 분류 보드**

## 캔버스를 사용하는 이유

작업에 구조화, 반복, 검증이 필요하고 채팅만으로 충분하지 않다면 캔버스를 사용합니다. 캔버스로 다음 작업을 수행할 수 있습니다.

- 워크플로에 맞는 실제 산출물을 기반으로 에이전트가 작업하게 합니다.
- 공유 화면에서 작업을 직접 안내하거나 수정한 다음 에이전트가 변경 내용에서 계속 작업하게 합니다.
- 채팅 응답만 보는 대신 산출물의 눈에 보이는 변경으로 진행 상황을 확인합니다.

## Database Explorer 캔버스 사용

프로젝트의 기존 Database Explorer 캔버스부터 사용합니다. 직접 만들기 전에 작동하는 예제를 사용하여 리포지토리 범위 캔버스의 동작을 확인합니다.

1. 필터링 끌어오기 요청(PR)이 병합되었는지 확인하고 로컬 `main`을 업데이트합니다.
2. GitHub Copilot app으로 돌아가 **Home screen**을 선택합니다.
3. `tailspin-toys`가 선택된 리포지토리인지 확인합니다.
4. 업데이트된 `main`을 기반으로 하는 **new working tree**에서 세션을 만들고 **Interactive** 모드를 선택합니다.
5. 필요한 경우 로컬 데이터베이스를 준비하고 기존 캔버스를 변경하지 않은 채 열도록 Copilot에 요청합니다.

    ```plaintext
    Set up the local database if needed, then open the repository's Database Explorer canvas. Do not change any files.
    ```

6. Database Explorer에서 사용 가능한 테이블을 살펴보고 `games`를 선택합니다.
7. 평점이 높은 게임 5개를 보여 주는 읽기 전용 쿼리를 실행합니다.

    ```sql
    SELECT title, star_rating
    FROM games
    ORDER BY star_rating DESC
    LIMIT 5;
    ```

8. 결과에 게임이 5개 이하로 포함되고 평점 내림차순으로 정렬되는지 확인합니다.
9. **Files**를 열고 `.github/extensions/database-explorer/extension.mjs`를 살펴봅니다. 캔버스가 프로젝트와 함께 저장되고 쿼리를 읽기 전용 `SELECT` 및 `WITH` 문으로 제한하는 방식을 확인합니다.
10. 세션에 변경된 파일이 없는지 확인합니다.

## 이슈 분류 캔버스 만들기

이제 다른 유형의 공유 화면을 만듭니다. 이슈 분류 캔버스를 프로젝트 범위에 저장하면 팀에서 검토하고 재사용할 수 있는 리포지토리 자산이 됩니다.

1. 동일한 세션에서 `/create-canvas`를 입력한 다음 만들려는 캔버스를 설명합니다.

   ```plaintext
   Create a Kanban triage canvas for this repo's open issues and save it under .github/extensions/. Highlight the three issues you'd prioritize and explain why, with the rest below. Include summaries and links.

   Give each card an "Add to current context" action that adds the issue details without starting work or changing the issue. Make it keyboard-accessible and open it so I can try it.
   ```

Copilot은 `.github/extensions` 아래에 캔버스 확장을 만들고 앱의 오른쪽 패널에 공유 화면을 엽니다. 생성된 확장은 단순한 시각적 산출물이 아니라 실행 가능한 리포지토리 콘텐츠이므로 다음으로 파일과 동작을 살펴봅니다.

## 캔버스 검토 및 사용

1. **Changes**를 열고 캔버스 정의가 사용자나 세션 전용이 아니라 리포지토리의 `.github/extensions/` 아래에 저장되었는지 확인합니다. 기존 확장과 애플리케이션 파일이 변경되지 않았는지 확인합니다.
2. 보드를 실제 열린 이슈와 비교하고 순위 설명을 평가합니다.
3. 카드와 컨트롤이 읽기 쉽고 키보드로 사용할 수 있는지 확인합니다.
4. 이슈의 **Add to current context**를 선택하고 세부 정보만 대화에 들어오는지 확인합니다. 구현이나 이슈 상태 변경이 시작되면 안 됩니다.
5. 수정 사항을 검토하고 변경된 파일에 적용되는 기존 검증을 실행하도록 Copilot에 요청합니다. 대화형 화면이 열렸다는 이유로 올바르다고 가정하지 말고 결과와 차단 요인을 기록합니다.
6. 캔버스를 변경해야 한다면 이슈 분류 범위 안에서 집중된 개선을 요청한 다음 영향을 받는 검사를 반복합니다. 이 캔버스 작업의 일부로 백로그 이슈를 구현하지 않습니다.

워크숍에서는 이미 직접 병합과 Agent Merge를 모두 연습했으므로 다른 PR을 만들기 전에 종료합니다. 프로덕션에서는 다른 사용자가 캔버스를 사용하기 전에 팀의 일반 프로세스로 검토하고 병합합니다.

## 요약 및 다음 단계

사용자와 에이전트가 협업하는 공유 화면을 만들었습니다. 다음 작업을 수행했습니다.

- 캔버스의 개념과 사용 시점을 배웠습니다.
- 기존 Database Explorer 캔버스로 프로젝트 데이터를 살펴봤습니다.
- 백로그를 분류하는 공유 Kanban 보드 캔버스를 만들었습니다.
- 다른 기능을 구현하지 않고 새 캔버스를 살펴보고 사용해 봤습니다.

백로그를 추적하도록 설정했으므로 지금까지 구축한 항목과 다음 단계를 돌아봅니다. [레슨 10 - 마무리 및 다음 단계][next-lesson]를 계속 진행합니다.

## 리소스

- [GitHub Copilot app에서 캔버스 확장 사용][canvas-docs]
- [Awesome Copilot의 캔버스][awesome-copilot-canvases]
- [GitHub Copilot app 정보][about-copilot-app]

[next-lesson]: /ko-kr/learning-hub/copilot-workshops/app/10-review/
[canvas-docs]: https://docs.github.com/copilot/how-tos/github-copilot-app/working-with-canvas-extensions
[awesome-copilot-canvases]: https://awesome-copilot.github.com/extensions/
[about-copilot-app]: https://docs.github.com/copilot/concepts/agents/github-copilot-app