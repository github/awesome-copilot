---
name: create-spring-boot-kotlin-project
description: 'Create Spring Boot Kotlin Project Skeleton'
---

# Create Spring Boot Kotlin project prompt

- Please make sure you have the following software installed on your system:

  - Java 21
  - Docker
  - Docker Compose

- If you need to custom the project name, please change the `artifactId` and the `packageName` in [download-spring-boot-project-template](./create-spring-boot-kotlin-project.prompt.md#download-spring-boot-project-template)

- If you need to update the Spring Boot version, please change the `bootVersion` in [download-spring-boot-project-template](./create-spring-boot-kotlin-project.prompt.md#download-spring-boot-project-template)

## Check Java version

- Run following command in terminal and check the version of Java

```shell
java -version
```

## Download Spring Boot project template

- Run following command in terminal to download a Spring Boot project template

```shell
curl https://start.spring.io/starter.zip \
  -d artifactId=${input:projectName:demo-kotlin} \
  -d bootVersion=3.4.5 \
  -d dependencies=configuration-processor,webflux,data-r2dbc,postgresql,data-redis-reactive,data-mongodb-reactive,validation,cache,testcontainers \
  -d javaVersion=21 \
  -d language=kotlin \
  -d packageName=com.example \
  -d packaging=jar \
  -d type=gradle-project-kotlin \
  -o starter.zip
```

## Unzip the downloaded file

- Run following command in terminal to unzip the downloaded file

```shell
unzip starter.zip -d ./${input:projectName:demo-kotlin}
```

## Remove the downloaded zip file

- Run following command in terminal to delete the downloaded zip file

```shell
rm -f starter.zip
```

## Unzip the downloaded file

- Run following command in terminal to unzip the downloaded file

```shell
unzip starter.zip -d ./${input:projectName:demo-kotlin}
```

## Add additional dependencies

- Insert `springdoc-openapi-starter-webmvc-ui` and `archunit-junit5` dependency into `build.gradle.kts` file

```gradle.kts
dependencies {
  implementation("org.springdoc:springdoc-openapi-starter-webflux-ui:2.8.6")
  testImplementation("com.tngtech.archunit:archunit-junit5:1.2.1")
}
```

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

- Insert R2DBC configurations into `application.properties` file

```properties
# R2DBC configurations
spring.r2dbc.url=r2dbc:postgresql://localhost:5432/postgres
spring.r2dbc.username=postgres
spring.r2dbc.password=rootroot

spring.sql.init.mode=always
spring.sql.init.platform=postgres
spring.sql.init.continue-on-error=true
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

- Insert `redis_data`, `postgres_data` and `mongo_data` directories in `.gitignore` file

- Run gradle clean test command to check if the project is working

```shell
./gradlew clean test
```

- (Optional) `docker-compose up -d` to start the services, `./gradlew spring-boot:run` to run the Spring Boot project, `docker-compose rm -sf` to stop the services.

Let's do this step by step.
