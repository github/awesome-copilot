type SkillsIconProps = {
  size?: number;
};

export function SkillsIcon({ size = 36 }: SkillsIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      role="img"
      aria-label="Skills"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#skills-icon-clip)">
        <path
          d="M87.6452 36.2143H60L69.8776 7.27142C71.2028 3.38827 66.5201 0.2653 63.4444 2.98108L5.9258 53.7695C3.16384 56.2082 4.88879 60.7679 8.57336 60.7679H38L29.0183 88.7728C27.7683 92.6706 32.486 95.7075 35.5163 92.9556L90.3343 43.1755C93.0417 40.7169 91.3024 36.2143 87.6452 36.2143Z"
          stroke="var(--brand-color-text-default)"
          strokeWidth="4"
          strokeMiterlimit="10"
          strokeLinecap="round"
        />
        <path
          d="M24 0C27.3137 -1.51144e-07 30 2.68629 30 6C29.9999 9.31356 27.314 11.9999 24.0005 12C20.6868 12 18.0001 9.31364 18 6C18 2.68637 20.6864 0.000131825 24 0Z"
          fill="var(--brand-color-text-muted)"
        />
        <path
          d="M11 82C14.3137 82 17 84.6863 17 88C16.9999 91.3136 14.314 93.9999 11.0005 94C7.68683 94 5.00008 91.3136 5 88C5 84.6864 7.6864 82.0001 11 82Z"
          fill="var(--brand-color-text-muted)"
        />
        <path
          d="M90 56C93.3137 56 96 58.6863 96 62C95.9999 65.3136 93.314 67.9999 90.0005 68C86.6868 68 84.0001 65.3136 84 62C84 58.6864 86.6864 56.0001 90 56Z"
          fill="var(--brand-color-text-muted)"
        />
      </g>
      <defs>
        <clipPath id="skills-icon-clip">
          <rect width="96" height="96" />
        </clipPath>
      </defs>
    </svg>
  );
}
