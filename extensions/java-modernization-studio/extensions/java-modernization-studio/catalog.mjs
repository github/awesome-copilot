// catalog.mjs — Static catalog of GitHub Copilot App Modernization for Java
// predefined tasks and supported Java upgrade paths. Sourced from Microsoft Learn:
//   /azure/developer/java/migration/migrate-github-copilot-app-modernization-for-java-predefined-tasks
//   /azure/developer/github-copilot-app-modernization/tools
//
// `detect` lists dependency-signature keys (see scan.mjs DEP_SIGNATURES). When a
// repo's build files match one of those keys, the task is flagged "relevant".

export const PREDEFINED_TASKS = [
    {
        id: "rabbitmq-to-servicebus",
        name: "RabbitMQ to Azure Service Bus",
        category: "Messaging",
        summary:
            "Convert RabbitMQ usage (Spring AMQP, Spring JMS, or Jakarta EE over AMQP) to Azure Service Bus, preserving messaging semantics with secure auth by default.",
        detect: ["rabbitmq"],
    },
    {
        id: "activemq-to-servicebus",
        name: "ActiveMQ to Azure Service Bus",
        category: "Messaging",
        summary:
            "Convert ActiveMQ producers, consumers, connection factories, and queue/topic interactions to Azure Service Bus equivalents.",
        detect: ["activemq"],
    },
    {
        id: "aws-sqs-to-servicebus",
        name: "AWS SQS to Azure Service Bus",
        category: "Messaging",
        summary:
            "Translate AWS SQS queue operations and message handling to Azure Service Bus, preserving at-least-once delivery, batching, and visibility-timeout behaviors.",
        detect: ["awsSqs"],
    },
    {
        id: "managed-identity-db",
        name: "Managed Identities for Database migration",
        category: "Identity & Secrets",
        summary:
            "Prepare your codebase for Managed Identity authentication when moving from a local database to Azure SQL, MySQL, PostgreSQL, or Cosmos DB.",
        detect: ["jdbc"],
    },
    {
        id: "managed-identity-credentials",
        name: "Managed Identities for Credential Migration",
        category: "Identity & Secrets",
        summary:
            "Replace connection strings / shared access signatures for messaging services (Event Hubs, Service Bus) with Azure Managed Identity authentication.",
        detect: ["rabbitmq", "activemq", "jms"],
    },
    {
        id: "secrets-to-keyvault",
        name: "Secrets & Certificate Management to Azure Key Vault",
        category: "Identity & Secrets",
        summary:
            "Move hardcoded secrets and local TLS/mTLS certificates (Java KeyStores) to Azure Key Vault, retrieving them at runtime via the JCA provider.",
        detect: ["keystore"],
    },
    {
        id: "crypto-to-keyvault",
        name: "Cryptography operations to Azure Key Vault",
        category: "Identity & Secrets",
        summary:
            "Migrate local signing, verification, encryption, and decryption to Azure Key Vault so keys never leave the vault.",
        detect: ["crypto"],
    },
    {
        id: "aws-secrets-to-keyvault",
        name: "AWS Secret Manager to Azure Key Vault",
        category: "Identity & Secrets",
        summary:
            "Reconfigure secret creation, retrieval, update, and deletion from AWS Secret Manager to Azure Key Vault.",
        detect: ["awsSecrets"],
    },
    {
        id: "entra-id-auth",
        name: "User authentication to Microsoft Entra ID",
        category: "Identity & Secrets",
        summary:
            "Transition LDAP-based user authentication to Microsoft Entra ID authentication.",
        detect: ["ldap"],
    },
    {
        id: "aws-s3-to-blob",
        name: "AWS S3 to Azure Storage Blob",
        category: "Storage",
        summary:
            "Convert code that interacts with AWS S3 into Azure Storage Blob logic while maintaining the same semantics.",
        detect: ["awsS3"],
    },
    {
        id: "file-io-to-fileshare",
        name: "Local file I/O to Azure Storage File share mounts",
        category: "Storage",
        summary:
            "Convert local file reads/writes to unified mount-path access so an Azure Storage File share can persist data across replicas.",
        detect: [],
    },
    {
        id: "logging-to-console",
        name: "Logging to local file → console (Azure Monitor)",
        category: "Observability",
        summary:
            "Convert file-based logging to console-based logging so Azure hosting integrates it with Azure Monitor automatically.",
        detect: ["filelog"],
    },
    {
        id: "javamail-to-acs",
        name: "Java Mail to Azure Communication Services",
        category: "Email",
        summary:
            "Convert SMTP-based mail sending to Azure Communication Services, which works in Azure hosting environments that block port 25.",
        detect: ["javamail"],
    },
    {
        id: "databases-to-azure",
        name: "On-prem databases to Azure database offerings",
        category: "Database",
        summary:
            "Migrate Oracle, IBM Db2, Informix, or Sybase ASE to Azure Database for PostgreSQL or Azure SQL with passwordless Entra ID auth, reconciling SQL dialect differences.",
        detect: ["oracle", "db2", "sybase", "informix"],
    },
    {
        id: "cache-to-redis",
        name: "Cache solutions to Azure Managed Redis",
        category: "Cache",
        summary:
            "Migrate in-memory or distributed caches (Infinispan, SwarmCache, Memcached, etc.) to Azure Managed Redis with passwordless Entra ID auth.",
        detect: ["cache"],
    },
    {
        id: "ant-eclipse-to-maven",
        name: "Ant / Eclipse project to Maven",
        category: "Build",
        summary:
            "Convert Ant or Eclipse IDE projects to Maven so the project builds consistently from any environment.",
        detect: ["ant"],
    },
];

// Java runtime upgrade ladder targeted by App Modernization (8 → 11 → 17 → 21 → 25),
// with particular focus on Spring Boot apps.
export const JAVA_UPGRADE_TARGETS = [11, 17, 21, 25];

// Day-to-day Java utilities you can invoke in Copilot Chat with the `#` prefix.
export const APPMOD_TOOLS = {
    cve: {
        id: "appmod-validate-cves-for-java",
        label: "Validate CVEs",
        summary:
            "Scan the project for known Java CVEs and validate that critical vulnerabilities are addressed.",
    },
    tests: {
        id: "appmod-generate-tests-for-java",
        label: "Generate unit tests",
        summary: "Use AI code understanding to generate unit tests for the Java code.",
    },
};

// The five validation gates App Modernization runs after code transformation.
export const VALIDATION_GATES = [
    { key: "build", label: "Build" },
    { key: "tests", label: "Unit Tests" },
    { key: "cve", label: "CVE Check" },
    { key: "consistency", label: "Consistency" },
    { key: "completeness", label: "Completeness" },
];

/** Return the catalog with a `relevant` flag set per task based on detected deps. */
export function catalogWithRelevance(detectedKeys) {
    const set = new Set(detectedKeys || []);
    return PREDEFINED_TASKS.map((t) => ({
        ...t,
        relevant: t.detect.some((d) => set.has(d)),
    }));
}
