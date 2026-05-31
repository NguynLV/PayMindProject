package com.example.AppQuanLiChiTieu.repository;

import com.example.AppQuanLiChiTieu.model.User;
import org.springframework.data.repository.CrudRepository;

public interface RedisUserRepository extends CrudRepository<User, String> {
}
