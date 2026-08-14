import { CheckIcon, CopyIcon } from "@primer/octicons-react";
import React from "react";

import { ActionMenu, Button } from "@primer/react-brand";

import styles from "./styles/github-copilot-app.module.css";

type InstallOption = { id: string; label: string; command: string };

const INSTALL_OPTIONS: InstallOption[] = [
  {
    id: "script",
    label: "Install with script",
    command: "curl -fsSL https://gh.io/copilot-install | bash",
  },
  {
    id: "winget",
    label: "Install with WinGet",
    command: "winget install GitHub.Copilot",
  },
  {
    id: "homebrew",
    label: "Install with Homebrew",
    command: "brew install copilot-cli",
  },
  {
    id: "npm",
    label: "Install with npm",
    command: "npm install -g @github/copilot",
  },
];

/** Package-manager selector + copyable install command, matching the install
 *  bar on github.com/features/copilot/cli. */
export function InstallCommandBar() {
  const [selectedId, setSelectedId] = React.useState("homebrew");
  const [copied, setCopied] = React.useState(false);

  const selected =
    INSTALL_OPTIONS.find((option) => option.id === selectedId) ??
    INSTALL_OPTIONS[0];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(selected.command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <>
      <div className={styles.installBar}>
        <ActionMenu
          selectionVariant="single"
          onSelect={(id) => setSelectedId(id)}
        >
          <ActionMenu.Button>{selected.label}</ActionMenu.Button>
          <ActionMenu.Overlay aria-label="Choose an install method">
            {INSTALL_OPTIONS.map((option) => (
              <ActionMenu.Item
                key={option.id}
                value={option.id}
                selected={option.id === selectedId}
              >
                {option.label}
              </ActionMenu.Item>
            ))}
          </ActionMenu.Overlay>
        </ActionMenu>
        <code className={styles.installCommand}>{selected.command}</code>
        <button
          type="button"
          className={styles.installCopy}
          onClick={handleCopy}
          aria-label={copied ? "Copied to clipboard" : "Copy install command"}
        >
          {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <div className={styles.installMobileCta}>
        <Button
          as="a"
          variant="primary"
          size="medium"
          href="https://github.com/github/copilot-cli"
        >
          Get Copilot CLI
        </Button>
      </div>
    </>
  );
}
