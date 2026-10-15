# runFullTrust rationale template

Replace every bracketed field with verified product-specific information.

> [PRODUCT_NAME] is a packaged [DESKTOP_TECHNOLOGY] desktop application. It
> requires `runFullTrust` to [PRIMARY_NATIVE_PURPOSE]. The application uses
> [WINDOWS_APIS_OR_SUBSYSTEMS] for [BEHAVIOR]. It
> [LAUNCHES/DOES_NOT_LAUNCH] [HELPER_PROCESS_DESCRIPTION] to
> [HELPER_PURPOSE], and uses [STARTUP_OR_TRAY_INTEGRATION] for
> [USER_VISIBLE_BEHAVIOR]. It does not require elevation and does not install
> drivers or services. It does not change system-wide settings
> [AND_DOES/DOES_NOT] use a cloud backend. All full-trust behavior runs in the
> signed application package under the interactive user's account.

Checklist:

- Name the exact desktop technology.
- Name the native Windows APIs or subsystems.
- Explain every helper executable or self-spawned worker mode.
- Explain startup-task and tray behavior.
- State whether elevation is used.
- State whether services or drivers are installed.
- State whether system-wide settings are changed.
- State whether a cloud service is used.
- Keep the statement factual and consistent with the package.
