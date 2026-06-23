package com.example.AppQuanLiChiTieu;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
@EnableFeignClients
@org.springframework.scheduling.annotation.EnableScheduling
public class AppQuanLiChiTieuApplication {

	static {
		// Load .env file programmatically
		java.util.List<java.io.File> potentialFiles = java.util.List.of(
				new java.io.File(".env"),
				new java.io.File("../.env"),
				new java.io.File("AppQuanLiChiTieu/AppQuanLiChiTieu/.env")
		);

		for (java.io.File envFile : potentialFiles) {
			if (envFile.exists() && envFile.isFile()) {
				System.out.println("Loading environment variables from: " + envFile.getAbsolutePath());
				try (java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.FileReader(envFile))) {
					String line;
					while ((line = reader.readLine()) != null) {
						line = line.trim();
						if (line.isEmpty() || line.startsWith("#")) {
							continue;
						}
						int eqIdx = line.indexOf('=');
						if (eqIdx > 0) {
							String key = line.substring(0, eqIdx).trim();
							String val = line.substring(eqIdx + 1).trim();
							if (val.startsWith("\"") && val.endsWith("\"") && val.length() >= 2) {
								val = val.substring(1, val.length() - 1);
							} else if (val.startsWith("'") && val.endsWith("'") && val.length() >= 2) {
								val = val.substring(1, val.length() - 1);
							}
							if (System.getProperty(key) == null && System.getenv(key) == null) {
								System.setProperty(key, val);
							}
						}
					}
				} catch (Exception e) {
					System.err.println("Error loading .env file: " + e.getMessage());
				}
				break; // Stop after loading the first valid .env file
			}
		}
	}

	public static void main(String[] args) {
		SpringApplication.run(AppQuanLiChiTieuApplication.class, args);
	}

}
