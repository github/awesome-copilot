import { test } from "node:test";
import assert from "node:assert/strict";

import {
    ConnectorAuthenticationRequiredError,
    InteractiveAuthBroker,
} from "./auth.mjs";

function accessToken(token = "token", expiresOnTimestamp = 2_000_000_000_000) {
    return { token, expiresOnTimestamp };
}

function authenticationRecord(username = "user@example.com") {
    return {
        authority: "login.microsoftonline.com",
        homeAccountId: "home-account",
        clientId: "client-id",
        tenantId: "tenant-id",
        username,
    };
}

test("ARM token requests require an explicit browser sign-in", async () => {
    let credentialOptions;
    const broker = new InteractiveAuthBroker({
        createCredential(options) {
            credentialOptions = options;
            return {
                async getToken() {
                    const error = new Error("No cached account found.");
                    error.name = "AuthenticationRequiredError";
                    throw error;
                },
            };
        },
    });

    await assert.rejects(
        broker.getToken(),
        (error) => error instanceof ConnectorAuthenticationRequiredError
            && error.code === "authentication_required",
    );
    assert.deepEqual(credentialOptions, {
        redirectUri: "http://localhost",
        disableAutomaticAuthentication: true,
    });
});

test("interactive sign-in reports pending then done and keeps the ARM token in memory", async () => {
    let credentialOptions;
    let authenticateOptions;
    const credential = {
        async authenticate(scope, options) {
            assert.equal(scope, "https://management.azure.com/.default");
            authenticateOptions = options;
            return authenticationRecord();
        },
        async getToken(scope, options) {
            assert.equal(scope, "https://management.azure.com/.default");
            assert.equal(options.abortSignal, authenticateOptions.abortSignal);
            return accessToken();
        },
    };
    const broker = new InteractiveAuthBroker({
        createCredential(options) {
            credentialOptions = options;
            return credential;
        },
        createSessionId: () => "signin-session",
        now: () => 1_000,
    });

    const started = broker.startSignIn();
    assert.deepEqual(started, {
        ok: true,
        sessionId: "signin-session",
        mode: "interactive",
    });
    assert.deepEqual(broker.getSignInStatus(started.sessionId), {
        ok: true,
        status: "pending",
        mode: "interactive",
    });

    await broker.sessions.get(started.sessionId).promise;

    assert.deepEqual(credentialOptions, {
        redirectUri: "http://localhost",
        disableAutomaticAuthentication: true,
    });
    assert.equal(authenticateOptions.abortSignal.aborted, false);
    assert.deepEqual(broker.getSignInStatus(started.sessionId), { ok: true, status: "done" });
    assert.deepEqual(broker.getSignInStatus(started.sessionId), { ok: true, status: "done" });
    assert.deepEqual(broker.cancelSignIn(started.sessionId), { ok: true });
    assert.equal(authenticateOptions.abortSignal.aborted, false);
    assert.deepEqual(broker.getSignInStatus(started.sessionId), { ok: true, status: "done" });
    assert.equal(await broker.getToken(), "token");
});

test("a new broker requires browser sign-in after the extension reloads", async () => {
    let authenticateCalls = 0;
    let createCredentialCalls = 0;
    const createCredential = (options) => {
        createCredentialCalls++;
        assert.deepEqual(options, {
            redirectUri: "http://localhost",
            disableAutomaticAuthentication: true,
        });
        let signedIn = false;
        return {
            async authenticate() {
                authenticateCalls++;
                signedIn = true;
                return authenticationRecord();
            },
            async getToken() {
                if (signedIn) return accessToken("memory-token");
                const error = new Error("No cached account found.");
                error.name = "AuthenticationRequiredError";
                throw error;
            },
        };
    };
    const signedInBroker = new InteractiveAuthBroker({
        createCredential,
        createSessionId: () => "persist-session",
        now: () => 1_000,
    });
    const started = signedInBroker.startSignIn();
    await signedInBroker.sessions.get(started.sessionId).promise;
    assert.equal(authenticateCalls, 1);
    assert.equal(await signedInBroker.getToken(), "memory-token");

    const restartedBroker = new InteractiveAuthBroker({
        createCredential,
        now: () => 1_000,
    });
    await assert.rejects(restartedBroker.getToken(), ConnectorAuthenticationRequiredError);
    assert.equal(authenticateCalls, 1);
    assert.equal(createCredentialCalls, 2);
});

test("concurrent first-time token requests share credential acquisition", async () => {
    let releaseToken;
    const tokenReady = new Promise((resolve) => {
        releaseToken = resolve;
    });
    let createCredentialCalls = 0;
    let tokenCalls = 0;
    const broker = new InteractiveAuthBroker({
        createCredential: () => {
            createCredentialCalls++;
            return {
                async getToken() {
                    tokenCalls++;
                    await tokenReady;
                    return accessToken("shared-token");
                },
            };
        },
    });

    const firstRequest = broker.getToken();
    const secondRequest = broker.getToken();
    await new Promise((resolve) => setImmediate(resolve));
    releaseToken();

    assert.deepEqual(
        await Promise.all([firstRequest, secondRequest]),
        ["shared-token", "shared-token"],
    );
    assert.equal(createCredentialCalls, 1);
    assert.equal(tokenCalls, 1);
});

test("cancelling sign-in aborts the credential request", async () => {
    let abortSignal;
    const credential = {
        authenticate(_scope, options) {
            abortSignal = options.abortSignal;
            return new Promise((resolve, reject) => {
                options.abortSignal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
            });
        },
        async getToken() {
            const error = new Error("No cached account found.");
            error.name = "AuthenticationRequiredError";
            throw error;
        },
    };
    const broker = new InteractiveAuthBroker({
        createCredential: () => credential,
        createSessionId: () => "cancel-session",
        now: () => 1_000,
    });

    const started = broker.startSignIn();
    const pending = broker.sessions.get(started.sessionId).promise;
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(abortSignal.aborted, false);

    assert.deepEqual(broker.cancelSignIn(started.sessionId), { ok: true });
    await pending;

    assert.equal(abortSignal.aborted, true);
    assert.deepEqual(broker.getSignInStatus(started.sessionId), { ok: true, status: "cancelled" });
    assert.deepEqual(broker.getSignInStatus(started.sessionId), { ok: true, status: "cancelled" });
    await assert.rejects(broker.getToken(), ConnectorAuthenticationRequiredError);
});

test("sign-in failures are surfaced through the status endpoint contract", async () => {
    const broker = new InteractiveAuthBroker({
        createCredential: () => ({
            async authenticate() {
                throw new Error("browser launch failed");
            },
            async getToken() {
                throw new Error("unreachable");
            },
        }),
        createSessionId: () => "failed-session",
        now: () => 1_000,
    });

    const started = broker.startSignIn();
    await broker.sessions.get(started.sessionId).promise;

    assert.deepEqual(broker.getSignInStatus(started.sessionId), {
        ok: false,
        status: "error",
        error: "browser launch failed",
    });
    assert.deepEqual(broker.getSignInStatus(started.sessionId), {
        ok: false,
        status: "error",
        error: "browser launch failed",
    });
    assert.deepEqual(broker.cancelSignIn(started.sessionId), { ok: true });
    assert.deepEqual(broker.getSignInStatus(started.sessionId), {
        ok: false,
        status: "error",
        error: "browser launch failed",
    });
});

test("legacy credential cleanup retries after a transient failure", async () => {
    let cleanupCalls = 0;
    const broker = new InteractiveAuthBroker({
        cleanupLegacyCredentials: async () => {
            cleanupCalls++;
            if (cleanupCalls === 1) throw new Error("legacy cache is locked");
        },
        createCredential: () => ({
            async getToken() {
                return accessToken();
            },
        }),
    });

    await assert.rejects(broker.getToken(), /legacy cache is locked/);
    assert.equal(await broker.getToken(), "token");
    assert.equal(cleanupCalls, 2);
});

test("token acquisition preserves operational errors and retries the credential", async () => {
    const outage = new Error("Azure Identity network request timed out");
    let createCredentialCalls = 0;
    let tokenCalls = 0;
    const broker = new InteractiveAuthBroker({
        createCredential: () => {
            createCredentialCalls++;
            return {
                async getToken() {
                    tokenCalls++;
                    if (tokenCalls === 1) throw outage;
                    return accessToken();
                },
            };
        },
    });

    await assert.rejects(broker.getToken(), (error) => error === outage);
    assert.equal(await broker.getToken(), "token");
    assert.equal(createCredentialCalls, 1);
    assert.equal(tokenCalls, 2);
});

test("incomplete tokens remain operational errors instead of prompting sign-in", async () => {
    const broker = new InteractiveAuthBroker({
        createCredential: () => ({
            async getToken() {
                return { token: "incomplete" };
            },
        }),
    });

    await assert.rejects(
        broker.getToken(),
        (error) => !(error instanceof ConnectorAuthenticationRequiredError)
            && error.message === "Azure identity returned an incomplete ARM access token.",
    );
});
