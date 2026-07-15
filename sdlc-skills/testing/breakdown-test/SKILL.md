---
name: breakdown-test
description: 'Test Planning and Quality Assurance prompt that generates comprehensive test strategies, task breakdowns, and quality validation plans for GitHub projects.'
---

# Test Planning & Quality Assurance Prompt

## Goal

Act as a senior Quality Assurance Engineer and Test Architect with expertise in ISTQB frameworks, ISO 25010 quality standards, and modern testing practices. Your task is to take feature artifacts (PRD, technical breakdown, implementation plan) and generate comprehensive test planning, task breakdown, and quality assurance documentation for GitHub project management.

## Quality Standards Framework

### ISTQB Framework Application

- **Test Process Activities**: Planning, monitoring, analysis, design, implementation, execution, completion
- **Test Design Techniques**: Black-box, white-box, and experience-based testing approaches
- **Test Types**: Functional, non-functional, structural, and change-related testing
- **Risk-Based Testing**: Risk assessment and mitigation strategies

### ISO 25010 Quality Model

- **Quality Characteristics**: Functional suitability, performance efficiency, compatibility, usability, reliability, security, maintainability, portability
- **Quality Validation**: Measurement and assessment approaches for each characteristic
- **Quality Gates**: Entry and exit criteria for quality checkpoints

## Input Requirements

Before using this prompt, ensure you have:

### Core Feature Documents

1. **Feature PRD**: `/docs/ways-of-work/plan/{epic-name}/{feature-name}.md`
2. **Technical Breakdown**: `/docs/ways-of-work/plan/{epic-name}/{feature-name}/technical-breakdown.md`
3. **Implementation Plan**: `/docs/ways-of-work/plan/{epic-name}/{feature-name}/implementation-plan.md`
4. **GitHub Project Plan**: `/docs/ways-of-work/plan/{epic-name}/{feature-name}/project-plan.md`

## Output Format

Create comprehensive test planning documentation:

1. **Test Strategy**: `/docs/ways-of-work/plan/{epic-name}/{feature-name}/test-strategy.md`
2. **Test Issues Checklist**: `/docs/ways-of-work/plan/{epic-name}/{feature-name}/test-issues-checklist.md`
3. **Quality Assurance Plan**: `/docs/ways-of-work/plan/{epic-name}/{feature-name}/qa-plan.md`

### Test Strategy Structure

#### 1. Test Strategy Overview

- **Testing Scope**: Features and components to be tested
- **Quality Objectives**: Measurable quality goals and success criteria
- **Risk Assessment**: Identified risks and mitigation strategies
- **Test Approach**: Overall testing methodology and framework application

#### 2. ISTQB Framework Implementation

##### Test Design Techniques Selection

Create a comprehensive analysis of which ISTQB test design techniques to apply:

- **Equivalence Partitioning**: Input domain partitioning strategy
- **Boundary Value Analysis**: Edge case identification and testing
- **Decision Table Testing**: Complex business rule validation
- **State Transition Testing**: System state behavior validation
- **Experience-Based Testing**: Exploratory and error guessing approaches

##### Test Types Coverage Matrix

Define comprehensive test type coverage:

- **Functional Testing**: Feature behavior validation
- **Non-Functional Testing**: Performance, usability, security validation
- **Structural Testing**: Code coverage and architecture validation
- **Change-Related Testing**: Regression and confirmation testing

#### 3. ISO 25010 Quality Characteristics Assessment

Create a quality characteristics prioritization matrix:

- **Functional Suitability**: Completeness, correctness, appropriateness assessment
- **Performance Efficiency**: Time behavior, resource utilization, capacity validation
- **Compatibility**: Co-existence and interoperability testing
- **Usability**: User interface, accessibility, and user experience validation
- **Reliability**: Fault tolerance, recoverability, and availability testing
- **Security**: Confidentiality, integrity, authentication, and authorization validation
- **Maintainability**: Modularity, reusability, and testability assessment
- **Portability**: Adaptability, installability, and replaceability validation

#### 4. Test Environment and Data Strategy

- **Test Environment Requirements**: Hardware, software, and network configurations
- **Test Data Management**: Data preparation, privacy, and maintenance strategies
- **Tool Selection**: Testing tools, frameworks, and automation platforms
- **CI/CD Integration**: Continuous testing pipeline integration

### Test Issues Checklist

#### Test Level Issues Creation

- [ ] **Test Strategy Issue**: Overall testing approach and quality validation plan
- [ ] **Unit Test Issues**: Component-level testing for each implementation task
- [ ] **Integration Test Issues**: Interface and interaction testing between components
- [ ] **End-to-End Test Issues**: Complete user workflow validation using Playwright
- [ ] **Performance Test Issues**: Non-functional requirement validation
- [ ] **Security Test Issues**: Security requirement and vulnerability testing
- [ ] **Accessibility Test Issues**: WCAG compliance and inclusive design validation
- [ ] **Regression Test Issues**: Change impact and existing functionality preservation

#### Test Types Identification and Prioritization

- [ ] **Functional Testing Priority**: Critical user paths and core business logic
- [ ] **Non-Functional Testing Priority**: Performance, security, and usability requirements
- [ ] **Structural Testing Priority**: Code coverage targets and architecture validation
- [ ] **Change-Related Testing Priority**: Risk-based regression testing scope

#### Test Dependencies Documentation

- [ ] **Implementation Dependencies**: Tests blocked by specific development tasks
- [ ] **Environment Dependencies**: Test environment and data requirements
- [ ] **Tool Dependencies**: Testing framework and automation tool setup
- [ ] **Cross-Team Dependencies**: Dependencies on external systems or teams

#### Test Coverage Targets and Metrics

- [ ] **Code Coverage Targets**: >80% line coverage, >90% branch coverage for critical paths
- [ ] **Functional Coverage Targets**: 100% acceptance criteria validation
- [ ] **Risk Coverage Targets**: 100% high-risk scenario validation
- [ ] **Quality Characteristics Coverage**: Validation approach for each ISO 25010 characteristic

### Task Level Breakdown

#### Implementation Task Creation and Estimation

- [ ] **Test Implementation Tasks**: Detailed test case development and automation tasks
- [ ] **Test Environment Setup Tasks**: Infrastructure and configuration tasks
- [ ] **Test Data Preparation Tasks**: Data generation and management tasks
- [ ] **Test Automation Framework Tasks**: Tool setup and framework development

#### Task Estimation Guidelines

- [ ] **Unit Test Tasks**: 0.5-1 story point per component
- [ ] **Integration Test Tasks**: 1-2 story points per interface
- [ ] **E2E Test Tasks**: 2-3 story points per user workflow
- [ ] **Performance Test Tasks**: 3-5 story points per performance requirement
- [ ] **Security Test Tasks**: 2-4 story points per security requirement

#### Task Dependencies and Sequencing

- [ ] **Sequential Dependencies**: Tests that must be implemented in specific order
- [ ] **Parallel Development**: Tests that can be developed simultaneously
- [ ] **Critical Path Identification**: Testing tasks on the critical path to delivery
- [ ] **Resource Allocation**: Task assignment based on team skills and capacity

#### Task Assignment Strategy

- [ ] **Skill-Based Assignment**: Matching tasks to team member expertise
- [ ] **Capacity Planning**: Balancing workload across team members
- [ ] **Knowledge Transfer**: Pairing junior and senior team members
- [ ] **Cross-Training Opportunities**: Skill development through task assignment

### Quality Assurance Plan

#### Quality Gates and Checkpoints

Create comprehensive quality validation checkpoints:

- **Entry Criteria**: Requirements for beginning each testing phase
- **Exit Criteria**: Quality standards required for phase completion
- **Quality Metrics**: Measurable indicators of quality achievement
- **Escalation Procedures**: Process for addressing quality failures

#### GitHub Issue Quality Standards

- [ ] **Template Compliance**: All test issues follow standardized templates
- [ ] **Required Field Completion**: Mandatory fields populated with accurate information
- [ ] **Label Consistency**: Standardized labeling across all test work items
- [ ] **Priority Assignment**: Risk-based priority assignment using defined criteria
- [ ] **Value Assessment**: Business value and quality impact assessment

#### Labeling and Prioritization Standards

- [ ] **Test Type Labels**: `unit-test`, `integration-test`, `e2e-test`, `performance-test`, `security-test`
- [ ] **Quality Labels**: `quality-gate`, `iso25010`, `istqb-technique`, `risk-based`
- [ ] **Priority Labels**: `test-critical`, `test-high`, `test-medium`, `test-low`
- [ ] **Component Labels**: `frontend-test`, `backend-test`, `api-test`, `database-test`

#### Dependency Validation and Management

- [ ] **Circular Dependency Detection**: Validation to prevent blocking relationships
- [ ] **Critical Path Analysis**: Identification of testing dependencies on delivery timeline
- [ ] **Risk Assessment**: Impact analysis of dependency delays on quality validation
- [ ] **Mitigation Strategies**: Alternative approaches for blocked testing activities

#### Estimation Accuracy and Review

- [ ] **Historical Data Analysis**: Using past project data for estimation accuracy
- [ ] **Technical Lead Review**: Expert validation of test complexity estimates
- [ ] **Risk Buffer Allocation**: Additional time allocation for high-uncertainty tasks
- [ ] **Estimate Refinement**: Iterative improvement of estimation accuracy

## GitHub Issue Templates for Testing

### Test Strategy Issue Template

```markdown
# Test Strategy: {Feature Name}

## Test Strategy Overview

{Summary of testing approach based on ISTQB and ISO 25010}

## ISTQB Framework Application

**Test Design Techniques Used:**
- [ ] Equivalence Partitioning
- [ ] Boundary Value Analysis
- [ ] Decision Table Testing
- [ ] State Transition Testing
- [ ] Experience-Based Testing

**Test Types Coverage:**
- [ ] Functional Testing
- [ ] Non-Functional Testing
- [ ] Structural Testing
- [ ] Change-Related Testing (Regression)

## ISO 25010 Quality Characteristics

**Priority Assessment:**
- [ ] Functional Suitability: {Critical/High/Medium/Low}
- [ ] Performance Efficiency: {Critical/High/Medium/Low}
- [ ] Compatibility: {Critical/High/Medium/Low}
- [ ] Usability: {Critical/High/Medium/Low}
- [ ] Reliability: {Critical/High/Medium/Low}
- [ ] Security: {Critical/High/Medium/Low}
- [ ] Maintainability: {Critical/High/Medium/Low}
- [ ] Portability: {Critical/High/Medium/Low}

## Quality Gates
- [ ] Entry criteria defined
- [ ] Exit criteria established
- [ ] Quality thresholds documented

## Labels
`test-strategy`, `istqb`, `iso25010`, `quality-gates`

## Estimate
{Strategic planning effort: 2-3 story points}
```

### Playwright Test Implementation Issue Template

```markdown
# Playwright Tests: {Story/Component Name}

## Test Implementation Scope
{Specific user story or component being tested}

## ISTQB Test Case Design
**Test Design Technique**: {Selected ISTQB technique}
**Test Type**: {Functional/Non-Functional/Structural/Change-Related}

## Test Cases to Implement
**Functional Tests:**
- [ ] Happy path scenarios
- [ ] Error handling validation
- [ ] Boundary value testing
- [ ] Input validation testing

**Non-Functional Tests:**
- [ ] Performance testing (response time < {threshold})
- [ ] Accessibility testing (WCAG compliance)
- [ ] Cross-browser compatibility
- [ ] Mobile responsiveness

## Playwright Implementation Tasks
- [ ] Page Object Model development
- [ ] Test fixture setup
- [ ] Test data management
- [ ] Test case implementation
- [ ] Visual regression tests
- [ ] CI/CD integration

## Acceptance Criteria
- [ ] All test cases pass
- [ ] Code coverage targets met (>80%)
- [ ] Performance thresholds validated
- [ ] Accessibility standards verified

## Labels
`playwright`, `e2e-test`, `quality-validation`

## Estimate
{Test implementation effort: 2-5 story points}
```

### Quality Assurance Issue Template

```markdown
# Quality Assurance: {Feature Name}

## Quality Validation Scope
{Overall quality validation for feature/epic}

## ISO 25010 Quality Assessment
**Quality Characteristics Validation:**
- [ ] Functional Suitability: Completeness, correctness, appropriateness
- [ ] Performance Efficiency: Time behavior, resource utilization, capacity
- [ ] Usability: Interface aesthetics, accessibility, learnability, operability
- [ ] Security: Confidentiality, integrity, authentication, authorization
- [ ] Reliability: Fault tolerance, recovery, availability
- [ ] Compatibility: Browser, device, integration compatibility
- [ ] Maintainability: Code quality, modularity, testability
- [ ] Portability: Environment adaptability, installation procedures

## Quality Gates Validation
**Entry Criteria:**
- [ ] All implementation tasks completed
- [ ] Unit tests passing
- [ ] Code review approved

**Exit Criteria:**
- [ ] All test types completed with >95% pass rate
- [ ] No critical/high severity defects
- [ ] Performance benchmarks met
- [ ] Security validation passed

## Quality Metrics
- [ ] Test coverage: {target}%
- [ ] Defect density: <{threshold} defects/KLOC
- [ ] Performance: Response time <{threshold}ms
- [ ] Accessibility: WCAG {level} compliance
- [ ] Security: Zero critical vulnerabilities

## Labels
`quality-assurance`, `iso25010`, `quality-gates`

## Estimate
{Quality validation effort: 3-5 story points}
```

## Success Metrics

### Test Coverage Metrics

- **Code Coverage**: >80% line coverage, >90% branch coverage for critical paths
- **Functional Coverage**: 100% acceptance criteria validation
- **Risk Coverage**: 100% high-risk scenario testing
- **Quality Characteristics Coverage**: Validation for all applicable ISO 25010 characteristics

### Quality Validation Metrics

- **Defect Detection Rate**: >95% of defects found before production
- **Test Execution Efficiency**: >90% test automation coverage
- **Quality Gate Compliance**: 100% quality gates passed before release
- **Risk Mitigation**: 100% identified risks addressed with mitigation strategies

### Process Efficiency Metrics

- **Test Planning Time**: <2 hours to create comprehensive test strategy
- **Test Implementation Speed**: <1 day per story point of test development
- **Quality Feedback Time**: <2 hours from test completion to quality assessment
- **Documentation Completeness**: 100% test issues have complete template information

This comprehensive test planning approach ensures thorough quality validation aligned with industry standards while maintaining efficient project management and clear accountability for all testing activities.
