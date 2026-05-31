package com.example.AppQuanLiChiTieu.repository;

import com.example.AppQuanLiChiTieu.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Integer> {
    List<Category> findByTypeAndOwnerEmailAndIsDeletedFalse(String type, String ownerEmail);
    List<Category> findByOwnerEmailAndIsDeletedFalse(String ownerEmail);
    Optional<Category> findByIdAndOwnerEmailAndIsDeletedFalse(Integer id, String ownerEmail);
}
