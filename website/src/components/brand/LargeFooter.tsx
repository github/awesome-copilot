import { MinimalFooter } from "@primer/react-brand";

export function LargeFooter() {
  return (
    <MinimalFooter logoHref="https://github.com" socialLinks={false}>
      <MinimalFooter.Link href="https://docs.github.com/site-policy/github-terms/github-terms-of-service">
        Terms
      </MinimalFooter.Link>
      <MinimalFooter.Link href="https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement">
        Privacy
      </MinimalFooter.Link>
      <MinimalFooter.Link href="https://docs.github.com">
        GitHub Docs
      </MinimalFooter.Link>
      <MinimalFooter.Link href="https://github.community">
        Community
      </MinimalFooter.Link>
      <MinimalFooter.Link href="https://support.github.com">
        Support
      </MinimalFooter.Link>
    </MinimalFooter>
  );
}
