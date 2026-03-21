package com.example.AppQuanLiChiTieu.repository;

import com.example.AppQuanLiChiTieu.entity.Wallet;
import com.example.AppQuanLiChiTieu.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WalletRepository extends JpaRepository<Wallet, Integer> {
    List<Wallet> findByUserAndIsDeletedFalse(User user);
    Optional<Wallet> findByIdAndUserAndIsDeletedFalse(Integer id, User user);
}
