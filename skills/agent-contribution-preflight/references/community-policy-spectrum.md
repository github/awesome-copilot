# Community policy spectrum

Snapshot date: 2026-09-02. Recheck the official source before acting.

## No generated contribution content by default

- [OpenJDK](https://openjdk.org/legal/ai): submitted generated content is prohibited across code, PR text, mail, wiki, and JBS. Private comprehension, debugging, review, and research are allowed when generated output is not contributed.
- [Gentoo](https://wiki.gentoo.org/wiki/Project:Council/AI_policy): official contributions created with NLP AI assistance are prohibited.
- [QEMU](https://www.qemu.org/docs/master/devel/code-provenance.html/#use-of-ai-generated-content): AI-derived contributions are declined on DCO/provenance grounds; private research and debugging can be allowed when output is not included.
- [NetBSD](https://www.netbsd.org/developers/commit-guidelines.html): LLM-generated code requires prior written core approval.

## Strict conditional permission

- [GCC](https://gcc.gnu.org/ai-policy.html): legally significant generated content is declined; narrow exceptions require human understanding, attribution, and DCO sign-off.
- [Rust `rust-lang/rust`](https://forge.rust-lang.org/policies/llm-usage.html): a scoped experiment requires disclosure, a pre-arranged reviewer, testing, and full author/reviewer understanding.
- [LLVM](https://llvm.org/docs/AIToolPolicy.html): human-in-the-loop use is allowed with accountability and transparency.
- [Kubernetes](https://www.kubernetes.dev/docs/guide/pull-requests/#ai-guidance): assistance is allowed with PR-description disclosure, self-review, testing, and human review replies; large generated PRs are not allowed.

## Human accountability and disclosure

- [Linux kernel](https://docs.kernel.org/next/process/coding-assistants.html): a human owns DCO sign-off, provenance, review, and testing; advanced assistance is acknowledged under kernel rules.
- [Homebrew](https://docs.brew.sh/Responsible-AI-Usage): the contributor reviews and tests first, discloses in the PR, and answers maintainers personally.
- [CPython](https://devguide.python.org/getting-started/generative-ai/): human responsibility, explanation, focused scope, and testing are required; disclosure is appreciated rather than mandatory.
- [Fedora](https://docs.fedoraproject.org/en-US/council/policy/ai-contribution-policy/): material unchanged output must be disclosed and the human remains accountable.

Attribution conventions conflict. Do not copy a trailer across projects: Kubernetes forbids forms that GCC, LLVM, or Linux may use. Discovery must precede drafting.
