package com.kintai.util;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import static org.junit.jupiter.api.Assertions.*;

/**
 * PasswordValidatorのテストクラス
 */
public class PasswordValidatorTest {
    
    private PasswordValidator passwordValidator;
    
    @BeforeEach
    void setUp() {
        passwordValidator = new PasswordValidator();
    }
    
    @Test
    @DisplayName("有効なパスワード - Test123! は検証に成功する")
    void testValidPassword_Test123() {
        // Given
        String password = "Test123!";
        String employeeCode = "E001";
        
        // When
        PasswordValidator.PasswordValidationResult result = passwordValidator.validate(password, employeeCode);
        
        // Then
        assertTrue(result.isValid());
        assertEquals("パスワードは有効です。", result.getMessage());
    }
    
    @Test
    @DisplayName("無効なパスワード - password（大文字数字記号なし）は検証に失敗する")
    void testInvalidPassword_password() {
        // Given
        String password = "password";
        String employeeCode = "E001";
        
        // When
        PasswordValidator.PasswordValidationResult result = passwordValidator.validate(password, employeeCode);
        
        // Then
        assertFalse(result.isValid());
        assertTrue(result.getMessage().contains("大文字") || 
                  result.getMessage().contains("数字") || 
                  result.getMessage().contains("記号"));
    }
    
    @Test
    @DisplayName("無効なパスワード - AAAaaa111!!!（連続文字あり）は検証に失敗する")
    void testInvalidPassword_ConsecutiveChars() {
        // Given
        String password = "AAAaaa111!!!";
        String employeeCode = "E001";
        
        // When
        PasswordValidator.PasswordValidationResult result = passwordValidator.validate(password, employeeCode);
        
        // Then
        assertFalse(result.isValid());
        assertTrue(result.getMessage().contains("連続する同一文字"));
    }
    
    @Test
    @DisplayName("無効なパスワード - E001（社員IDと同じ）は検証に失敗する")
    void testInvalidPassword_SameAsEmployeeCode() {
        // Given
        String password = "E001";
        String employeeCode = "E001";
        
        // When
        PasswordValidator.PasswordValidationResult result = passwordValidator.validate(password, employeeCode);
        
        // Then
        assertFalse(result.isValid());
        // 社員IDが短すぎるため、長さチェックで先に失敗する可能性がある
        assertTrue(result.getMessage().contains("社員IDと同じ文字列") || 
                  result.getMessage().contains("8文字以上"));
    }
    
    @Test
    @DisplayName("無効なパスワード - 長い社員IDと同じパスワードは検証に失敗する")
    void testInvalidPassword_SameAsLongEmployeeCode() {
        // Given
        String password = "Employee001!";
        String employeeCode = "Employee001!";
        
        // When
        PasswordValidator.PasswordValidationResult result = passwordValidator.validate(password, employeeCode);
        
        // Then
        assertFalse(result.isValid());
        assertTrue(result.getMessage().contains("社員IDと同じ文字列"));
    }
    
    @Test
    @DisplayName("無効なパスワード - 空文字は検証に失敗する")
    void testInvalidPassword_Empty() {
        // Given
        String password = "";
        String employeeCode = "E001";
        
        // When
        PasswordValidator.PasswordValidationResult result = passwordValidator.validate(password, employeeCode);
        
        // Then
        assertFalse(result.isValid());
        assertEquals("パスワードは必須です。", result.getMessage());
    }
    
    @Test
    @DisplayName("無効なパスワード - nullは検証に失敗する")
    void testInvalidPassword_Null() {
        // Given
        String password = null;
        String employeeCode = "E001";
        
        // When
        PasswordValidator.PasswordValidationResult result = passwordValidator.validate(password, employeeCode);
        
        // Then
        assertFalse(result.isValid());
        assertEquals("パスワードは必須です。", result.getMessage());
    }
    
    @Test
    @DisplayName("無効なパスワード - 短すぎる（7文字）は検証に失敗する")
    void testInvalidPassword_TooShort() {
        // Given
        String password = "Test1!";
        String employeeCode = "E001";
        
        // When
        PasswordValidator.PasswordValidationResult result = passwordValidator.validate(password, employeeCode);
        
        // Then
        assertFalse(result.isValid());
        assertTrue(result.getMessage().contains("8文字以上"));
    }
    
    @Test
    @DisplayName("無効なパスワード - 長すぎる（21文字）は検証に失敗する")
    void testInvalidPassword_TooLong() {
        // Given
        String password = "Test123!Test123!Test1";
        String employeeCode = "E001";
        
        // When
        PasswordValidator.PasswordValidationResult result = passwordValidator.validate(password, employeeCode);
        
        // Then
        assertFalse(result.isValid());
        assertTrue(result.getMessage().contains("20文字以下"));
    }
    
    @Test
    @DisplayName("無効なパスワード - 大文字なしは検証に失敗する")
    void testInvalidPassword_NoUppercase() {
        // Given
        String password = "test123!";
        String employeeCode = "E001";
        
        // When
        PasswordValidator.PasswordValidationResult result = passwordValidator.validate(password, employeeCode);
        
        // Then
        assertFalse(result.isValid());
        assertTrue(result.getMessage().contains("大文字"));
    }
    
    @Test
    @DisplayName("無効なパスワード - 小文字なしは検証に失敗する")
    void testInvalidPassword_NoLowercase() {
        // Given
        String password = "TEST123!";
        String employeeCode = "E001";
        
        // When
        PasswordValidator.PasswordValidationResult result = passwordValidator.validate(password, employeeCode);
        
        // Then
        assertFalse(result.isValid());
        assertTrue(result.getMessage().contains("小文字"));
    }
    
    @Test
    @DisplayName("無効なパスワード - 数字なしは検証に失敗する")
    void testInvalidPassword_NoDigit() {
        // Given
        String password = "TestABC!";
        String employeeCode = "E001";
        
        // When
        PasswordValidator.PasswordValidationResult result = passwordValidator.validate(password, employeeCode);
        
        // Then
        assertFalse(result.isValid());
        assertTrue(result.getMessage().contains("数字"));
    }
    
    @Test
    @DisplayName("無効なパスワード - 記号なしは検証に失敗する")
    void testInvalidPassword_NoSymbol() {
        // Given
        String password = "Test1234";
        String employeeCode = "E001";
        
        // When
        PasswordValidator.PasswordValidationResult result = passwordValidator.validate(password, employeeCode);
        
        // Then
        assertFalse(result.isValid());
        assertTrue(result.getMessage().contains("記号"));
    }
    
    @Test
    @DisplayName("有効なパスワード - 社員コードがnullでも検証に成功する")
    void testValidPassword_NullEmployeeCode() {
        // Given
        String password = "Test123!";
        String employeeCode = null;
        
        // When
        PasswordValidator.PasswordValidationResult result = passwordValidator.validate(password, employeeCode);
        
        // Then
        assertTrue(result.isValid());
        assertEquals("パスワードは有効です。", result.getMessage());
    }
    
    @Test
    @DisplayName("有効なパスワード - 社員コードが空文字でも検証に成功する")
    void testValidPassword_EmptyEmployeeCode() {
        // Given
        String password = "Test123!";
        String employeeCode = "";
        
        // When
        PasswordValidator.PasswordValidationResult result = passwordValidator.validate(password, employeeCode);
        
        // Then
        assertTrue(result.isValid());
        assertEquals("パスワードは有効です。", result.getMessage());
    }
    
    @Test
    @DisplayName("有効なパスワード - 境界値テスト（8文字）")
    void testValidPassword_MinLength() {
        // Given
        String password = "Test1!ab";
        String employeeCode = "E001";
        
        // When
        PasswordValidator.PasswordValidationResult result = passwordValidator.validate(password, employeeCode);
        
        // Then
        assertTrue(result.isValid());
        assertEquals("パスワードは有効です。", result.getMessage());
    }
    
    @Test
    @DisplayName("有効なパスワード - 境界値テスト（20文字）")
    void testValidPassword_MaxLength() {
        // Given
        String password = "Test123!Test123!Test";
        String employeeCode = "E001";
        
        // When
        PasswordValidator.PasswordValidationResult result = passwordValidator.validate(password, employeeCode);
        
        // Then
        assertTrue(result.isValid());
        assertEquals("パスワードは有効です。", result.getMessage());
    }
    
    @Test
    @DisplayName("有効なパスワード - 連続文字の境界値テスト（2文字まで許可）")
    void testValidPassword_MaxConsecutiveChars() {
        // Given
        String password = "Test11!a";
        String employeeCode = "E001";
        
        // When
        PasswordValidator.PasswordValidationResult result = passwordValidator.validate(password, employeeCode);
        
        // Then
        assertTrue(result.isValid());
        assertEquals("パスワードは有効です。", result.getMessage());
    }
    
    @Test
    @DisplayName("無効なパスワード - 連続文字の境界値テスト（3文字でNG）")
    void testInvalidPassword_ThreeConsecutiveChars() {
        // Given
        String password = "Test111!a";
        String employeeCode = "E001";
        
        // When
        PasswordValidator.PasswordValidationResult result = passwordValidator.validate(password, employeeCode);
        
        // Then
        assertFalse(result.isValid());
        assertTrue(result.getMessage().contains("連続する同一文字"));
    }
}
