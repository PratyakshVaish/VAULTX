package com.securefile.repository;

import com.securefile.model.FileMetadata;
import com.securefile.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FileMetadataRepository extends JpaRepository<FileMetadata, Long> {
    List<FileMetadata> findBySenderOrRecipientOrderByUploadedAtDesc(User sender, User recipient);
}
