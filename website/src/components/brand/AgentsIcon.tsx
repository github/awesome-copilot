type AgentsIconProps = {
  size?: number;
  className?: string;
};

export function AgentsIcon({ size = 36, className }: AgentsIconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M48 53L23 72"
        stroke="currentColor"
        strokeWidth="4"
        strokeMiterlimit="10"
        strokeLinecap="round"
      />
      <path
        d="M47.9998 53L72.9998 72"
        stroke="currentColor"
        strokeWidth="4"
        strokeMiterlimit="10"
        strokeLinecap="round"
      />
      <path
        d="M48.01 53L48.01 26"
        stroke="currentColor"
        strokeWidth="4"
        strokeMiterlimit="10"
        strokeLinecap="round"
      />
      <path
        d="M87 91C91.9706 91 96 86.9706 96 82C96 77.0294 91.9706 73 87 73C82.0294 73 78 77.0294 78 82C78 86.9706 82.0294 91 87 91Z"
        fill="var(--base-color-scale-gray-5)"
      />
      <path
        d="M48 18C52.9706 18 57 13.9706 57 9C57 4.02944 52.9706 0 48 0C43.0294 0 39 4.02944 39 9C39 13.9706 43.0294 18 48 18Z"
        fill="var(--base-color-scale-gray-5)"
      />
      <path
        d="M9 91C13.9706 91 18 86.9706 18 82C18 77.0294 13.9706 73 9 73C4.02944 73 0 77.0294 0 82C0 86.9706 4.02944 91 9 91Z"
        fill="var(--base-color-scale-gray-5)"
      />
    </svg>
  );
}
