package com.kintai.service;

import com.kintai.dto.ClockInRequest;
import com.kintai.dto.ClockOutRequest;
import com.kintai.dto.ClockResponse;
import com.kintai.entity.AttendanceRecord;
import com.kintai.entity.Employee;
import com.kintai.exception.AttendanceException;
import com.kintai.repository.AttendanceRecordRepository;
import com.kintai.repository.EmployeeRepository;
import com.kintai.util.TimeCalculator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * AttendanceServiceのユニットテスト
 */
class AttendanceServiceTest {
    
    @Mock
    private AttendanceRecordRepository attendanceRecordRepository;
    
    @Mock
    private EmployeeRepository employeeRepository;
    
    @Mock
    private TimeCalculator timeCalculator;
    
    @InjectMocks
    private AttendanceService attendanceService;
    
    private Employee testEmployee;
    private AttendanceRecord testAttendanceRecord;
    
    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        
        // テスト用の従業員データ
        testEmployee = new Employee("EMP001", "田中", "太郎", "tanaka@example.com", LocalDate.of(2020, 4, 1));
        testEmployee.setEmployeeId(1L);
        testEmployee.setIsActive(true);
        
        // テスト用の勤怠記録データ
        testAttendanceRecord = new AttendanceRecord(1L, LocalDate.now());
        testAttendanceRecord.setAttendanceId(1L);
        testAttendanceRecord.setClockInTime(LocalDateTime.of(2025, 1, 1, 9, 0));
    }
    
    @Test
    @DisplayName("出勤打刻成功テスト")
    void testClockIn_Success() {
        // Given
        ClockInRequest request = new ClockInRequest(1L);
        LocalDateTime now = LocalDateTime.of(2025, 1, 1, 9, 5);
        
        when(employeeRepository.findByEmployeeId(1L)).thenReturn(Optional.of(testEmployee));
        when(attendanceRecordRepository.existsByEmployeeIdAndAttendanceDateAndClockInTimeIsNotNull(1L, LocalDate.now())).thenReturn(false);
        when(timeCalculator.getCurrentTokyoTime()).thenReturn(now);
        when(timeCalculator.calculateLateMinutes(now)).thenReturn(5);
        when(attendanceRecordRepository.save(any(AttendanceRecord.class))).thenReturn(testAttendanceRecord);
        
        // When
        ClockResponse response = attendanceService.clockIn(request);
        
        // Then
        assertTrue(response.isSuccess());
        assertEquals("出勤打刻完了（5分遅刻）", response.getMessage());
        assertNotNull(response.getData());
        assertEquals(1L, response.getData().getAttendanceId());
        assertEquals(5, response.getData().getLateMinutes());
        
        verify(attendanceRecordRepository).save(any(AttendanceRecord.class));
    }
    
    @Test
    @DisplayName("重複出勤エラーテスト")
    void testClockIn_AlreadyClockedIn() {
        // Given
        ClockInRequest request = new ClockInRequest(1L);
        
        when(employeeRepository.findByEmployeeId(1L)).thenReturn(Optional.of(testEmployee));
        when(attendanceRecordRepository.existsByEmployeeIdAndAttendanceDateAndClockInTimeIsNotNull(1L, LocalDate.now())).thenReturn(true);
        
        // When & Then
        AttendanceException exception = assertThrows(AttendanceException.class, () -> {
            attendanceService.clockIn(request);
        });
        
        assertEquals(AttendanceException.ALREADY_CLOCKED_IN, exception.getErrorCode());
        assertEquals("既に出勤打刻済みです", exception.getMessage());
    }
    
    @Test
    @DisplayName("退職者打刻エラーテスト")
    void testClockIn_RetiredEmployee() {
        // Given
        ClockInRequest request = new ClockInRequest(1L);
        testEmployee.setRetirementDate(LocalDate.now().minusDays(1));
        
        when(employeeRepository.findByEmployeeId(1L)).thenReturn(Optional.of(testEmployee));
        
        // When & Then
        AttendanceException exception = assertThrows(AttendanceException.class, () -> {
            attendanceService.clockIn(request);
        });
        
        assertEquals(AttendanceException.RETIRED_EMPLOYEE, exception.getErrorCode());
        assertEquals("退職済みの従業員です", exception.getMessage());
    }
    
    @Test
    @DisplayName("従業員不存在エラーテスト")
    void testClockIn_EmployeeNotFound() {
        // Given
        ClockInRequest request = new ClockInRequest(999L);
        
        when(employeeRepository.findByEmployeeId(999L)).thenReturn(Optional.empty());
        
        // When & Then
        AttendanceException exception = assertThrows(AttendanceException.class, () -> {
            attendanceService.clockIn(request);
        });
        
        assertEquals(AttendanceException.EMPLOYEE_NOT_FOUND, exception.getErrorCode());
        assertEquals("従業員が見つかりません", exception.getMessage());
    }
    
    @Test
    @DisplayName("退勤打刻成功テスト")
    void testClockOut_Success() {
        // Given
        ClockOutRequest request = new ClockOutRequest(1L);
        LocalDateTime now = LocalDateTime.of(2025, 1, 1, 18, 10);
        
        when(employeeRepository.findByEmployeeId(1L)).thenReturn(Optional.of(testEmployee));
        when(attendanceRecordRepository.findEditableRecord(1L, LocalDate.now())).thenReturn(Optional.of(testAttendanceRecord));
        when(timeCalculator.getCurrentTokyoTime()).thenReturn(now);
        when(timeCalculator.calculateEarlyLeaveMinutes(now)).thenReturn(0);
        when(timeCalculator.calculateWorkingMinutes(any(), any())).thenReturn(490);
        when(timeCalculator.calculateOvertimeMinutes(490)).thenReturn(10);
        when(timeCalculator.calculateNightShiftMinutes(any(), any())).thenReturn(0);
        when(attendanceRecordRepository.save(any(AttendanceRecord.class))).thenReturn(testAttendanceRecord);
        
        // When
        ClockResponse response = attendanceService.clockOut(request);
        
        // Then
        assertTrue(response.isSuccess());
        assertEquals("退勤打刻完了（10分残業）", response.getMessage());
        assertNotNull(response.getData());
        assertEquals(1L, response.getData().getAttendanceId());
        assertEquals(10, response.getData().getOvertimeMinutes());
        
        verify(attendanceRecordRepository).save(any(AttendanceRecord.class));
    }
    
    @Test
    @DisplayName("出勤前退勤エラーテスト")
    void testClockOut_NotClockedIn() {
        // Given
        ClockOutRequest request = new ClockOutRequest(1L);
        
        when(employeeRepository.findByEmployeeId(1L)).thenReturn(Optional.of(testEmployee));
        when(attendanceRecordRepository.findEditableRecord(1L, LocalDate.now())).thenReturn(Optional.empty());
        
        // When & Then
        AttendanceException exception = assertThrows(AttendanceException.class, () -> {
            attendanceService.clockOut(request);
        });
        
        assertEquals(AttendanceException.NOT_CLOCKED_IN, exception.getErrorCode());
        assertEquals("出勤打刻がされていません", exception.getMessage());
    }
    
    @Test
    @DisplayName("既に退勤済みエラーテスト")
    void testClockOut_AlreadyClockedOut() {
        // Given
        ClockOutRequest request = new ClockOutRequest(1L);
        testAttendanceRecord.setClockOutTime(LocalDateTime.of(2025, 1, 1, 18, 0));
        
        when(employeeRepository.findByEmployeeId(1L)).thenReturn(Optional.of(testEmployee));
        when(attendanceRecordRepository.findEditableRecord(1L, LocalDate.now())).thenReturn(Optional.of(testAttendanceRecord));
        
        // When & Then
        AttendanceException exception = assertThrows(AttendanceException.class, () -> {
            attendanceService.clockOut(request);
        });
        
        assertEquals(AttendanceException.ALREADY_CLOCKED_IN, exception.getErrorCode());
        assertEquals("既に退勤打刻済みです", exception.getMessage());
    }
}
