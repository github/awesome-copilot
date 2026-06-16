---
name: 'sp-to-application-migration'
description: 'Skill to extract business logic from SPs to C#/.NET, applying Strangler Fig, DDD and anti-corruption patterns'
---

# SP Migration → Application Layer (C#/.NET)

## Purpose

Guide the incremental migration of business logic embedded in stored procedures to an application layer in C# (or any language), without big-bang, with rollback at each step and without interrupting production.

---

## General Strategy: Strangler Fig Pattern

The key is **never replace everything at once**. Each SP is converted to a C# service incrementally, keeping the SP active in parallel until the new code passes 100% of the tests.

```
INITIAL STATE:
    App -> SP in SQL Server (full logic in DB)

INTERMEDIATE STATE (Anti-Corruption Layer):
    App -> C# Service -> SP (wrapper that translates without adding new logic)
              ↓
                     [Regression tests pass]

FINAL STATE:
    App -> C# Service (logic in code, SP removed or archived)
```

**The cable is never cut before laying the new one.**

---

## Migration Phases

### Phase 0: Preparation (Without touching code)

Before writing a line of C#:

- [ ] **Map domains** to bounded contexts (use report `06-BUSINESS-LOGIC-DOMAINS.md`)
- [ ] **Classify SPs** into four categories:
  - 🟢 **Pure CRUD** → EF Core / Dapper direct (no logic)
    - 🟡 **Simple logic** -> C# service with unit tests
  - 🟠 **Complex logic** → C# domain model + integration tests
  - 🔴 **Transactional critical** → Ultimate migration, maximum coverage
- [ ] **Set contract**: what each SP returns (input/output types) → generates C# interfaces
- [ ] **Create regression suite**: run current SP → capture outputs as golden files

### Phase 1: Anti-Corruption Layer (ACL)

Create C# wrappers that call existing SPs. No new logic, just translation:

```csharp
// STEP 1: Domain interface (contract, no SQL implementation)
public interface IPlanFormacionRepository
{
    Task<PlanFormacion?> GetByIdAsync(int id);
    Task<IReadOnlyList<PlanFormacion>> GetByConvocatoriaAsync(int idConvocatoria);
    Task<int> CreateAsync(CreatePlanFormacionCommand cmd);
}

// STEP 2: Implementation that delegates to SP (Anti-Corruption Layer)
public class SqlPlanFormacionRepository : IPlanFormacionRepository
{
    private readonly SqlConnection _conn;

    public async Task<PlanFormacion?> GetByIdAsync(int id)
    {
        // Calls existing SP - ZERO new logic here
        return await _conn.QuerySingleOrDefaultAsync<PlanFormacion>(
            "EXEC dbo.UP_S_PLANFORMACION_BY_ID @ID",
            new { ID = id });
    }
}
```

**Result:** The app talks with C# interfaces. The implementation is still SQL.

### Phase 2: Migration by Domain (Read Models first)

Start with the **read** SPs of the schema `bi` (the safest, without side effects):

```csharp
// BEFORE: app calls reporting SP directly
EXEC bi.AccionesFormativasPlanFormacion_S @ID_PLAN = 123

// AFTER: C# query object with Dapper (maintainable, testable)
public class AccionesFormativasQuery
{
    public async Task<IReadOnlyList<AccionFormativa>> ExecuteAsync(int idPlan)
    {
        const string sql = @"
            SELECT af.ID, af.D_DESCRIPCION, af.N_HORAS, af.F_INICIO, af.F_FIN,
                   c.D_NOMBRE AS D_CENTRO, s.D_NOMBRE AS D_SECTOR
            FROM dbo.T_ACCION_FORMATIVA af
            JOIN dbo.T_CENTRO c ON af.ID_CENTRO = c.ID
            JOIN dbo.T_SECTOR s ON af.ID_SECTOR = s.ID
            WHERE af.ID_PLANFORMACION = @IdPlan
            ORDER BY af.F_INICIO";

        return (await _conn.QueryAsync<AccionFormativa>(sql, new { IdPlan = idPlan }))
               .ToList();
    }
}
```

**Migration order:**
1. `bi.*` (1,195 reporting SPs, reading only) → **Dapper queries** or **EF Core projections**
2. `dbo.UP_S_*` (monolith selects) → parameterized **Dapper queries**
3. `dbo.UP_I_*, UP_U_*` (inserts/updates) → **EF Core entities** or **Dapper commands**
4. `dbo.UP_UID_*` (complex transactional) → **Domain Services** with orchestration

### Phase 3: Migrate Business Logic (Write Models)

Extract business rules from the most complex SPs to C# domain objects:

```csharp
// RULE R7: Participant Enrollment (extracted from SP dbo.UP_I_PARTICIPANTE)
public class InscripcionParticipanteService
{
    private readonly IParticipanteRepository _repo;
    private readonly IConvocatoriaRepository _convRepo;
    private readonly INifValidator _nifValidator;

    public async Task<Result<int>> InscribirAsync(InscribirParticipanteCommand cmd)
    {
        // Validations extracted from the SP
        if (!_nifValidator.IsValid(cmd.Nif))
            return Result.Failure<int>("Invalid NIF/CIF");

        var convocatoria = await _convRepo.GetByIdAsync(cmd.IdConvocatoria);
        if (convocatoria.Estado != EstadoConvocatoria.Publicada)
            return Result.Failure<int>("The call is not open");

        // Business rule: minimum % of unemployed participants
        var porcentajeDesempleados = await _repo
            .GetPorcentajeDesempleadosAsync(cmd.IdConvocatoria);
        if (cmd.SituacionLaboral == SituacionLaboral.Empleado &&
            porcentajeDesempleados < convocatoria.MinPorcentajeDesempleados)
            return Result.Failure<int>(
                $"Group requires at least {convocatoria.MinPorcentajeDesempleados}% unemployed participants");

        var id = await _repo.InsertAsync(cmd);
        return Result.Success(id);
    }
}
```

### Phase 4: Encryption — Migrate from legacy functions to Azure Key Vault

The current encryption system (legacy functions/procedures) is replaced by:

```csharp
// BEFORE: SPs open cryptographic context inside SQL
// AFTER: C# manages encryption lifecycle

// Program.cs / DI setup
builder.Services.AddAzureKeyVault(
    new Uri($"https://{keyVaultName}.vault.azure.net/"),
    new DefaultAzureCredential());

// Encryption service
public class EncryptionService
{
    private readonly CryptographyClient _cryptoClient;

    public async Task<string> EncryptAsync(string plainText)
    {
        var result = await _cryptoClient.EncryptAsync(
            EncryptionAlgorithm.RsaOaep,
            Encoding.UTF8.GetBytes(plainText));
        return Convert.ToBase64String(result.Ciphertext);
    }

    public async Task<string> DecryptAsync(string cipherText)
    {
        var result = await _cryptoClient.DecryptAsync(
            EncryptionAlgorithm.RsaOaep,
            Convert.FromBase64String(cipherText));
        return Encoding.UTF8.GetString(result.Plaintext);
    }
}

// Repository uses service - no OPEN SYMMETRIC KEY
public async Task<Beneficiario> GetDatosEncriptadosAsync(int id)
{
    var row = await _conn.QuerySingleAsync<BeneficiarioRow>(
        "SELECT DatosEncriptados FROM T_BENEFICIARIO WHERE ID = @Id", new { id });

    return new Beneficiario
    {
        Id = row.Id,
        DatosSensibles = await _encryption.DecryptAsync(row.DatosEncriptados)
    };
}
```

---

## Classification of SPs for ProjectName

### 🟢 Immediate Migration — Pure CRUD (Dapper / EF Core)

```
bi.*_S        -> Reporting queries    -> EF Core projections or Dapper
dbo.UP_S_*    -> Simple selects       -> Dapper QueryAsync<T>
ale.*_S       -> Appeals reads        -> Dapper QueryAsync<T>
anu.UP_S_*    -> Cancellations reads  -> Dapper QueryAsync<T>
```

**Effort:** 2-4 hours per SP · ~1,200 SPs · ~2,400-4,800 total hours

### 🟡 Medium Migration — Simple Logic (C# Services)

```
dbo.UP_I_*    -> Inserts with basic validation  -> Service + Command
dbo.UP_U_*    -> Updates with conditions        -> Service + Command
plc.*         -> Call calculations              -> Domain Service
vt.*          -> Technical validations          -> Validator classes
```

**Effort:** 4-8 hours per SP · ~800 SPs · ~3,200-6,400 total hours

### 🟠 Complex Migration — Domain Models (DDD)

```
dbo.UP_UID_*  -> Critical transactions          -> Aggregate roots + Domain events
bi.Agrupacion*-> Massive grouping logic         -> CQRS read models
bya.*         -> Beneficiaries + years          -> Own bounded context
gcc.*         -> Center management              -> Own bounded context
```

**Effort:** 8-20 hours per SP · ~400 SPs · ~3,200-8,000 total hours

### 🔴 Critical Migration — Last Phase (maximum coverage)

```
sp_abrir_contexto_cifrado -> Migrate to Azure Key Vault (parallel phase)
dbo.*PLANFORMACION*       -> Business core (validate with stakeholders)
dbo.*CONVOCATORIA*        -> Awarding flow (highest criticality)
```

**Effort:** 20-40 hours per SP · ~100 SPs · ~2,000-4,000 total hours

---

## Target Architecture: Bounded Contexts

```
┌─────────────────────────────────────────────────────────────────────┐
│ API Gateway / BFF                                                   │
└─────────────────────────────────────────────────────────────────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Training    │ │Calls         │ │Beneficiaries │ │   Centers    │
│  Service     │ │   Service    │ │   Service    │ │   Service    │
│  (.NET API)  │ │  (.NET API)  │ │  (.NET API)  │ │  (.NET API)  │
│              │ │              │ │              │ │              │
│ EF Core      │ │ EF Core      │ │ Dapper       │ │ EF Core      │
│ SQL Server   │ │ SQL Server   │ │ SQL Server   │ │ SQL Server   │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
         │              │              │              │
         └──────────────┴──────────────┴──────────────┘
                                │
                    ┌───────────▼───────────┐
                    │  Shared Kernel        │
                    │  - ValidationService  │
                    │  - EncryptionService  │
                    │  - AuditService       │
                    │  - DomainEvents       │
                    └───────────────────────┘
```

---

## .NET Stack Recommended

| Layer | Technology | When |
|---|---|---|
| **API** | ASP.NET Core Minimal APIs / Controllers | Always |
| **Simple queries** | Dapper | SPs of reading, reporting |
| **Complex queries** | EF Core + LINQ | Entities with relationships |
| **Business logic** | C# Domain Services | Rules extracted from SPs |
| **Validation** | FluentValidation | Replace validations in SP |
| **Encrypted** | Azure Key Vault + Azure.Security | Replaces legacy encryption functions |
| **Transactions** | IDbTransaction / UnitOfWork | Replaces BEGIN TRAN in SPs |
| **Tests** | xUnit + Moq + Testcontainers | Regression Suite |
| **ORM** | EF Core 8+ | Write models, migrations |
| **Migrations BD** | EF Core Migrations / DbUp | Schema evolution |

---

## Checklist by Migrated SP

- [ ] Documented SP (inputs, outputs, business rules)
- [ ] C# interface defined (contract)
- [ ] Golden files created (current outputs captured)
- [ ] Anti-Corruption Layer implemented (calls SP)
- [ ] Regression tests pass against ACL
- [ ] Created C# implementation (without SP)
- [ ] Tests pass against C# implementation
- [ ] Validated performance (no regression)
- [ ] SP marked as `DEPRECATED` (comment + date)
- [ ] Monitoring in production (both parallel implementations)
- [ ] SP removed (after stabilization period: 2-4 weeks)

---

## Anti-Patterns to Avoid

| Anti-pattern | Problem | Solution |
|---|---|---|
| **Rewrite everything at once** | Catastrophic risk | Strangler Fig: SP by SP |
| **Duplicate logic** | Inconsistency | A single canonical source |
| **Hardcode SQL strings in C#** | Same problem as SPs | Dapper + stored SQL in files `.sql` |
| **God Service** | Monolith in C# | A service by bounded context |
| **Skip tests** | Silent regressions | Golden files + automatic regression |
| **Migrate encryption in the same phase** | Double risk | Migrate encryption separately, first |

---

## Progress Metrics

```
Total SPs:             N
Migrated SPs:              0   (0%)
SPs with ACL:              0   (0%)
Deprecated SPs:            0   (0%)
Removed SPs:               0   (0%)
Test coverage:             0%
```

Update this block in each sprint as a progress indicator.

