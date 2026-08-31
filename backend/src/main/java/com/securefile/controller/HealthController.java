package com.securefile.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    @GetMapping({"/", "/api/health"})
    public ResponseEntity<String> healthCheck() {
        return ResponseEntity.ok("Secure File Transfer API is active and running with RSA-2048 and AES-256-GCM encryption!");
    }
}
