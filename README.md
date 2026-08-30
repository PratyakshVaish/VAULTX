# VaultX — Zero-Trust Encrypted File Transfer System

A high-performance, secure file exchange platform designed with end-to-end Zero-Trust architecture. The application combines **AES-256-GCM** for authenticated symmetric file encryption and **RSA-2048** for asymmetric key wrapping, ensuring that stored file contents and encryption keys remain strictly inaccessible to database administrators, intermediaries, and unauthorized actors.

Built with Java 21, Spring Boot 3, PostgreSQL 16, Nginx, and single-page Vanilla JavaScript, containerized for single-command orchestration using Docker Compose.

---

## Technical Overview & Security Architecture

Traditional file-sharing architectures rely on server-side static key storage, making files vulnerable if backend databases or disk volumes are compromised. VaultX resolves this by implementing a **Hybrid Cryptographic Architecture**:

1. **Symmetric File Encryption (AES-256-GCM)**:
   - Every file payload is encrypted using a unique, transient 256-bit AES symmetric key.
   - Galois/Counter Mode (GCM) guarantees both confidentiality and data authenticity via a 128-bit authentication tag.
   - Each operation generates a fresh 12-byte (96-bit) Initialization Vector (IV) using `java.security.SecureRandom`, preventing ciphertext pattern analysis across identical payloads.

2. **Asymmetric Key Distribution (RSA-2048)**:
   - Upon registration, an RSA-2048 keypair is generated for each user entity.
   - When **User A (Sender)** transfers a file to **User B (Recipient)**, the transient 256-bit AES key is wrapped (encrypted) using **User B's RSA Public Key**.
   - The encrypted file payload and the wrapped AES key are persisted in PostgreSQL and physical volume storage.

3. **Decryption & Unwrapping**:
   - To retrieve the file, **User B** requests the record using their authenticated session.
   - The backend retrieves User B's RSA Private Key to unwrap the 256-bit AES key, then executes AES-256-GCM decryption on the binary stream before piping it to the client response.

---

## Cryptographic Flow Diagram

```
[Sender: User A]
       |
       +---> Generates Random AES-256 Key + 12-Byte IV
       |
       +---> [AES-256-GCM Encrypt File Bytes] --------------> Encrypted Payload (Disk)
       |
       +---> Encrypt AES Key with Recipient's RSA Public Key -> Wrapped AES Key (PostgreSQL)

---------------------------------------------------------------------------------------

[Recipient: User B]
       |
       +---> Authenticates Session (JWT)
       |
       +---> Retrieves Wrapped AES Key + IV
       |
       +---> [Decrypt AES Key with Recipient's RSA Private Key] -> Original AES-256 Key
       |
       +---> [AES-256-GCM Decrypt Payload + GCM Auth Check] ----> Original File Stream
```

---

## Technology Stack

- **Backend**: Java 21 LTS, Spring Boot 3.2.3, Spring Security (Stateless JWT Filter), Spring Data JPA / Hibernate, JJWT (io.jsonwebtoken)
- **Frontend**: Vanilla JavaScript (ES6+), Web APIs, CSS3 (Custom Design System with Inter Tight & JetBrains Mono typography), Nginx
- **Database**: PostgreSQL 16 (Relational Schema with JPA Auto-DDL Initializer)
- **DevOps**: Docker, Docker Compose, Multi-stage Maven Alpine Containers

---

## Database Schema Design

The relational model consists of three core normalized tables:

### 1. `users`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | BIGINT | PRIMARY KEY, AUTO_INC | Unique user identifier |
| `username` | VARCHAR | UNIQUE, NOT NULL | Account login username |
| `password_hash` | VARCHAR | NOT NULL | BCrypt hashed account password |
| `public_key` | TEXT | NOT NULL | Base64 PEM encoded RSA-2048 Public Key |
| `private_key_pem` | TEXT | NOT NULL | Base64 PEM encoded RSA-2048 Private Key |
| `created_at` | TIMESTAMP | NOT NULL | Account creation timestamp |

### 2. `file_metadata`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | BIGINT | PRIMARY KEY, AUTO_INC | Unique file record identifier |
| `original_filename` | VARCHAR | NOT NULL | Original uploaded filename |
| `content_type` | VARCHAR | NOT NULL | MIME media type string |
| `file_size` | BIGINT | NOT NULL | File size in bytes |
| `stored_path` | VARCHAR | NOT NULL | Disk filename reference (`UUID.enc`) |
| `encrypted_aes_key` | TEXT | NOT NULL | RSA Public Key wrapped AES-256 key |
| `iv_base64` | VARCHAR | NOT NULL | Base64 encoded 12-byte random IV |
| `sender_id` | BIGINT | FK -> users(id) | Reference to file uploader/sender |
| `recipient_id` | BIGINT | FK -> users(id) | Reference to file target recipient |
| `uploaded_at` | TIMESTAMP | NOT NULL | File upload timestamp |

### 3. `audit_logs`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | BIGINT | PRIMARY KEY, AUTO_INC | Log record ID |
| `username` | VARCHAR | NOT NULL | User performing action |
| `filename` | VARCHAR | NOT NULL | Target file name |
| `action` | VARCHAR | NOT NULL | Action type (`SEND_FILE`, `DOWNLOAD_DECRYPT`, `DELETE`) |
| `status` | VARCHAR | NOT NULL | Execution status (`SUCCESS`, `FAILED`) |
| `timestamp` | TIMESTAMP | NOT NULL | Timestamp of event execution |

---

## REST API Specification

### Authentication Endpoints
- `POST /api/auth/register`
  - Body: `{ "username": "alice", "password": "password123" }`
  - Response: `{ "token": "JWT_TOKEN", "username": "alice", "publicKey": "BASE64_RSA_PUBLIC_KEY" }`
- `POST /api/auth/login`
  - Body: `{ "username": "alice", "password": "password123" }`
  - Response: Auth payload with JWT Bearer token
- `GET /api/auth/users`
  - Headers: `Authorization: Bearer <TOKEN>`
  - Response: List of registered recipient usernames `["alice", "bob"]`

### File Transfer Endpoints
- `POST /api/files/upload`
  - Headers: `Authorization: Bearer <TOKEN>`
  - Form Data: `file` (Multipart), `recipientUsername` (String)
  - Processing: Encrypts file bytes via AES-256-GCM, wraps key using recipient's RSA public key.
- `GET /api/files`
  - Headers: `Authorization: Bearer <TOKEN>`
  - Response: Array of `FileMetadataDTO` records where user is sender or recipient.
- `GET /api/files/{id}/download`
  - Headers: `Authorization: Bearer <TOKEN>`
  - Processing: Unwraps AES key with recipient's private key, decrypts ciphertext, and streams attachment.
- `DELETE /api/files/{id}`
  - Headers: `Authorization: Bearer <TOKEN>`
  - Processing: Removes physical payload from disk and deletes database record.

### Security Audit Endpoints
- `GET /api/audit`
  - Headers: `Authorization: Bearer <TOKEN>`
  - Response: System audit log array ordered descending by timestamp.

---

## Deployment & Setup Instructions

### Prerequisites
- Docker Engine 20.10+
- Docker Compose 2.0+
- JDK 21+ and Maven 3.9+ (optional for local standalone execution)

### 1-Click Container Deployment
Clone the repository and launch the full stack via Docker Compose:

```bash
git clone https://github.com/your-username/secure-file-system.git
cd secure-file-system
docker-compose up --build
```

Docker Compose spins up three isolated services:
1. `secure_file_postgres`: PostgreSQL 16 database running on port `5432`.
2. `secure_file_backend`: Spring Boot 3 Java 21 REST backend running on port `8080`.
3. `secure_file_frontend`: Nginx reverse proxy & static SPA web portal running on port `80`.

Access the application in your browser at `http://localhost`.

---

## Local Development Execution (Without Docker)

### Backend
1. Ensure PostgreSQL is running on `localhost:5432` with database `securefiledb`, username `fileuser`, and password `filepassword`.
2. Navigate to the `backend/` directory:
   ```bash
   cd backend
   mvn clean package
   java -jar target/secure-file-system-1.0.0.jar
   ```

### Frontend
Serve the `frontend/src/` folder using Nginx, Live Server, or Python HTTP server pointing API calls to `http://localhost:8080`.

---

## License

Distributed under the MIT License. See `LICENSE` for details.
