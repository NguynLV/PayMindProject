package com.example.AppQuanLiChiTieu.service;

import com.example.AppQuanLiChiTieu.dto.request.GeminiRequest;
import com.example.AppQuanLiChiTieu.dto.response.GeminiResponse;
import com.example.AppQuanLiChiTieu.utils.GeminiClient;
import com.fasterxml.jackson.databind.ObjectMapper;
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
                        - For receipts/images: find "Tổng", "TOTAL", "Thanh toán", "Giá vé"; use item name as description
                        - If input is ambiguous (confidence < 0.7), still return best guess but set confidence low
                        """,
                now, yesterday, lastMonday, prevMonday,
                categoriesContext,
                now.getMonthValue(), now.getYear(),
                now.minusMonths(1).getMonthValue(), now.minusMonths(1).getYear(),
                now.getYear());
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

            log.info("Sending text to Gemini Flash...");

            GeminiResponse response = geminiClient.generateContent("v1beta", "gemini-2.5-flash", apiKey, request);
            return parseGeminiResponse(response);
        } catch (Exception e) {
            log.error("Error calling Gemini Text API: {}", e.getMessage());
            return Map.of("error", "AI Text Error: " + e.getMessage());
        }
    }

    public Map<String, Object> scanReceipt(String base64Data, String mimeType, List<String> categories) {
        try {
            // Remove header if present (e.g. "data:image/jpeg;base64,")
            String cleanData = base64Data;
            if (base64Data != null && base64Data.contains(",")) {
                cleanData = base64Data.split(",")[1];
            }

            GeminiRequest request = GeminiRequest.builder()
                    .contents(List.of(
                            GeminiRequest.Content.builder()
                                    .parts(List.of(
                                            GeminiRequest.Part.builder()
                                                    .text(getSystemPrompt(categories)
                                                            + "\nExtract data from this receipt image.")
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

            log.info("Sending receipt to Gemini Flash (size: {} chars)...", cleanData != null ? cleanData.length() : 0);

            GeminiResponse response = geminiClient.generateContent("v1beta", "gemini-2.5-flash", apiKey, request);
            return parseGeminiResponse(response);
        } catch (Exception e) {
            log.error("Error calling Gemini Flash API: {}", e.getMessage());
            return Map.of("error", "AI Receipt Error: " + e.getMessage());
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
            GeminiResponse response = geminiClient.generateContent("v1beta", "gemini-2.5-flash", apiKey, request);
            return parseGeminiResponse(response);
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
            GeminiResponse response = geminiClient.generateContent("v1beta", "gemini-2.5-flash", apiKey, request);

            String rawText = response.getCandidates().get(0).getContent().getParts().get(0).getText();
            String cleanJson = rawText.replaceAll("(?s)^.*?(\\[.*?\\]).*$", "$1").trim();

            List<Map<String, Object>> suggestions = objectMapper.readValue(cleanJson, List.class);
            return Map.of("suggestions", suggestions, "monthlyIncome", (long) totalIncome);
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
            GeminiResponse response = geminiClient.generateContent("v1beta", "gemini-2.5-flash", apiKey, request);
            return parseGeminiResponse(response);
        } catch (Exception e) {
            log.error("Spending pattern error: {}", e.getMessage());
            return Map.of("error", e.getMessage());
        }
    }
}
