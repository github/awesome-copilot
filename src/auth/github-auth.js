/**
 * GitHub Authentication Module for awesome-copilot
 * Fixes Issue #566: Visual Studio integration authentication errors
 */

const vscode = require('vscode');

/**
 * Verifies GitHub authentication status
 * @returns {Promise<object>} Authentication status
 */
async function verifyGitHubAuth() {
  try {
    // Try to get existing GitHub session
    const session = await vscode.authentication.getSession('github', ['repo', 'user'], {
      createIfNone: false,
      silent: true
    });

    if (!session) {
      return {
        authenticated: false,
        error: 'No GitHub session found',
        needsAuth: true
      };
    }

    // Validate token exists
    const token = session.accessToken;
    if (!token || token.length === 0) {
      return {
        authenticated: false,
        error: 'GitHub token is empty',
        needsAuth: true
      };
    }

    // Get account information
    const account = session.account;

    return {
      authenticated: true,
      token: token,
      account: account.label,
      accountId: account.id,
      scopes: session.scopes
    };
  } catch (error) {
    console.error(`GitHub auth verification failed: ${error.message}`);
    return {
      authenticated: false,
      error: error.message,
      needsAuth: true
    };
  }
}

/**
 * Requests GitHub authentication if not authenticated
 * @returns {Promise<object>} Authentication result
 */
async function requestGitHubAuth() {
  try {
    console.log('🔐 Requesting GitHub authentication...');

    const session = await vscode.authentication.getSession('github', ['repo', 'user'], {
      createIfNone: true,
      silent: false
    });

    if (!session) {
      return {
        authenticated: false,
        error: 'Failed to authenticate with GitHub - user cancelled',
        needsAuth: true
      };
    }

    const token = session.accessToken;
    if (!token) {
      return {
        authenticated: false,
        error: 'Failed to obtain GitHub token',
        needsAuth: true
      };
    }

    console.log(`✓ Authenticated as: ${session.account.label}`);

    return {
      authenticated: true,
      token: token,
      account: session.account.label,
      accountId: session.account.id,
      scopes: session.scopes
    };
  } catch (error) {
    console.error(`GitHub authentication failed: ${error.message}`);
    return {
      authenticated: false,
      error: error.message,
      needsAuth: true
    };
  }
}

/**
 * Ensures GitHub authentication is available
 * Shows UI prompts if needed
 * @returns {Promise<object>} Authentication result
 */
async function ensureGitHubAuth() {
  // First check if already authenticated
  const authStatus = await verifyGitHubAuth();

  if (authStatus.authenticated) {
    console.log(`✓ Already authenticated as: ${authStatus.account}`);
    return authStatus;
  }

  // Not authenticated, request authentication
  console.log('⚠ GitHub authentication required');

  const selection = await vscode.window.showInformationMessage(
    'awesome-copilot requires GitHub authentication to function properly.',
    'Sign In',
    'Cancel'
  );

  if (selection === 'Sign In') {
    return await requestGitHubAuth();
  } else {
    return {
      authenticated: false,
      error: 'User cancelled authentication',
      needsAuth: true
    };
  }
}

/**
 * Creates an authenticated API client
 * @returns {Promise<object>} API client or error
 */
async function getAuthenticatedClient() {
  const authStatus = await verifyGitHubAuth();

  if (!authStatus.authenticated) {
    const auth = await requestGitHubAuth();
    if (!auth.authenticated) {
      throw new Error(`Failed to authenticate: ${auth.error}`);
    }
    return {
      token: auth.token,
      headers: {
        'Authorization': `token ${auth.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    };
  }

  return {
    token: authStatus.token,
    headers: {
      'Authorization': `token ${authStatus.token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  };
}

/**
 * Validates GitHub token by making a test API call
 * @param {string} token - GitHub token to validate
 * @returns {Promise<boolean>} Token validity
 */
async function validateToken(token) {
  try {
    const fetch = require('node-fetch');

    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    return response.status === 200;
  } catch (error) {
    console.error(`Token validation failed: ${error.message}`);
    return false;
  }
}

/**
 * Handles authentication errors gracefully
 * @param {Error} error - The error that occurred
 * @returns {Promise<object>} Recovery action
 */
async function handleAuthError(error) {
  console.error(`Authentication error: ${error.message}`);

  // Determine recovery action based on error
  if (error.message.includes('401') || error.message.includes('unauthorized')) {
    // Token expired or invalid
    const action = await vscode.window.showWarningMessage(
      'GitHub authentication has expired. Please sign in again.',
      'Sign In Again',
      'Cancel'
    );

    if (action === 'Sign In Again') {
      return await requestGitHubAuth();
    }
  } else if (error.message.includes('403')) {
    // Insufficient permissions
    vscode.window.showErrorMessage(
      'GitHub token does not have required permissions (repo, user). Please re-authenticate.'
    );
  } else {
    // Generic auth error
    const action = await vscode.window.showErrorMessage(
      `Authentication error: ${error.message}`,
      'Retry',
      'Cancel'
    );

    if (action === 'Retry') {
      return await requestGitHubAuth();
    }
  }

  return {
    authenticated: false,
    error: error.message
  };
}

/**
 * Status indicator for authentication
 * @returns {Promise<string>} Status message
 */
async function getAuthStatus() {
  const status = await verifyGitHubAuth();

  if (status.authenticated) {
    return `✓ Authenticated as ${status.account}`;
  } else {
    return `✗ Not authenticated`;
  }
}

module.exports = {
  verifyGitHubAuth,
  requestGitHubAuth,
  ensureGitHubAuth,
  getAuthenticatedClient,
  validateToken,
  handleAuthError,
  getAuthStatus
};
