package com.kintai.util;

import org.springframework.stereotype.Component;
import java.util.regex.Pattern;

/**
 * パスワード強度チェック用バリデーター
 */
@Component
public class PasswordValidator {
    
    // パスワードポリシー定数
    private static final int MIN_LENGTH = 8;
    private static final int MAX_LENGTH = 20;
    private static final int MAX_CONSECUTIVE_CHARS = 2; // 連続する同一文字の最大数（3文字以上禁止なので2文字まで）
    
    // 正規表現パターン
    private static final Pattern UPPERCASE_PATTERN = Pattern.compile("[A-Z]");
    private static final Pattern LOWERCASE_PATTERN = Pattern.compile("[a-z]");
    private static final Pattern DIGIT_PATTERN = Pattern.compile("[0-9]");
    private static final Pattern SYMBOL_PATTERN = Pattern.compile("[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?]");
    
    /**
     * パスワードの強度を検証
     * @param password 検証するパスワード
     * @param employeeCode 社員コード（重複チェック用）
     * @return 検証結果
     */
    public PasswordValidationResult validate(String password, String employeeCode) {
        if (password == null || password.isEmpty()) {
            return new PasswordValidationResult(false, "パスワードは必須です。");
        }
        
        // 長さチェック
        if (password.length() < MIN_LENGTH || password.length() > MAX_LENGTH) {
            return new PasswordValidationResult(false, 
                String.format("パスワードは%d文字以上%d文字以下で入力してください。", MIN_LENGTH, MAX_LENGTH));
        }
        
        // 大文字チェック
        if (!UPPERCASE_PATTERN.matcher(password).find()) {
            return new PasswordValidationResult(false, "パスワードには大文字を1文字以上含めてください。");
        }
        
        // 小文字チェック
        if (!LOWERCASE_PATTERN.matcher(password).find()) {
            return new PasswordValidationResult(false, "パスワードには小文字を1文字以上含めてください。");
        }
        
        // 数字チェック
        if (!DIGIT_PATTERN.matcher(password).find()) {
            return new PasswordValidationResult(false, "パスワードには数字を1文字以上含めてください。");
        }
        
        // 記号チェック
        if (!SYMBOL_PATTERN.matcher(password).find()) {
            return new PasswordValidationResult(false, "パスワードには記号を1文字以上含めてください。");
        }
        
        // 連続する同一文字チェック
        if (hasConsecutiveChars(password)) {
            return new PasswordValidationResult(false, "連続する同一文字は3文字以上使用できません。");
        }
        
        // 社員IDとの重複チェック
        if (employeeCode != null && !employeeCode.isEmpty() && password.equals(employeeCode)) {
            return new PasswordValidationResult(false, "パスワードに社員IDと同じ文字列は使用できません。");
        }
        
        return new PasswordValidationResult(true, "パスワードは有効です。");
    }
    
    /**
     * 連続する同一文字が3文字以上あるかチェック
     * @param password チェックするパスワード
     * @return 連続する同一文字が3文字以上ある場合true
     */
    private boolean hasConsecutiveChars(String password) {
        int consecutiveCount = 1;
        char previousChar = password.charAt(0);
        
        for (int i = 1; i < password.length(); i++) {
            char currentChar = password.charAt(i);
            if (currentChar == previousChar) {
                consecutiveCount++;
                if (consecutiveCount > MAX_CONSECUTIVE_CHARS) {
                    return true;
                }
            } else {
                consecutiveCount = 1;
                previousChar = currentChar;
            }
        }
        
        return false;
    }
    
    /**
     * パスワード検証結果を保持するクラス
     */
    public static class PasswordValidationResult {
        private final boolean valid;
        private final String message;
        
        public PasswordValidationResult(boolean valid, String message) {
            this.valid = valid;
            this.message = message;
        }
        
        public boolean isValid() {
            return valid;
        }
        
        public String getMessage() {
            return message;
        }
    }
}
