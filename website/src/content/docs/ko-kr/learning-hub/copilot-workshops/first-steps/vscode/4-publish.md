---
title: "레슨 4 - 프로젝트 게시"
description: "VS Code에 내장된 Source Control 통합만으로 Space Quiz를 초기화하고 커밋하고 게시합니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
---

내장 Git 통합만으로 테스트를 마친 퀴즈를 GitHub에 게시하고, Copilot이 실제 변경 사항을 바탕으로 커밋 메시지 초안을 작성하게 합니다.

이 레슨에서는 다음 작업을 수행합니다.

- **Source Control**에서 리포지토리를 초기화합니다.
- 스테이징된 변경 사항을 바탕으로 커밋 메시지를 생성합니다.
- 새 공개 GitHub 리포지토리에 브랜치를 게시합니다.

## 초기화, 커밋, 게시

1. **Source Control**을 열고 **Initialize Repository**를 선택합니다.
2. 파일을 스테이징합니다.
3. 커밋 메시지 입력란의 **sparkle pencil** 아이콘을 선택하여 Copilot이 스테이징된 변경 사항을 바탕으로 메시지를 작성하게 합니다. 메시지를 읽고 잘못된 부분을 수정한 다음 커밋합니다.
4. **Publish Branch**를 선택하고 GitHub에 공개 `space-quiz` 리포지토리를 만듭니다.
5. 테스트한 파일이 GitHub에 있는지 확인합니다.

![VS Code의 Source Control 보기 일러스트레이션. Changes 목록에는 index.html과 .github/copilot-instructions.md가 표시되어 있습니다. 커밋 메시지 입력란의 반짝이는 버튼에 대한 설명은 Copilot wrote your message이며, 메시지는 Add per-question timer to the quiz입니다. Commit 버튼 아래에는 Create Pull Request 버튼이 강조 표시되어 있으며, 먼저 커밋하면 이 버튼이 Source Control 안에 나타난다는 안내가 있습니다.](/images/learning-hub/copilot-workshops/first-steps-vscode-commit.svg)

반짝이는 버튼은 스테이징된 변경 사항을 바탕으로 커밋 메시지 초안을 작성합니다. 커밋하면 **Source Control**에서 풀 리퀘스트(Pull request) 생성도 제안합니다.

## 요약 및 다음 단계

이제 테스트를 마친 퀴즈가 GitHub에 게시되었습니다. [레슨 5: 편집 전에 계획하기][next-lesson]를 계속 진행합니다.

[next-lesson]: /ko-kr/learning-hub/copilot-workshops/first-steps/vscode/5-plan-mode/
