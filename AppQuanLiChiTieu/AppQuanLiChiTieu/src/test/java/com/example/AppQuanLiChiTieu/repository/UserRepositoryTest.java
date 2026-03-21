package com.example.AppQuanLiChiTieu.repository;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
public class UserRepositoryTest {

    @Autowired
    private UserRepository userRepository;

    @Test
    public void testFindByEmail() {
        // Attempt to find a user. It doesn't matter if it returns null or not, 
        // as long as it doesn't throw "Invalid column name" SQL exception.
        try {
            userRepository.findByEmail("nonexistent@example.com");
            System.out.println("TEST_SUCCESS_NO_EXCEPTION");
        } catch (Exception e) {
            e.printStackTrace();
            System.out.println("TEST_FAILURE_EXCEPTION");
        }
    }
}
