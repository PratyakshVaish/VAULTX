package com.securefile.dto;

import java.time.LocalDateTime;

public class FileDTOs {

    public static class FileMetadataDTO {
        private Long id;
        private String originalFilename;
        private String contentType;
        private Long fileSize;
        private String ivBase64;
        private String encryptedAesKey;
        private String senderUsername;
        private String recipientUsername;
        private LocalDateTime uploadedAt;

        public FileMetadataDTO(Long id, String originalFilename, String contentType, Long fileSize,
                               String ivBase64, String encryptedAesKey, String senderUsername,
                               String recipientUsername, LocalDateTime uploadedAt) {
            this.id = id;
            this.originalFilename = originalFilename;
            this.contentType = contentType;
            this.fileSize = fileSize;
            this.ivBase64 = ivBase64;
            this.encryptedAesKey = encryptedAesKey;
            this.senderUsername = senderUsername;
            this.recipientUsername = recipientUsername;
            this.uploadedAt = uploadedAt;
        }

        public Long getId() { return id; }
        public String getOriginalFilename() { return originalFilename; }
        public String getContentType() { return contentType; }
        public Long getFileSize() { return fileSize; }
        public String getIvBase64() { return ivBase64; }
        public String getEncryptedAesKey() { return encryptedAesKey; }
        public String getSenderUsername() { return senderUsername; }
        public String getRecipientUsername() { return recipientUsername; }
        public LocalDateTime getUploadedAt() { return uploadedAt; }
    }

    public static class AuditLogDTO {
        private Long id;
        private String username;
        private String filename;
        private String action;
        private String status;
        private LocalDateTime timestamp;

        public AuditLogDTO(Long id, String username, String filename, String action, String status, LocalDateTime timestamp) {
            this.id = id;
            this.username = username;
            this.filename = filename;
            this.action = action;
            this.status = status;
            this.timestamp = timestamp;
        }

        public Long getId() { return id; }
        public String getUsername() { return username; }
        public String getFilename() { return filename; }
        public String getAction() { return action; }
        public String getStatus() { return status; }
        public LocalDateTime getTimestamp() { return timestamp; }
    }
}
