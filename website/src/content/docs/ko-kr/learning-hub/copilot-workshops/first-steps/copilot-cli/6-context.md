---
title: "레슨 6 - 에이전트가 볼 수 있는 내용 파악하기"
description: "/context로 컨텍스트 윈도우를 채우는 내용을 살펴보고, 대화가 주제에서 벗어나면 /clear로 새로 시작합니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

터미널 명령으로 컨텍스트를 확인하고 의도적으로 관리할 수 있습니다. 에이전트가 볼 수 있는 내용을 알면 결과를 이해하고 언제 새로 시작할지 판단하는 데 도움이 됩니다.

이 레슨에서는 다음 작업을 수행합니다.

- `/context`로 컨텍스트 윈도우(Context window)를 살펴봅니다.
- 각 부분이 윈도우에서 차지하는 공간을 확인합니다.
- `/clear`로 주제에서 벗어난 대화를 초기화합니다.

## 컨텍스트 살펴보기

1. `/context`를 실행하여 파일, 지침, 대화 기록을 살펴봅니다.
2. 각 부분이 윈도우에서 얼마나 많은 공간을 사용하는지 확인합니다.
3. 대화가 주제에서 벗어나면 `/clear`를 실행하여 새로 시작합니다.
4. 다른 변경을 요청하기 전에 적절한 파일을 다시 추가합니다.

![Copilot CLI에서 /context를 실행한 뒤의 출력 일러스트레이션. 컨텍스트 윈도우 사용량은 61%로 표시되며 대화, 읽은 파일, 지침으로 나뉩니다. 남은 공간이 적으면 /compact로 요약하거나 새 세션을 시작하라는 안내가 있습니다.](/images/learning-hub/copilot-workshops/first-steps-cli-context.svg)

`/context`는 컨텍스트 윈도우를 정확히 무엇이 채우는지, 공간이 얼마나 남았는지 보여 줍니다. 남은 공간이 적으면 `/compact`로 대화를 요약하거나 새 세션을 시작합니다.

## 요약 및 다음 단계

이제 에이전트가 아는 내용을 확인하고 관리할 수 있습니다. [레슨 7: 세션 재개 및 원격 이용][next-lesson]을 계속 진행합니다.

[next-lesson]: /ko-kr/learning-hub/copilot-workshops/first-steps/copilot-cli/7-resume-and-remote/
