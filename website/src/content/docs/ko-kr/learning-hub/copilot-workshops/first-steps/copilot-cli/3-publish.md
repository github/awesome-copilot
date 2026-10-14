---
title: "레슨 3 - 프로젝트 게시"
description: "프롬프트로 요청하거나 직접 명령을 실행하여 Space Quiz를 초기화하고 커밋하고 GitHub에 게시합니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

실험 프로젝트를 공개 GitHub 리포지토리로 전환합니다. 하나의 프롬프트로 요청하거나 직접 명령을 실행할 수 있습니다. 두 방식을 한 번씩 시도하면 에이전트가 대신 어떤 작업을 수행하는지 정확히 알 수 있습니다.

이 레슨에서는 다음 작업을 수행합니다.

- Git 리포지토리를 초기화하고 첫 커밋을 만듭니다.
- 공개 GitHub 리포지토리를 만들고 푸시합니다.
- 커밋과 파일이 반영되었는지 확인합니다.

## 옵션 A: 에이전트에 요청하기

다음 프롬프트를 보냅니다.

```plaintext
Initialize this folder as a Git repository, create an initial commit, and create a new public GitHub repository named space-quiz in my account. Push the current branch and set it as the default branch.
```

에이전트가 요청할 때마다 각 Git 및 GitHub 작업을 승인합니다.

## 옵션 B: 직접 실행하기

각 명령 앞에 `!`를 붙여 세션 안에서 실행하거나, 직접 사용하는 터미널에서 접두사 없이 명령을 실행합니다.

```plaintext
!git init -b main
!git add .
!git commit -m "Add space quiz"
!gh repo create space-quiz --public --source=. --push
```

마지막 명령은 [GitHub CLI][gh-cli]를 사용합니다. 설치되어 있지 않다면 GitHub에서 리포지토리를 만든 다음 `!git remote add origin <url>`과 `!git push -u origin main`을 실행합니다.

## 결과 확인

1. `!git log --oneline`을 실행하여 커밋이 반영되었는지 확인합니다.
2. GitHub에서 리포지토리를 열고 `index.html`이 있는지 확인합니다.

## 요약 및 다음 단계

이제 프로젝트는 정상 동작이 확인된 버전을 비교 기준으로 사용할 수 있는 GitHub 리포지토리입니다. [레슨 4: 이슈를 병렬로 작업하기][next-lesson]를 계속 진행합니다.

[gh-cli]: https://cli.github.com/
[next-lesson]: /ko-kr/learning-hub/copilot-workshops/first-steps/copilot-cli/4-issues-and-sessions/
