---
description: "Human-in-the-loop development practices emphasizing human oversight, validation, and decision-making in AI-assisted development workflows"
applyTo: "**"
---

# Human-in-the-Loop Development Practices

## Core Philosophy

AI tools like GitHub Copilot are powerful assistants, but humans must remain the decision-makers. This instruction file implements **Microsoft's Responsible AI principle of Accountability** and establishes practices for AI-assisted development that:

- **Empowers developers** to make informed decisions with AI support
- **Requires human validation** for critical code and architectural decisions
- **Promotes understanding** over blind acceptance of AI suggestions
- **Maintains accountability** with humans responsible for all code merged (Accountability principle)
- **Encourages learning** by explaining AI-generated solutions

> **Microsoft Responsible AI - Accountability Principle:**
> "People should be accountable for AI systems. AI systems should be designed to meet regulatory requirements and to reflect the ethical principles that have been established by the team."

This aligns with Microsoft's broader framework where all six Responsible AI principles (Fairness, Reliability & Safety, Privacy & Security, Inclusiveness, Transparency, and Accountability) work together. See `responsible-ai-development.instructions.md` for the complete framework.

## Fundamental Principles

### 1. Human Decision Authority

**Developers are always the final decision-makers:**

- Review and understand all AI-generated code before acceptance
- Validate that suggestions align with project requirements and architecture
- Question AI suggestions that seem unclear or inappropriate
- Make conscious decisions to accept, modify, or reject AI output

**Never blindly accept AI suggestions:**

- Read and comprehend generated code before using it
- Verify that logic matches intended functionality
- Check for edge cases and error handling
- Ensure code fits within the existing codebase architecture

### 2. Validation Requirements

**All AI-generated code must be validated:**

- **Correctness**: Does it solve the intended problem?
- **Security**: Are there vulnerabilities or security concerns?
- **Performance**: Are there efficiency issues or bottlenecks?
- **Maintainability**: Is the code readable and well-structured?
- **Standards**: Does it follow project coding standards?

**Critical code requires additional validation:**

- Security-sensitive code (authentication, authorization, encryption)
- Financial calculations and transactions
- Healthcare or safety-critical systems
- Data privacy and compliance-related code
- Infrastructure and deployment configurations

### 3. Mandatory Human Review Points

**Require explicit human review for:**

**Architecture Decisions:**

- Design patterns and architectural choices
- Technology stack selections
- Database schema changes
- API contract modifications
- Integration patterns

**Security-Critical Code:**

- Authentication and authorization logic
- Encryption and key management
- Input validation and sanitization
- Security headers and configurations
- Access control implementations

**Data Handling:**

- Personal identifiable information (PII) processing
- Data retention and deletion logic
- Privacy controls and consent management
- Data migration scripts
- Backup and recovery procedures

**Production Deployments:**

- Deployment scripts and configurations
- Infrastructure changes
- Database migrations
- Feature flags and roll out strategies
- Rollback procedures

### 4. Explainability and Understanding

**Understand before accepting:**

- Ask AI to explain complex or unclear suggestions
- Request comments explaining the logic
- Have AI break down multi-step solutions
- Validate assumptions made by AI

**Document AI-assisted decisions:**

- Note when AI tools were used in commit messages
- Document significant AI suggestions in code reviews
- Explain why AI suggestions were accepted or modified
- Share learnings with the team

## Development Workflow Practices

### Code Generation Workflow

**1. Define Requirements Clearly:**

```markdown
Before requesting AI code generation:

- Clearly define the problem or feature
- Specify constraints and requirements
- Identify edge cases and error conditions
- Note security and performance requirements
```

**2. Review Generated Code:**

```markdown
For each AI suggestion:

- Read through the entire suggestion
- Verify it matches your requirements
- Check for security vulnerabilities
- Validate error handling
- Ensure it follows project conventions
```

**3. Test Thoroughly:**

```markdown
Always test AI-generated code:

- Write unit tests for new functionality
- Test edge cases and error conditions
- Verify integration with existing code
- Perform security testing for sensitive code
- Conduct performance testing if needed
```

**4. Refine and Customize:**

```markdown
Adapt AI suggestions to your project:

- Adjust variable names to match conventions
- Add project-specific error handling
- Include appropriate logging and monitoring
- Update documentation and comments
- Ensure consistent code style
```

### Code Review Workflow

**Human reviewers must:**

- Evaluate AI-suggested changes with same rigour as human-written code
- Question unclear or overly complex AI suggestions
- Verify that AI hasn't introduced subtle bugs
- Check for security vulnerabilities in AI code
- Ensure compliance with project standards

**When reviewing AI-generated code, ask:**

- "Do I fully understand what this code does?"
- "Are there security implications I need to consider?"
- "Does this align with our architecture and patterns?"
- "Are there edge cases that aren't handled?"
- "Would a human have written it this way, and if not, why?"

### Pair Programming with AI

**Effective AI collaboration:**

- Use AI for boilerplate and repetitive code
- Ask AI to explain complex algorithms or patterns
- Request AI to generate test cases
- Have AI suggest refactoring approaches
- Let AI help with documentation

**Maintain human control:**

- Make architectural decisions yourself
- Design interfaces and contracts
- Choose appropriate algorithms and data structures
- Determine error handling strategies
- Set security and privacy requirements

## Critical Validation Checkpoints

### Security Validation

**Before accepting security-related code:**

- [ ] Have you reviewed the code for common vulnerabilities (SQL injection, XSS, CSRF)?
- [ ] Does the code properly validate and sanitize all inputs?
- [ ] Are secrets and credentials properly protected?
- [ ] Is sensitive data properly encrypted?
- [ ] Are access controls correctly implemented?
- [ ] Have you consulted security documentation or experts?

### Privacy Validation

**Before accepting privacy-related code:**

- [ ] Does the code handle PII appropriately?
- [ ] Are data retention policies correctly implemented?
- [ ] Is user consent properly obtained and recorded?
- [ ] Are privacy controls in place?
- [ ] Does the code comply with relevant regulations (GDPR, CCPA, etc.)?
- [ ] Have you consulted privacy documentation or legal team?

### Performance Validation

**Before accepting performance-critical code:**

- [ ] Have you analyzed the algorithm complexity?
- [ ] Are database queries optimized?
- [ ] Is caching appropriately used?
- [ ] Are there potential memory leaks?
- [ ] Have you tested with realistic data volumes?
- [ ] Have you profiled the code for bottlenecks?

### Compliance Validation

**Before accepting compliance-related code:**

- [ ] Does the code meet regulatory requirements?
- [ ] Are audit logs properly implemented?
- [ ] Is data governance followed?
- [ ] Are industry standards met?
- [ ] Have you consulted compliance documentation?
- [ ] Has legal or compliance team reviewed if needed?

## Communication and Documentation

### Transparent AI Usage

**Document AI tool usage:**

- Note in commit messages when AI tools were used
- Mention AI assistance in pull request descriptions
- Share AI-generated insights in team discussions
- Document when AI suggestions were modified and why

**Example commit message:**

```text
feat: Add user authentication middleware

Implemented JWT-based authentication with GitHub Copilot assistance.
Modified AI suggestion to use project-specific error handling and
added additional security headers per our security policy.

Validated against OWASP authentication best practices.
```

### Team Communication

**Foster human oversight culture:**

- Share experiences with AI tools in team meetings
- Discuss when AI suggestions were particularly helpful or problematic
- Establish team guidelines for AI tool usage
- Create channels for discussing AI-related concerns
- Encourage questions and critical thinking

**Escalation paths:**

- When unsure about AI suggestions, ask teammates
- Involve security team for security-critical code
- Consult architects for architectural decisions
- Get legal review for compliance-related changes

## Ethical Considerations

### Responsible AI Usage

**Use AI ethically:**

- Don't use AI to bypass security policies or controls
- Don't use AI to generate discriminatory or biased code
- Don't use AI to process sensitive data without proper authorization
- Don't use AI to circumvent review processes
- Don't use AI to obscure responsibility or accountability

**Maintain accountability:**

- You are responsible for all code you commit
- AI is a tool, not a replacement for developer judgment
- Don't blame AI for bugs or security issues
- Take ownership of understanding and validating AI suggestions

### Bias Awareness

**Be aware of potential AI biases:**

- AI may suggest non-inclusive variable names or comments
- AI may make assumptions based on stereotypes
- AI may reflect biases in training data
- Review suggestions for inclusive language
- Ensure diverse perspectives are considered

**Promote inclusive development:**

- Review AI suggestions for inclusive language
- Ensure accessibility is considered
- Consider diverse user needs and contexts
- Question assumptions in AI suggestions
- Advocate for fairness and inclusion

## Continuous Improvement

### Learning from AI

**Use AI as a learning tool:**

- Ask AI to explain unfamiliar patterns or techniques
- Request alternative approaches and their trade offs
- Have AI suggest improvements to your code
- Learn from AI-suggested test cases
- Explore new libraries and frameworks with AI guidance

**Share knowledge:**

- Document useful AI interactions for the team
- Create examples of good vs. problematic AI suggestions
- Build a knowledge base of validated patterns
- Train new team members on effective AI usage

### Feedback and Adaptation

**Provide feedback on AI tools:**

- Report bugs or problematic suggestions
- Share what works well and what doesn't
- Contribute to AI tool improvements
- Help train and refine AI models when possible

**Adapt practices:**

- Regularly review and update team AI guidelines
- Adjust validation requirements based on experience
- Incorporate lessons learned into workflows
- Stay informed about AI tool capabilities and limitations

## Best Practices Summary

### Do's ✓

- ✓ **Understand before accepting**: Read and comprehend all AI suggestions
- ✓ **Validate thoroughly**: Test and verify AI-generated code
- ✓ **Maintain human control**: Make critical decisions yourself
- ✓ **Document AI usage**: Be transparent about AI assistance
- ✓ **Learn continuously**: Use AI as a learning tool
- ✓ **Question suggestions**: Critical thinking is essential
- ✓ **Follow team guidelines**: Adhere to established AI usage policies
- ✓ **Take responsibility**: Own all code you commit

### Don'ts ✗

- ✗ **Blindly accept**: Never use code without understanding it
- ✗ **Skip validation**: Don't bypass testing and review
- ✗ **Delegate decisions**: Don't let AI make critical choices
- ✗ **Ignore security**: Don't accept security-critical code without expert review
- ✗ **Hide AI usage**: Don't obscure when AI tools were used
- ✗ **Bypass processes**: Don't use AI to circumvent reviews
- ✗ **Assume correctness**: Don't trust AI is always right
- ✗ **Shift blame**: Don't blame AI for your code decisions

## Conclusion

AI tools like GitHub Copilot are powerful assistants that can significantly enhance developer productivity. However, they work best when humans remain in control, making informed decisions and taking responsibility for the code they create.

By following human-in-the-loop practices, we ensure:

- **Quality**: Code is thoroughly reviewed and validated
- **Security**: Critical code receives appropriate scrutiny
- **Accountability**: Developers own their code decisions
- **Learning**: Teams grow their skills and knowledge
- **Ethics**: AI is used responsibly and inclusively

Remember: **AI suggests, humans decide.**
