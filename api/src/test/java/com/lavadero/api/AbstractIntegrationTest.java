package com.lavadero.api;

import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Base class for all integration tests.
 *
 * Container sharing: a single PostgreSQL container is started once per JVM
 * via a static field on this class. Spring's context cache then reuses the
 * same ApplicationContext across every subclass that shares the same context
 * key (same profile, same properties). Tests that need auth enabled override
 * the property and receive a fresh context, but still reuse the same
 * database container — that is correct and intentional.
 *
 * The test profile (application-test.yml) sets lavadero.auth.enabled=false,
 * so these tests exercise business logic without RBAC overhead. RBAC is
 * covered separately in RbacSecurityIntegrationTest which sets
 * lavadero.auth.enabled=true and uses real JWT tokens.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class AbstractIntegrationTest {

    // One container for the entire test JVM. PostgreSQLContainer is thread-safe
    // and Testcontainers handles the lifecycle via JVM shutdown hook.
    private static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:16").withReuse(false);

    static {
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void postgresProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }
}
