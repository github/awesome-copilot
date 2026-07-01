// Real browser E2E for the app, driven by Playwright against the LOCAL
// stack: Next.js frontend (3000) -> bridge (8080) -> hosted Foundry agent
// running locally via `azd ai agent run` (8088).
//
// Scenarios (for the example "records" domain in hosted/responses/agent.py — rename the
// tool prompts / record ids below if you changed the domain):
//  1. Read: "list pending records for alice" -> assistant text + tool-render
//     card, no approval UI.
//  2. HITL pause: "approve REC-1002" -> confirm_changes card appears with
//     Approve/Reject buttons.
//  3. Approve: click Approve -> tool re-executes server-side, state changes
//     (verified by asking again afterward: REC-1002 no longer pending).
//  4. Reject: fresh record (REC-1003) -> click Reject -> state unchanged
//     (verified: REC-1003 still pending afterward).
//
// Screenshots are saved to ../e2e-screenshots/ as evidence.

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const assert = require("assert");

const BASE_URL = "http://localhost:3000";
const SCREENSHOT_DIR = path.join(__dirname, "..", "e2e-screenshots");

async function sendMessage(page, text) {
  const textarea = page.locator("textarea, [contenteditable='true'], input[type='text']").first();
  await textarea.click();
  await textarea.fill(text);
  await textarea.press("Enter");
}

async function waitForAssistantIdle(page, timeoutMs = 45000) {
  // Poll until the chat's visible text stops changing (streaming finished),
  // as a robust proxy for "run complete" that doesn't depend on internal
  // CSS class names. Do NOT use `page.waitForLoadState("networkidle")` here —
  // an SSE connection to the bridge keeps the network "busy" indefinitely.
  await page.waitForTimeout(1500);
  const start = Date.now();
  let previous = null;
  let stableCount = 0;
  while (Date.now() - start < timeoutMs) {
    const current = await page.locator("body").innerText();
    if (current === previous) {
      stableCount += 1;
      if (stableCount >= 4) break;
    } else {
      stableCount = 0;
    }
    previous = current;
    await page.waitForTimeout(1000);
  }
  // Extra settle buffer in case of a final re-render after the text stabilizes.
  await page.waitForTimeout(1500);
}

async function main() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  console.log("== 1. Load app ==");
  await page.goto(BASE_URL, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "01-loaded.png"), fullPage: true });

  console.log("== 2. Read: list pending records for alice ==");
  await sendMessage(page, "List pending records for alice");
  await waitForAssistantIdle(page);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "02-read-alice.png"), fullPage: true });
  const bodyTextAfterRead = await page.locator("body").innerText();
  assert(/REC-1002/.test(bodyTextAfterRead), "expected REC-1002 to appear in the chat's read result");
  console.log("   OK - read result visible");

  console.log("== 3. HITL pause: approve REC-1002 ==");
  await sendMessage(page, "Approve REC-1002.");
  // Wait specifically for the approval card to render.
  const approvalCard = page.locator("[data-testid='hitl-approval-card']");
  await approvalCard.first().waitFor({ state: "visible", timeout: 30000 });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "03-hitl-pause.png"), fullPage: true });
  console.log("   OK - confirm_changes approval card appeared (run PAUSED)");

  console.log("== 4. Approve ==");
  await page.locator("[data-testid='hitl-approve-button']").first().click();
  await waitForAssistantIdle(page);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "04-after-approve.png"), fullPage: true });

  console.log("== 5. Verify state changed (REC-1002 no longer pending) ==");
  await sendMessage(page, "List pending records for alice again.");
  await waitForAssistantIdle(page);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "05-verify-approved.png"), fullPage: true });
  const bodyAfterApprove = await page.locator("body").innerText();
  assert(
    !/REC-1002/i.test(bodyAfterApprove.split("List pending records for alice again").pop() || bodyAfterApprove),
    "REC-1002 should no longer be listed as pending after approval"
  );
  console.log("   OK - REC-1002 no longer pending (state changed server-side)");

  console.log("== 6. HITL reject: approve REC-1003 (bob), then reject ==");
  await sendMessage(page, "Approve REC-1003.");
  const approvalCard2 = page.locator("[data-testid='hitl-approval-card']");
  await approvalCard2.first().waitFor({ state: "visible", timeout: 30000 });
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "06-hitl-pause-reject-flow.png"), fullPage: true });

  await page.locator("[data-testid='hitl-reject-button']").first().click();
  await waitForAssistantIdle(page);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "07-after-reject.png"), fullPage: true });

  console.log("== 7. Verify state UNCHANGED (REC-1003 still pending) ==");
  await sendMessage(page, "List pending records for bob.");
  await waitForAssistantIdle(page);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, "08-verify-rejected.png"), fullPage: true });
  const bodyAfterReject = await page.locator("body").innerText();
  const lastChunk = bodyAfterReject.split("List pending records for bob").pop() || bodyAfterReject;
  assert(/REC-1003/i.test(lastChunk), "REC-1003 should still be listed as pending after reject");
  console.log("   OK - REC-1003 still pending (state unchanged after reject)");

  console.log("\n== Console errors observed ==");
  console.log(consoleErrors.length ? consoleErrors.join("\n") : "(none)");

  await browser.close();
  console.log("\nALL E2E SCENARIOS PASSED");
}

main().catch((err) => {
  console.error("E2E FAILED:", err);
  process.exit(1);
});
