# Contributing to SuperDoc

Thank you for your interest in contributing to SuperDoc! We're excited to have you join our community. This document provides guidelines and information about contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)
- [Style Guidelines](#style-guidelines)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it are governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to [support@harbourshare.com](mailto:support@harbourshare.com).

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check [existing issues](https://github.com/Harbour-Enterprises/SuperDoc/issues) as you might find that the issue has already been reported. When creating a bug report, include as many details as possible:

- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior vs actual behavior
- Screenshots if applicable
- Your environment (browser, OS, SuperDoc version)
- Code samples demonstrating the issue
- Any relevant error messages

### Suggesting Features

Feature suggestions are tracked as GitHub issues. When creating a feature suggestion:

- Use a clear and descriptive title
- Provide a detailed description of the proposed feature
- Explain why this feature would be useful
- Include mockups or examples if applicable

### Documentation Improvements

Documentation is crucial for our project. You can help by:

- Fixing typos and grammar
- Adding code examples
- Improving explanations
- Adding new sections
- Translating documentation

### Code Contributions

#### Types of Contributions

1. **Bug fixes**: Resolve existing issues
2. **Features**: Implement new functionality
3. **Performance improvements**: Optimize existing code
4. **Tests**: Add or improve test coverage
5. **Framework integrations**: Create examples for different frameworks
6. **Documentation**: Improve SuperDoc documentation

## Development Setup

1. **Fork and Clone**:

   ```bash
   git clone https://github.com/Harbour-Enterprises/SuperDoc.git
   cd SuperDoc
   ```

2. **Install Dependencies**:

   ```bash
   npm install
   ```

3. **Set Up Development Environment**:

   ```bash
   npm run dev
   ```

4. **Run Tests**:
   ```bash
   npm test
   ```

## Pull Request Process

1. **Branch Naming**:

   - `feature/description` for new features
   - `fix/description` for bug fixes
   - `docs/description` for documentation changes
   - `perf/description` for performance improvements

2. **Commit Messages**:

   - Use present tense ("add feature" not "added feature")
   - Be descriptive but concise
   - Reference issues and pull requests

   ```
   feat: add real-time cursor sharing

   - Implement cursor position tracking
   - Add websocket connection for updates
   - Include user identification

   Closes #123
   ```

3. **Before Submitting**:

   - Update documentation if needed
   - Add or update tests
   - Run the test suite
   - Update the changelog if applicable
   - Ensure CI passes

4. **Pull Request Description**:
   - Describe the changes
   - Link to related issues
   - Include screenshots for UI changes
   - List any breaking changes
   - Mention dependencies added/removed

## Release Process

SuperDoc uses automated semantic-release. No manual version bumps needed.

### How It Works

**Branches:**

- `main` → Preview releases (`@next` tag)
- `release/vX.Y` → Stable releases (`@latest` tag)

**Your commits control versions:**

| Commit            | Version Change | Example                   |
| ----------------- | -------------- | ------------------------- |
| `fix:`            | Patch (0.0.X)  | `fix: resolve cursor bug` |
| `feat:`           | Minor (0.X.0)  | `feat: add PDF export`    |
| `feat!:`          | Major (X.0.0)  | `feat!: new API format`   |
| `docs:`, `chore:` | No change      | `docs: update README`     |

### Commit Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat(editor): add table support
fix: resolve memory leak
feat!: change document format

BREAKING CHANGE: New format required
```

### Creating Releases

**Preview (automatic):** Every merge to `main` → `0.17.0-next.1, next.2...`

**Stable (manual trigger):**

```bash
git checkout -b release/v0.17
git push origin release/v0.17
# Automatically publishes 0.17.0
```

**Hotfix:** Fix directly on release branch → auto publishes patch

### Testing

Run dry-run to preview: `npx semantic-release --dry-run --no-ci`

## Style Guidelines

### JavaScript

- Use JavaScript for all new code
- Follow the existing code style
- Use ES6+ features when appropriate
- Document public APIs using JSDoc
- Maximum line length of 100 characters
- Use meaningful variable names

### Documentation

- Use JSDoc
- Include code examples when relevant
- Keep explanations clear and concise
- Use proper Markdown formatting

### Testing

- Write tests for new features
- Update tests for bug fixes
- Aim for high coverage of critical paths
- Include both unit and integration tests
- Test edge cases and error conditions

## Community

- Join our [Discord server](https://discord.gg/HydwD7Kq) for discussions
- Participate in [GitHub Discussions](https://github.com/Harbour-Enterprises/SuperDoc/discussions)
- Attend our community meetings (schedule TBA)

### Recognition

We recognize contributions in several ways:

- Featured in our [contributors page](https://github.com/Harbour-Enterprises/SuperDoc#contributors)
- Mentioned in release notes
- Opportunities to join the core team

## Questions?

If you have questions, feel free to:

- Start a [GitHub Discussion](https://github.com/Harbour-Enterprises/SuperDoc/discussions)
- Join our [Discord server](https://discord.gg/wjMccuygvy)
- Email us at [support@harbourshare.com](mailto:support@harbourshare.com)

---

Thank you for contributing to SuperDoc! Your efforts help make document editing on the web better for everyone.
