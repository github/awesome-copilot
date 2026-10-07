---
title: "레슨 5 - 프로젝트 게시"
description: "로컬 Space Quiz 실험 프로젝트를 공개 GitHub 리포지토리로 전환합니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

Space Quiz를 게시하여 이슈를 관리하고, 격리된 워크트리(Worktree)를 사용하고, 풀 리퀘스트(Pull request) 워크플로를 완료할 수 있도록 합니다.

이 레슨에서는 다음 작업을 수행합니다.

- 폴더를 Git 리포지토리로 초기화합니다.
- 공개 GitHub 리포지토리를 만들고 푸시합니다.
- Copilot app에서 프로젝트를 GitHub에 연결합니다.

## 리포지토리 게시

다음 프롬프트를 보냅니다.

```plaintext
Initialize this folder as a Git repository, create an initial commit, and create a new public GitHub repository named space-quiz in my account. Push the current branch and set it as the default branch. Refresh the project within this app so the GitHub project is linked.
```

> [!WARNING]
> 에이전트는 리포지토리를 만들거나 코드를 푸시하기 전에 확인을 요청합니다. 승인하기 전에 제안한 작업과 대상을 검토합니다.

에이전트가 작업을 마치면 다음을 수행합니다.

1. GitHub에서 새 리포지토리를 엽니다.
2. `index.html`이 있는지 확인합니다.
3. Copilot app으로 돌아가 프로젝트가 리포지토리에 연결되어 있는지 확인합니다.

## 요약 및 다음 단계

이제 프로젝트가 GitHub 리포지토리가 되었습니다. [레슨 6: 이슈 및 세션으로 작업하기][next-lesson]를 계속 진행합니다.

[next-lesson]: /ko-kr/learning-hub/copilot-workshops/first-steps/copilot-app/6-issues-and-sessions/
