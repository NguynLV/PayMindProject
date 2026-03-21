package com.example.AppQuanLiChiTieu.repository;

import com.example.AppQuanLiChiTieu.entity.Category;
import com.example.AppQuanLiChiTieu.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Integer> {
    List<Category> findByUserAndTypeAndIsDeletedFalse(User user, String type);
    List<Category> findByUserAndIsDeletedFalse(User user);
    Optional<Category> findByIdAndUserAndIsDeletedFalse(Integer id, User user);
}
