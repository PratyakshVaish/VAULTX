package com.securefile.dto;

public class AuthDTOs {

    public static class RegisterRequest {
        private String username;
        private String password;

        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }

    public static class LoginRequest {
        private String username;
        private String password;

        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }

    public static class AuthResponse {
        private String token;
        private String username;
        private String publicKey;

        public AuthResponse(String token, String username, String publicKey) {
            this.token = token;
            this.username = username;
            this.publicKey = publicKey;
        }

        public String getToken() { return token; }
        public String getUsername() { return username; }
        public String getPublicKey() { return publicKey; }
    }
}
