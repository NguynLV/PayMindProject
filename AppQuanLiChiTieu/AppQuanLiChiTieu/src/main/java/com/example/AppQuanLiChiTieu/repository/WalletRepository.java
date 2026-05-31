package com.example.AppQuanLiChiTieu.repository;

import com.example.AppQuanLiChiTieu.entity.Wallet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WalletRepository extends JpaRepository<Wallet, Integer> {
    List<Wallet> findByOwnerEmailAndIsDeletedFalse(String ownerEmail);
    Optional<Wallet> findByIdAndOwnerEmailAndIsDeletedFalse(Integer id, String ownerEmail);
}
