package com.example.AppQuanLiChiTieu.controller;

import com.example.AppQuanLiChiTieu.dto.response.ApiResponse;
import com.example.AppQuanLiChiTieu.dto.response.DailyStatResponse;
import com.example.AppQuanLiChiTieu.dto.response.ReportSummaryResponse;
import com.example.AppQuanLiChiTieu.dto.response.YearlyReportResponse;
import com.example.AppQuanLiChiTieu.service.ReportService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/reports")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ReportController {

    ReportService reportService;

    @GetMapping("/monthly")
    public ApiResponse<ReportSummaryResponse> getMonthlySummary(
            @RequestParam int month,
            @RequestParam int year) {
        return ApiResponse.<ReportSummaryResponse>builder()
                .result(reportService.getMonthlySummary(month, year))
                .build();
    }

    @GetMapping("/daily")
    public ApiResponse<List<DailyStatResponse>> getDailyStats(
            @RequestParam int month,
            @RequestParam int year) {
        return ApiResponse.<List<DailyStatResponse>>builder()
                .result(reportService.getDailyStats(month, year))
                .build();
    }

    @GetMapping("/yearly")
    public ApiResponse<YearlyReportResponse> getYearlySummary(
            @RequestParam int year) {
        return ApiResponse.<YearlyReportResponse>builder()
                .result(reportService.getYearlySummary(year))
                .build();
    }
    @GetMapping("/category-transactions")
    public ApiResponse<List<com.example.AppQuanLiChiTieu.dto.response.TransactionResponse>> getTransactionsByCategory(
            @RequestParam int categoryId,
            @RequestParam int month,
            @RequestParam int year) {
        return ApiResponse.<List<com.example.AppQuanLiChiTieu.dto.response.TransactionResponse>>builder()
                .result(reportService.getTransactionsByCategory(categoryId, month, year))
                .build();
    }
}

