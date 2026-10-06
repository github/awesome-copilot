---
title: "레슨 9 - 이슈 분류 자동화"
description: "최근 열린 이슈를 요약하는 주간 자동화를 만들고 실행합니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

자동화를 사용하여 반복되는 이슈 분류 작업을 예약된 에이전트 워크플로로 전환합니다.

이 레슨에서는 다음 작업을 수행합니다.

- 주간 자동화를 만듭니다.
- 자동화를 Space Quiz 프로젝트에 연결합니다.
- 자동화를 즉시 실행하고 결과를 검토합니다.

## 자동화 만들기

![All, Local, Cloud 필터, 검색란, Templates 및 New automation 버튼, space-quiz 프로젝트의 주간 자동화 카드 2개인 Issue triage와 Accessibility audit가 표시된 Copilot app의 Automations 화면 일러스트레이션.](/images/learning-hub/copilot-workshops/first-steps-app-automations.svg)

자동화는 일정에 따라 같은 프롬프트를 각각 별도의 세션에서 실행하므로 작업을 방해하지 않습니다. **All**, **Local**, **Cloud**로 필터링할 수 있으며 원하는 자동화를 필요할 때 실행할 수 있습니다.

1. **Automations**를 엽니다.
2. 새 주간 자동화용 템플릿을 선택합니다.
3. 다음 프롬프트를 입력합니다.

   ```plaintext
   Review the latest GitHub issues created and still open in the last week, and provide a summary table ranked by severity and priority.
   ```

4. 세션 모드를 **Autopilot**으로 설정합니다.
5. 모델을 **Auto**로 설정합니다.
6. `space-quiz` 프로젝트를 선택합니다.
7. **Create** 드롭다운을 열고 **Create and run**을 선택합니다.

생성된 요약을 검토하고 리포지토리에서 최근 생성되어 아직 열린 이슈를 참조하는지 확인합니다.

## 요약 및 다음 단계

일정에 따라 실행되는 재사용 가능한 에이전트 워크플로를 만들었습니다. [레슨 10: 원격으로 세션 이어가기][next-lesson]를 계속 진행합니다.

[next-lesson]: /ko-kr/learning-hub/copilot-workshops/first-steps/copilot-app/10-remote/
