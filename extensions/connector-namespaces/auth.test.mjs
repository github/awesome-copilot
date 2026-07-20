import { test } from "node:test";
import assert from "node:assert/strict";

import {
    ConnectorAuthenticationRequiredError,
    InteractiveAuthBroker,
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
            throw new Error("getToken should not run after cancellation");
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
});
