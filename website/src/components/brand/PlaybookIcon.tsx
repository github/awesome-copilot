type PlaybookIconProps = {
  size?: number;
};

export function PlaybookIcon({ size = 36 }: PlaybookIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      role="img"
      aria-label="Copilot Playbook"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g clipPath="url(#playbook-icon-clip)">
        <path
          d="M48 23C50 12.9543 59.9543 6 71 6H90C92.2091 6 94 7.79086 94 10V81C94 83.2091 92.2091 85 90 85H72.5C68.0769 85 63.9581 87.061 61.3028 90.4876C60.3979 91.6553 59.0772 92.5 57.6 92.5H38.4C36.9228 92.5 35.6021 91.6553 34.6972 90.4876C32.0419 87.061 27.9231 85 23.5 85H6C3.79086 85 2 83.2091 2 81V43.5"
          stroke="var(--brand-color-text-default)"
          strokeWidth="4"
          strokeMiterlimit="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M15.3384 24.9263C10.8911 24.3872 7.75781 21.1865 7.75781 17.0425C7.75781 15.3579 8.36426 13.5386 9.375 12.3257C8.93701 11.2139 9.00439 8.85547 9.50977 7.87842C10.8574 7.70996 12.6768 8.41748 13.7549 9.39453C15.0352 8.99023 16.3828 8.78809 18.0337 8.78809C19.6846 8.78809 21.0322 8.99023 22.2451 9.36084C23.2896 8.41748 25.1426 7.70996 26.4902 7.87842C26.9619 8.78809 27.0293 11.1465 26.5913 12.292C27.6694 13.5723 28.2422 15.2905 28.2422 17.0425C28.2422 21.1865 25.1089 24.3198 20.5942 24.8926C21.7397 25.6338 22.5146 27.251 22.5146 29.104V32.6079C22.5146 33.6187 23.3569 34.1914 24.3677 33.7871C30.4658 31.4624 35.25 25.3643 35.25 17.8174C35.25 8.28271 27.501 0.5 17.9663 0.5C8.43164 0.5 0.75 8.28271 0.75 17.8174C0.75 25.2969 5.50049 31.4961 11.9019 33.8208C12.8115 34.1577 13.6875 33.5513 13.6875 32.6416V29.9463C13.2158 30.1484 12.6094 30.2832 12.0703 30.2832C9.84668 30.2832 8.53272 29.0703 7.58936 26.813C7.21875 25.9033 6.81445 25.3643 6.03955 25.2632C5.63525 25.2295 5.50049 25.061 5.50049 24.8589C5.50049 24.4546 6.17432 24.1514 6.84814 24.1514C7.8252 24.1514 8.66748 24.7578 9.54346 26.0044C10.2173 26.9814 10.9248 27.4194 11.7671 27.4194C12.6094 27.4194 13.1484 27.1162 13.9233 26.3413C14.4961 25.7686 14.9341 25.2632 15.3384 24.9263Z"
          fill="var(--brand-color-text-default)"
        />
        <path
          d="M48 35.5L48 80.5"
          stroke="var(--brand-color-text-muted)"
          strokeWidth="4"
          strokeMiterlimit="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M48 80.5L44.5627 77.6356C40.9684 74.6403 36.4377 73 31.759 73H14"
          stroke="var(--brand-color-text-muted)"
          strokeWidth="4"
          strokeMiterlimit="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M48 80.5L51.4373 77.6356C55.0316 74.6403 59.5623 73 64.241 73H82"
          stroke="var(--brand-color-text-muted)"
          strokeWidth="4"
          strokeMiterlimit="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      <defs>
        <clipPath id="playbook-icon-clip">
          <rect width="96" height="96" />
        </clipPath>
      </defs>
    </svg>
  );
}
