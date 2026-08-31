# Stage 1: Build the Maven application
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app

# Copy pom.xml whether context is repo root or /backend directory
COPY pom.xml* backend/pom.xml* ./
RUN mvn dependency:go-offline -B || true

# Copy source code whether context is repo root or /backend directory
COPY src* ./src/
COPY backend/src* ./src/

RUN mvn package -DskipTests

# Stage 2: Runtime Container
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN mkdir -p /app/uploads
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
