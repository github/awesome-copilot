/**
 * Lightweight graceful shutdown helper for one-off scripts.
 *
 * Call setupGracefulShutdown('script-name') early in your script to attach
 * signal and exception handlers that exit the process cleanly.
 *
 * @param {string} name - Human readable name for log messages
 * @param {{exitCode?:number}} [opts]
 * @returns {() => void} teardown function to remove handlers (useful in tests)
 */
export const setupGracefulShutdown = (name, { exitCode = 1 } = {}) => {
  let _shuttingDown = false;

  const cleanup = (signal) => {
    if (_shuttingDown) return;
    _shuttingDown = true;
    console.log(`\n🛑 ${name}: received ${signal}, shutting down gracefully...`);
    // Best-effort cleanup: keep this short and synchronous
    try {
      // Place for lightweight cleanup tasks if needed in future
    } catch (e) {
      console.error(`${name}: error during shutdown cleanup:`, e);
    }

    // Exit with a non-zero code to indicate abnormal termination
    try {
      process.exit(exitCode);
    } catch (e) {
      // If process.exit is stubbed or overridden (e.g. in tests), surface the failure.
      console.error(`${name}: process.exit failed:`, e?.message || e);
      throw e;
    }
  };

  const onSigInt = () => cleanup('SIGINT');
  const onSigTerm = () => cleanup('SIGTERM');
  const onSigHup = () => cleanup('SIGHUP');
  const onUncaught = (err) => {
    console.error(`${name}: Uncaught exception:`, err);
    cleanup('uncaughtException');
  };
  const onUnhandledRejection = (reason) => {
    console.error(`${name}: Unhandled promise rejection:`, reason);
    cleanup('unhandledRejection');
  };

  process.on('SIGINT', onSigInt);
  process.on('SIGTERM', onSigTerm);
  process.on('SIGHUP', onSigHup);
  process.on('uncaughtException', onUncaught);
  process.on('unhandledRejection', onUnhandledRejection);

  // Return a teardown function useful for tests or if a caller wants to remove handlers
  return () => {
    process.removeListener('SIGINT', onSigInt);
    process.removeListener('SIGTERM', onSigTerm);
    process.removeListener('SIGHUP', onSigHup);
    process.removeListener('uncaughtException', onUncaught);
    process.removeListener('unhandledRejection', onUnhandledRejection);
  };
};
