package com.securefile.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
public class FileStorageService {

    private final Path storageLocation;

    public FileStorageService(@Value("${app.upload.dir:./uploads}") String uploadDir) {
        this.storageLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.storageLocation);
        } catch (IOException e) {
            throw new RuntimeException("Could not create storage directory", e);
        }
    }

    public String storeEncryptedBytes(byte[] bytes) throws IOException {
        String filename = UUID.randomUUID().toString() + ".enc";
        Path targetPath = this.storageLocation.resolve(filename);
        Files.write(targetPath, bytes);
        return filename;
    }

    public byte[] readEncryptedBytes(String storedFilename) throws IOException {
        Path filePath = this.storageLocation.resolve(storedFilename);
        return Files.readAllBytes(filePath);
    }

    public void deleteFile(String storedFilename) {
        try {
            Path filePath = this.storageLocation.resolve(storedFilename);
            Files.deleteIfExists(filePath);
        } catch (IOException ignored) {}
    }
}
