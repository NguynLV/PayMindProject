package com.example.AppQuanLiChiTieu.controller;

import com.example.AppQuanLiChiTieu.dto.request.ReportInsightRequest;
import com.example.AppQuanLiChiTieu.dto.response.ApiResponse;
import com.example.AppQuanLiChiTieu.service.AiService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AiController {

    AiService aiService;
    com.example.AppQuanLiChiTieu.service.TransactionService transactionService;

    @PostMapping("/chat")
    public ApiResponse<Map<String, Object>> chat(@RequestBody Map<String, Object> request) {
        String message = (String) request.get("message");
        Object categoriesObj = request.get("categories");
        List<String> categories = categoriesObj instanceof List ? (List<String>) categoriesObj : null;
        return ApiResponse.<Map<String, Object>>builder()
                .result(aiService.processText(message, categories))
                .build();
    }

    @PostMapping("/scan-receipt")
    public ApiResponse<Map<String, Object>> scanReceipt(@RequestBody Map<String, Object> request) {
        String base64Data = (String) request.get("base64Data");
        String mimeType = (String) request.get("mimeType");
        Object categoriesObj = request.get("categories");
        List<String> categories = categoriesObj instanceof List ? (List<String>) categoriesObj : null;
        return ApiResponse.<Map<String, Object>>builder()
                .result(aiService.scanReceipt(base64Data, mimeType, categories))
                .build();
    }

    @GetMapping("/debug/models")
    public ApiResponse<Map<String, Object>> debugModels() {
        return ApiResponse.<Map<String, Object>>builder()
                .result(aiService.getAvailableModels())
                .build();
    }

    @PostMapping("/report-insight")
    public ApiResponse<Map<String, Object>> getReportInsight(@RequestBody ReportInsightRequest request) {
        try {
            System.out.println("AI Insight Request: " + request);
            return ApiResponse.<Map<String, Object>>builder()
                    .result(aiService.getReportInsight(request.getReportData(), request.getMonth(), request.getYear()))
                    .build();
        } catch (Throwable t) {
            System.err.println("AiController FATAL Error: " + t.getMessage());
            t.printStackTrace();
            return ApiResponse.<Map<String, Object>>builder()
                    .code(1001)
                    .message("Server Error: " + t.getClass().getSimpleName() + " - " + t.getMessage())
                    .build();
        }
    }

    @GetMapping("/budget-suggestion")
    public ApiResponse<Map<String, Object>> getBudgetSuggestion() {
        return ApiResponse.<Map<String, Object>>builder()
                .result(aiService.suggestBudget(transactionService.getMyTransactions()))
                .build();
    }
}
