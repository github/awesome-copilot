const locales = ["", "es-es", "ja-jp", "ko-kr", "pt-br", "zh-cn"];
const lessonRenames = {
  "app/3-custom-instructions": "app/4-custom-instructions",
  "app/4-build-filtering": "app/3-agent-modes",
  "app/5-mcp-playwright": "app/6-mcp-playwright",
  "app/6-agent-merge": "app/8-create-pull-request",
  "app/7-canvases": "app/9-canvases",
  "app/8-review": "app/10-review",
  "first-steps/copilot-app/12-review": "first-steps/copilot-app/13-review",
};

export const workshopRedirects = Object.fromEntries([
  ...locales.flatMap((locale) => {
    const prefix = `/${locale ? `${locale}/` : ""}learning-hub/copilot-workshops/`;
    return Object.entries(lessonRenames).map(([previous, current]) => [
      `${prefix}${previous}/`,
      `${prefix}${current}/`,
    ]);
  }),
  // Only these four translations are missing; Korean has its own lesson.
  ...["es-es", "ja-jp", "pt-br", "zh-cn"].map((locale) => [
    `/${locale}/learning-hub/copilot-workshops/first-steps/copilot-app/12-deploy-pages/`,
    "/learning-hub/copilot-workshops/first-steps/copilot-app/12-deploy-pages/",
  ]),
]);
