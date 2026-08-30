package com.securefile;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootApplication
@RestController
public class SecureFileApplication {

    public static void main(String[] args) {
        SpringApplication.run(SecureFileApplication.class, args);
    }

    @GetMapping("/api/health")
    public String healthCheck() {
        return "Secure File Transfer API is running with RSA-2048 and AES-256-GCM encryption!";
    }
}
