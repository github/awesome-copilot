import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
    deserializeAuthenticationRecord,
    InteractiveBrowserCredential,
    serializeAuthenticationRecord,
    useIdentityPlugin,
} from "@azure/identity";
import { cachePersistencePlugin } from "@azure/identity-cache-persistence";

export const ARM_SCOPE = "https://management.azure.com/.default";
export const TOKEN_CACHE_NAME = "github-copilot-connector-namespaces";

const TOKEN_EXPIRY_SKEW_MS = 5 * 60 * 1000;
const SIGN_IN_SESSION_TTL_MS = 10 * 60 * 1000;
const AUTH_STORAGE_DIR = join(
    process.env.COPILOT_HOME || join(homedir(), ".copilot"),
    "extensions",
    "connector-namespaces",
    "artifacts",
);
const AUTH_RECORD_FILE = join(AUTH_STORAGE_DIR, "azure-auth-record.json");
const LEGACY_AUTH_CACHE = join(AUTH_STORAGE_DIR, "auth-cache.json");

let legacyAuthCacheRemoved = false;

useIdentityPlugin(cachePersistencePlugin);

async function loadAuthenticationRecord() {
    try {
        const serialized = await fs.readFile(AUTH_RECORD_FILE, "utf-8");
        return deserializeAuthenticationRecord(serialized);
    } catch (error) {
        if (error?.code === "ENOENT") return undefined;
        throw error;
    }
}

async function saveAuthenticationRecord(record) {
    await fs.mkdir(AUTH_STORAGE_DIR, { recursive: true, mode: 0o700 });
    await fs.chmod(AUTH_STORAGE_DIR, 0o700);
    await fs.writeFile(
        AUTH_RECORD_FILE,
        serializeAuthenticationRecord(record),
        { encoding: "utf-8", mode: 0o600 },
    );
    await fs.chmod(AUTH_RECORD_FILE, 0o600);
}

async function removeLegacyAuthCache() {
    if (legacyAuthCacheRemoved) return;
    try {
        await fs.unlink(LEGACY_AUTH_CACHE);
    } catch (error) {
        if (error?.code !== "ENOENT") {
            throw new Error(`Could not remove the legacy connector credential cache at ${LEGACY_AUTH_CACHE}: ${error.message}`);
        }
    }
    legacyAuthCacheRemoved = true;
}

export class ConnectorAuthenticationRequiredError extends Error {
    constructor(message = "Sign in to Azure to continue.", options) {
        super(message, options);
        this.name = "ConnectorAuthenticationRequiredError";
        this.code = "authentication_required";
    }
}

export function isAuthenticationRequiredError(error) {
    return error instanceof ConnectorAuthenticationRequiredError
        || error?.code === "authentication_required"
        || error?.name === "AuthenticationRequiredError";
}

function credentialFactory(options) {
    return new InteractiveBrowserCredential(options);
}

function hasUsableToken(accessToken, now) {
    return !!accessToken?.token
        && Number.isFinite(accessToken.expiresOnTimestamp)
        && accessToken.expiresOnTimestamp - TOKEN_EXPIRY_SKEW_MS > now;
}

function errorDetail(error) {
    return String(error?.message || error || "Azure sign-in failed.").slice(0, 400);
}

export class InteractiveAuthBroker {
    constructor({
        createCredential = credentialFactory,
        createSessionId = randomUUID,
        cleanupLegacyCredentials = async () => {},
        loadAuthRecord = async () => undefined,
        saveAuthRecord = async () => {},
        now = Date.now,
        scope = ARM_SCOPE,
        tokenCacheName = TOKEN_CACHE_NAME,
    } = {}) {
        this.createCredential = createCredential;
        this.createSessionId = createSessionId;
        this.cleanupLegacyCredentials = cleanupLegacyCredentials;
        this.loadAuthRecord = loadAuthRecord;
        this.saveAuthRecord = saveAuthRecord;
        this.now = now;
        this.scope = scope;
        this.tokenCacheName = tokenCacheName;
        this.credential = null;
        this.accessToken = null;
        this.cleanupInFlight = null;
        this.tokenInFlight = null;
        this.sessions = new Map();
    }

    createInteractiveCredential(authenticationRecord) {
        return this.createCredential({
            redirectUri: "http://localhost",
            disableAutomaticAuthentication: true,
            tokenCachePersistenceOptions: {
                enabled: true,
                name: this.tokenCacheName,
            },
            ...(authenticationRecord ? { authenticationRecord } : {}),
        });
    }

    ensureLegacyCredentialsRemoved() {
        if (!this.cleanupInFlight) {
            const cleanup = Promise.resolve()
                .then(() => this.cleanupLegacyCredentials())
                .catch((error) => {
                    if (this.cleanupInFlight === cleanup) this.cleanupInFlight = null;
                    throw error;
                });
            this.cleanupInFlight = cleanup;
        }
        return this.cleanupInFlight;
    }

    pruneSessions() {
        const cutoff = this.now() - SIGN_IN_SESSION_TTL_MS;
        for (const [sessionId, session] of this.sessions) {
            if (session.createdAt >= cutoff) continue;
            session.status = "cancelled";
            session.abortController.abort();
            this.sessions.delete(sessionId);
        }
    }

    startSignIn() {
        this.pruneSessions();
        const sessionId = this.createSessionId();
        const abortController = new AbortController();
        let credential;
        try {
            credential = this.createInteractiveCredential();
        } catch (error) {
            return { ok: false, reason: "identity_unavailable", error: errorDetail(error) };
        }

        const session = {
            abortController,
            createdAt: this.now(),
            error: "",
            status: "pending",
        };
        this.sessions.set(sessionId, session);

        session.promise = Promise.resolve()
            .then(async () => {
                await this.ensureLegacyCredentialsRemoved();
                const authenticationRecord = await credential.authenticate(
                    this.scope,
                    { abortSignal: abortController.signal },
                );
                if (!authenticationRecord) {
                    throw new Error("Azure identity did not return an authentication record.");
                }
                await this.saveAuthRecord(authenticationRecord);
                const accessToken = await credential.getToken(this.scope, { abortSignal: abortController.signal });
                if (!accessToken?.token || !Number.isFinite(accessToken.expiresOnTimestamp)) {
                    throw new Error("Azure identity returned an incomplete ARM access token.");
                }
                if (session.status !== "pending" || this.sessions.get(sessionId) !== session) return;
                this.credential = credential;
                this.accessToken = accessToken;
                session.status = "done";
            })
            .catch((error) => {
                if (session.status !== "pending") return;
                session.status = abortController.signal.aborted ? "cancelled" : "error";
                if (session.status === "error") session.error = errorDetail(error);
            });

        return { ok: true, sessionId, mode: "interactive" };
    }

    getSignInStatus(sessionId) {
        this.pruneSessions();
        const session = this.sessions.get(sessionId);
        if (!session) return { ok: false, status: "unknown" };
        if (session.status === "pending") return { ok: true, status: "pending", mode: "interactive" };

        if (session.status === "done") return { ok: true, status: "done" };
        if (session.status === "cancelled") return { ok: true, status: "cancelled" };
        return { ok: false, status: "error", error: session.error || "Azure sign-in failed." };
    }

    cancelSignIn(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return { ok: true };
        session.status = "cancelled";
        session.abortController.abort();
        return { ok: true };
    }

    async getToken() {
        await this.ensureLegacyCredentialsRemoved();
        if (hasUsableToken(this.accessToken, this.now())) return this.accessToken.token;
        if (this.tokenInFlight) return this.tokenInFlight;

        let credential = this.credential;
        if (!credential) {
            try {
                const authenticationRecord = await this.loadAuthRecord();
                credential = this.createInteractiveCredential(authenticationRecord);
                this.credential = credential;
            } catch (error) {
                if (isAuthenticationRequiredError(error)) {
                    throw new ConnectorAuthenticationRequiredError(
                        "Sign in to Azure to continue.",
                        { cause: error },
                    );
                }
                throw error;
            }
        }
        const request = credential.getToken(this.scope)
            .then((accessToken) => {
                if (!accessToken?.token || !Number.isFinite(accessToken.expiresOnTimestamp)) {
                    throw new Error("Azure identity returned an incomplete ARM access token.");
                }
                this.accessToken = accessToken;
                return accessToken.token;
            })
            .catch((error) => {
                if (!isAuthenticationRequiredError(error)) throw error;
                if (this.credential === credential) {
                    this.credential = null;
                    this.accessToken = null;
                }
                throw new ConnectorAuthenticationRequiredError(
                    "Sign in to Azure to continue.",
                    { cause: error },
                );
            })
            .finally(() => {
                if (this.tokenInFlight === request) this.tokenInFlight = null;
            });
        this.tokenInFlight = request;
        return request;
    }
}

export const interactiveAuth = new InteractiveAuthBroker({
    cleanupLegacyCredentials: removeLegacyAuthCache,
    loadAuthRecord: loadAuthenticationRecord,
    saveAuthRecord: saveAuthenticationRecord,
});

export const startSignIn = () => interactiveAuth.startSignIn();
export const getSignInStatus = (sessionId) => interactiveAuth.getSignInStatus(sessionId);
export const cancelSignIn = (sessionId) => interactiveAuth.cancelSignIn(sessionId);
export const getToken = () => interactiveAuth.getToken();
