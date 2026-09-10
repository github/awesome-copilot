type PluginsIconProps = {
  size?: number;
};

export function PluginsIcon({ size = 36 }: PluginsIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      role="img"
      aria-label="Plugins"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M26.6614 44V59C26.6614 67.8366 33.8248 75 42.6614 75H51.6614"
        stroke="var(--brand-color-text-default)"
        strokeWidth="4"
        strokeMiterlimit="10"
        strokeLinecap="round"
      />
      <path
        d="M60.3728 52V54H86.3728V52V50H60.3728V52ZM94.3728 60H92.3728V86H94.3728H96.3728V60H94.3728ZM86.3728 94V92H60.3728V94V96H86.3728V94ZM52.3728 86H54.3728V60H52.3728H50.3728V86H52.3728ZM60.3728 94V92C57.0591 92 54.3728 89.3137 54.3728 86H52.3728H50.3728C50.3728 91.5228 54.85 96 60.3728 96V94ZM94.3728 86H92.3728C92.3728 89.3137 89.6865 92 86.3728 92V94V96C91.8956 96 96.3728 91.5228 96.3728 86H94.3728ZM86.3728 52V54C89.6865 54 92.3728 56.6863 92.3728 60H94.3728H96.3728C96.3728 54.4772 91.8956 50 86.3728 50V52ZM60.3728 52V50C54.85 50 50.3728 54.4772 50.3728 60H52.3728H54.3728C54.3728 56.6863 57.0591 54 60.3728 54V52Z"
        fill="var(--brand-color-text-default)"
      />
      <rect
        x="18.0001"
        y="35.9998"
        width="18"
        height="18"
        rx="9"
        transform="rotate(-90 18.0001 35.9998)"
        fill="var(--brand-color-text-muted)"
      />
      <rect
        x="36.0001"
        y="35.9998"
        width="18"
        height="18"
        rx="9"
        transform="rotate(-90 36.0001 35.9998)"
        fill="var(--brand-color-text-muted)"
      />
      <rect
        x="36.0001"
        y="18"
        width="18"
        height="18"
        rx="9"
        transform="rotate(180 36.0001 18)"
        fill="var(--brand-color-text-muted)"
      />
      <rect
        x="54.0001"
        y="18"
        width="18"
        height="18"
        rx="9"
        transform="rotate(180 54.0001 18)"
        fill="var(--brand-color-text-muted)"
      />
      <rect
        x="6.10352e-05"
        y="18"
        width="18"
        height="18"
        rx="9"
        transform="rotate(-90 6.10352e-05 18)"
        fill="var(--brand-color-text-muted)"
      />
      <rect
        x="18.0001"
        y="36"
        width="18"
        height="18"
        rx="9"
        transform="rotate(180 18.0001 36)"
        fill="var(--brand-color-text-muted)"
      />
    </svg>
  );
}
