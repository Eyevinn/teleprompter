# Contributing to Open Teleprompter

We welcome contributions to Open Teleprompter! This document outlines the process for contributing to this project.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/open-teleprompter.git
   cd open-teleprompter
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm start
   ```

## Development Process

### Making Changes

1. Create a new branch for your feature or bug fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes, ensuring:
   - Code follows existing style and conventions
   - Features are properly tested
   - Documentation is updated if needed

3. Test your changes:
   - Test both controller and display interfaces
   - Verify WebSocket connectivity
   - Test Docker deployment if applicable

4. Commit your changes with a descriptive message:
   ```bash
   git commit -m "Add feature: brief description of your changes"
   ```

### Submitting Changes

1. Push your branch to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. Create a Pull Request on GitHub with:
   - Clear description of changes
   - Screenshots/recordings if UI changes are involved
   - Reference to any related issues

## Code Style

- Use consistent indentation (2 spaces)
- Follow existing naming conventions
- Add comments for complex logic
- Keep functions focused and modular

## Testing

Before submitting changes:

1. Test the application manually:
   - Upload and display manuscripts
   - Test all control features (start, pause, reset)
   - Verify scheduled start functionality
   - Test on-air indicator behavior

2. Test Docker deployment:
   ```bash
   docker build -t open-teleprompter .
   docker run -p 8080:8080 open-teleprompter
   ```

## Reporting Issues

When reporting bugs or requesting features:

1. Check if the issue already exists
2. Use the issue template if available
3. Include:
   - Clear description of the problem
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser and operating system information
   - Screenshots or error messages

## Community

- Join our [Slack community](http://slack.streamingtech.se) for discussions
- Be respectful and constructive in all interactions
- Help others in the community when possible

## License

By contributing to Open Teleprompter, you agree that your contributions will be licensed under the Apache License 2.0.

## Questions?

If you have questions about contributing, feel free to:
- Ask in our [Slack community](http://slack.streamingtech.se)
- Open an issue for discussion
- Contact us at [work@eyevinn.se](mailto:work@eyevinn.se)

Thank you for contributing to Open Teleprompter!