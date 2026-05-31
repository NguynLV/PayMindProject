package com.example.AppQuanLiChiTieu.repository;

import com.example.AppQuanLiChiTieu.entity.RedisToken;
import org.springframework.data.repository.CrudRepository;

public interface RedisRepository extends CrudRepository<RedisToken, String> {
}
