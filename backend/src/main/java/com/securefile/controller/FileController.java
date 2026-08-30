package com.securefile.controller;

import com.securefile.dto.FileDTOs.FileMetadataDTO;
import com.securefile.model.AuditLog;
import com.securefile.model.FileMetadata;
import com.securefile.model.User;
import com.securefile.repository.AuditLogRepository;
import com.securefile.repository.FileMetadataRepository;
import com.securefile.repository.UserRepository;
import com.securefile.security.CryptoUtils;
import com.securefile.service.FileStorageService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.crypto.SecretKey;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.util.Base64;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/files")
public class FileController {

    private final FileMetadataRepository fileRepository;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final FileStorageService fileStorageService;

    public FileController(FileMetadataRepository fileRepository, UserRepository userRepository,
                          AuditLogRepository auditLogRepository, FileStorageService fileStorageService) {
        this.fileRepository = fileRepository;
        this.userRepository = userRepository;
        this.auditLogRepository = auditLogRepository;
        this.fileStorageService = fileStorageService;
    }

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Authenticated user not found"));
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "recipientUsername", required = false) String recipientUsername) {

        User sender = getCurrentUser();
        String filename = file.getOriginalFilename();

        // If no recipient specified, default to self-transfer
        User recipient = sender;
        if (recipientUsername != null && !recipientUsername.isBlank()) {
            recipient = userRepository.findByUsername(recipientUsername)
                    .orElseThrow(() -> new RuntimeException("Recipient user not found: " + recipientUsername));
        }

        try {
            // 1. Generate 256-bit AES Key & 12-byte IV
            SecretKey aesKey = CryptoUtils.generateAesKey();
            byte[] iv = CryptoUtils.generateIv();

            // 2. Encrypt File Content with AES-256-GCM
            byte[] rawBytes = file.getBytes();
            byte[] encryptedBytes = CryptoUtils.encryptFileAesGcm(rawBytes, aesKey, iv);

            // 3. Encrypt AES SecretKey with RECIPIENT's RSA Public Key
            PublicKey recipientPublicKey = CryptoUtils.stringToPublicKey(recipient.getPublicKey());
            String encryptedAesKeyStr = CryptoUtils.encryptAesKeyWithRsa(aesKey, recipientPublicKey);

            // 4. Store Encrypted File on Storage Volume
            String storedPath = fileStorageService.storeEncryptedBytes(encryptedBytes);

            // 5. Save File Metadata in Postgres DB
            String ivBase64 = Base64.getEncoder().encodeToString(iv);
            FileMetadata metadata = new FileMetadata(
                    filename,
                    file.getContentType() != null ? file.getContentType() : "application/octet-stream",
                    file.getSize(),
                    storedPath,
                    encryptedAesKeyStr,
                    ivBase64,
                    sender,
                    recipient
            );
            fileRepository.save(metadata);

            // 6. Log Audit Event
            auditLogRepository.save(new AuditLog(sender.getUsername(), filename + " (Sent to " + recipient.getUsername() + ")", "SEND_FILE", "SUCCESS"));

            return ResponseEntity.ok("File encrypted for " + recipient.getUsername() + " and sent successfully!");

        } catch (Exception e) {
            auditLogRepository.save(new AuditLog(sender.getUsername(), filename, "SEND_FILE", "FAILED"));
            return ResponseEntity.internalServerError().body("Encryption or upload failed: " + e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<List<FileMetadataDTO>> listFiles() {
        User user = getCurrentUser();
        List<FileMetadataDTO> dtos = fileRepository.findBySenderOrRecipientOrderByUploadedAtDesc(user, user).stream()
                .map(f -> new FileMetadataDTO(
                        f.getId(),
                        f.getOriginalFilename(),
                        f.getContentType(),
                        f.getFileSize(),
                        f.getIvBase64(),
                        f.getEncryptedAesKey(),
                        f.getSender().getUsername(),
                        f.getRecipient().getUsername(),
                        f.getUploadedAt()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<?> downloadFile(@PathVariable Long id) {
        User currentUser = getCurrentUser();
        FileMetadata metadata = fileRepository.findById(id).orElse(null);

        if (metadata == null) {
            return ResponseEntity.badRequest().body("File not found.");
        }

        // Verify current user is recipient or sender
        boolean isRecipient = metadata.getRecipient().getId().equals(currentUser.getId());
        boolean isSender = metadata.getSender().getId().equals(currentUser.getId());

        if (!isRecipient && !isSender) {
            return ResponseEntity.status(403).body("Access denied: You are neither the sender nor the recipient of this file.");
        }

        try {
            // Decryption requires recipient's RSA Private Key (since AES key was encrypted with recipient's RSA Public Key)
            User keyOwner = metadata.getRecipient();
            PrivateKey rsaPrivateKey = CryptoUtils.stringToPrivateKey(keyOwner.getPrivateKeyPem());

            // 1. Decrypt AES Key using Recipient's RSA Private Key
            SecretKey aesKey = CryptoUtils.decryptAesKeyWithRsa(metadata.getEncryptedAesKey(), rsaPrivateKey);

            // 2. Decode 12-byte IV
            byte[] iv = Base64.getDecoder().decode(metadata.getIvBase64());

            // 3. Read Encrypted Bytes from Storage
            byte[] encryptedBytes = fileStorageService.readEncryptedBytes(metadata.getStoredPath());

            // 4. Decrypt File Bytes using AES-256-GCM
            byte[] decryptedBytes = CryptoUtils.decryptFileAesGcm(encryptedBytes, aesKey, iv);

            // 5. Log Audit Event
            auditLogRepository.save(new AuditLog(currentUser.getUsername(), metadata.getOriginalFilename(), "DOWNLOAD_DECRYPT", "SUCCESS"));

            // 6. Stream Decrypted File to User
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(metadata.getContentType()))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + metadata.getOriginalFilename() + "\"")
                    .body(decryptedBytes);

        } catch (Exception e) {
            auditLogRepository.save(new AuditLog(currentUser.getUsername(), metadata.getOriginalFilename(), "DOWNLOAD_DECRYPT", "FAILED"));
            return ResponseEntity.internalServerError().body("Decryption failed: " + e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteFile(@PathVariable Long id) {
        User user = getCurrentUser();
        FileMetadata metadata = fileRepository.findById(id).orElse(null);

        if (metadata == null || (!metadata.getSender().getId().equals(user.getId()) && !metadata.getRecipient().getId().equals(user.getId()))) {
            return ResponseEntity.badRequest().body("File not found or access denied.");
        }

        fileStorageService.deleteFile(metadata.getStoredPath());
        fileRepository.delete(metadata);
        auditLogRepository.save(new AuditLog(user.getUsername(), metadata.getOriginalFilename(), "DELETE", "SUCCESS"));

        return ResponseEntity.ok("File deleted successfully.");
    }
}
