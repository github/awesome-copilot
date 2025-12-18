# Awesome Copilot MCP Server - Beta Release Guide

## 🎯 Release Objectives

Release the beta version of the MCP server to allow community users to test completeness and stability.

## 📋 Prerequisites

1. **npm Account**: Requires an npm account with publishing permissions
2. **Tests Passed**: All tests must pass (54/54 ✅)
3. **Build Success**: MCP server must build successfully
4. **Code Review**: Ensure code quality and security

## 🚀 Release Steps

### Automated Release (Recommended)

```bash
# Run from project root directory
./scripts/publish-beta.sh
```

The script will automatically execute:
- Run complete test suite
- Build MCP server
- Check npm login status
- Publish beta version to npm

### Manual Release

```bash
# 1. Run tests
npm run test:mcp

# 2. Build server
npm run build:mcp

# 3. Publish beta version
npm run publish:mcp:beta
```

## 📦 Package Information

- **Package Name**: `@github/awesome-copilot-mcp`
- **Version**: `1.0.0-beta.1`
- **Tag**: `beta`
- **Installation**: `npm install @github/awesome-copilot-mcp@beta`

## 🔧 VS Code Configuration

```json
{
  "mcp": {
    "servers": {
      "awesome-copilot": {
        "command": "npx",
        "args": ["awesome-copilot-mcp"],
        "env": {
          "NODE_ENV": "production"
        }
      }
    }
  }
}
```

## 🧪 Testing Plan

### Functional Testing
- [ ] MCP server starts normally
- [ ] Search agents functionality works
- [ ] Search prompts functionality works
- [ ] Search instructions functionality works
- [ ] Load resources functionality works
- [ ] Collection browsing functionality works

### Performance Testing
- [ ] Reasonable response time (< 2 seconds)
- [ ] Normal memory usage
- [ ] Large request handling works

### Compatibility Testing
- [ ] VS Code stable version compatibility
- [ ] VS Code Insiders compatibility
- [ ] Different operating system testing

## 📊 Quality Metrics

- **Test Coverage**: 96.15%
- **Test Cases**: 54 tests
- **Code Quality**: TypeScript strict mode
- **Dependency Management**: Locked versions

## 🐛 Issue Tracking

- **Issues**: https://github.com/github/awesome-copilot/issues
- **Beta Tag**: Add `beta` tag to beta-related issues
- **Priority**: Handle critical bugs with priority

## 📈 Feedback Collection

1. **GitHub Issues**: Collect user feedback and bug reports
2. **Usage Statistics**: Monitor npm download counts
3. **Community Discussion**: Discord/GitHub Discussions

## 🔄 Future Plans

### Beta Feedback Period
- Collect user feedback (2-4 weeks)
- Fix critical bugs
- Optimize performance issues

### Stable Release
- Resolve all known issues
- Update documentation
- Release `1.0.0` stable version

### Continuous Improvement
- Add new features
- Performance optimization
- User experience improvement

## 📞 Contact Information

- **Project Homepage**: https://github.com/github/awesome-copilot
- **MCP Documentation**: `eng/mcp-server/BETA_README.md`
- **Maintainers**: GitHub Team