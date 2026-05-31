package com.example.AppQuanLiChiTieu.controller;

import com.example.AppQuanLiChiTieu.dto.request.SavingGoalRequest;
import com.example.AppQuanLiChiTieu.dto.request.SavingGoalTransactionRequest;
import com.example.AppQuanLiChiTieu.dto.response.ApiResponse;
import com.example.AppQuanLiChiTieu.dto.response.SavingGoalResponse;
import com.example.AppQuanLiChiTieu.dto.response.SavingGoalTransactionResponse;
import com.example.AppQuanLiChiTieu.service.SavingGoalService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/saving-goals")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class SavingGoalController {

    SavingGoalService savingGoalService;

    @GetMapping
    ApiResponse<List<SavingGoalResponse>> getAllGoals() {
        return ApiResponse.<List<SavingGoalResponse>>builder()
                .result(savingGoalService.getAllGoals()).build();
    }

    @GetMapping("/{id}")
    ApiResponse<SavingGoalResponse> getGoalById(@PathVariable Integer id) {
        return ApiResponse.<SavingGoalResponse>builder()
                .result(savingGoalService.getGoalById(id)).build();
    }

    @PostMapping
    ApiResponse<SavingGoalResponse> createGoal(@Valid @RequestBody SavingGoalRequest request) {
        return ApiResponse.<SavingGoalResponse>builder()
                .result(savingGoalService.createGoal(request)).build();
    }

    @PutMapping("/{id}")
    ApiResponse<SavingGoalResponse> updateGoal(@PathVariable Integer id, @Valid @RequestBody SavingGoalRequest request) {
        return ApiResponse.<SavingGoalResponse>builder()
                .result(savingGoalService.updateGoal(id, request)).build();
    }

    @DeleteMapping("/{id}")
    void deleteGoal(@PathVariable Integer id) {
        savingGoalService.deleteGoal(id);
    }

    @PostMapping("/{id}/deposit")
    ApiResponse<SavingGoalResponse> deposit(@PathVariable Integer id, @Valid @RequestBody SavingGoalTransactionRequest request) {
        return ApiResponse.<SavingGoalResponse>builder()
                .result(savingGoalService.deposit(id, request)).build();
    }

    @PostMapping("/{id}/withdraw")
    ApiResponse<SavingGoalResponse> withdraw(@PathVariable Integer id, @Valid @RequestBody SavingGoalTransactionRequest request) {
        return ApiResponse.<SavingGoalResponse>builder()
                .result(savingGoalService.withdraw(id, request)).build();
    }

    @GetMapping("/{id}/transactions")
    ApiResponse<List<SavingGoalTransactionResponse>> getGoalTransactions(@PathVariable Integer id) {
        return ApiResponse.<List<SavingGoalTransactionResponse>>builder()
                .result(savingGoalService.getGoalTransactions(id)).build();
    }
}
