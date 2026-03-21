package com.example.AppQuanLiChiTieu.repository;

import com.example.AppQuanLiChiTieu.entity.Notification;
import com.example.AppQuanLiChiTieu.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Integer> {
    List<Notification> findByUserOrderByCreatedAtDesc(User user);
    long countByUserAndIsReadFalse(User user);
}
