import { CategoryResponse } from '../services/category.service';

export interface ParsedVoiceTransaction {
    intent: 'TRANSACTION' | 'REPORT';
    type: 'INCOME' | 'EXPENSE' | null;
    amount: number | null;
    categoryId: number | null;
    categoryName: string | null;
    suggestedCategoryName: string | null;
    description: string;
    walletIntent: 'CASH' | 'BANK' | null;
    reportParams?: {
        viewMode: 'monthly' | 'yearly';
        month: number;
        year: number;
    };
}

/**
 * Parse Vietnamese voice input to extract transaction data.
 *
 * Examples:
 *  - "chi 50 nghìn ăn uống"       → EXPENSE, 50000, category "Ăn uống"
 *  - "thu 2 triệu tiền lương"     → INCOME, 2000000, category "Lương"
 *  - "100k cafe"                   → EXPENSE, 100000, description "cafe"
 *  - "chi tiêu 30 ngàn trà sữa"   → EXPENSE, 30000, description "trà sữa"
 */
export function parseVoiceTransaction(
    text: string,
    categories: CategoryResponse[]
): ParsedVoiceTransaction {
    const result: ParsedVoiceTransaction = {
        intent: 'TRANSACTION',
        type: null,
        amount: null,
        categoryId: null,
        categoryName: null,
        suggestedCategoryName: null,
        description: '',
        walletIntent: null,
    };

    if (!text || text.trim().length === 0) return result;

    let working = text.trim().toLowerCase();

    // Word boundary helper for Vietnamese
    const vnBoundary = (pattern: string) => `(^|\\s|[.,!?;])${pattern}($|\\s|[.,!?;])`;

    // ── 0. Detect Global Intent (Report vs Transaction) ──────────────────
    const reportKeywords = '(báo cáo|thống kê|xem chi tiêu|xem thu nhập|xem tình hình|tổng kết)';
    const reportRegex = new RegExp(vnBoundary(reportKeywords), 'i');

    if (reportRegex.test(working)) {
        result.intent = 'REPORT';
        // Default to current month/year
        const now = new Date();
        result.reportParams = {
            viewMode: 'monthly',
            month: now.getMonth() + 1,
            year: now.getFullYear(),
        };

        // Detect Yearly
        if (/\b(năm nay|cả năm|trong năm)\b/i.test(working)) {
            result.reportParams.viewMode = 'yearly';
        } else {
            const yearMatch = working.match(/\bnăm\s+(\d{4})\b/i);
            if (yearMatch) {
                result.reportParams.viewMode = 'yearly';
                result.reportParams.year = parseInt(yearMatch[1]);
            }
        }

        // Detect Monthly specifically
        const monthMatch = working.match(/\btháng\s+(\d{1,2})\b/i);
        if (monthMatch) {
            result.reportParams.viewMode = 'monthly';
            result.reportParams.month = parseInt(monthMatch[1]);
            // Also check for year in same sentence if monthly
            const yearMatchInMonth = working.match(/\bnăm\s+(\d{4})\b/i);
            if (yearMatchInMonth) result.reportParams.year = parseInt(yearMatchInMonth[1]);
        }
        
        // Detect "tháng trước"
        if (/\btháng trước\b/i.test(working)) {
            result.reportParams.viewMode = 'monthly';
            if (result.reportParams.month === 1) {
                result.reportParams.month = 12;
                result.reportParams.year -= 1;
            } else {
                result.reportParams.month -= 1;
            }
        }

        return result; // Exit early for report intent
    }
    
    const incomeKeywords = '(thu nhập|thu|tiền vào|nhận|lương|thưởng|được|tặng|biếu|lãi|lời|trúng|cộng)';
    const expenseKeywords = '(chi tiêu|chi|tiêu|trả|mua|thanh toán|hết|mất|ăn|uống|cafe|đi|trừ|nộp|đóng)';

    const incomeRegex = new RegExp(vnBoundary(incomeKeywords), 'i');
    const expenseRegex = new RegExp(vnBoundary(expenseKeywords), 'i');

    const hasIncome = incomeRegex.test(working);
    const hasExpense = expenseRegex.test(working);

    if (hasExpense && hasIncome) {
        // Nếu có cả hai, ưu tiên từ khoá xuất hiện đầu tiên
        const incomeMatch = working.match(incomeRegex);
        const expenseMatch = working.match(expenseRegex);
        
        if (expenseMatch && working.indexOf(expenseMatch[0]) < working.indexOf(incomeMatch![0])) {
            result.type = 'EXPENSE';
        } else {
            result.type = 'INCOME';
        }
    } else if (hasIncome) {
        result.type = 'INCOME';
    } else if (hasExpense) {
        result.type = 'EXPENSE';
    } else {
        result.type = 'EXPENSE'; // Default
    }

    // KHÔNG xoá keywords ở đây nữa để tránh xoá nhầm tên danh mục (VD: Lương, Thưởng)
    // Chỉ loại bỏ các từ mang tính "hành động" thuần tuý ở bước sau

    // ── 2. Pre-process Vietnamese number words ───────────────────────────
    const numberMap: { [key: string]: string } = {
        'không': '0', 'một': '1', 'hai': '2', 'ba': '3', 'bốn': '4', 
        'năm': '5', 'sáu': '6', 'bảy': '7', 'tám': '8', 'chín': '9',
        'mười': '10', 'trăm': '100', 'nghìn': 'nghìn', 'ngàn': 'ngàn',
        'triệu': 'triệu', 'tỉ': 'tỉ', 'tỷ': 'tỷ'
    };

    // Simple replacement for basic number words to help regex
    // We target common patterns like "một triệu", "hai mươi", "năm trăm"
    let amountText = working;
    
    // Handle "mười" -> 10, "mươi" -> 0
    amountText = amountText.replace(new RegExp(vnBoundary('mười'), 'gi'), '$110$2');
    amountText = amountText.replace(new RegExp(vnBoundary('mươi'), 'gi'), '$10$2');
    amountText = amountText.replace(new RegExp(vnBoundary('trăm'), 'gi'), '$100$2');

    // Replace basic digits spoken as words
    Object.keys(numberMap).forEach(word => {
        if (['nghìn', 'ngàn', 'triệu', 'tỉ', 'tỷ', 'mười', 'mươi', 'trăm'].includes(word)) return;
        const reg = new RegExp(vnBoundary(word), 'gi');
        amountText = amountText.replace(reg, `$1${numberMap[word]}$2`);
    });

    // Cleanup compounded digits (e.g., "1 00" -> "100", "2 10" -> "20")
    // Note: This is a heuristic approach for common spoken patterns
    // We handle the extra spaces captured by our boundary helper
    amountText = amountText.replace(/(\d)\s+(00|10|0)\b/g, '$1$2');

    // Handle "chục" -> "2 chục" = 20
    amountText = amountText.replace(/(\d+)\s*chục/g, '$10');
    
    // Handle "rưỡi" -> "1 triệu rưỡi" = 1.5 triệu, "trăm rưỡi" = 150
    const rưỡiPattern = /(\d+[\.,]?\d*)\s*(triệu|tr|ngàn|nghìn|k|00)?\s*rưỡi/i;
    const rưỡiMatch = amountText.match(rưỡiPattern);
    if (rưỡiMatch) {
        let val = parseFloat(rưỡiMatch[1].replace(',', '.'));
        const unit = rưỡiMatch[2]?.toLowerCase() || '';
        
        if (unit === '00') {
            // "100 rưỡi" (from "một trăm rưỡi")
            amountText = amountText.replace(rưỡiMatch[0], `${val}50`);
        } else {
            val += 0.5;
            amountText = amountText.replace(rưỡiMatch[0], `${val} ${unit}`);
        }
    }

    const amountPatterns = [
        { regex: /(\d+[\.,]?\d*)\s*(triệu|tr)\b/i, mult: 1_000_000 },
        { regex: /(\d+[\.,]?\d*)\s*(nghìn|ngàn|nghin|ngan|k)\b/i, mult: 1_000 },
        { regex: /\b(\d{1,3}(?:\.\d{3})+)\b/, mult: 1 }, 
        { regex: /\b(\d{4,})\b/, mult: 1 },
        { regex: /\b(\d+)\s*(?:đồng|đ|d)\b/i, mult: 1 },
        { regex: /\b(\d+)\b/, mult: 1 }
    ];

    for (const p of amountPatterns) {
        // We use amountText for matching but MUST remove from original 'working'
        const match = amountText.match(p.regex);
        if (match) {
            let num = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
            
            if (p.mult === 1000 && num >= 1000) {
                 result.amount = Math.round(num);
            } else {
                result.amount = Math.round(num * p.mult);
            }
            
            // To remove from 'working', we need to find what phrase in 'working' 
            // corresponds to the 'match' in 'amountText'. 
            // Since we did controlled replacements, we can try to find the amount phrase.
            // For simplicity, we remove common number-related words in working around where the number was found.
            const quantityWords = '(một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười|triệu|nghìn|ngàn|tr|k|rưỡi|chục|trăm|mươi)';
            working = working.replace(new RegExp(vnBoundary(quantityWords), 'gi'), '$1 $2').trim();
            // Also remove any literal digits found
            working = working.replace(new RegExp(match[1].split('.')[0], 'gi'), '').trim();
            break;
        }
    }

    // ── 2.5 Detect Wallet Intent ───────────────────────────────────────
    const bankKeywords = /\b(chuyển khoản|bank|ngân hàng|thẻ|atm|ck)\b/i;
    const cashKeywords = /\b(tiền mặt|tiền tươi|túi)\b/i;

    if (bankKeywords.test(working)) {
        result.walletIntent = 'BANK';
        working = working.replace(bankKeywords, '').trim();
    } else if (cashKeywords.test(working)) {
        result.walletIntent = 'CASH';
        working = working.replace(cashKeywords, '').trim();
    }

    // ── 3. Match category ───────────────────────────────────────────────
    // Bước này cần loại bỏ số tiền đã nhận diện và các từ đệm vô nghĩa
    // Giữ lại các danh từ, động từ chỉ nội dung (cha, cho, lương, cafe...)
    const fillerWordsArr = ['tôi', 'vừa', 'mới', 'được', 'biết', 'xong', 'là', 'tại', 'với', 'để', 'cái', 'chiếc', 'mình', 'khoản', 'số tiền', 'tiền', 'cho'];
    const quantityWordsArr = ['một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín', 'mười', 'triệu', 'nghìn', 'ngàn', 'tr', 'k', 'rưỡi', 'chục', 'trăm', 'mươi'];
    
    // Helper to filter words
    const filterMeaningfulWords = (text: string) => {
        return text.split(/\s+/).filter(w => {
            const low = w.toLowerCase();
            return !fillerWordsArr.includes(low) && !quantityWordsArr.includes(low) && low.length > 0;
        });
    };

    // For better regex stripping (filler only)
    const fillerWordsRegex = new RegExp(vnBoundary('(tôi|vừa|mới|biết|xong|là|tại|với|để|cái|chiếc|mình|khoản|số tiền|tiền)'), 'gi');
    working = working.replace(fillerWordsRegex, '$1 $2').replace(/\s+/g, ' ').trim();

    if (working.length > 0 && categories.length > 0) {
        let bestMatch: CategoryResponse | null = null;
        let bestMatchLength = 0;

        // 1. Try exact or substring match (Higher priority)
        // We ensure it's a whole word match or at least a significant portion
        for (const cat of categories) {
            const catNameLower = cat.name.toLowerCase();
            // Use special boundary regex
            const catRegex = new RegExp(vnBoundary(catNameLower), 'i');
            if (catRegex.test(working) && catNameLower.length > bestMatchLength) {
                bestMatch = cat;
                bestMatchLength = catNameLower.length;
            }
        }

        // 2. Only if no whole-word match, try partial word match with safety
        if (!bestMatch) {
            const words = working.split(/\s+/).filter(w => w.length >= 2);
            for (const word of words) {
                // Skip common verbs or short prepositions (additional safety)
                if (['đi', 'hết', 'mất', 'tại', 'vào', 'cho', 'cái', 'xe', 'tiền', 'được', 'cha', 'mẹ', 'bố'].includes(word)) continue;
                
                for (const cat of categories) {
                    const catNameLower = cat.name.toLowerCase();
                    // Don't match generic words if category name is long (avoid 'cho' matching 'được mẹ cho')
                    if (catNameLower.length > 5 && ['cho', 'được', 'thu', 'chi'].includes(word)) continue;
                    
                    const wordRegex = new RegExp(vnBoundary(word), 'i');
                    if (wordRegex.test(catNameLower)) {
                        if (!bestMatch || cat.name.length < bestMatch.name.length) {
                             bestMatch = cat;
                        }
                    }
                }
            }
        }

        if (bestMatch) {
            result.categoryId = bestMatch.id;
            result.categoryName = bestMatch.name;
            // Remove matched words from description
            const matchRegex = new RegExp(vnBoundary(bestMatch.name.toLowerCase()), 'gi');
            working = working.replace(matchRegex, '$1 $2').trim();
        } else {
            // No category matched, suggest new one
            // Use the list-based filter to get really meaningful words
            const words = filterMeaningfulWords(working);
            
            if (words.length > 0) {
                // Take up to 3 words as suggested category name
                let suggestion = words.slice(0, 3).join(' ');
                
                result.suggestedCategoryName = suggestion;
                working = working.replace(new RegExp(vnBoundary(result.suggestedCategoryName), 'gi'), '$1 $2').trim();
            }
        }
    }

    // ── 4. Description ──────────────────────────────────────────────────
    const desc = working
        .replace(/\s+/g, ' ')
        .trim();
    if (desc.length > 0) {
        result.description = desc.charAt(0).toUpperCase() + desc.slice(1);
    }

    return result;
}
