## Configuration Property Changes

### MongoDB Property Restructuring

**Major reorganization:** Non-Spring Data properties moved to `spring.mongodb.*`:

**application.yml migration:**
```yaml
# Old (Spring Boot 3.x)
spring:
  data:
    mongodb:
      uri: mongodb://localhost:27017/mydb
      database: mydb
      host: localhost
      port: 27017
      username: user
      password: pass
      authentication-database: admin
      replica-set-name: rs0
      additional-hosts:
        - host1:27017
        - host2:27017
      ssl:
        enabled: true
        bundle: my-bundle
      representation:
        uuid: STANDARD

management:
  health:
    mongo:
      enabled: true
  metrics:
    mongo:
      command:
        enabled: true
      connectionpool:
        enabled: true

# New (Spring Boot 4.0)
spring:
  mongodb:
    uri: mongodb://localhost:27017/mydb
    database: mydb
    host: localhost
    port: 27017
    username: user
    password: pass
    authentication-database: admin
    replica-set-name: rs0
    additional-hosts:
      - host1:27017
      - host2:27017
    ssl:
      enabled: true
      bundle: my-bundle
    representation:
      uuid: STANDARD # Explicit configuration now required

  data:
    mongodb:
      # Spring Data-specific properties remain here
      auto-index-creation: true
      field-naming-strategy: org.springframework.data.mapping.model.SnakeCaseFieldNamingStrategy
      gridfs:
        bucket: fs
        database: gridfs-db
      repositories:
        type: auto
      representation:
        big-decimal: DECIMAL128 # Explicit configuration now required

management:
  health:
    mongodb: # Renamed from "mongo"
      enabled: true
  metrics:
    mongodb: # Renamed from "mongo"
      command:
        enabled: true
      connectionpool:
        enabled: true
```

**Key changes:**
- **UUID representation**: **MANDATORY** - No default provided, must explicitly configure `spring.mongodb.representation.uuid` (e.g., `STANDARD`, `JAVA_LEGACY`, `PYTHON_LEGACY`, `C_SHARP_LEGACY`)
- **BigDecimal representation**: **MANDATORY** - No default provided, must explicitly configure `spring.data.mongodb.representation.big-decimal` (e.g., `DECIMAL128`, `STRING`)
- **Management properties**: `mongo` → `mongodb`
- **Failure to configure these will result in runtime errors when persisting UUID or BigDecimal values**

### Spring Session Property Renames

**application.yml migration:**
```yaml
# Old (Spring Boot 3.x)
spring:
  session:
    redis:
      namespace: myapp:session
      flush-mode: on-save
    mongodb:
      collection-name: sessions

# New (Spring Boot 4.0)
spring:
  session:
    data:
      redis:
        namespace: myapp:session
        flush-mode: on-save
      mongodb:
        collection-name: sessions
```

### Persistence Module Property Change

**application.yml migration:**
```yaml
# Old (Spring Boot 3.x)
spring:
  dao:
    exceptiontranslation:
      enabled: true

# New (Spring Boot 4.0)
spring:
  persistence:
    exceptiontranslation:
      enabled: true
```

