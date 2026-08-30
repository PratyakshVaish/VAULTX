package com.securefile.controller;

import com.securefile.dto.FileDTOs.AuditLogDTO;
import com.securefile.repository.AuditLogRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/audit")
public class AuditController {

    private final AuditLogRepository auditLogRepository;

    public AuditController(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @GetMapping
    public ResponseEntity<List<AuditLogDTO>> getAuditLogs() {
        List<AuditLogDTO> dtos = auditLogRepository.findAllByOrderByTimestampDesc().stream()
                .map(a -> new AuditLogDTO(
                        a.getId(),
                        a.getUsername(),
                        a.getFilename(),
                        a.getAction(),
                        a.getStatus(),
                        a.getTimestamp()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }
}
