package com.securefile.controller;

import com.securefile.dto.AuthDTOs.*;
import com.securefile.model.User;
import com.securefile.repository.UserRepository;
import com.securefile.security.CryptoUtils;
import com.securefile.security.JwtUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.security.KeyPair;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtils jwtUtils) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtils = jwtUtils;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            return ResponseEntity.badRequest().body("Error: Username is already taken!");
        }

        try {
            // Generate RSA 2048 Keypair for new user
            KeyPair keyPair = CryptoUtils.generateRsaKeyPair();
            String publicKeyStr = CryptoUtils.keyToString(keyPair.getPublic());
            String privateKeyStr = CryptoUtils.keyToString(keyPair.getPrivate());

            User user = new User(
                request.getUsername(),
                passwordEncoder.encode(request.getPassword()),
                publicKeyStr,
                privateKeyStr
            );

            userRepository.save(user);

            String token = jwtUtils.generateJwtToken(user.getUsername());
            return ResponseEntity.ok(new AuthResponse(token, user.getUsername(), user.getPublicKey()));

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Error generating cryptographic keys: " + e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername()).orElse(null);

        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            return ResponseEntity.badRequest().body("Error: Invalid username or password!");
        }

        String token = jwtUtils.generateJwtToken(user.getUsername());
        return ResponseEntity.ok(new AuthResponse(token, user.getUsername(), user.getPublicKey()));
    }

    @GetMapping("/users")
    public ResponseEntity<List<String>> getAllUsernames() {
        List<String> usernames = userRepository.findAll().stream()
                .map(User::getUsername)
                .collect(Collectors.toList());
        return ResponseEntity.ok(usernames);
    }
}
