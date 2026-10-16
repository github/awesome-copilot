---
title: "레슨 12 - GitHub Pages로 사이트 배포하기"
description: "GitHub Copilot app을 사용해 Pages 워크플로를 구성하고, 풀 리퀘스트를 검토한 뒤, 게시된 Space Quiz를 확인합니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-15
---

Space Quiz를 GitHub Pages에 배포하여 공개적으로 이용할 수 있도록 합니다. Copilot은 워크플로를 준비하고 배포 과정을 안내할 수 있지만, 변경 사항을 검토하고 사이트가 게시되었는지 확인하는 책임은 사용자에게 있습니다.

이 레슨에서는 다음을 수행합니다.

- Copilot에 GitHub Pages 배포 구성을 요청합니다.
- 병합하기 전에 워크플로와 풀 리퀘스트를 검토합니다.
- 배포 과정을 따라가고 게시된 사이트를 확인합니다.

## 시나리오

Space Quiz는 이미 GitHub 리포지토리에 있지만, 누구나 간단히 이용할 수 있는 방법은 아직 없습니다. 서버나 런타임 종속성을 추가하지 않고 GitHub Pages로 단일 파일 사이트를 게시하면 공개 URL에서 이용할 수 있습니다.

## Copilot에 사이트 배포 요청하기

`space-quiz`의 Copilot app 세션에서 다음 프롬프트를 보냅니다.

```plaintext
이 리포지토리에서 GitHub Pages를 활성화해 주세요. 필요한 경우 웹사이트를 빌드하고 GitHub Pages에 배포하는 GitHub Actions 워크플로를 만들어 주세요. 아직 README가 없다면 앱 소개와 로컬 실행 방법을 설명하는 README를 추가해 주세요. 변경 사항으로 풀 리퀘스트를 만들고 필수 검사가 통과하면 병합해 주세요. 배포가 성공할 때까지 모니터링한 다음 실제 웹사이트의 최종 URL을 알려 주세요. Pages를 활성화하거나 병합할 권한이 없다면 제가 무엇을 승인하거나 해야 하는지 정확히 알려 주세요. 사이트가 실제로 게시되기 전까지 성공했다고 보고하지 마세요.
```

![Space Quiz 풀 리퀘스트 병합, Build website·Upload artifact·Deploy to Pages 단계가 성공한 GitHub Actions 배포 실행, yourname.github.io/space-quiz/에서 열린 Space Quiz를 보여 주는 3단계 다이어그램](/images/learning-hub/copilot-workshops/first-steps-app-pages-deploy.svg)

> [!WARNING]
> 이 프롬프트는 에이전트에 풀 리퀘스트 생성 및 병합과 리포지토리의 Pages 설정 변경을 요청합니다. 진행하기 전에 diff, 배포 권한, GitHub의 승인 요청을 검토합니다.

## 워크플로 검토 및 배포 확인하기

1. 리포지토리에 README가 없는 경우에만 추가되었는지 확인합니다.
2. 워크플로의 빌드 및 배포 단계를 포함해 풀 리퀘스트 변경 사항을 검토합니다.
3. 필수 풀 리퀘스트 검사가 통과한 뒤에만 병합합니다.
4. GitHub Actions 배포 실행이 성공할 때까지 확인합니다.
5. 보고된 URL을 열어 Space Quiz가 로드되는지 확인합니다.

에이전트가 Pages를 활성화하거나 풀 리퀘스트를 병합할 수 없다면 제공된 구체적인 지침을 따릅니다. 배포가 성공하고 실제 사이트가 로드될 때까지 작업이 완료된 것으로 처리하지 않습니다.

## 요약 및 다음 단계

Space Quiz를 실제 사이트로 게시하고 에이전트의 보고에 의존하지 않고 배포를 확인했습니다. 다음으로 [레슨 13: 검토 및 다음 단계][next-lesson]를 진행합니다.

[next-lesson]: /ko-kr/learning-hub/copilot-workshops/first-steps/copilot-app/13-review/
