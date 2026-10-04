import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright-core";

const writeCommands = new Set([
  "add-combo-token",
  "check-label",
  "check-name",
  "click-role",
  "click-text",
  "click-text-ancestor",
  "click-text-index",
  "fill-label",
  "fill-selector",
  "select-combo",
  "uncheck-label",
  "upload-file",
  "upload-file-index",
]);

const edgeCandidates = [
  process.env.PARTNER_CENTER_EDGE_PATH,
  path.join(
    process.env["ProgramFiles(x86)"] ?? "",
    "Microsoft",
    "Edge",
    "Application",
    "msedge.exe",
  ),
  path.join(
    process.env.ProgramFiles ?? "",
    "Microsoft",
    "Edge",
    "Application",
    "msedge.exe",
  ),
].filter(Boolean);

const edgePath = edgeCandidates.find((candidate) => existsSync(candidate));
const profilePath =
  process.env.PARTNER_CENTER_PROFILE ??
  path.join(os.homedir(), ".copilot", "browser-profiles", "partner-center");
const port = Number.parseInt(process.env.PARTNER_CENTER_DEBUG_PORT ?? "9223", 10);
const endpoint =
  process.env.PARTNER_CENTER_CDP_ENDPOINT ?? `http://127.0.0.1:${port}`;

function requireWriteAccess(command) {
  if (
    writeCommands.has(command) &&
    process.env.PARTNER_CENTER_ALLOW_WRITE !== "1"
  ) {
    throw new Error(
      `${command} can change Partner Center state. Obtain the required user approval, ` +
        "then set PARTNER_CENTER_ALLOW_WRITE=1 for this one action.",
    );
  }
}

function pageSummary(page, index) {
  return {
    index,
    title: "",
    url: page.url(),
  };
}

async function listPages(browser) {
  const pages = browser.contexts().flatMap((context) => context.pages());
  return Promise.all(
    pages.map(async (page, index) => ({
      ...pageSummary(page, index),
      title: await page.title().catch(() => ""),
    })),
  );
}

async function activePage(browser) {
  const pages = browser.contexts().flatMap((context) => context.pages());
  const configuredIndex = process.env.PARTNER_CENTER_PAGE_INDEX;
  if (configuredIndex !== undefined) {
    const page = pages[Number.parseInt(configuredIndex, 10)];
    if (!page) {
      throw new Error(
        `PARTNER_CENTER_PAGE_INDEX=${configuredIndex} does not identify an open page.`,
      );
    }
    return page;
  }

  const preferred = pages.filter(
    (page) =>
      page.url().includes("partner.microsoft.com") ||
      page.url().includes("storedeveloper.microsoft.com"),
  );
  const page =
    preferred.at(-1) ??
    pages.filter((candidate) => !candidate.url().startsWith("edge://")).at(-1) ??
    pages.at(-1);
  if (!page) {
    throw new Error("No browser page is available.");
  }
  return page;
}

async function connect() {
  const browser = await chromium.connectOverCDP(endpoint);
  return { browser, page: await activePage(browser) };
}

function commandHelp() {
  return {
    readOnly: [
      "status",
      "pages",
      "goto <url>",
      "reload",
      "text",
      "anchors",
      "overview-state",
      "agreement-state",
      "inputs",
      "radios",
      "comboboxes",
      "combo-options <index>",
      "button-state <name>",
      "find-text <text>",
      "match-context <text>",
      "ancestors <text>",
      "screenshot <path>",
    ],
    guardedWrites: [...writeCommands].sort(),
    environment: {
      PARTNER_CENTER_PROFILE: profilePath,
      PARTNER_CENTER_CDP_ENDPOINT: endpoint,
      PARTNER_CENTER_PAGE_INDEX: "optional zero-based page index",
      PARTNER_CENTER_ALLOW_WRITE: "set to 1 only for an approved mutation",
    },
  };
}

const [command = "help", ...args] = process.argv.slice(2);
requireWriteAccess(command);

if (command === "help") {
  console.log(JSON.stringify(commandHelp(), null, 2));
  process.exit(0);
}

if (command === "launch") {
  if (!edgePath) {
    throw new Error(
      "Microsoft Edge was not found. Set PARTNER_CENTER_EDGE_PATH to msedge.exe.",
    );
  }
  const context = await chromium.launchPersistentContext(profilePath, {
    executablePath: edgePath,
    headless: false,
    args: [
      `--remote-debugging-port=${port}`,
      "--no-first-run",
      "--start-maximized",
    ],
  });
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto("https://storedeveloper.microsoft.com", {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  console.log(
    JSON.stringify({
      ready: true,
      url: page.url(),
      profilePath,
      endpoint,
    }),
  );
  await new Promise(() => {});
}

const { browser, page } = await connect();
try {
  if (command === "status") {
    console.log(
      JSON.stringify({ title: await page.title(), url: page.url() }),
    );
  } else if (command === "pages") {
    console.log(JSON.stringify(await listPages(browser)));
  } else if (command === "goto") {
    const url = args[0];
    if (!url) {
      throw new Error("goto requires a URL.");
    }
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    console.log(
      JSON.stringify({ title: await page.title(), url: page.url() }),
    );
  } else if (command === "reload") {
    await page.reload({ waitUntil: "domcontentloaded", timeout: 120000 });
    console.log(
      JSON.stringify({ title: await page.title(), url: page.url() }),
    );
  } else if (command === "text") {
    await page.waitForLoadState("domcontentloaded");
    console.log((await page.locator("body").innerText()).slice(0, 50000));
  } else if (command === "anchors") {
    console.log(
      JSON.stringify(
        await page.locator("a").evaluateAll((anchors) =>
          anchors
            .map((anchor, index) => ({
              index,
              text: anchor.innerText.trim(),
              ariaLabel: anchor.getAttribute("aria-label"),
              href: anchor.href,
            }))
            .filter((anchor) => anchor.text || anchor.ariaLabel),
        ),
      ),
    );
  } else if (command === "overview-state") {
    const body = await page.locator("body").innerText();
    const submitButton = page.getByRole("button", {
      name: "Submit for certification",
      exact: true,
    });
    const submitButtonCount = await submitButton.count();
    const sectionLinks = await page.locator("a").evaluateAll((anchors) =>
      anchors
        .map((anchor) => ({
          text: anchor.innerText.trim(),
          ariaLabel: anchor.getAttribute("aria-label"),
          href: anchor.href,
        }))
        .filter(
          (anchor) =>
            anchor.ariaLabel?.includes("Status:") ||
            anchor.ariaLabel === "Submission Options",
        ),
    );
    console.log(
      JSON.stringify({
        title: await page.title(),
        url: page.url(),
        productInDraft: body.includes("In draft"),
        productInCertification: body.includes("In certification"),
        productPublished:
          body.includes("In the Store") || body.includes("Published"),
        packageValidated: body.includes("Validated"),
        sectionLinks,
        submitButton: {
          count: submitButtonCount,
          disabled: submitButtonCount
            ? await submitButton.first().isDisabled()
            : null,
        },
        bodyText: body.slice(0, 30000),
      }),
    );
  } else if (command === "agreement-state") {
    const body = await page.locator("body").innerText();
    const acceptControls = page.getByText("Accept", { exact: true });
    const acceptCount = await acceptControls.count();
    const controls = [];
    for (let index = 0; index < Math.min(acceptCount, 20); index += 1) {
      controls.push(
        await acceptControls.nth(index).evaluate((element, matchIndex) => ({
          index: matchIndex,
          tag: element.tagName,
          testid: element.getAttribute("testid"),
          outerHTML: element.outerHTML.slice(0, 1200),
        }), index),
      );
    }
    console.log(
      JSON.stringify({
        title: await page.title(),
        url: page.url(),
        notAccepted: body.includes("Not Accepted"),
        acceptCount,
        controls,
        bodyText: body.slice(0, 30000),
      }),
    );
  } else if (command === "click-text") {
    const text = args.join(" ");
    const target = page.getByText(text, { exact: true }).first();
    await target.waitFor({ state: "visible", timeout: 30000 });
    await target.click();
    await page.waitForTimeout(1500);
    console.log(
      JSON.stringify({ title: await page.title(), url: page.url() }),
    );
  } else if (command === "click-role") {
    const [role, ...nameParts] = args;
    const name = nameParts.join(" ");
    const target = page.getByRole(role, { name, exact: true }).first();
    await target.waitFor({ state: "visible", timeout: 30000 });
    await target.click();
    await page.waitForTimeout(1500);
    console.log(
      JSON.stringify({ title: await page.title(), url: page.url() }),
    );
  } else if (command === "click-text-index") {
    const index = Number.parseInt(args[0], 10);
    const text = args.slice(1).join(" ");
    const target = page.getByText(text, { exact: true }).nth(index);
    await target.waitFor({ state: "visible", timeout: 30000 });
    await target.click();
    await page.waitForTimeout(1500);
    console.log(
      JSON.stringify({
        title: await page.title(),
        url: page.url(),
        index,
        text,
      }),
    );
  } else if (command === "click-text-ancestor") {
    const text = args.join(" ");
    const target = page.getByText(text, { exact: true }).first();
    await target.waitFor({ state: "visible", timeout: 30000 });
    const ancestor = target.locator(
      "xpath=ancestor-or-self::*[self::a or self::button or self::he-button or " +
        "self::accexp_he-button or @role='button'][1]",
    );
    await ancestor.click();
    await page.waitForTimeout(1500);
    console.log(
      JSON.stringify({ title: await page.title(), url: page.url() }),
    );
  } else if (command === "fill-label") {
    const [label, ...valueParts] = args;
    await page
      .getByLabel(label, { exact: true })
      .fill(valueParts.join(" "));
    console.log(JSON.stringify({ label, filled: true }));
  } else if (command === "fill-selector") {
    const [selector, ...valueParts] = args;
    await page.locator(selector).first().fill(valueParts.join(" "));
    console.log(JSON.stringify({ selector, filled: true }));
  } else if (command === "check-label") {
    const label = args.join(" ");
    await page.getByLabel(label, { exact: true }).first().check();
    console.log(JSON.stringify({ label, checked: true }));
  } else if (command === "uncheck-label") {
    const label = args.join(" ");
    await page.getByLabel(label, { exact: true }).first().uncheck();
    console.log(JSON.stringify({ label, checked: false }));
  } else if (command === "upload-file") {
    const filePath = args.join(" ");
    await page.locator("input[type='file']").first().setInputFiles(filePath);
    await page.waitForTimeout(2000);
    console.log(JSON.stringify({ filePath, url: page.url() }));
  } else if (command === "upload-file-index") {
    const index = Number.parseInt(args[0], 10);
    const filePaths = args.slice(1);
    await page
      .locator("input[type='file']")
      .nth(index)
      .setInputFiles(filePaths);
    await page.waitForTimeout(2000);
    console.log(JSON.stringify({ index, filePaths, url: page.url() }));
  } else if (command === "check-name") {
    const name = args.join(" ");
    await page.getByLabel("Name", { exact: true }).fill(name);
    await page.getByText("Check availability", { exact: true }).click();
    await page.waitForTimeout(1000);
    const body = await page.locator("body").innerText();
    console.log(
      JSON.stringify({
        name,
        result: body.includes("The name is not available.")
          ? "unavailable"
          : body.includes("available")
            ? "available"
            : "unknown",
      }),
    );
  } else if (command === "button-state") {
    const name = args.join(" ");
    const button = page.getByRole("button", { name, exact: true });
    const count = await button.count();
    console.log(
      JSON.stringify({
        name,
        count,
        disabled: count ? await button.first().isDisabled() : null,
      }),
    );
  } else if (command === "find-text") {
    const text = args.join(" ");
    const matches = page.getByText(text, { exact: true });
    const count = await matches.count();
    const elements = [];
    for (let index = 0; index < Math.min(count, 20); index += 1) {
      elements.push(
        await matches.nth(index).evaluate((element, matchIndex) => ({
          index: matchIndex,
          tag: element.tagName,
          role: element.getAttribute("role"),
          testid: element.getAttribute("testid"),
          href: element.getAttribute("href"),
          disabled: "disabled" in element ? element.disabled : null,
          outerHTML: element.outerHTML.slice(0, 1000),
        }), index),
      );
    }
    console.log(JSON.stringify({ text, count, elements }));
  } else if (command === "match-context") {
    const text = args.join(" ");
    const matches = page.getByText(text, { exact: true });
    const count = await matches.count();
    const elements = [];
    for (let index = 0; index < Math.min(count, 20); index += 1) {
      elements.push(
        await matches.nth(index).evaluate((element, matchIndex) => {
          let current = element;
          for (let depth = 0; current && depth < 10; depth += 1) {
            const value = current.innerText?.trim();
            if (
              value &&
              value !== element.innerText?.trim() &&
              value.length < 4000
            ) {
              return {
                index: matchIndex,
                tag: element.tagName,
                contextTag: current.tagName,
                text: value,
                outerHTML: current.outerHTML.slice(0, 2500),
              };
            }
            current = current.parentElement;
          }
          return {
            index: matchIndex,
            tag: element.tagName,
            text: element.innerText?.trim(),
          };
        }, index),
      );
    }
    console.log(JSON.stringify({ text, count, elements }));
  } else if (command === "inputs") {
    console.log(
      JSON.stringify(
        await page
          .locator("input, textarea, he-checkbox, [role='checkbox']")
          .evaluateAll((elements) =>
            elements.map((element, index) => ({
              index,
              tag: element.tagName,
              type: element.getAttribute("type"),
              name: element.getAttribute("name"),
              id: element.id,
              ariaLabel: element.getAttribute("aria-label"),
              value:
                "value" in element
                  ? element.value
                  : element.getAttribute("value"),
              checked:
                "checked" in element
                  ? element.checked
                  : element.getAttribute("checked"),
              disabled:
                "disabled" in element
                  ? element.disabled
                  : element.hasAttribute("disabled"),
              outerHTML: element.outerHTML.slice(0, 1200),
            })),
          ),
      ),
    );
  } else if (command === "radios") {
    console.log(
      JSON.stringify(
        await page.locator("input[type='radio']").evaluateAll((radios) =>
          radios.map((radio, index) => ({
            index,
            name: radio.getAttribute("name"),
            value: radio.value,
            checked: radio.checked,
            title: radio.getAttribute("title"),
            parentText: radio.parentElement?.innerText,
            labels: (radio.getAttribute("aria-labelledby") ?? "")
              .split(/\s+/)
              .filter(Boolean)
              .map((id) => document.getElementById(id)?.innerText)
              .filter(Boolean),
          })),
        ),
      ),
    );
  } else if (command === "comboboxes") {
    console.log(
      JSON.stringify(
        await page
          .locator("[role='combobox'], select")
          .evaluateAll((elements) =>
            elements.map((element, index) => ({
              index,
              tag: element.tagName,
              ariaLabel: element.getAttribute("aria-label"),
              placeholder: element.getAttribute("placeholder"),
              value: "value" in element ? element.value : null,
              disabled:
                "disabled" in element
                  ? element.disabled
                  : element.hasAttribute("disabled"),
              parentText: element.parentElement?.parentElement?.innerText?.slice(
                0,
                1000,
              ),
              outerHTML: element.outerHTML.slice(0, 1500),
            })),
          ),
      ),
    );
  } else if (command === "combo-options") {
    const index = Number.parseInt(args[0], 10);
    const combo = page.locator("[role='combobox'], select").nth(index);
    await combo.click();
    await page.waitForTimeout(500);
    console.log(
      JSON.stringify({
        index,
        options: await page.getByRole("option").evaluateAll((options) =>
          options
            .filter((option) => option.getClientRects().length > 0)
            .map((option) => ({
              text: option.innerText,
              value: option.getAttribute("value"),
              selected:
                option.getAttribute("aria-selected") ?? option.selected,
            })),
        ),
      }),
    );
  } else if (command === "select-combo") {
    const index = Number.parseInt(args[0], 10);
    const optionText = args.slice(1).join(" ");
    const combo = page.locator("[role='combobox'], select").nth(index);
    if ((await combo.evaluate((element) => element.tagName)) === "SELECT") {
      await combo.selectOption({ label: optionText });
    } else {
      await combo.click();
      await page
        .getByRole("option", { name: optionText, exact: true })
        .click();
    }
    console.log(JSON.stringify({ index, optionText }));
  } else if (command === "add-combo-token") {
    const index = Number.parseInt(args[0], 10);
    const token = args.slice(1).join(" ");
    const combo = page.locator("[role='combobox']").nth(index);
    await combo.fill(token);
    await combo.press("Enter");
    console.log(JSON.stringify({ index, token }));
  } else if (command === "ancestors") {
    const text = args.join(" ");
    const target = page.getByText(text, { exact: true }).first();
    await target.waitFor({ state: "attached", timeout: 30000 });
    console.log(
      JSON.stringify(
        await target.evaluate((element) => {
          const ancestors = [];
          let current = element;
          for (let index = 0; current && index < 10; index += 1) {
            ancestors.push({
              tag: current.tagName,
              role: current.getAttribute("role"),
              testid: current.getAttribute("testid"),
              className: current.className,
              href: current.getAttribute("href"),
              outerHTML: current.outerHTML.slice(0, 1500),
            });
            current = current.parentElement;
          }
          return ancestors;
        }),
      ),
    );
  } else if (command === "screenshot") {
    const output = args[0];
    if (!output) {
      throw new Error("screenshot requires an output path.");
    }
    await page.screenshot({ path: output, fullPage: true });
    console.log(JSON.stringify({ output }));
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
} finally {
  await browser.close();
}
