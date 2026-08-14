type ExtensionsIconProps = {
  size?: number;
};

export function ExtensionsIcon({ size = 36 }: ExtensionsIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      role="img"
      aria-label="Canvas Extensions"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M36 56H18"
        stroke="var(--brand-color-text-default)"
        strokeWidth="4"
        strokeMiterlimit="10"
        strokeLinecap="round"
      />
      <path
        d="M90 40L6 40"
        stroke="var(--brand-color-text-muted)"
        strokeWidth="4"
        strokeMiterlimit="10"
        strokeLinecap="round"
      />
      <path
        d="M90 73L6 73"
        stroke="var(--brand-color-text-muted)"
        strokeWidth="4"
        strokeMiterlimit="10"
        strokeLinecap="round"
      />
      <path
        d="M48 23L48 90"
        stroke="var(--brand-color-text-muted)"
        strokeWidth="4"
        strokeMiterlimit="10"
        strokeLinecap="round"
      />
      <path
        d="M90 23L6 23"
        stroke="var(--brand-color-text-muted)"
        strokeWidth="4"
        strokeMiterlimit="10"
        strokeLinecap="round"
      />
      <path
        d="M6 82V14C6 9.58172 9.58172 6 14 6H82C86.4183 6 90 9.58172 90 14V82C90 86.4183 86.4183 90 82 90H14C9.58172 90 6 86.4183 6 82Z"
        stroke="var(--brand-color-text-default)"
        strokeWidth="4"
        strokeMiterlimit="10"
        strokeLinecap="round"
      />
      <path
        d="M48 71.5V41.5C48 40.6716 48.6716 40 49.5 40H88.5C89.3284 40 90 40.6716 90 41.5V71.5C90 72.3284 89.3284 73 88.5 73H49.5C48.6716 73 48 72.3284 48 71.5Z"
        stroke="var(--brand-color-text-default)"
        strokeWidth="4"
        strokeMiterlimit="10"
        strokeLinecap="round"
      />
      <path
        d="M69 65C73.9706 65 78 60.9706 78 56C78 51.0294 73.9706 47 69 47C64.0294 47 60 51.0294 60 56C60 60.9706 64.0294 65 69 65Z"
        fill="var(--brand-color-text-muted)"
      />
    </svg>
  );
}
