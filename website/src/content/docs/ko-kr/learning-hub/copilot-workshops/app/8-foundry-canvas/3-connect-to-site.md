---
title: "에이전트를 사이트에 연결"
description: "자격 증명을 안전하게 보호하는 로컬 프록시로 호스팅 Backer Concierge를 통합하고 위젯을 엔드투엔드로 테스트합니다."
authors:
  - GitHub Copilot Learning Hub Team
lastUpdated: 2026-10-05
prev:
  link: /ko-kr/learning-hub/copilot-workshops/app/8-foundry-canvas/2-build-and-deploy/
  label: 에이전트 빌드 및 배포
next: { link: /ko-kr/learning-hub/copilot-workshops/app/10-review/, label: 검토 및 다음 단계 }
---

마지막 모듈에서는 [에이전트 빌드 및 배포][previous-module]에서 테스트한 호스팅 에이전트를 로컬에서 실행하는 Tailspin Toys 웹사이트에 연결합니다.

이 모듈을 마치면 다음을 갖추게 됩니다.

- Foundry 자격 증명과 대화 식별자를 보호하는 로컬 Azure Functions 프록시(Proxy)
- 엔드투엔드(End-to-end) 동작을 검증한 접근성 있는 채팅 위젯
- 로컬에서 검증한 통합과 리소스 정리 체크포인트

## 시나리오

Tailspin Toys 후원자는 게임을 둘러보는 곳에서 카탈로그 관련 안내를 받아야 합니다. Backer Concierge는 대화를 유지하고 키보드 탐색을 지원하며, 제공되지 않는 정보와 오류를 명확하게 처리해야 합니다. 이러한 편의성을 제공하더라도 서비스 자격 증명이나 내부 대화 세부 정보를 브라우저에 노출해서는 안 됩니다.

## 호스팅 에이전트 체크포인트에서 재개

통합할 때는 새 Foundry 리소스를 만드는 대신 기존 호스팅 에이전트를 사용합니다.

1. 이전 모듈의 동일한 Tailspin Toys 리포지토리, 워크트리(Worktree) 브랜치, **Add a Backer Concierge assistant for catalog questions** 이슈 세션으로 돌아갑니다. 루트 `azure.yaml`, 에이전트 소스, 카탈로그가 있는지 확인하고, 기록해 둔 구독, 전용 리소스 그룹, Foundry 프로젝트, 모델 배포, 테스트한 호스팅 에이전트 버전을 확인합니다.
2. 리소스를 정리했다면 통합하기 전에 관련 [프로젝트와 모델][project-module] 및 [테스트한 호스팅 배포][previous-module]를 복원합니다.

## 서버 측 프록시 빌드

Tailspin Toys는 전체를 사전 렌더링합니다. 브라우저 코드는 호스팅 에이전트를 직접 호출하거나 Foundry 자격 증명을 받아서는 절대 안 됩니다. 로컬 Azure Functions의 **서버 측 자격 증명 경계**에서 Foundry 인증을 처리하고 브라우저에는 에이전트 응답만 반환합니다. 브라우저는 각 메시지를 불투명한 대화 핸들(Opaque conversation handle)과 함께 전송합니다. 프록시는 내부 식별자를 노출하지 않고 해당 핸들을 Foundry 대화에 매핑합니다.

Azure 자격 증명에 액세스할 수 있는 코드는 프록시뿐입니다. 이 워크숍에서는 Function과 사이트를 로컬에서 실행하며, Astro 개발 서버가 `/api` 요청을 Function으로 전달합니다.

> [!IMPORTANT]
> 이 워크숍 프록시는 로컬 개발 전용입니다. 익명 공개 엔드포인트로 배포해서는 안 됩니다. 프로덕션 통합에는 적절한 속도 제한 또는 할당량, CORS 제한, 모니터링, 비용 제어를 포함하여 애플리케이션에 맞게 설계한 인증 및 악용 방지 방안이 필요합니다.

3. 동일한 Copilot 세션에서 다음을 입력합니다.

   ```plaintext
   Add a local Azure Functions proxy in api for the static Astro site to call my deployed Backer Concierge during development. Use my existing local Azure sign-in, keep credentials and Foundry conversation identifiers out of the browser, return an opaque conversation handle, validate requests, sanitize errors, and add focused tests. Configure the Astro development server so /api requests reach the local Function. Don't create public deployment infrastructure.
   ```

4. 생성된 프록시와 집중 테스트를 검토하여 요청 유효성 검사, 민감한 정보를 제거한 오류, 불투명한 대화 핸들, 서버 전용 자격 증명 경계를 확인합니다. Copilot에 집중 테스트를 실행하고 실패한 부분을 수정하도록 요청합니다.
5. 다른 터미널을 열고 Copilot이 제공한 명령으로 로컬 Function을 시작한 다음 실행 상태로 둡니다.
6. 채팅으로 돌아가 Copilot에 로컬 프록시를 테스트하도록 요청합니다.

   ```plaintext
   Test the local /api/concierge endpoint by asking "Which games are under $30?" Show me the sanitized response and confirm that no credentials or internal conversation identifiers are returned.
   ```

7. 응답을 검사합니다. 카탈로그에 가격 정보가 없음을 설명해야 합니다. Foundry 토큰, 자격 증명, 내부 대화 식별자, 프로젝트 엔드포인트, 스택 추적이 포함되어 있지 않은지 확인합니다. Function에 연결할 수 없거나 응답이 세부 정보를 유출하거나 가격을 지어내면, 민감한 정보를 제거한 실패 내용을 Copilot에 전달하고 수정한 다음, 계속하기 전에 프록시 테스트를 다시 실행합니다.

   ![로컬 프록시 테스트](/images/learning-hub/copilot-workshops/app-8-local-proxy-test.png)

## 채팅 위젯 빌드 및 테스트

프록시가 실행 중인 상태에서 위젯은 Foundry 세부 정보를 노출하지 않고 사이트에 대화 화면을 제공합니다.

8. Copilot에 사이트 통합을 구현하도록 요청합니다.

   ```plaintext
   Add an accessible Backer Concierge chat widget to the Astro site. Connect it to /api/concierge, preserve the conversation using the returned opaque handle, follow the existing design guidance, support keyboard use, keep Foundry details out of the browser, and add end-to-end tests covering the chat flow, conversation continuity, accessibility, error handling, and grounding boundaries.
   ```

9. 다른 터미널에서 Copilot이 제공한 명령으로 Astro 개발 서버를 시작합니다. 사이트와 로컬 Function을 모두 실행 상태로 유지합니다.
10. Copilot에 엔드투엔드 테스트를 실행하도록 요청합니다.

    ```plaintext
    Run the end-to-end tests for the Backer Concierge widget in the Tailspin Toys site. Verify its core chat flow, conversation continuity, accessibility, error handling, grounding boundaries, and secure use of the local proxy. Report the results and include evidence for any failures.
    ```

11. 보고서를 검토하고 키보드 사용과 [호스팅 에이전트 승인 검사][agent-checks]의 두 턴 대화를 포함하여 보고된 동작을 브라우저에서 검증합니다. 브라우저 요청이 Foundry로 직접 전송되지 않고 불투명한 핸들과 함께 `/api/concierge`를 거치는지, 응답에 자격 증명이나 내부 Foundry 식별자가 노출되지 않는지 확인합니다. 추천과 누락된 정보에 대한 답변이 카탈로그 범위 안에 머무르는지 확인합니다. 실패한 테스트를 Copilot과 함께 해결하고 필요한 경우 영향을 받는 로컬 서비스를 다시 시작한 다음 테스트를 다시 실행합니다.

    ![Backer Concierge 위젯의 엔드투엔드 테스트 결과](/images/learning-hub/copilot-workshops/app-8-e2e-test-results.png)

## 체크포인트 및 다음 단계

자격 증명을 안전하게 보호하는 로컬 프록시를 빌드하고 접근성 있는 채팅 위젯을 연결한 다음, 호스팅 Backer Concierge를 대상으로 전체 대화 흐름을 검증했습니다. 이 모듈의 체크포인트는 카탈로그 범위를 유지하고 자격 증명과 내부 Foundry 식별자를 브라우저에 노출하지 않는, 로컬에서 테스트한 웹사이트 통합입니다. 프록시나 사이트를 프로덕션에 배포한 것은 아닙니다.

실험을 마치면 두 로컬 서비스를 모두 중지하고 [Azure 리소스를 정리합니다][cleanup]. 그런 다음 핵심 워크숍 경로의 [검토 및 다음 단계][core-review]로 계속 진행합니다.

[previous-module]: /ko-kr/learning-hub/copilot-workshops/app/8-foundry-canvas/2-build-and-deploy/
[project-module]: /ko-kr/learning-hub/copilot-workshops/app/8-foundry-canvas/1-project-and-model/
[agent-checks]: /ko-kr/learning-hub/copilot-workshops/app/8-foundry-canvas/2-build-and-deploy/#%EB%A1%9C%EC%BB%AC%EC%97%90%EC%84%9C-%EC%97%90%EC%9D%B4%EC%A0%84%ED%8A%B8-%EA%B2%80%EC%82%AC
[cleanup]: /ko-kr/learning-hub/copilot-workshops/app/8-foundry-canvas/#%EB%A6%AC%EC%86%8C%EC%8A%A4-%EC%A0%95%EB%A6%AC
[core-review]: /ko-kr/learning-hub/copilot-workshops/app/10-review/
