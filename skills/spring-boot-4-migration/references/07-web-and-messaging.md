## Web Framework Changes

### Static Resource Locations

`PathRequest#toStaticResources()` now includes `/fonts/**` by default.

**Security configuration (exclude fonts if needed):**
```kotlin
import org.springframework.boot.security.autoconfigure.web.StaticResourceLocation
import org.springframework.boot.security.autoconfigure.web.servlet.PathRequest

@Configuration
@EnableWebSecurity
class SecurityConfig {

    @Bean
    fun securityFilterChain(http: HttpSecurity): SecurityFilterChain {
        http {
            authorizeHttpRequests {
                // Exclude fonts if needed
                authorize(PathRequest.toStaticResources()
                    .atCommonLocations()
                    .excluding(StaticResourceLocation.FONTS), permitAll)
                authorize(anyRequest, authenticated)
            }
        }
        return http.build()
    }
}
```

### HttpMessageConverters Deprecation

`HttpMessageConverters` deprecated due to framework improvements (conflated client/server converters).

**Migration:**
```kotlin
// Old (Spring Boot 3.x)
import org.springframework.boot.autoconfigure.http.HttpMessageConverters
import org.springframework.context.annotation.Bean

@Configuration
class WebConfig {
    @Bean
    fun customConverters(): HttpMessageConverters {
        return HttpMessageConverters(MyCustomConverter())
    }
}

// New (Spring Boot 4.0)
import org.springframework.boot.http.converter.autoconfigure.ClientHttpMessageConvertersCustomizer
import org.springframework.boot.http.converter.autoconfigure.ServerHttpMessageConvertersCustomizer

@Configuration
class WebConfig {

    // Separate client and server converters
    @Bean
    fun clientConvertersCustomizer(): ClientHttpMessageConvertersCustomizer {
        return ClientHttpMessageConvertersCustomizer { builder ->
            builder.addCustomConverter(MyCustomClientConverter())
        }
    }

    @Bean
    fun serverConvertersCustomizer(): ServerHttpMessageConvertersCustomizer {
        return ServerHttpMessageConvertersCustomizer { builder ->
            builder.addCustomConverter(MyCustomServerConverter())
        }
    }
}
```

### Trailing Slash URL Matching Removed

`PathMatchConfigurer#setUseTrailingSlashMatch(true)` is **removed** in Spring Framework 7 / Spring Boot 4.
There is no replacement configuration knob — `/foo` and `/foo/` are no longer treated as the same route.

**Migration:** register Spring Framework's `UrlHandlerFilter` as a
`FilterRegistrationBean` so it runs ahead of the security chain. `wrapRequest()` makes it forward transparently (no
redirect), preserving the old behavior end-to-end:

```java
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.web.filter.UrlHandlerFilter;

@Configuration
class WebConfig {

    // After ForwardedHeaderFilter, before ServletRequestPathFilter and security filters.
    private static final int BEFORE_SECURITY_FILTER_ORDER = -101;

    @Bean
    FilterRegistrationBean<UrlHandlerFilter> trailingSlashHandlerFilter() {
        UrlHandlerFilter filter = UrlHandlerFilter.trailingSlashHandler("/**").wrapRequest().build();
        FilterRegistrationBean<UrlHandlerFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setOrder(BEFORE_SECURITY_FILTER_ORDER);
        return registration;
    }
}
```

### Jersey and Jackson 3 Incompatibility

**Jersey 4.0 limitation:** Spring Boot 4.0 supports Jersey 4.0, which **does not yet support Jackson 3**.

**Solution:** Use `spring-boot-jackson2` compatibility module **either in place of or alongside** `spring-boot-jackson`:

**libs.versions.toml:**
```toml
[libraries]
spring-boot-starter-jersey = { module = "org.springframework.boot:spring-boot-starter-jersey", version.ref = "springBoot" }
spring-boot-jackson2 = { module = "org.springframework.boot:spring-boot-jackson2", version.ref = "springBoot" }
# Optional: Keep Jackson 3 for non-Jersey parts of application
spring-boot-jackson = { module = "org.springframework.boot:spring-boot-jackson", version.ref = "springBoot" }
```

**build.gradle.kts:**
```kotlin
dependencies {
    implementation(libs.spring.boot.starter.jersey)
    implementation(libs.spring.boot.jackson2) // Required for Jersey JSON processing
    // Optional: Use Jackson 3 elsewhere in application
    // implementation(libs.spring.boot.jackson)
}
```

**Note:** If using only Jersey in your application, you can replace Jackson 3 entirely with Jackson 2 compatibility module.

## Messaging Framework Changes

### Kafka Streams Customizer Replacement

**Deprecated `StreamsBuilderFactoryBeanCustomizer` → `StreamsBuilderFactoryBeanConfigurer`:**

```kotlin
// Old (Spring Boot 3.x)
import org.springframework.boot.autoconfigure.kafka.StreamsBuilderFactoryBeanCustomizer

@Configuration
class KafkaStreamsConfig {
    @Bean
    fun streamsCustomizer(): StreamsBuilderFactoryBeanCustomizer {
        return StreamsBuilderFactoryBeanCustomizer { factoryBean ->
            factoryBean.setKafkaStreamsCustomizer { streams ->
                // Custom config
            }
        }
    }
}

// New (Spring Boot 4.0)
import org.springframework.kafka.config.StreamsBuilderFactoryBeanConfigurer

@Configuration
class KafkaStreamsConfig {
    @Bean
    fun streamsConfigurer(): StreamsBuilderFactoryBeanConfigurer {
        return StreamsBuilderFactoryBeanConfigurer { factoryBean ->
            factoryBean.setKafkaStreamsCustomizer { streams ->
                // Custom config
            }
        }
    }
}
```

**Note:** New configurer implements `Ordered` with default value `0`.

### Kafka Retry Property Change

**application.yml migration:**
```yaml
# Old (Spring Boot 3.x)
spring:
  kafka:
    retry:
      topic:
        backoff:
          random: true

# New (Spring Boot 4.0)
spring:
  kafka:
    retry:
      topic:
        backoff:
          jitter: 0.5 # More flexible than boolean
```

### RabbitMQ Retry Customizer Split

**Spring AMQP moved from Spring Retry → Spring Framework core retry**, with customizer split:

```kotlin
// Old (Spring Boot 3.x)
import org.springframework.boot.autoconfigure.amqp.RabbitRetryTemplateCustomizer

@Configuration
class RabbitConfig {
    @Bean
    fun retryCustomizer(): RabbitRetryTemplateCustomizer {
        return RabbitRetryTemplateCustomizer { template ->
            // Applies to both RabbitTemplate and listeners
        }
    }
}

// New (Spring Boot 4.0)
import org.springframework.boot.amqp.autoconfigure.RabbitTemplateRetrySettingsCustomizer
import org.springframework.boot.amqp.autoconfigure.RabbitListenerRetrySettingsCustomizer

@Configuration
class RabbitConfig {

    // For RabbitTemplate operations
    @Bean
    fun templateRetryCustomizer(): RabbitTemplateRetrySettingsCustomizer {
        return RabbitTemplateRetrySettingsCustomizer { settings ->
            settings.retryPolicySettings.maxRetries = 5L
        }
    }

    // For message listeners
    @Bean
    fun listenerRetryCustomizer(): RabbitListenerRetrySettingsCustomizer {
        return RabbitListenerRetrySettingsCustomizer { settings ->
            settings.retryPolicySettings.maxRetries = 3L
        }
    }
}
```

These customizers exist since Spring Boot 4.0.0 (`maxRetries` counts retries after the first attempt, unlike the old `maxAttempts`). In Spring Boot 4.2+ they moved to the `org.springframework.boot.rabbitmq.autoconfigure` package; adjust the imports when upgrading to 4.2.

