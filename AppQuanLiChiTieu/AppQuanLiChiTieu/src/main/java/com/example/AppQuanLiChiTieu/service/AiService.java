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

import java.util.List;
import java.util.Map;

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
        java.time.LocalDate now = java.time.LocalDate.now();
        String categoriesContext = (userCategories != null && !userCategories.isEmpty())
                ? "Existing user categories: " + String.join(", ", userCategories) + ". ALWAYS prioritize these names."
                : "Common categories: Ăn uống, Di chuyển, Giải trí, Mua sắm, Lương.";

        return String.format(
                """
                        You are a smart financial assistant for a Vietnamese personal finance app.
                        Today is %s.
                        Your task is to parse the user's input (text or receipt image) into a structured JSON object.

                        %s

                        The JSON MUST follow this structure:
                        {
                            "intent": "TRANSACTION" | "REPORT",
                            "type": "INCOME" | "EXPENSE",
                            "amount": number,
                            "category": string (Priority: use an existing category name if it fits. If not, create a concise new one),
                            "description": string (brief summary, e.g., "Ăn sáng", "Vé xem phim CGV"),
                            "walletIntent": "CASH" | "BANK" | null,
                            "reportParams": {
                                "viewMode": "daily" | "monthly" | "yearly",
                                "day": number,
                                "month": number,
                                "year": number
                            }
                        }

                        Rules:
                        - If user asks for "tổng kết", "báo cáo", "chi tiêu", set intent to "REPORT".
                        - For relative dates like "hôm nay", "hôm qua", "thứ 2 vừa rồi", use the current date (%s) to calculate the correct day, month and year for "REPORT" intent. Use "daily" viewMode for specific days.
                        - For "tháng này", "tháng trước", use "monthly" viewMode.
                        - For Receipts/Tickets:
                            - Look for "TOTAL", "Tổng cộng", "Giá vé", "Thanh toán".
                            - For cinema tickets, prioritize a category like "Xem phim" if it exists. If not, use "Giải trí".
                            - Set description to the movie title or items bought.
                        - ALWAYS return valid JSON. Return ONLY the JSON object.
                        """,
                now, categoriesContext, now);
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
                            You are a smart financial advisor.
                            Analyze this monthly report data for Month %d, Year %d and provide 3-4 concise, actionable insights in Vietnamese.
                            Focus on:
                            - Highest expense category.
                            - Savings potential (Income vs Expense).
                            - Trends or anomalies.

                            Keep it friendly and professional.
                            Return ONLY a JSON object with this structure:
                            {
                                "insights": ["insight 1", "insight 2", "insight 3"]
                            }

                            Report Data:
                            %s
                            """,
                    month, year, reportJson);

            GeminiRequest request = GeminiRequest.builder()
                    .contents(List.of(
                            GeminiRequest.Content.builder()
                                    .parts(List.of(GeminiRequest.Part.builder().text(prompt).build()))
                                    .build()))
                    .generationConfig(GeminiRequest.GenerationConfig.builder()
                            .temperature(0.7)
                            .build())
                    .build();

            log.info("Requesting AI Report Insight...");
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
            // Filter to only expenses from the last 90 days
            java.time.Instant ninetyDaysAgo = java.time.Instant.now().minus(java.time.Duration.ofDays(90));

            // Group expenses by category
            Map<String, Double> expensesByCategory = transactions.stream()
                    .filter(t -> "EXPENSE".equalsIgnoreCase(t.getType()))
                    .filter(t -> t.getTransactionDate() != null && t.getTransactionDate().isAfter(ninetyDaysAgo))
                    .filter(t -> t.getCategory() != null)
                    .collect(java.util.stream.Collectors.groupingBy(
                            t -> t.getCategory().getName() + " (ID: " + t.getCategory().getId() + ")",
                            java.util.stream.Collectors.summingDouble(t -> t.getAmount().doubleValue())));

            // Prompt Gemini for budget advice
            String prompt = String.format(
                    """
                            You are a smart financial advisor. Suggest a realistic monthly budget for these categories based on 3 months of spending history:
                            %s

                            Rules:
                            1. If a category has high spending, suggest a slightly lower but realistic budget to encourage saving.
                            2. If spending is low, suggest a maintainable limit.
                            3. Return JSON array ONLY.

                            [
                              {
                                "categoryId": number,
                                "categoryName": "string",
                                "suggestedAmount": number (round to nearest 50,000 or 100,000 VND),
                                "reason": "Giải thích ngắn gọn tại sao gợi ý số này (tiếng Việt)"
                              }
                            ]
                            """,
                    expensesByCategory.toString());

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
            return Map.of("suggestions", suggestions);
        } catch (Exception e) {
            log.error("Budget suggestion error: {}", e.getMessage());
            return Map.of("error", e.getMessage());
        }
    }
}
