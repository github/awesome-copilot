---
description: |
  Comprehensive Flutter and Dart development guidelines covering best practices, error handling, testing, and modern development patterns
appliesTo: "**/*.dart, **/pubspec.yaml, **/analysis_options.yaml"
---

# Flutter and Dart Development Instructions

Instructions for generating high-quality Flutter applications with Dart, following modern development practices, Material Design 3 guidelines, and comprehensive error handling strategies.

## Project Context
- Latest stable Flutter version with Dart 3.0+ features
- Material Design 3 (Material You) for UI components
- Null-safety enabled by default
- Modern state management solutions (Provider, Riverpod, Bloc, or built-in setState)
- Clean architecture with proper separation of concerns
- Follow official Flutter Style Guide and effective Dart practices

## Error Handling Guidelines

### Clear Error Messages
- Provide user-friendly error messages that explain what went wrong and suggest next steps
- Use specific error types rather than generic exceptions
- Include context information in error messages for debugging
- Implement proper error logging with different severity levels

### User Feedback
- Show loading states during asynchronous operations using `CircularProgressIndicator` or custom loading widgets
- Display error states with retry mechanisms using `SnackBar`, `AlertDialog`, or dedicated error widgets
- Provide success feedback for completed actions
- Use proper navigation and state restoration on errors

### Error Boundaries
- Implement `FlutterError.onError` for catching Flutter framework errors
- Use `PlatformDispatcher.instance.onError` for catching async errors outside Flutter
- Create custom error widgets with `ErrorWidget.builder` for graceful error displays
- Implement proper error handling in async operations with try-catch blocks

### Logging and Error Reporting
- Use `debugPrint` for development logging, remove in production
- Implement structured logging with packages like `logger`
- Integrate crash reporting tools like Firebase Crashlytics or Sentry
- Log meaningful information including user actions, API responses, and error context

### TODO Comments and Incomplete Suggestions
- Use `// TODO:` comments for incomplete implementations with specific next steps
- Include estimated effort and priority in TODO comments
- Use `// FIXME:` for known issues that need immediate attention
- Document assumptions and limitations in comments

### Clarifying Questions
- Ask specific questions about business logic requirements
- Clarify state management patterns preferred for the project
- Confirm API integration patterns and authentication methods
- Verify accessibility and internationalization requirements

### Input Validation
- Validate user inputs using `TextFormField` with custom validators
- Implement client-side validation with immediate feedback
- Use proper input types and keyboard configurations
- Sanitize inputs before processing or API calls

### Edge Case Handling
- Handle network connectivity changes with `connectivity_plus` package
- Implement proper handling for device orientation changes
- Handle app lifecycle states (paused, resumed, detached)
- Manage memory effectively with proper widget disposal

### Recovery Mechanisms
- Implement retry logic for failed network requests with exponential backoff
- Provide offline capabilities with local data caching
- Allow users to manually refresh data when errors occur
- Implement graceful degradation for non-critical features

## General Guidelines

### Dart Language Best Practices
- Use Dart 3.0+ features: records, patterns, sealed classes, and switch expressions
- Prefer `final` and `const` variables over `var` when type is clear
- Use meaningful variable and function names following camelCase convention
- Implement proper null-safety with null-aware operators (`?.`, `??`, `!`)
- Use extension methods to add functionality to existing classes

### Null-Safety
- Enable null-safety in `pubspec.yaml` and maintain sound null-safety
- Use non-nullable types by default, nullable only when necessary
- Implement proper null checks before accessing nullable variables
- Use `late` keyword judiciously for delayed initialization
- Prefer null-aware operators over explicit null checks

### Code Style and Formatting
- Follow Dart's official style guide and use `dart format` command
- Configure `analysis_options.yaml` with strict linting rules
- Use `dart analyze` to catch potential issues before runtime
- Implement consistent naming conventions for files, classes, and variables
- Group imports: Dart SDK, Flutter, external packages, then local files

### Const Constructors
- Use `const` constructors for immutable widgets and reduce rebuilds
- Mark constructor parameters as `const` when appropriate
- Use `const` for static lists, maps, and other compile-time constants
- Leverage `const` in widget trees to optimize performance

## Flutter Best Practices

### Widget Structure
- Create small, focused widgets with single responsibilities
- Use composition over inheritance for building complex UIs
- Implement proper widget separation: presentation, business logic, and data
- Prefer `StatelessWidget` over `StatefulWidget` when state is not needed
- Use `Builder` widgets to provide new build contexts when necessary

### State Management
- Choose appropriate state management solution based on app complexity
- Use `setState` for simple local state in small widgets
- Implement Provider/Riverpod for medium to large applications
- Use BLoC pattern for complex business logic and testing requirements
- Avoid global state when local state is sufficient

### Responsive Design
- Use `MediaQuery` to get screen dimensions and adapt layouts
- Implement responsive layouts with `LayoutBuilder` and `OrientationBuilder`
- Use `Flexible` and `Expanded` widgets for dynamic sizing
- Create breakpoint-based layouts for different screen sizes
- Test on various device sizes and orientations

### Performance Optimization
- Use `const` constructors to prevent unnecessary rebuilds
- Implement `ListView.builder` for large scrollable lists
- Use `RepaintBoundary` to isolate expensive widgets
- Optimize images with proper sizing and caching
- Profile app performance using Flutter DevTools

### Error Handling in Widgets
- Implement `FutureBuilder` and `StreamBuilder` with proper error states
- Use `ErrorWidget` for custom error displays
- Handle async operations with loading and error states
- Provide fallback UI for failed widget builds

### Dependencies Management
- Keep `pubspec.yaml` organized with clear dependency separation
- Use specific version constraints to avoid breaking changes
- Regularly update dependencies and test for compatibility
- Use `dependency_overrides` sparingly and document reasons

### Security Considerations
- Never store sensitive data in plain text
- Use secure storage packages for sensitive information
- Implement proper API authentication with secure token handling
- Validate all user inputs and sanitize data
- Use HTTPS for all network communications

### Internationalization (i18n)
- Use `flutter_localizations` package for multi-language support
- Implement `Localizations` and `MaterialLocalizations`
- Extract all user-facing strings to localization files
- Test app with different locales and text directions (RTL support)
- Consider cultural differences in UI design and date formats

## File & Project Structure

### Organized Project Structure
```
lib/
├── main.dart
├── app/
│   ├── app.dart
│   └── routes/
├── core/
│   ├── constants/
│   ├── errors/
│   ├── network/
│   └── utils/
├── features/
│   └── feature_name/
│       ├── data/
│       │   ├── models/
│       │   ├── repositories/
│       │   └── data_sources/
│       ├── domain/
│       │   ├── entities/
│       │   ├── repositories/
│       │   └── use_cases/
│       └── presentation/
│           ├── pages/
│           ├── widgets/
│           └── bloc_or_provider/
├── shared/
│   ├── widgets/
│   ├── themes/
│   └── extensions/
└── generated/
```

### Naming Conventions
- Use snake_case for file and directory names
- Use PascalCase for class names and enum values
- Use camelCase for variables, functions, and parameters
- Prefix private variables and functions with underscore
- Use descriptive names that clearly indicate purpose

### Asset Organization
- Organize assets by type: `assets/images/`, `assets/icons/`, `assets/fonts/`
- Use appropriate image formats (WebP, SVG for icons)
- Implement asset generation tools for different screen densities
- Maintain consistent naming conventions for assets

## Code Suggestions

### Context-Aware Development
- Analyze existing code patterns and maintain consistency
- Suggest appropriate widgets based on Material Design 3 guidelines
- Recommend state management patterns that fit the current architecture
- Consider performance implications of suggested code changes

### Complete Code Snippets
- Provide complete, working code examples with proper imports
- Include error handling in all async operations
- Add proper documentation and comments for complex logic
- Ensure code follows established project patterns

### Import Management
- Suggest necessary imports for recommended packages
- Organize imports according to Dart conventions
- Remove unused imports and suggest package optimizations
- Use relative imports for local files, absolute for packages

### Modern Dart Features
- Utilize Dart 3.0+ features: records, patterns, sealed classes
- Suggest null-aware operators and null-safety best practices
- Recommend modern async/await patterns over callbacks
- Use collection methods (map, where, fold) for data manipulation

### Material Design 3 Integration
- Suggest Material 3 widgets: `NavigationBar`, `SegmentedButton`, `FilledButton`
- Implement proper theming with `ColorScheme.fromSeed()`
- Use `Material` and `MaterialApp` with proper theme configuration
- Follow Material Design 3 spacing, typography, and color guidelines

## Testing & Debugging

### Unit Testing
- Write unit tests for business logic and data models
- Use `test` package for pure Dart testing
- Mock dependencies with `mockito` or `mocktail` packages
- Achieve high test coverage for critical business logic
- Test edge cases and error conditions

### Widget Testing
- Use `flutter_test` package for widget testing
- Test widget behavior, user interactions, and state changes
- Use `testWidgets` for testing individual widgets
- Mock external dependencies in widget tests
- Test accessibility features and responsive layouts

### Integration Testing
- Implement end-to-end tests with `integration_test` package
- Test complete user flows and app functionality
- Use page object pattern for maintainable integration tests
- Test on real devices for accurate performance metrics
- Automate integration tests in CI/CD pipeline

### Debugging Tools
- Use `debugPrint` for development logging, remove in production
- Leverage Flutter Inspector for widget tree analysis
- Use Flutter DevTools for performance profiling and memory analysis
- Implement proper logging strategies with different severity levels
- Use breakpoints and step-through debugging effectively

### Code Analysis
- Configure `analysis_options.yaml` with comprehensive linting rules
- Use `dart analyze` to catch potential issues before runtime
- Run `dart format` to maintain consistent code formatting
- Use Flutter's built-in linting rules and consider additional packages

### Performance Testing
- Profile app performance using Flutter DevTools
- Monitor memory usage and identify potential leaks
- Test app performance on low-end devices
- Measure startup time and optimize critical paths
- Use Timeline view to identify UI performance bottlenecks

## CI/CD and Workflow

### GitHub Actions Integration
- Set up automated testing on pull requests
- Implement code formatting and linting checks
- Configure build automation for different platforms (iOS, Android, Web)
- Set up automated deployment to app stores or hosting platforms
- Include security scanning and dependency checks

### Version Management
- Use semantic versioning for app releases
- Maintain proper version numbering in `pubspec.yaml`
- Tag releases with clear release notes
- Implement changelog generation and maintenance
- Use Git flow or GitHub flow for branch management

### GitFlow Best Practices
- Use feature branches for new functionality
- Implement proper code review processes
- Maintain clean commit history with meaningful messages
- Use conventional commit messages for automated changelog generation
- Configure branch protection rules for main/master branch

### Build Configuration
- Configure build flavors for different environments (dev, staging, prod)
- Use environment-specific configuration files
- Implement proper signing and security configurations
- Set up automated builds for continuous integration
- Configure testing environments and deployment strategies

## Common Patterns

### Async/Await Patterns
- Use `async`/`await` for asynchronous operations instead of `.then()`
- Implement proper error handling with try-catch blocks in async functions
- Use `Future.wait()` for concurrent operations
- Implement timeout handling for network requests
- Use `StreamBuilder` for reactive data streams

### InheritedWidget and Provider Pattern
- Use `InheritedWidget` for passing data down the widget tree
- Implement Provider pattern for state management
- Use `Consumer` widgets for efficient rebuilds
- Leverage `Selector` for specific property listening
- Implement proper disposal in provider classes

### Theme and Styling Patterns
- Define app-wide themes using `ThemeData` and Material Design 3
- Use `Theme.of(context)` to access theme properties
- Implement dark and light theme support
- Create custom theme extensions for app-specific styling
- Use consistent spacing and typography throughout the app

### Navigation Patterns
- Use `Navigator.push()` and `Navigator.pop()` for basic navigation
- Implement named routes for complex navigation structures
- Use `GoRouter` or similar packages for advanced routing needs
- Handle deep linking and URL-based navigation for web
- Implement proper navigation state management

## Context Awareness

### Intent Recognition
- Analyze code context to suggest appropriate solutions
- Understand app architecture and suggest consistent patterns
- Recognize state management patterns and maintain consistency
- Suggest optimizations based on current code structure

### Clarifying Questions
- Ask about preferred state management approach when unclear
- Clarify API integration requirements and authentication methods
- Verify accessibility and internationalization requirements
- Confirm platform-specific implementation needs (iOS vs Android)

### Library and Tool Integration
- Suggest appropriate packages from pub.dev based on requirements
- Recommend testing frameworks that fit the project structure
- Suggest development tools for productivity improvement
- Consider package compatibility and maintenance status

### Architecture Considerations
- Suggest architectural patterns (Clean Architecture, MVVM, etc.)
- Recommend code organization strategies for scalability
- Consider performance implications of architectural decisions
- Suggest refactoring approaches for existing code

## Additional Notes

### Accessibility (a11y)
- Implement proper semantic labels with `Semantics` widget
- Use `semanticLabel` properties for images and interactive elements
- Test with screen readers and accessibility tools
- Follow WCAG guidelines for color contrast and text sizing
- Implement proper focus management for keyboard navigation

### Platform-Specific UI Considerations
- Use `Platform.isIOS` and `Platform.isAndroid` for platform-specific code
- Implement platform-adaptive widgets with `adaptive` constructors
- Consider iOS Human Interface Guidelines and Material Design differences
- Use platform-specific navigation patterns when appropriate
- Test thoroughly on both platforms for consistent user experience

### Performance Best Practices
- Avoid rebuilding expensive widgets unnecessarily
- Use `const` constructors wherever possible
- Implement proper disposal methods for resources
- Optimize image loading and caching strategies
- Monitor and optimize app startup time

### Avoiding Outdated Practices
- Avoid deprecated Flutter APIs and migrate to newer alternatives
- Don't use `StatefulWidget` when `StatelessWidget` suffices
- Avoid global variables and prefer dependency injection
- Don't ignore null-safety warnings and analyzer suggestions
- Avoid blocking the main thread with heavy computations

## Example Scenarios & Sample Code Suggestions

### Complete Widget Example
```dart
import 'package:flutter/material.dart';

class UserProfileCard extends StatelessWidget {
  const UserProfileCard({
    super.key,
    required this.user,
    this.onTap,
  });

  final User user;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            children: [
              CircleAvatar(
                radius: 30,
                backgroundImage: user.avatarUrl != null
                    ? NetworkImage(user.avatarUrl!)
                    : null,
                child: user.avatarUrl == null
                    ? Text(user.initials)
                    : null,
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      user.name,
                      style: theme.textTheme.titleMedium,
                    ),
                    if (user.email != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        user.email!,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```

### Async Data Loading with Error Handling
```dart
class UserRepository {
  final ApiClient _apiClient;
  
  const UserRepository(this._apiClient);
  
  Future<Result<List<User>>> getUsers() async {
    try {
      final response = await _apiClient.get('/users');
      final users = (response.data as List)
          .map((json) => User.fromJson(json))
          .toList();
      return Result.success(users);
    } on NetworkException catch (e) {
      return Result.failure(
        AppError.network(
          message: 'Failed to load users. Please check your connection.',
          originalError: e,
        ),
      );
    } catch (e) {
      return Result.failure(
        AppError.unknown(
          message: 'An unexpected error occurred.',
          originalError: e,
        ),
      );
    }
  }
}
```

### New Screen with Proper State Management
```dart
class UserListScreen extends ConsumerWidget {
  const UserListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final usersAsync = ref.watch(usersProvider);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Users'),
        actions: [
          IconButton(
            onPressed: () => ref.refresh(usersProvider),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: usersAsync.when(
        data: (users) => ListView.builder(
          itemCount: users.length,
          itemBuilder: (context, index) {
            final user = users[index];
            return UserProfileCard(
              user: user,
              onTap: () => context.push('/user/${user.id}'),
            );
          },
        ),
        loading: () => const Center(
          child: CircularProgressIndicator(),
        ),
        error: (error, stack) => ErrorView(
          error: error,
          onRetry: () => ref.refresh(usersProvider),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/user/new'),
        child: const Icon(Icons.add),
      ),
    );
  }
}
```

### Package Usage Example
```dart
// Example using HTTP package for API calls
import 'package:http/http.dart' as http;
import 'dart:convert';

class ApiClient {
  final String baseUrl;
  final http.Client _client;
  
  ApiClient({
    required this.baseUrl,
    http.Client? client,
  }) : _client = client ?? http.Client();
  
  Future<ApiResponse> get(String endpoint) async {
    try {
      final uri = Uri.parse('$baseUrl$endpoint');
      final response = await _client.get(
        uri,
        headers: {'Content-Type': 'application/json'},
      ).timeout(const Duration(seconds: 10));
      
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return ApiResponse(
          data: json.decode(response.body),
          statusCode: response.statusCode,
        );
      } else {
        throw ApiException(
          statusCode: response.statusCode,
          message: 'Request failed with status ${response.statusCode}',
        );
      }
    } on TimeoutException {
      throw NetworkException('Request timeout');
    } on SocketException {
      throw NetworkException('No internet connection');
    }
  }
  
  void dispose() {
    _client.close();
  }
}
```

---

*These instructions provide comprehensive guidance for Flutter and Dart development with modern best practices, error handling, and code quality standards. Follow these guidelines to create maintainable, performant, and user-friendly Flutter applications.*