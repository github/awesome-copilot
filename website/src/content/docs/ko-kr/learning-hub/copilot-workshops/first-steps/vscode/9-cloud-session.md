---
title: "레슨 9 - 다음 아이디어를 클라우드 세션에 맡기기"
description: "Copilot Chat 하네스를 Local에서 Cloud로 전환하고, 풀 리퀘스트로 전달되는 독립적인 기능을 위임합니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

로컬에서 전체 작업 사이클을 완료했으므로 이제 좋은 결과가 어떤 모습인지 알게 되었습니다. 직접 지켜보지 않고 작업이 실행되게 할 적절한 시점입니다. Copilot Chat은 실행에 사용하는 하네스(Harness)를 로컬 컴퓨터에서 GitHub로 전환할 수 있습니다.

이 레슨에서는 다음 작업을 수행합니다.

- Copilot Chat 하네스를 **Local**에서 **Cloud**로 전환합니다.
- 인수 기준이 명확한 독립적인 기능을 위임합니다.
- 결과 풀 리퀘스트(Pull request)를 검토합니다.

> [!NOTE]
> 클라우드 세션에는 이용 자격이 있는 유료 Copilot 플랜이 필요합니다. Business와 Enterprise의 액세스도 관리자가 활성화해야 할 수 있습니다.

## 클라우드에 위임하기

![Harness 선택기가 열린 VS Code의 Copilot Chat 일러스트레이션. Copilot 아래에서 Local 대신 Cloud가 선택되어 있으며 Claude와 Codex 등 다른 하네스도 나열되어 있습니다. 위쪽에는 새로운 색상 테마 3개를 추가하라는 요청에 Working in the cloud와 GitHub에서 세션을 확인하는 링크가 표시됩니다.](/images/learning-hub/copilot-workshops/first-steps-vscode-cloud-harness.svg)

**Harness** 선택기에는 **Local** 또는 **Cloud**에서 실행되는 Copilot과 다른 하네스가 나열됩니다. **Cloud**로 전환하면 다음 요청은 로컬 컴퓨터가 아니라 GitHub에서 실행됩니다.

1. Copilot Chat에서 **Harness** 선택기를 열고 Copilot을 **Local**에서 **Cloud**로 전환합니다.
2. 새 세션을 시작하고 인수 기준이 명확한 독립적인 기능을 맡깁니다.

   ```plaintext
   Add a theme picker to the space quiz with three named themes: Deep Space, Launch Pad, and Lunar. Persist the choice in localStorage, keep everything in the single index.html with no dependencies, keep contrast accessible in every theme, and open a pull request when the tests pass.
   ```

3. 노트북을 닫습니다. 작업은 GitHub에서 계속되며 풀 리퀘스트로 전달됩니다.
4. 직접 작성한 풀 리퀘스트와 똑같이 주의 깊게 검토합니다.

> [!TIP]
> **설명할 수 있는 작업을 위임합니다**
>
> 클라우드 세션에는 정확한 작업 지침이 효과적입니다. 인수 기준을 작성할 수 없다면 아직 로컬 컴퓨터 밖으로 작업을 넘길 준비가 되지 않은 것입니다.

## 요약 및 다음 단계

클라우드 세션에 기능을 위임하고 결과를 검토했습니다. [레슨 10: 복습 및 다음 단계][next-lesson]를 계속 진행합니다.

[next-lesson]: /ko-kr/learning-hub/copilot-workshops/first-steps/vscode/10-review/
