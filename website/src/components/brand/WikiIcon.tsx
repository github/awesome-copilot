type WikiIconProps = {
  size?: number;
};

export function WikiIcon({ size = 64 }: WikiIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="Community library"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M32 23.666L32 53.666"
        stroke="var(--brand-color-text-muted)"
        strokeWidth="2.66667"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M32.0007 53.666L29.7091 51.7564C27.3129 49.7596 24.2925 48.666 21.1733 48.666H9.33398"
        stroke="var(--brand-color-text-muted)"
        strokeWidth="2.66667"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M32.0013 53.666L34.2928 51.7564C36.689 49.7596 39.7095 48.666 42.8286 48.666H54.668"
        stroke="var(--brand-color-text-muted)"
        strokeWidth="2.66667"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.6673 4C24.0311 4 30.6673 8.6362 32.0007 15.3333C33.334 8.6362 39.9702 4 47.334 4H60.0007C61.4734 4 62.6673 5.19391 62.6673 6.66667V54C62.6673 55.4728 61.4734 56.6667 60.0007 56.6667H48.334C45.3852 56.6667 42.6394 58.0407 40.8692 60.3251C40.2659 61.1035 39.3855 61.6667 38.4007 61.6667H25.6007C24.6158 61.6667 23.7354 61.1035 23.1321 60.3251C21.3619 58.0407 18.6161 56.6667 15.6673 56.6667H4.00065C2.52789 56.6667 1.33398 55.4728 1.33398 54V6.66667C1.33398 5.19391 2.52789 4 4.00065 4H16.6673Z"
        stroke="var(--brand-color-text-default)"
        strokeWidth="2.66667"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 16.666C20 19.9797 17.3137 22.666 14 22.666C10.6864 22.6659 8.00013 19.9801 8 16.6665C8 13.3528 10.6864 10.6661 14 10.666C17.3136 10.666 19.9999 13.3524 20 16.666Z"
        fill="var(--brand-color-text-muted)"
      />
    </svg>
  );
}
