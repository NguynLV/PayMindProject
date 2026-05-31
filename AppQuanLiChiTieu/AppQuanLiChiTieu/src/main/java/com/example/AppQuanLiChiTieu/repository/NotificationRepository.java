package com.example.AppQuanLiChiTieu.repository;

import com.example.AppQuanLiChiTieu.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Integer> {
    List<Notification> findByOwnerEmailOrderByCreatedAtDesc(String ownerEmail);
    Optional<Notification> findByIdAndOwnerEmail(Integer id, String ownerEmail);
    long countByOwnerEmailAndIsReadFalse(String ownerEmail);
}
