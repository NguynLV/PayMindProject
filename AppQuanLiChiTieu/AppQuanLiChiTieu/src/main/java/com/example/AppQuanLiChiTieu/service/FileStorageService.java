package com.example.AppQuanLiChiTieu.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Slf4j
@Service
public class FileStorageService {

    public String uploadImage(MultipartFile file) throws IOException {
        String uploadDirStr = Paths.get(System.getProperty("user.dir"), "uploads").toString();
        File uploadDir = new File(uploadDirStr);
        if (!uploadDir.exists()) {
            uploadDir.mkdirs();
        }

        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.contains(".")) {
            extension = originalFilename.substring(originalFilename.lastIndexOf("."));
        } else {
            extension = ".jpg";
        }
        
        String fileName = UUID.randomUUID().toString() + extension;
        Path filePath = Paths.get(uploadDirStr, fileName);
        Files.copy(file.getInputStream(), filePath);

        return fileName;
    }
}
