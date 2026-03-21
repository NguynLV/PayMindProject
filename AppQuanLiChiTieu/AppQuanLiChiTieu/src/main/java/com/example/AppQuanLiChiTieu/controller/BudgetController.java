package com.example.AppQuanLiChiTieu.controller;

import com.example.AppQuanLiChiTieu.dto.request.BudgetRequest;
import com.example.AppQuanLiChiTieu.dto.response.ApiResponse;
import com.example.AppQuanLiChiTieu.dto.response.BudgetResponse;
import com.example.AppQuanLiChiTieu.service.BudgetService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/budgets")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class BudgetController {

    BudgetService budgetService;

    @GetMapping
    public ApiResponse<List<BudgetResponse>> getMyBudgets() {
        return ApiResponse.<List<BudgetResponse>>builder()
                .result(budgetService.getMyBudgets())
                .build();
    }

    @PostMapping
    public ApiResponse<BudgetResponse> createBudget(@RequestBody @Valid BudgetRequest request) {
        return ApiResponse.<BudgetResponse>builder()
                .result(budgetService.createBudget(request))
                .build();
    }

    @PutMapping("/{id}")
    public ApiResponse<BudgetResponse> updateBudget(@PathVariable Integer id, @RequestBody @Valid BudgetRequest request) {
        return ApiResponse.<BudgetResponse>builder()
                .result(budgetService.updateBudget(id, request))
                .build();
    }

    @DeleteMapping("/{id}")
    public ApiResponse<String> deleteBudget(@PathVariable Integer id) {
        budgetService.deleteBudget(id);
        return ApiResponse.<String>builder()
                .result("Xóa ngân sách thành công")
                .build();
    }
}
