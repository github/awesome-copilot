import React from "react";
import { clsx } from "clsx";
import styles from "./styles/reading-header.module.css";

/** A zero-height sticky slot keeps the expanded hero's scroll geometry intact. */
export function ReadingHeader({
  title,
  className,
  action,
  children,
}: {
  title: string;
  className: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.slot} data-reading-header inert aria-hidden="true">
      <div className={clsx(styles.surface, className)}>
        <div className={styles.row}>
          <div className={styles.title} title={title} aria-hidden="true">{title}</div>
          {action ? <div className={styles.action} data-reading-action>{action}</div> : null}
        </div>
        {children}
      </div>
    </div>
  );
}
