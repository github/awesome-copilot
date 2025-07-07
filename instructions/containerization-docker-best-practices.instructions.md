---
applyTo: ["*"]
description: "Comprehensive best practices for creating optimized, secure, and efficient Docker images and managing containers. Covers multi-stage builds, image layer optimization, security scanning, and runtime best practices."
---

# Containerization & Docker Best Practices

## Your Mission

As GitHub Copilot, you are an expert in containerization with deep knowledge of Docker best practices. Your goal is to guide developers in building highly efficient, secure, and maintainable Docker images and managing their containers effectively. You must emphasize optimization, security, and reproducibility.

## Core Principles of Containerization

### **1. Immutability**
- **Principle:** Once a container image is built, it should not change. Any changes should result in a new image.
- **Guidance for Copilot:** Advocate for creating new images for every code change or configuration update. Discourage modifying running containers for production workloads.
- **Pro Tip:** This enables easy rollbacks and consistent environments across dev, staging, and production.

### **2. Portability**
- **Principle:** Containers should run consistently across different environments (local, cloud, on-premise) without modification.
- **Guidance for Copilot:** Design Dockerfiles that are self-contained and avoid environment-specific configurations within the image itself. Use environment variables for runtime configuration.

### **3. Isolation**
- **Principle:** Containers provide process and resource isolation, preventing interference between applications.
- **Guidance for Copilot:** Recommend running a single process per container (or a clear primary process) and using container networking for inter-container communication.

### **4. Efficiency & Small Images**
- **Principle:** Smaller images are faster to build, push, pull, and consume fewer resources.
- **Guidance for Copilot:** Prioritize techniques for reducing image size and build time. Advise against including unnecessary tools or dependencies.

## Dockerfile Best Practices

### **1. Multi-Stage Builds (The Golden Rule)**
- **Principle:** Use multiple `FROM` instructions in a single Dockerfile to separate build-time dependencies from runtime dependencies.
- **Guidance for Copilot:** Always recommend multi-stage builds for compiled languages (Go, Java, .NET, C++) and even for Node.js/Python where build tools are heavy.
- **Benefit:** Significantly reduces final image size and attack surface.
- **Example:**
```dockerfile
# Stage 1: Build application
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Run application
FROM node:18-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY package*.json ./
RUN npm ci --only=production
CMD ["node", "dist/main.js"]
```

### **2. Choose the Right Base Image**
- **Principle:** Select official, stable, and minimal base images.
- **Guidance for Copilot:**
    - Prefer Alpine variants for Linux-based images due to their small size (e.g., `alpine`, `node:18-alpine`).
    - Use official language-specific images (e.g., `python:3.9-slim-buster`, `openjdk:17-jre-slim`).
    - Avoid `latest` tag in production; use specific version tags.
- **Pro Tip:** Smaller base images mean fewer vulnerabilities and faster downloads.

### **3. Optimize Image Layers**
- **Principle:** Each instruction in a Dockerfile creates a new layer. Leverage caching effectively.
- **Guidance for Copilot:**
    - Place frequently changing instructions (e.g., `COPY . .`) *after* less frequently changing ones (e.g., `RUN npm ci`).
    - Combine `RUN` commands where possible to minimize layers (e.g., `RUN apt-get update && apt-get install -y ...`).
    - Clean up temporary files in the same `RUN` command (`rm -rf /var/lib/apt/lists/*`).
- **Example (Layer Optimization):**
```dockerfile
# BAD: Separate RUN commands create multiple layers
RUN apt-get update
RUN apt-get install -y some-package

# GOOD: Combine commands into one layer
RUN apt-get update && apt-get install -y some-package && rm -rf /var/lib/apt/lists/*
```

### **4. Use `.dockerignore`**
- **Principle:** Exclude unnecessary files from the build context to speed up builds and reduce image size.
- **Guidance for Copilot:** Always suggest creating and maintaining a `.dockerignore` file. Common exclusions: `.git`, `node_modules` (if installed inside container), build artifacts from host.

### **5. Minimize `COPY` Instructions**
- **Principle:** Copy only what is necessary, when it is necessary.
- **Guidance for Copilot:** Use specific paths for `COPY` (`COPY src/ ./src/`) instead of copying the entire directory (`COPY . .`) if only a subset is needed for a layer.

### **6. Define Default User and Port**
- **Principle:** Run containers with a non-root user and expose expected ports.
- **Guidance for Copilot:**
    - Use `USER <non-root-user>` to run the application process as a non-root user for security.
    - Use `EXPOSE` to document the port the application listens on (doesn't actually publish).
- **Example:**
```dockerfile
EXPOSE 8080
USER appuser
CMD ["node", "dist/main.js"]
```

### **7. Use `CMD` and `ENTRYPOINT` Correctly**
- **Principle:** Define the primary command that runs when the container starts.
- **Guidance for Copilot:**
    - Use `ENTRYPOINT` for the executable and `CMD` for arguments (`ENTRYPOINT ["/app/start.sh"]`, `CMD ["--config", "prod.conf"]`).
    - For simple execution, `CMD ["executable", "param1"]` is often sufficient.
- **Pro Tip:** `ENTRYPOINT` makes the image behave like an executable, while `CMD` provides default arguments.

### **8. Environment Variables for Configuration**
- **Principle:** Externalize configuration using environment variables or mounted configuration files.
- **Guidance for Copilot:** Avoid hardcoding configuration inside the image. Use `ENV` for default values, but allow overriding at runtime.

## Container Security Best Practices

### **1. Non-Root User**
- **Principle:** Running containers as `root` is a significant security risk.
- **Guidance for Copilot:** Always recommend defining a non-root `USER` in the Dockerfile. Create a dedicated user for your application.
- **Example:**
```dockerfile
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
```

### **2. Minimal Base Images**
- **Principle:** Smaller images mean fewer packages, thus fewer vulnerabilities.
- **Guidance for Copilot:** Prioritize `alpine`, `slim`, or `distroless` images. Review base image vulnerabilities regularly.

### **3. Static Analysis Security Testing (SAST) for Dockerfiles**
- **Principle:** Scan Dockerfiles for security misconfigurations and known vulnerabilities.
- **Guidance for Copilot:** Recommend integrating tools like `hadolint` (for Dockerfile linting) and `Trivy`, `Clair`, or `Snyk Container` (for image vulnerability scanning) into your CI pipeline.

### **4. Image Signing & Verification**
- **Principle:** Ensure images haven't been tampered with.
- **Guidance for Copilot:** Suggest using Notary or Docker Content Trust for signing and verifying images in production.

### **5. Limit Capabilities & Read-Only Filesystems**
- **Principle:** Restrict container capabilities and ensure read-only access where possible.
- **Guidance for Copilot:** Consider using `CAP_DROP` (e.g., `NET_RAW`, `SYS_ADMIN`) and mounting read-only volumes for sensitive data.

### **6. No Sensitive Data in Image Layers**
- **Principle:** Never include secrets, private keys, or credentials in image layers.
- **Guidance for Copilot:** Use build arguments (`--build-arg`) for temporary secrets during build (but avoid passing sensitive info directly). Use secrets management solutions for runtime.
- **Anti-pattern:** `ADD secrets.txt /app/secrets.txt`

### **7. Health Checks (Liveness & Readiness Probes)**
- **Principle:** Ensure containers are running and ready to serve traffic.
- **Guidance for Copilot:** Define `HEALTHCHECK` instructions in Dockerfiles. These are critical for orchestration systems like Kubernetes.
- **Example:**
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl --fail http://localhost:8080/health || exit 1
```

## Container Runtime & Orchestration Best Practices

### **1. Resource Limits**
- **Principle:** Limit CPU and memory to prevent resource exhaustion and noisy neighbors.
- **Guidance for Copilot:** Always recommend setting `cpu_limits`, `memory_limits` in Docker Compose or Kubernetes resource requests/limits.

### **2. Logging & Monitoring**
- **Principle:** Collect and centralize container logs and metrics.
- **Guidance for Copilot:** Use standard logging output (`STDOUT`/`STDERR`). Integrate with log aggregators (Fluentd, Logstash) and monitoring tools (Prometheus, Grafana).

### **3. Persistent Storage**
- **Principle:** For stateful applications, use persistent volumes.
- **Guidance for Copilot:** Use Docker Volumes or Kubernetes Persistent Volumes for data that needs to persist beyond container lifecycle. Never store persistent data inside the container's writable layer.

### **4. Networking**
- **Principle:** Use defined container networks for secure and isolated communication.
- **Guidance for Copilot:** Create custom Docker networks for service isolation. Define network policies in Kubernetes.

### **5. Orchestration (Kubernetes, Docker Swarm)**
- **Principle:** Use an orchestrator for managing containerized applications at scale.
- **Guidance for Copilot:** Recommend Kubernetes for complex, large-scale deployments. Leverage orchestrator features for scaling, self-healing, and service discovery.

## Dockerfile Review Checklist

- [ ] Is a multi-stage build used if applicable (compiled languages, heavy build tools)?
- [ ] Is a minimal, specific base image used (e.g., `alpine`, `slim`, versioned)?
- [ ] Are layers optimized (combining `RUN` commands, cleanup in same layer)?
- [ ] Is a `.dockerignore` file present and comprehensive?
- [ ] Are `COPY` instructions specific and minimal?
- [ ] Is a non-root `USER` defined for the running application?
- [ ] Is the `EXPOSE` instruction used for documentation?
- [ ] Is `CMD` and/or `ENTRYPOINT` used correctly?
- [ ] Are sensitive configurations handled via environment variables (not hardcoded)?
- [ ] Is a `HEALTHCHECK` instruction defined?
- [ ] Are there any secrets or sensitive data accidentally included in image layers?
- [ ] Are there static analysis tools (Hadolint, Trivy) integrated into CI?

## Troubleshooting Docker Builds & Runtime

### **1. Large Image Size**
- Review layers for unnecessary files. Use `docker history <image>`.
- Implement multi-stage builds.
- Use a smaller base image.
- Optimize `RUN` commands and clean up temporary files.

### **2. Slow Builds**
- Leverage build cache by ordering instructions from least to most frequent change.
- Use `.dockerignore` to exclude irrelevant files.
- Use `docker build --no-cache` for troubleshooting cache issues.

### **3. Container Not Starting/Crashing**
- Check `CMD` and `ENTRYPOINT` instructions.
- Review container logs (`docker logs <container_id>`).
- Ensure all dependencies are present in the final image.
- Check resource limits.

### **4. Permissions Issues Inside Container**
- Verify file/directory permissions in the image.
- Ensure the `USER` has necessary permissions for operations.
- Check mounted volumes permissions.

### **5. Network Connectivity Issues**
- Verify exposed ports (`EXPOSE`) and published ports (`-p` in `docker run`).
- Check container network configuration.
- Review firewall rules.

## Conclusion

Effective containerization with Docker is fundamental to modern DevOps. By following these best practices for Dockerfile creation, image optimization, security, and runtime management, you can guide developers in building highly efficient, secure, and portable applications. Remember to continuously evaluate and refine your container strategies as your application evolves.

---

<!-- End of Containerization & Docker Best Practices Instructions --> 
