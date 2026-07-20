import { test } from "node:test";
import assert from "node:assert/strict";

import {
    ConnectorAuthenticationRequiredError,
    InteractiveAuthBroker,
    loadAuthenticationRecord,
    TOKEN_CACHE_NAME,
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
        loadAuthRecord: async () => undefined,
    });

    await assert.rejects(
        broker.getToken(),
        (error) => error instanceof ConnectorAuthenticationRequiredError
            && error.code === "authentication_required",
    );
    assert.deepEqual(credentialOptions.tokenCachePersistenceOptions, {
        enabled: true,
        name: TOKEN_CACHE_NAME,
    });
});

test("a malformed authentication record falls back to browser sign-in", async () => {
    assert.equal(
        await loadAuthenticationRecord({
            readFile: async () => "{malformed-json",
        }),
        undefined,
    );
});

test("authentication record read failures remain operational errors", async () => {
    const readError = Object.assign(new Error("authentication record is unreadable"), { code: "EACCES" });
    await assert.rejects(
        loadAuthenticationRecord({
            readFile: async () => { throw readError; },
        }),
        (error) => error === readError,
    );
});

test("interactive sign-in reports pending then done and caches the ARM token", async () => {
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
        saveAuthRecord: async (record) => assert.deepEqual(record, authenticationRecord()),
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
        tokenCachePersistenceOptions: {
            enabled: true,
            name: TOKEN_CACHE_NAME,
        },
    });
    assert.equal(authenticateOptions.abortSignal.aborted, false);
    assert.deepEqual(broker.getSignInStatus(started.sessionId), { ok: true, status: "done" });
    assert.deepEqual(broker.getSignInStatus(started.sessionId), { ok: true, status: "done" });
    assert.deepEqual(broker.cancelSignIn(started.sessionId), { ok: true });
    assert.equal(authenticateOptions.abortSignal.aborted, false);
    assert.deepEqual(broker.getSignInStatus(started.sessionId), { ok: true, status: "done" });
    assert.equal(await broker.getToken(), "token");
});

test("a new broker restores the persisted credential without reopening the browser", async () => {
    const cache = { record: null, token: null };
    let authenticateCalls = 0;
    const createCredential = (options) => {
        assert.deepEqual(options.tokenCachePersistenceOptions, {
            enabled: true,
            name: TOKEN_CACHE_NAME,
        });
        return {
            async authenticate() {
                authenticateCalls++;
                cache.token = accessToken("persisted-token");
                return authenticationRecord();
            },
            async getToken() {
                if (cache.token && options.authenticationRecord) return cache.token;
                const error = new Error("No cached account found.");
                error.name = "AuthenticationRequiredError";
                throw error;
            },
        };
    };
    const signedInBroker = new InteractiveAuthBroker({
        createCredential,
        createSessionId: () => "persist-session",
        saveAuthRecord: async (record) => { cache.record = record; },
        now: () => 1_000,
    });
    const started = signedInBroker.startSignIn();
    await signedInBroker.sessions.get(started.sessionId).promise;
    assert.equal(authenticateCalls, 1);

    const restartedBroker = new InteractiveAuthBroker({
        createCredential,
        loadAuthRecord: async () => cache.record,
        now: () => 1_000,
    });
    assert.equal(await restartedBroker.getToken(), "persisted-token");
    assert.equal(authenticateCalls, 1);
});

test("concurrent first-time token requests share credential initialization and acquisition", async () => {
    let releaseAuthenticationRecord;
    const authenticationRecordReady = new Promise((resolve) => {
        releaseAuthenticationRecord = resolve;
    });
    let loadAuthRecordCalls = 0;
    let createCredentialCalls = 0;
    let tokenCalls = 0;
    const broker = new InteractiveAuthBroker({
        async loadAuthRecord() {
            loadAuthRecordCalls++;
            await authenticationRecordReady;
            return authenticationRecord();
        },
        createCredential: () => {
            createCredentialCalls++;
            return {
                async getToken() {
                    tokenCalls++;
                    return accessToken("shared-token");
                },
            };
        },
    });

    const firstRequest = broker.getToken();
    const secondRequest = broker.getToken();
    await new Promise((resolve) => setImmediate(resolve));
    const loadsBeforeRelease = loadAuthRecordCalls;
    releaseAuthenticationRecord();

    assert.deepEqual(
        await Promise.all([firstRequest, secondRequest]),
        ["shared-token", "shared-token"],
    );
    assert.equal(loadsBeforeRelease, 1);
    assert.equal(loadAuthRecordCalls, 1);
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
        loadAuthRecord: async () => undefined,
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
        loadAuthRecord: async () => authenticationRecord(),
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
        loadAuthRecord: async () => authenticationRecord(),
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
        loadAuthRecord: async () => authenticationRecord(),
    });

    await assert.rejects(
        broker.getToken(),
        (error) => !(error instanceof ConnectorAuthenticationRequiredError)
            && error.message === "Azure identity returned an incomplete ARM access token.",
    );
});
