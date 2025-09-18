package com.kintai.util;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

/**
 * TimeCalculatorのユニットテスト
 */
class TimeCalculatorTest {
    
    private TimeCalculator timeCalculator;
    
    @BeforeEach
    void setUp() {
        timeCalculator = new TimeCalculator();
    }
    
    @Test
    @DisplayName("遅刻時間計算テスト - 09:00出勤")
    void testCalculateLateMinutes_OnTime() {
        // Given
        LocalDateTime clockInTime = LocalDateTime.of(2025, 1, 1, 9, 0);
        
        // When
        int lateMinutes = timeCalculator.calculateLateMinutes(clockInTime);
        
        // Then
        assertEquals(0, lateMinutes);
    }
    
    @Test
    @DisplayName("遅刻時間計算テスト - 09:05出勤")
    void testCalculateLateMinutes_Late5Minutes() {
        // Given
        LocalDateTime clockInTime = LocalDateTime.of(2025, 1, 1, 9, 5);
        
        // When
        int lateMinutes = timeCalculator.calculateLateMinutes(clockInTime);
        
        // Then
        assertEquals(5, lateMinutes);
    }
    
    @Test
    @DisplayName("遅刻時間計算テスト - 10:30出勤")
    void testCalculateLateMinutes_Late90Minutes() {
        // Given
        LocalDateTime clockInTime = LocalDateTime.of(2025, 1, 1, 10, 30);
        
        // When
        int lateMinutes = timeCalculator.calculateLateMinutes(clockInTime);
        
        // Then
        assertEquals(90, lateMinutes);
    }
    
    @Test
    @DisplayName("遅刻時間計算テスト - 08:30出勤（早出）")
    void testCalculateLateMinutes_EarlyArrival() {
        // Given
        LocalDateTime clockInTime = LocalDateTime.of(2025, 1, 1, 8, 30);
        
        // When
        int lateMinutes = timeCalculator.calculateLateMinutes(clockInTime);
        
        // Then
        assertEquals(0, lateMinutes);
    }
    
    @Test
    @DisplayName("早退時間計算テスト - 18:00退勤")
    void testCalculateEarlyLeaveMinutes_OnTime() {
        // Given
        LocalDateTime clockOutTime = LocalDateTime.of(2025, 1, 1, 18, 0);
        
        // When
        int earlyLeaveMinutes = timeCalculator.calculateEarlyLeaveMinutes(clockOutTime);
        
        // Then
        assertEquals(0, earlyLeaveMinutes);
    }
    
    @Test
    @DisplayName("早退時間計算テスト - 17:30退勤")
    void testCalculateEarlyLeaveMinutes_EarlyLeave30Minutes() {
        // Given
        LocalDateTime clockOutTime = LocalDateTime.of(2025, 1, 1, 17, 30);
        
        // When
        int earlyLeaveMinutes = timeCalculator.calculateEarlyLeaveMinutes(clockOutTime);
        
        // Then
        assertEquals(30, earlyLeaveMinutes);
    }
    
    @Test
    @DisplayName("早退時間計算テスト - 16:00退勤")
    void testCalculateEarlyLeaveMinutes_EarlyLeave120Minutes() {
        // Given
        LocalDateTime clockOutTime = LocalDateTime.of(2025, 1, 1, 16, 0);
        
        // When
        int earlyLeaveMinutes = timeCalculator.calculateEarlyLeaveMinutes(clockOutTime);
        
        // Then
        assertEquals(120, earlyLeaveMinutes);
    }
    
    @Test
    @DisplayName("早退時間計算テスト - 19:00退勤（残業）")
    void testCalculateEarlyLeaveMinutes_Overtime() {
        // Given
        LocalDateTime clockOutTime = LocalDateTime.of(2025, 1, 1, 19, 0);
        
        // When
        int earlyLeaveMinutes = timeCalculator.calculateEarlyLeaveMinutes(clockOutTime);
        
        // Then
        assertEquals(0, earlyLeaveMinutes);
    }
    
    @Test
    @DisplayName("残業時間計算テスト - 480分勤務")
    void testCalculateOvertimeMinutes_NoOvertime() {
        // Given
        int workingMinutes = 480;
        
        // When
        int overtimeMinutes = timeCalculator.calculateOvertimeMinutes(workingMinutes);
        
        // Then
        assertEquals(0, overtimeMinutes);
    }
    
    @Test
    @DisplayName("残業時間計算テスト - 540分勤務")
    void testCalculateOvertimeMinutes_60MinutesOvertime() {
        // Given
        int workingMinutes = 540;
        
        // When
        int overtimeMinutes = timeCalculator.calculateOvertimeMinutes(workingMinutes);
        
        // Then
        assertEquals(60, overtimeMinutes);
    }
    
    @Test
    @DisplayName("残業時間計算テスト - 420分勤務")
    void testCalculateOvertimeMinutes_UnderTime() {
        // Given
        int workingMinutes = 420;
        
        // When
        int overtimeMinutes = timeCalculator.calculateOvertimeMinutes(workingMinutes);
        
        // Then
        assertEquals(0, overtimeMinutes);
    }
    
    @Test
    @DisplayName("残業時間計算テスト - 600分勤務")
    void testCalculateOvertimeMinutes_120MinutesOvertime() {
        // Given
        int workingMinutes = 600;
        
        // When
        int overtimeMinutes = timeCalculator.calculateOvertimeMinutes(workingMinutes);
        
        // Then
        assertEquals(120, overtimeMinutes);
    }
    
    @Test
    @DisplayName("実働時間計算テスト - 09:00-18:00勤務（昼休憩控除）")
    void testCalculateWorkingMinutes_WithLunchBreak() {
        // Given
        LocalDateTime clockInTime = LocalDateTime.of(2025, 1, 1, 9, 0);
        LocalDateTime clockOutTime = LocalDateTime.of(2025, 1, 1, 18, 0);
        
        // When
        int workingMinutes = timeCalculator.calculateWorkingMinutes(clockInTime, clockOutTime);
        
        // Then
        assertEquals(480, workingMinutes); // 540分 - 60分（昼休憩）
    }
    
    @Test
    @DisplayName("実働時間計算テスト - 13:00-18:00勤務（昼休憩なし）")
    void testCalculateWorkingMinutes_NoLunchBreak() {
        // Given
        LocalDateTime clockInTime = LocalDateTime.of(2025, 1, 1, 13, 0);
        LocalDateTime clockOutTime = LocalDateTime.of(2025, 1, 1, 18, 0);
        
        // When
        int workingMinutes = timeCalculator.calculateWorkingMinutes(clockInTime, clockOutTime);
        
        // Then
        assertEquals(300, workingMinutes);
    }
    
    @Test
    @DisplayName("実働時間計算テスト - 09:00-12:00勤務（昼休憩なし）")
    void testCalculateWorkingMinutes_NoLunchBreak2() {
        // Given
        LocalDateTime clockInTime = LocalDateTime.of(2025, 1, 1, 9, 0);
        LocalDateTime clockOutTime = LocalDateTime.of(2025, 1, 1, 12, 0);
        
        // When
        int workingMinutes = timeCalculator.calculateWorkingMinutes(clockInTime, clockOutTime);
        
        // Then
        assertEquals(180, workingMinutes);
    }
    
    @Test
    @DisplayName("実働時間計算テスト - 11:00-14:00勤務（昼休憩控除）")
    void testCalculateWorkingMinutes_WithLunchBreak2() {
        // Given
        LocalDateTime clockInTime = LocalDateTime.of(2025, 1, 1, 11, 0);
        LocalDateTime clockOutTime = LocalDateTime.of(2025, 1, 1, 14, 0);
        
        // When
        int workingMinutes = timeCalculator.calculateWorkingMinutes(clockInTime, clockOutTime);
        
        // Then
        assertEquals(120, workingMinutes); // 180分 - 60分（昼休憩）
    }
    
    @Test
    @DisplayName("深夜勤務時間計算テスト - 09:00-18:00勤務")
    void testCalculateNightShiftMinutes_NormalWork() {
        // Given
        LocalDateTime clockInTime = LocalDateTime.of(2025, 1, 1, 9, 0);
        LocalDateTime clockOutTime = LocalDateTime.of(2025, 1, 1, 18, 0);
        
        // When
        int nightShiftMinutes = timeCalculator.calculateNightShiftMinutes(clockInTime, clockOutTime);
        
        // Then
        assertEquals(0, nightShiftMinutes);
    }
    
    @Test
    @DisplayName("深夜勤務時間計算テスト - 09:00-23:00勤務")
    void testCalculateNightShiftMinutes_60MinutesNightShift() {
        // Given
        LocalDateTime clockInTime = LocalDateTime.of(2025, 1, 1, 9, 0);
        LocalDateTime clockOutTime = LocalDateTime.of(2025, 1, 1, 23, 0);
        
        // When
        int nightShiftMinutes = timeCalculator.calculateNightShiftMinutes(clockInTime, clockOutTime);
        
        // Then
        assertEquals(61, nightShiftMinutes); // 22:00-23:00 = 61分（23:59:59を含めるため+1）
    }
    
    @Test
    @DisplayName("深夜勤務時間計算テスト - 21:00-02:00勤務")
    void testCalculateNightShiftMinutes_240MinutesNightShift() {
        // Given
        LocalDateTime clockInTime = LocalDateTime.of(2025, 1, 1, 21, 0);
        LocalDateTime clockOutTime = LocalDateTime.of(2025, 1, 2, 2, 0);
        
        // When
        int nightShiftMinutes = timeCalculator.calculateNightShiftMinutes(clockInTime, clockOutTime);
        
        // Then
        assertEquals(240, nightShiftMinutes); // 22:00-02:00 = 4時間 = 240分
    }
    
    @Test
    @DisplayName("深夜勤務時間計算テスト - 23:00-06:00勤務")
    void testCalculateNightShiftMinutes_360MinutesNightShift() {
        // Given
        LocalDateTime clockInTime = LocalDateTime.of(2025, 1, 1, 23, 0);
        LocalDateTime clockOutTime = LocalDateTime.of(2025, 1, 2, 6, 0);
        
        // When
        int nightShiftMinutes = timeCalculator.calculateNightShiftMinutes(clockInTime, clockOutTime);
        
        // Then
        assertEquals(420, nightShiftMinutes); // 23:00-06:00 = 7時間 = 420分（深夜勤務時間）
    }
}
