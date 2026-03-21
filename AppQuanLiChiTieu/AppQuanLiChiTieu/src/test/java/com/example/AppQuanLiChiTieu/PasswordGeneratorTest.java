package com.example.AppQuanLiChiTieu;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

public class PasswordGeneratorTest {

    @Test
    public void generatePassword() {
        PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(10);
        String password = "Nguyen@2";
        String hash = passwordEncoder.encode(password);
        try (java.io.FileWriter writer = new java.io.FileWriter("password_hash.txt")) {
            writer.write(hash);
        } catch (java.io.IOException e) {
            e.printStackTrace();
        }
    }
}
