package com.example.AppQuanLiChiTieu.controller;

import com.example.AppQuanLiChiTieu.dto.response.ApiResponse;
import com.example.AppQuanLiChiTieu.dto.response.DiaryEntryResponse;
import com.example.AppQuanLiChiTieu.service.DiaryService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/diary")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class DiaryController {

    DiaryService diaryService;

    /** GET /diary — lấy toàn bộ nhật ký của user hiện tại */
    @GetMapping
    public ApiResponse<List<DiaryEntryResponse>> getAll() {
        return ApiResponse.<List<DiaryEntryResponse>>builder()
                .result(diaryService.getMyDiaries())
                .build();
    }

    /** GET /diary/month?year=2026&month=5 — lọc theo tháng */
    @GetMapping("/month")
    public ApiResponse<List<DiaryEntryResponse>> getByMonth(
            @RequestParam int year,
            @RequestParam int month) {
        return ApiResponse.<List<DiaryEntryResponse>>builder()
                .result(diaryService.getMyDiariesByMonth(year, month))
                .build();
    }

    /** GET /diary/{id} — chi tiết 1 nhật ký */
    @GetMapping("/{id}")
    public ApiResponse<DiaryEntryResponse> getById(@PathVariable Long id) {
        return ApiResponse.<DiaryEntryResponse>builder()
                .result(diaryService.getDiaryById(id))
                .build();
    }

    /**
     * POST /diary — tạo nhật ký mới
     * Dùng multipart/form-data để gửi ảnh + các field khác
     */
    @PostMapping(consumes = "multipart/form-data")
    public ApiResponse<DiaryEntryResponse> create(
            @RequestPart(value = "image", required = false) MultipartFile image,
            @RequestParam(required = false) String note,
            @RequestParam(required = false) String entryDate,
            @RequestParam(required = false) Long transactionId) {
        return ApiResponse.<DiaryEntryResponse>builder()
                .result(diaryService.createDiary(image, note, entryDate, transactionId))
                .build();
    }

    /** PUT /diary/{id} — cập nhật ghi chú */
    @PutMapping("/{id}")
    public ApiResponse<DiaryEntryResponse> update(
            @PathVariable Long id,
            @RequestParam String note) {
        return ApiResponse.<DiaryEntryResponse>builder()
                .result(diaryService.updateDiary(id, note))
                .build();
    }

    /** DELETE /diary/{id} — xóa mềm */
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(@PathVariable Long id) {
        diaryService.deleteDiary(id);
        return ApiResponse.<Void>builder()
                .message("Đã xóa nhật ký thành công")
                .build();
    }
}
