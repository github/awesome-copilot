# Design Principles

A collection of principles for designing agent workflows.

## Tier 1: Core Principles (Essential)

### 1. SSOT (Single Source of Truth)

**Manage information in one place**

| Aspect                   | Description                                          |
| ------------------------ | ---------------------------------------------------- |
| **Definition**           | Don't define the same information in multiple places |
| **Workflow Application** | Centralize context, configuration, and state         |
| **Violation Example**    | Each agent maintains the same settings separately    |
| **Solution**             | Use shared context or configuration files            |

### 2. SRP (Single Responsibility Principle)

**1 Agent = 1 Responsibility**

| Aspect                   | Description                                       |
| ------------------------ | ------------------------------------------------- |
| **Definition**           | Each agent focuses on a single responsibility     |
| **Workflow Application** | Clearly separate tasks and assign to each agent   |
| **Violation Example**    | One agent handles "search + analysis + reporting" |
| **Solution**             | Split agents by role                              |

### 3. Simplicity First

**Start with the simplest solution**

| Aspect                   | Description                                                    |
| ------------------------ | -------------------------------------------------------------- |
| **Definition**           | Keep complexity to what's necessary and sufficient             |
| **Workflow Application** | Try with a single agent first. Add complexity only when needed |
| **Violation Example**    | Designing a 10-agent workflow from the start                   |
| **Solution**             | Start minimal, extend gradually                                |

**Anthropic's Recommendation:**

> "Start with simple prompts, optimize them with comprehensive evaluation, and add multi-step agentic systems only when simpler solutions fall short."

### 4. Fail Fast

**Detect and fix errors early**

| Aspect                   | Description                                       |
| ------------------------ | ------------------------------------------------- |
| **Definition**           | Detect errors early and handle immediately        |
| **Workflow Application** | Validate at each step, stop immediately if issues |
| **Violation Example**    | Ignoring errors and continuing to the end         |
| **Solution**             | Set up Gates/Checkpoints                          |

### 5. Iterative Refinement

**Build small, improve repeatedly**

| Aspect                   | Description                                           |
| ------------------------ | ----------------------------------------------------- |
| **Definition**           | Prefer small improvements over large changes          |
| **Workflow Application** | MVP → verify → feedback → improve                     |
| **Violation Example**    | Implementing all features at once, testing at the end |
| **Solution**             | Implement and verify one task at a time               |

**Related Pattern:** Evaluator-Optimizer

### 6. Feedback Loop

**Verify results at each step → adjust**

| Aspect                   | Description                                        |
| ------------------------ | -------------------------------------------------- |
| **Definition**           | Get feedback from execution results, apply to next |
| **Workflow Application** | Evaluate agent output, re-execute if needed        |
| **Violation Example**    | One-way flow without result verification           |
| **Solution**             | Incorporate evaluation steps                       |

**Anthropic's Recommendation:**

> "During execution, it's crucial for the agents to gain 'ground truth' from the environment at each step to assess its progress."

---

## Tier 2: Quality Principles (Recommended)

### 7. Transparency

**Show plans and progress explicitly**

| Aspect                   | Description                                        |
| ------------------------ | -------------------------------------------------- |
| **Definition**           | Make what's happening visible                      |
| **Workflow Application** | Show start/end of each step, display progress      |
| **Violation Example**    | Black box with no visibility into what's happening |
| **Solution**             | Use logs, progress display, TodoWrite              |

**Anthropic's Recommendation:**

> "Prioritize transparency by explicitly showing the agent's planning steps."

### 8. Gate/Checkpoint

**Validation gates at each step**

| Aspect                   | Description                                   |
| ------------------------ | --------------------------------------------- |
| **Definition**           | Validate before proceeding to the next step   |
| **Workflow Application** | Don't proceed unless quality criteria are met |
| **Violation Example**    | Passing through all steps without validation  |
| **Solution**             | Quality checks with conditional branching     |

### 9. DRY (Don't Repeat Yourself)

**Eliminate duplication, promote reuse**

| Aspect                   | Description                                |
| ------------------------ | ------------------------------------------ |
| **Definition**           | Don't repeat the same logic                |
| **Workflow Application** | Template common processes, reuse prompts   |
| **Violation Example**    | Copy-pasting the same prompt to each agent |
| **Solution**             | Create common prompt templates             |

### 10. ISP (Interface Segregation Principle)

**Minimal context only**

| Aspect                   | Description                                    |
| ------------------------ | ---------------------------------------------- |
| **Definition**           | Pass only necessary information to each agent  |
| **Workflow Application** | Excessive context becomes noise                |
| **Violation Example**    | Passing all information to all agents          |
| **Solution**             | Select and pass only task-relevant information |

### 11. Idempotency

**Safe to retry**

| Aspect                   | Description                                               |
| ------------------------ | --------------------------------------------------------- |
| **Definition**           | Same operation produces same result regardless of retries |
| **Workflow Application** | Design to allow retries on failure                        |
| **Violation Example**    | Retrying causes data duplication                          |
| **Solution**             | State checking, use unique IDs                            |

---

## Tier 3: Scale Principles (Advanced)

### 12. Human-in-the-Loop

**Human confirmation at critical points**

| Aspect                   | Description                                          |
| ------------------------ | ---------------------------------------------------- |
| **Definition**           | Balance automation with human judgment               |
| **Workflow Application** | Confirm before important decisions, risky operations |
| **Application Example**  | Before production deploy, before mass deletion       |

### 13. KISS (Keep It Simple, Stupid)

**Keep it simple**

| Aspect                   | Description                                      |
| ------------------------ | ------------------------------------------------ |
| **Definition**           | Avoid unnecessary complexity                     |
| **Workflow Application** | Sufficient number of agents, simple coordination |

### 14. Loose Coupling

**Loose coupling between agents**

| Aspect                   | Description                             |
| ------------------------ | --------------------------------------- |
| **Definition**           | Minimize dependencies between agents    |
| **Workflow Application** | Each agent can operate independently    |
| **Benefits**             | Limit impact of changes, easier testing |

### 15. Graceful Degradation

**Continue operation despite partial failures**

| Aspect                   | Description                                    |
| ------------------------ | ---------------------------------------------- |
| **Definition**           | Maintain overall function even when parts fail |
| **Workflow Application** | Fallback processing, skippable steps           |

---

## ACI Design (Agent-Computer Interface)

**Anthropic's Recommendation:**

> "Think about how much effort goes into human-computer interfaces (HCI), and plan to invest just as much effort in creating good agent-computer interfaces (ACI)."

### Tool Design Guidelines

1. **Clear Description** - Clarify tool purpose and usage
2. **Edge Cases** - Document boundary conditions
3. **Input Format** - Specify expected input format
4. **Error Handling** - Define behavior on failure
5. **Testing** - Actually use it and iterate

---

## References

- [Building Effective Agents - Anthropic](https://www.anthropic.com/engineering/building-effective-agents)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [12-Factor App](https://12factor.net/)
