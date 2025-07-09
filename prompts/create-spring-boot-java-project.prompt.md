---
mode: 'agent'
tools: ['changes', 'codebase', 'editFiles', 'findTestFiles', 'problems', 'runCommands', 'runTests', 'search', 'searchResults', 'terminalLastCommand', 'testFailure', 'usages']
description: 'Create Spring Boot Java project skeleton'
---

# Create Spring Boot Java project prompt

- Please make sure you have the following software installed on your system:

  - Java 21
  - Docker
  - Docker Compose

- If you need to custom the project name, please change the `artifactId` and the `packageName` in [download-spring-boot-project-template](./create-spring-boot-java-project.prompt.md#download-spring-boot-project-template)

- If you need to update the Spring Boot version, please change the `bootVersion` in [download-spring-boot-project-template](./create-spring-boot-java-project.prompt.md#download-spring-boot-project-template)

## Check Java version

- Run following command in terminal and check the version of Java

```shell
java -version
```

## Download Spring Boot project template

- Run following command in terminal to download a Spring Boot project template

```shell
curl https://start.spring.io/starter.zip \
  -d artifactId=demo \
  -d bootVersion=3.4.5 \
  -d dependencies=lombok,configuration-processor,web,data-jpa,postgresql,data-redis,data-mongodb,validation,cache,testcontainers \
  -d javaVersion=21 \
  -d packageName=com.example \
  -d packaging=jar \
  -d type=maven-project \
  -o starter.zip
```

## Unzip the downloaded file

- Run following command in terminal to unzip the downloaded file

```shell
unzip starter.zip -d .
```

## Remove the downloaded zip file

- Run following command in terminal to delete the downloaded zip file

```shell
rm -f starter.zip
```

## Add additional dependencies

- Insert `springdoc-openapi-starter-webmvc-ui` and `archunit-junit5` dependency into `pom.xml` file

```xml
<dependency>
  <groupId>org.springdoc</groupId>
  <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
  <version>2.8.6</version>
</dependency>
<dependency>
  <groupId>com.tngtech.archunit</groupId>
  <artifactId>archunit-junit5</artifactId>
  <version>1.2.1</version>
  <scope>test</scope>
</dependency>
```

## Add SpringDoc, Redis, JPA and MongoDB configurations

- Insert SpringDoc configurations into `application.properties` file

```properties
# SpringDoc configurations
springdoc.swagger-ui.doc-expansion=none
springdoc.swagger-ui.operations-sorter=alpha
springdoc.swagger-ui.tags-sorter=alpha
```

- Insert Redis configurations into `application.properties` file

```properties
# Redis configurations
spring.data.redis.host=localhost
spring.data.redis.port=6379
spring.data.redis.password=rootroot
```

- Insert JPA configurations into `application.properties` file

```properties
# JPA configurations
spring.datasource.driver-class-name=org.postgresql.Driver
spring.datasource.url=jdbc:postgresql://localhost:5432/postgres
spring.datasource.username=postgres
spring.datasource.password=rootroot
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true
```

- Insert MongoDB configurations into `application.properties` file

```properties
# MongoDB configurations
spring.data.mongodb.host=localhost
spring.data.mongodb.port=27017
spring.data.mongodb.authentication-database=admin
spring.data.mongodb.username=root
spring.data.mongodb.password=rootroot
spring.data.mongodb.database=test
```

## Add `docker-compose.yaml` with Redis, PostgreSQL and MongoDB services

- Create `docker-compose.yaml` at project root and add following services: `redis:6`, `postgresql:17` and `mongo:8`.

  - redis service should have
    - password `rootroot`
    - mapping port 6379 to 6379
    - mounting volume `./redis_data` to `/data`
  - postgresql service should have
    - password `rootroot`
    - mapping port 5432 to 5432
    - mounting volume `./postgres_data` to `/var/lib/postgresql/data`
  - mongo service should have
    - initdb root username `root`
    - initdb root password `rootroot`
    - mapping port 27017 to 27017
    - mounting volume `./mongo_data` to `/data/db`

## Add `.gitignore` file

- Insert `redis_data`, `postgres_data` and `mongo_data` directories in `.gitignore` file

## Run Maven test command

- Run maven clean test command to check if the project is working

```shell
./mvnw clean test
```

## Run Maven run command (Optional)

- (Optional) `docker-compose up -d` to start the services, `./mvnw spring-boot:run` to run the Spring Boot project, `docker-compose rm -sf` to stop the services.

## Let's do this step by step
