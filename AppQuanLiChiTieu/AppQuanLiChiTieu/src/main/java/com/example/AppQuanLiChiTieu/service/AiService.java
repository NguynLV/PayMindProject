package com.example.AppQuanLiChiTieu.service;

import com.example.AppQuanLiChiTieu.dto.request.GeminiRequest;
import com.example.AppQuanLiChiTieu.dto.response.GeminiResponse;
import com.example.AppQuanLiChiTieu.utils.GeminiClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import feign.FeignException;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AiService {

    final GeminiClient geminiClient;
    final ObjectMapper objectMapper;

    @Value("${gemini.api.key}")
    String apiKey;

    // Models in priority order — will try each one before giving up
    private static final String[] MODELS = {
            "gemini-2.5-flash",
            "gemini-2.0-flash-lite",
            "gemini-1.5-flash"
    };
    private static final int MAX_RETRIES = 2;
    private static final long BASE_DELAY_MS = 1000; // 1 second

    private String getSystemPrompt(List<String> userCategories) {
        LocalDate now = LocalDate.now();
        int dayOfWeek = now.getDayOfWeek().getValue(); // 1=Mon, 7=Sun
        LocalDate yesterday = now.minusDays(1);
        LocalDate lastMonday = now.minusDays(dayOfWeek - 1);
        LocalDate prevMonday = lastMonday.minusDays(7);

        String categoriesContext = (userCategories != null && !userCategories.isEmpty())
                ? "User's existing categories (ALWAYS use one of these if it fits): " + String.join(", ", userCategories)
                : "Default categories: Ăn uống, Di chuyển, Giải trí, Mua sắm, Sức khoẻ, Lương, Tiền thưởng, Đầu tư, Hóa đơn, Giáo dục";

        return String.format(
                """
                        You are a smart financial assistant embedded in a Vietnamese personal finance app called PayMind.
                        Today is %s (yyyy-MM-dd). Yesterday was %s.
                        Last Monday was %s. The Monday before that was %s.

                        %s

                        === CURRENCY UNIT RULES (CRITICAL) ===
                        - "k" or "K" = × 1,000  → "50k" = 50000, "200k" = 200000
                        - "tr", "triệu", "củ" = × 1,000,000 → "2tr" = 2000000, "15 triệu" = 15000000
                        - "đ", "đồng", "vnđ", "vnd" = exact value → "50000đ" = 50000
                        - Bare number with no unit: if < 1000, assume × 1000 (e.g. "50" → 50000); else use as-is

                        === WALLET DETECTION RULES ===
                        - "tiền mặt", "cash", "trả tiền mặt" → walletIntent: "CASH"
                        - "chuyển khoản", "banking", "atm", "thẻ", "momo", "zalopay", "vnpay", "ví điện tử", "grab pay" → walletIntent: "BANK"
                        - Not mentioned → walletIntent: null

                        === OUTPUT FORMAT ===
                        Return ONLY a valid JSON object. No markdown, no explanation.
                        {
                          "intent": "TRANSACTION" | "REPORT",
                          "type": "INCOME" | "EXPENSE",
                          "amount": number,
                          "category": "string (pick from user's categories list above; create short new one only if truly needed)",
                          "description": "string (concise: what was bought/received, e.g. 'Ăn sáng bún bò', 'Lương tháng 5', 'Vé xem phim Avengers')",
                          "walletIntent": "CASH" | "BANK" | null,
                          "confidence": 0.0-1.0,
                          "reportParams": {
                            "viewMode": "daily" | "monthly" | "yearly",
                            "day": number | null,
                            "month": number | null,
                            "year": number | null
                          }
                        }

                        === FEW-SHOT EXAMPLES ===
                        Input: "ăn sáng 35k"
                        Output: {"intent":"TRANSACTION","type":"EXPENSE","amount":35000,"category":"Ăn uống","description":"Ăn sáng","walletIntent":null,"confidence":0.95,"reportParams":null}

                        Input: "nhận lương tháng này 18tr chuyển khoản"
                        Output: {"intent":"TRANSACTION","type":"INCOME","amount":18000000,"category":"Lương","description":"Lương tháng 5","walletIntent":"BANK","confidence":0.98,"reportParams":null}

                        Input: "đổ xăng 80 tiền mặt"
                        Output: {"intent":"TRANSACTION","type":"EXPENSE","amount":80000,"category":"Di chuyển","description":"Đổ xăng","walletIntent":"CASH","confidence":0.92,"reportParams":null}

                        Input: "tháng này tôi chi bao nhiêu"
                        Output: {"intent":"REPORT","type":null,"amount":null,"category":null,"description":null,"walletIntent":null,"confidence":0.97,"reportParams":{"viewMode":"monthly","day":null,"month":%d,"year":%d}}

                        Input: "hôm qua ăn phở 60k momo"
                        Output: {"intent":"TRANSACTION","type":"EXPENSE","amount":60000,"category":"Ăn uống","description":"Ăn phở","walletIntent":"BANK","confidence":0.96,"reportParams":null}

                        Input: "cafe với bạn 2 ly 120k"
                        Output: {"intent":"TRANSACTION","type":"EXPENSE","amount":120000,"category":"Ăn uống","description":"Cafe với bạn","walletIntent":null,"confidence":0.90,"reportParams":null}

                        === SPECIAL RULES ===
                        - REPORT intent: use relative dates → "hôm nay"=today, "hôm qua"=yesterday, "thứ 2 vừa rồi"=last Monday
                        - For "tháng trước" → month=%d, year=%d; for "năm nay" → viewMode=yearly, year=%d
                        - For images: If it's a receipt, find "Tổng", "TOTAL", "Thanh toán". If it's a photo of an item/food/drink, identify it and infer category.
                        - If input is ambiguous (confidence < 0.7), still return best guess but set confidence low
                        """,
                now, yesterday, lastMonday, prevMonday,
                categoriesContext,
                now.getMonthValue(), now.getYear(),
                now.minusMonths(1).getMonthValue(), now.minusMonths(1).getYear(),
                now.getYear());
    }

    /**
     * Core method: call Gemini API with retry + cascading fallback through multiple models.
     * For each model: retries MAX_RETRIES times on 503/429, then moves to next model.
     * Models tried in order: gemini-2.5-flash → gemini-2.0-flash-lite → gemini-1.5-flash
     */
    private GeminiResponse callGeminiWithRetry(GeminiRequest request) {
        Exception lastException = null;

        for (int modelIdx = 0; modelIdx < MODELS.length; modelIdx++) {
            String model = MODELS[modelIdx];

            for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                try {
                    log.info("Calling Gemini model={} (attempt {}/{}, model {}/{})",
                            model, attempt, MAX_RETRIES, modelIdx + 1, MODELS.length);
                    return geminiClient.generateContent("v1beta", model, apiKey, request);
                } catch (FeignException e) {
                    int status = e.status();
                    lastException = e;
                    log.warn("Gemini API returned {} on model={} attempt {}/{}: {}",
                            status, model, attempt, MAX_RETRIES, e.contentUTF8());

                    if (status == 503 || status == 429) {
                        if (attempt < MAX_RETRIES) {
                            long delay = BASE_DELAY_MS * (1L << (attempt - 1)); // 1s, 2s
                            log.info("Retrying in {}ms...", delay);
                            try {
                                Thread.sleep(delay);
                            } catch (InterruptedException ie) {
                                Thread.currentThread().interrupt();
                                throw new RuntimeException("Interrupted during retry", ie);
                            }
                        } else {
                            // Retries exhausted for this model, move to next
                            log.warn("Model {} exhausted after {} retries, trying next model...",
                                    model, MAX_RETRIES);
                        }
                    } else {
                        // Non-retryable error (400, 403, etc.) — throw immediately
                        throw e;
                    }
                }
            }
        }

        // All models exhausted
        log.error("All {} Gemini models failed. Last error: {}",
                MODELS.length, lastException != null ? lastException.getMessage() : "unknown");
        if (lastException instanceof FeignException) {
            throw (FeignException) lastException;
        }
        throw new RuntimeException("All Gemini models unavailable", lastException);
    }

    /**
     * Classifies a FeignException into a user-friendly Vietnamese error message.
     */
    private Map<String, Object> handleGeminiError(FeignException e, String context) {
        int status = e.status();
        String responseBody = e.contentUTF8();
        log.error("Gemini {} error [HTTP {}]: {}", context, status, responseBody);

        if (status == 429) {
            if (responseBody != null && responseBody.contains("quota")) {
                return Map.of("error", "API Gemini đã hết quota miễn phí trong ngày. Vui lòng thử lại sau 1 phút hoặc liên hệ admin để nâng cấp API plan.");
            }
            return Map.of("error", "API Gemini đã đạt giới hạn request. Vui lòng thử lại sau 30 giây nhé!");
        }
        if (status == 403) {
            return Map.of("error", "API Key Gemini không có quyền truy cập. Vui lòng kiểm tra lại API Key.");
        }
        if (status == 400) {
            if (responseBody != null && responseBody.toLowerCase().contains("api_key")) {
                return Map.of("error", "API Key Gemini không hợp lệ. Vui lòng cập nhật API Key mới.");
            }
            return Map.of("error", "Dữ liệu gửi lên không hợp lệ. Vui lòng thử lại với ảnh/nội dung khác.");
        }
        if (status == 503) {
            return Map.of("error", "Tất cả model AI đang quá tải. Vui lòng thử lại sau vài phút!");
        }
        return Map.of("error", "Lỗi kết nối AI (HTTP " + status + "). Vui lòng thử lại sau.");
    }

    public Map<String, Object> processText(String text, List<String> categories) {
        try {
            GeminiRequest request = GeminiRequest.builder()
                    .contents(List.of(
                            GeminiRequest.Content.builder()
                                    .parts(List.of(
                                            GeminiRequest.Part.builder()
                                                    .text(getSystemPrompt(categories) + "\nUser input: " + text)
                                                    .build()))
                                    .build()))
                    .generationConfig(GeminiRequest.GenerationConfig.builder()
                            .temperature(0.1)
                            .build())
                    .build();

            log.info("Sending text to Gemini...");

            GeminiResponse response = callGeminiWithRetry(request);
            return parseGeminiResponse(response);
        } catch (FeignException e) {
            return handleGeminiError(e, "Text");
        } catch (Exception e) {
            log.error("Error calling Gemini Text API: {}", e.getMessage());
            return Map.of("error", "Đã có lỗi xảy ra khi kết nối với AI. Vui lòng thử lại sau.");
        }
    }

    public Map<String, Object> scanReceipt(String base64Data, String mimeType, List<String> categories) {
        // Input validation
        if (base64Data == null || base64Data.isBlank()) {
            return Map.of("error", "Không nhận được dữ liệu ảnh. Vui lòng chụp lại hoặc chọn ảnh khác.");
        }

        try {
            // Remove header if present (e.g. "data:image/jpeg;base64,")
            String cleanData = base64Data;
            if (base64Data.contains(",")) {
                cleanData = base64Data.split(",")[1];
            }

            // Check image size (Gemini limit ~20MB for inline data)
            if (cleanData.length() > 20_000_000) {
                return Map.of("error", "Ảnh quá lớn (>15MB). Vui lòng chụp lại với chất lượng thấp hơn.");
            }

            GeminiRequest request = GeminiRequest.builder()
                    .contents(List.of(
                            GeminiRequest.Content.builder()
                                    .parts(List.of(
                                            GeminiRequest.Part.builder()
                                                    .text(getSystemPrompt(categories)
                                                            + "\nAnalyze this image. If it is a receipt or bill, extract the total amount and use the main item/place as description. If it is a photo of food, a drink, or an object (e.g. a pizza, a cocktail), identify what it is, use it as the description, and infer the most appropriate category (e.g. 'Ăn uống', 'Giải trí'). If there's no price visible, you can leave amount as null or estimate a typical price in VND.")
                                                    .build(),
                                            GeminiRequest.Part.builder()
                                                    .inlineData(GeminiRequest.InlineData.builder()
                                                            .mimeType(mimeType != null ? mimeType : "image/jpeg")
                                                            .data(cleanData)
                                                            .build())
                                                    .build()))
                                    .build()))
                    .generationConfig(GeminiRequest.GenerationConfig.builder()
                            .temperature(0.1)
                            .build())
                    .build();

            log.info("Sending receipt to Gemini (size: {} chars)...", cleanData.length());

            GeminiResponse response = callGeminiWithRetry(request);
            return parseGeminiResponse(response);
        } catch (FeignException e) {
            return handleGeminiError(e, "Receipt Scan");
        } catch (Exception e) {
            log.error("Error calling Gemini Receipt API: {}", e.getMessage());
            return Map.of("error", "Không thể đọc hóa đơn lúc này. Vui lòng nhập tay hoặc thử lại sau.");
        }
    }

    public Map<String, Object> getAvailableModels() {
        try {
            return geminiClient.listModels(apiKey);
        } catch (Exception e) {
            log.error("Failed to list models: {}", e.getMessage());
            return Map.of("error", e.getMessage());
        }
    }

    private Map<String, Object> parseGeminiResponse(GeminiResponse response) {
        try {
            if (response != null && response.getCandidates() != null && !response.getCandidates().isEmpty()) {
                String jsonText = response.getCandidates().get(0).getContent().getParts().get(0).getText();
                log.info("Gemini Raw Response: {}", jsonText);

                // Strip markdown code blocks if present
                if (jsonText.contains("```")) {
                    jsonText = jsonText.replaceAll("```json|```", "").trim();
                    log.info("Cleaned JSON: {}", jsonText);
                }

                return objectMapper.readValue(jsonText, Map.class);
            }
        } catch (Exception e) {
            log.error("Failed to parse Gemini response: {}", e.getMessage());
        }
        return Map.of("error", "Failed to parse AI response structure");
    }

    public Map<String, Object> getReportInsight(Map<String, Object> reportData, int month, int year) {
        try {
            String reportJson = objectMapper.writeValueAsString(reportData);
            String prompt = String.format(
                    """
                            You are a smart, friendly personal financial advisor for Vietnamese users.
                            Analyze the monthly financial report below for Month %d/%d.

                            Report Data (JSON):
                            %s

                            Tasks:
                            1. Calculate savings rate = (totalIncome - totalExpense) / totalIncome * 100
                               - If savings rate < 10%%: warn the user urgently
                               - If 10-20%%: encourage improvement
                               - If > 20%%: praise the user
                            2. Identify the TOP expense category and its %% of total spending
                            3. Flag any category consuming > 40%% of total income as a WARNING
                            4. Suggest ONE specific, actionable saving tip relevant to the data
                            5. Suggest a realistic savings target for next month

                            Tone: friendly, encouraging, use Vietnamese. Use emoji sparingly (1-2 max).

                            Return ONLY this JSON:
                            {
                              "savingsRate": number,
                              "savingsStatus": "GREAT" | "OK" | "WARNING" | "CRITICAL",
                              "insights": [
                                "insight text 1 (tiếng Việt, cụ thể, có số liệu)",
                                "insight text 2",
                                "insight text 3"
                              ],
                              "warnings": ["warning 1 nếu có"],
                              "savingTip": "Một mẹo tiết kiệm cụ thể cho tháng sau",
                              "nextMonthTarget": number
                            }
                            """,
                    month, year, reportJson);

            GeminiRequest request = GeminiRequest.builder()
                    .contents(List.of(
                            GeminiRequest.Content.builder()
                                    .parts(List.of(GeminiRequest.Part.builder().text(prompt).build()))
                                    .build()))
                    .generationConfig(GeminiRequest.GenerationConfig.builder()
                            .temperature(0.4)
                            .build())
                    .build();

            log.info("Requesting AI Report Insight for {}/{}", month, year);
            GeminiResponse response = callGeminiWithRetry(request);
            return parseGeminiResponse(response);
        } catch (FeignException e) {
            return handleGeminiError(e, "Report Insight");
        } catch (Exception e) {
            log.error("AI Insight Error: {}", e.getMessage());
            return Map.of("error", "AI Insight Error: " + e.getMessage());
        }
    }

    public Map<String, Object> suggestBudget(
            List<com.example.AppQuanLiChiTieu.dto.response.TransactionResponse> transactions) {
        try {
            java.time.Instant ninetyDaysAgo = java.time.Instant.now().minus(java.time.Duration.ofDays(90));

            // Calculate total income for 50/30/20 reference
            double totalIncome = transactions.stream()
                    .filter(t -> "INCOME".equalsIgnoreCase(t.getType()))
                    .filter(t -> t.getTransactionDate() != null && t.getTransactionDate().isAfter(ninetyDaysAgo))
                    .mapToDouble(t -> t.getAmount().doubleValue())
                    .sum() / 3; // average monthly income

            // Group expenses by category with average monthly spending
            Map<String, Double> expensesByCategory = transactions.stream()
                    .filter(t -> "EXPENSE".equalsIgnoreCase(t.getType()))
                    .filter(t -> t.getTransactionDate() != null && t.getTransactionDate().isAfter(ninetyDaysAgo))
                    .filter(t -> t.getCategory() != null)
                    .collect(Collectors.groupingBy(
                            t -> t.getCategory().getName() + "||" + t.getCategory().getId(),
                            Collectors.summingDouble(t -> t.getAmount().doubleValue())))
                    .entrySet().stream()
                    .collect(Collectors.toMap(
                            Map.Entry::getKey,
                            e -> e.getValue() / 3, // avg per month
                            (a, b) -> a,
                            LinkedHashMap::new));

            String prompt = String.format(
                    """
                            You are a Vietnamese personal finance advisor.
                            Based on 3 months of spending data, suggest a realistic monthly budget.

                            Average monthly income (last 3 months): %,.0f VND

                            Average monthly spending by category (last 3 months):
                            %s

                            Apply the 50/30/20 rule as a guideline:
                            - 50%% of income for NEEDS (food, rent, utilities, transport, health)
                            - 30%% for WANTS (entertainment, dining out, shopping)
                            - 20%% for SAVINGS

                            Rules:
                            1. Round suggested amounts to nearest 50,000 VND
                            2. If a category exceeds its ideal %%%%, suggest a reduction of 10-20%%
                            3. If spending is already lean, suggest a small buffer (+5-10%%)
                            4. Write 'reason' in friendly Vietnamese (max 15 words)
                            5. Assign 'priority': "HIGH" for needs, "MEDIUM" for regular wants, "LOW" for discretionary

                            Return JSON array ONLY, no markdown:
                            [
                              {
                                "categoryId": number,
                                "categoryName": "string",
                                "currentAverage": number,
                                "suggestedAmount": number,
                                "reason": "Giải thích ngắn gọn (tiếng Việt)",
                                "priority": "HIGH" | "MEDIUM" | "LOW"
                              }
                            ]
                            """,
                    totalIncome, expensesByCategory.toString());

            GeminiRequest request = GeminiRequest.builder()
                    .contents(List.of(
                            GeminiRequest.Content.builder()
                                    .parts(List.of(GeminiRequest.Part.builder().text(prompt).build()))
                                    .build()))
                    .generationConfig(GeminiRequest.GenerationConfig.builder()
                            .temperature(0.2)
                            .build())
                    .build();

            log.info("Requesting AI Budget Suggestion...");
            GeminiResponse response = callGeminiWithRetry(request);

            String rawText = response.getCandidates().get(0).getContent().getParts().get(0).getText();
            String cleanJson = rawText.replaceAll("(?s)^.*?(\\[.*?\\]).*$", "$1").trim();

            List<Map<String, Object>> suggestions = objectMapper.readValue(cleanJson, List.class);
            return Map.of("suggestions", suggestions, "monthlyIncome", (long) totalIncome);
        } catch (FeignException e) {
            return handleGeminiError(e, "Budget Suggestion");
        } catch (Exception e) {
            log.error("Budget suggestion error: {}", e.getMessage());
            return Map.of("error", e.getMessage());
        }
    }

    public Map<String, Object> analyzeSpendingPattern(
            List<com.example.AppQuanLiChiTieu.dto.response.TransactionResponse> transactions) {
        try {
            java.time.Instant ninetyDaysAgo = java.time.Instant.now().minus(java.time.Duration.ofDays(90));

            // Group expenses by day of week
            Map<String, Double> byDayOfWeek = transactions.stream()
                    .filter(t -> "EXPENSE".equalsIgnoreCase(t.getType()))
                    .filter(t -> t.getTransactionDate() != null && t.getTransactionDate().isAfter(ninetyDaysAgo))
                    .collect(Collectors.groupingBy(
                            t -> {
                                java.time.DayOfWeek dow = java.time.LocalDateTime
                                        .ofInstant(t.getTransactionDate(), java.time.ZoneId.of("Asia/Ho_Chi_Minh"))
                                        .getDayOfWeek();
                                return dow.getDisplayName(java.time.format.TextStyle.FULL,
                                        new java.util.Locale("vi", "VN"));
                            },
                            Collectors.summingDouble(t -> t.getAmount().doubleValue())));

            // Group expenses by category
            Map<String, Double> byCategory = transactions.stream()
                    .filter(t -> "EXPENSE".equalsIgnoreCase(t.getType()))
                    .filter(t -> t.getTransactionDate() != null && t.getTransactionDate().isAfter(ninetyDaysAgo))
                    .filter(t -> t.getCategory() != null)
                    .collect(Collectors.groupingBy(
                            t -> t.getCategory().getName(),
                            Collectors.summingDouble(t -> t.getAmount().doubleValue())));

            String prompt = String.format(
                    """
                            You are a Vietnamese personal finance analyst.
                            Analyze these 3-month spending patterns and provide personalized insights.

                            Spending by Day of Week (total VND over 3 months):
                            %s

                            Spending by Category (total VND over 3 months):
                            %s

                            Tasks:
                            1. Identify the BUSIEST spending day(s) and explain why (weekend effect, etc.)
                            2. Identify the HIGHEST spending category and check if it is proportional
                            3. Provide 3 personalized, specific tips to improve based on this actual data

                            Rules:
                            - Be specific with numbers ("Thứ 6 bạn chi trung bình X đ/tuần")
                            - Tips must be actionable, not generic
                            - Write everything in friendly Vietnamese

                            Return ONLY this JSON:
                            {
                              "busiestDay": "tên ngày",
                              "busiestDayAmount": number,
                              "topCategory": "tên danh mục",
                              "topCategoryAmount": number,
                              "patterns": ["nhận xét pattern 1", "nhận xét pattern 2"],
                              "tips": ["mẹo cụ thể 1", "mẹo cụ thể 2", "mẹo cụ thể 3"]
                            }
                            """,
                    byDayOfWeek, byCategory);

            GeminiRequest request = GeminiRequest.builder()
                    .contents(List.of(
                            GeminiRequest.Content.builder()
                                    .parts(List.of(GeminiRequest.Part.builder().text(prompt).build()))
                                    .build()))
                    .generationConfig(GeminiRequest.GenerationConfig.builder()
                            .temperature(0.5)
                            .build())
                    .build();

            log.info("Requesting AI Spending Pattern Analysis...");
            GeminiResponse response = callGeminiWithRetry(request);
            return parseGeminiResponse(response);
        } catch (FeignException e) {
            return handleGeminiError(e, "Spending Pattern");
        } catch (Exception e) {
            log.error("Spending pattern error: {}", e.getMessage());
            return Map.of("error", e.getMessage());
        }
    }
}
