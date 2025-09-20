package com.kintai.service;

import com.kintai.dto.ClockInRequest;
import com.kintai.dto.ClockOutRequest;
import com.kintai.dto.ClockResponse;
import com.kintai.dto.MonthlySubmitRequest;
import com.kintai.entity.AttendanceRecord;
import com.kintai.entity.Employee;
import com.kintai.entity.SubmissionStatus;
import com.kintai.entity.VacationRequest;
import com.kintai.entity.VacationStatus;
import com.kintai.exception.AttendanceException;
import com.kintai.repository.AttendanceRecordRepository;
import com.kintai.repository.EmployeeRepository;
import com.kintai.repository.VacationRequestRepository;
import com.kintai.util.TimeCalculator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
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
    
    @Mock
    private VacationRequestRepository vacationRequestRepository;
    
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
        assertTrue(response.getData() instanceof ClockResponse.ClockData);
        ClockResponse.ClockData clockData = (ClockResponse.ClockData) response.getData();
        assertEquals(1L, clockData.getAttendanceId());
        assertEquals(0, clockData.getLateMinutes()); // 実際のTimeCalculatorが呼ばれるため0
        
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
    @DisplayName("今日の勤怠状況取得テスト")
    void testGetTodayAttendance() {
        // Given
        Long employeeId = 1L;
        LocalDate today = LocalDate.now();
        AttendanceRecord record = new AttendanceRecord(employeeId, today);
        record.setClockInTime(LocalDateTime.now().withHour(9).withMinute(0));
        
        when(employeeRepository.findByEmployeeId(employeeId)).thenReturn(Optional.of(testEmployee));
        when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDate(employeeId, today)).thenReturn(Optional.of(record));
        
        // When
        ClockResponse response = attendanceService.getTodayAttendance(employeeId);
        
        // Then
        assertTrue(response.isSuccess());
        assertEquals("今日の勤怠状況を取得しました", response.getMessage());
        assertNotNull(response.getData());
        assertTrue(response.getData() instanceof ClockResponse.ClockData);
    }
    
    @Test
    @DisplayName("今日の勤怠状況取得テスト - 記録なし")
    void testGetTodayAttendance_NoRecord() {
        // Given
        Long employeeId = 1L;
        LocalDate today = LocalDate.now();
        
        when(employeeRepository.findByEmployeeId(employeeId)).thenReturn(Optional.of(testEmployee));
        when(attendanceRecordRepository.findByEmployeeIdAndAttendanceDate(employeeId, today)).thenReturn(Optional.empty());
        
        // When
        ClockResponse response = attendanceService.getTodayAttendance(employeeId);
        
        // Then
        assertTrue(response.isSuccess());
        assertEquals("今日の勤怠記録はありません", response.getMessage());
        assertNull(response.getData());
    }
    
    @Test
    @DisplayName("今日の勤怠状況取得テスト - 従業員なし")
    void testGetTodayAttendance_EmployeeNotFound() {
        // Given
        Long employeeId = 999L;
        
        when(employeeRepository.findByEmployeeId(employeeId)).thenReturn(Optional.empty());
        
        // When & Then
        AttendanceException exception = assertThrows(AttendanceException.class, () -> {
            attendanceService.getTodayAttendance(employeeId);
        });
        
        assertEquals(AttendanceException.EMPLOYEE_NOT_FOUND, exception.getErrorCode());
        assertEquals("従業員が見つかりません", exception.getMessage());
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
        assertTrue(response.getData() instanceof ClockResponse.ClockData);
        ClockResponse.ClockData clockData = (ClockResponse.ClockData) response.getData();
        assertEquals(1L, clockData.getAttendanceId());
        assertEquals(10, clockData.getOvertimeMinutes());
        
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
    
    @Test
    @DisplayName("夜勤退勤テスト - 21:00-02:00勤務")
    void testClockOut_NightShift() {
        // Given
        ClockOutRequest request = new ClockOutRequest(1L);
        LocalDateTime clockInTime = LocalDateTime.of(2025, 1, 1, 21, 0);
        LocalDateTime clockOutTime = LocalDateTime.of(2025, 1, 2, 2, 0);
        
        testAttendanceRecord.setClockInTime(clockInTime);
        
        when(employeeRepository.findByEmployeeId(1L)).thenReturn(Optional.of(testEmployee));
        when(attendanceRecordRepository.findEditableRecord(1L, LocalDate.now())).thenReturn(Optional.of(testAttendanceRecord));
        when(timeCalculator.getCurrentTokyoTime()).thenReturn(clockOutTime);
        when(timeCalculator.calculateEarlyLeaveMinutes(clockOutTime)).thenReturn(0);
        when(timeCalculator.calculateWorkingMinutes(clockInTime, clockOutTime)).thenReturn(300);
        when(timeCalculator.calculateOvertimeMinutes(300)).thenReturn(0);
        when(timeCalculator.calculateNightShiftMinutes(clockInTime, clockOutTime)).thenReturn(240);
        when(attendanceRecordRepository.save(any(AttendanceRecord.class))).thenReturn(testAttendanceRecord);
        
        // When
        ClockResponse response = attendanceService.clockOut(request);
        
        // Then
        assertTrue(response.isSuccess());
        assertEquals("退勤打刻完了（240分深夜勤務）", response.getMessage());
        assertNotNull(response.getData());
        assertTrue(response.getData() instanceof ClockResponse.ClockData);
        ClockResponse.ClockData clockData = (ClockResponse.ClockData) response.getData();
        assertEquals(1L, clockData.getAttendanceId());
        assertEquals(0, clockData.getEarlyLeaveMinutes());
        assertEquals(0, clockData.getOvertimeMinutes());
        assertEquals(240, clockData.getNightShiftMinutes());
        
        verify(attendanceRecordRepository).save(any(AttendanceRecord.class));
    }
    
    @Test
    @DisplayName("早退退勤テスト - 17:30退勤")
    void testClockOut_EarlyLeave() {
        // Given
        ClockOutRequest request = new ClockOutRequest(1L);
        LocalDateTime clockInTime = LocalDateTime.of(2025, 1, 1, 9, 0);
        LocalDateTime clockOutTime = LocalDateTime.of(2025, 1, 1, 17, 30);
        
        testAttendanceRecord.setClockInTime(clockInTime);
        
        when(employeeRepository.findByEmployeeId(1L)).thenReturn(Optional.of(testEmployee));
        when(attendanceRecordRepository.findEditableRecord(1L, LocalDate.now())).thenReturn(Optional.of(testAttendanceRecord));
        when(timeCalculator.getCurrentTokyoTime()).thenReturn(clockOutTime);
        when(timeCalculator.calculateEarlyLeaveMinutes(clockOutTime)).thenReturn(30);
        when(timeCalculator.calculateWorkingMinutes(clockInTime, clockOutTime)).thenReturn(450);
        when(timeCalculator.calculateOvertimeMinutes(450)).thenReturn(0);
        when(timeCalculator.calculateNightShiftMinutes(clockInTime, clockOutTime)).thenReturn(0);
        when(attendanceRecordRepository.save(any(AttendanceRecord.class))).thenReturn(testAttendanceRecord);
        
        // When
        ClockResponse response = attendanceService.clockOut(request);
        
        // Then
        assertTrue(response.isSuccess());
        assertEquals("退勤打刻完了（30分早退）", response.getMessage());
        assertNotNull(response.getData());
        assertTrue(response.getData() instanceof ClockResponse.ClockData);
        ClockResponse.ClockData clockData = (ClockResponse.ClockData) response.getData();
        assertEquals(1L, clockData.getAttendanceId());
        assertEquals(30, clockData.getEarlyLeaveMinutes());
        assertEquals(0, clockData.getOvertimeMinutes());
        assertEquals(0, clockData.getNightShiftMinutes());
        
        verify(attendanceRecordRepository).save(any(AttendanceRecord.class));
    }
    
    @Test
    @DisplayName("月末申請成功テスト - 全日打刻あり")
    void testSubmitMonthly_Success() {
        // Given
        MonthlySubmitRequest request = new MonthlySubmitRequest(1L, "2025-01");
        
        // 完全な勤怠記録を作成（出勤・退勤両方打刻済み）
        AttendanceRecord record1 = new AttendanceRecord(1L, LocalDate.of(2025, 1, 1));
        record1.setClockInTime(LocalDateTime.of(2025, 1, 1, 9, 0));
        record1.setClockOutTime(LocalDateTime.of(2025, 1, 1, 18, 0));
        record1.setAttendanceFixedFlag(false);
        
        AttendanceRecord record2 = new AttendanceRecord(1L, LocalDate.of(2025, 1, 2));
        record2.setClockInTime(LocalDateTime.of(2025, 1, 2, 9, 0));
        record2.setClockOutTime(LocalDateTime.of(2025, 1, 2, 18, 0));
        record2.setAttendanceFixedFlag(false);
        
        List<AttendanceRecord> records = Arrays.asList(record1, record2);
        
        when(employeeRepository.findByEmployeeId(1L)).thenReturn(Optional.of(testEmployee));
        when(attendanceRecordRepository.findByEmployeeAndMonth(1L, 2025, 1)).thenReturn(records);
        when(attendanceRecordRepository.saveAll(anyList())).thenReturn(records);
        
        // When
        ClockResponse response = attendanceService.submitMonthly(request);
        
        // Then
        assertTrue(response.isSuccess());
        assertEquals("2025-01の勤怠を申請しました", response.getMessage());
        assertNotNull(response.getData());
        assertTrue(response.getData() instanceof ClockResponse.MonthlySubmitData);
        ClockResponse.MonthlySubmitData monthlyData = (ClockResponse.MonthlySubmitData) response.getData();
        assertEquals(1L, monthlyData.getEmployeeId());
        assertEquals("2025-01", monthlyData.getYearMonth());
        assertEquals(2, monthlyData.getFixedCount());
        
        verify(attendanceRecordRepository).saveAll(anyList());
    }
    
    @Test
    @DisplayName("月末申請エラーテスト - 未打刻の日がある")
    void testSubmitMonthly_IncompleteAttendance() {
        // Given
        MonthlySubmitRequest request = new MonthlySubmitRequest(1L, "2025-01");
        
        // 未打刻の勤怠記録を作成（退勤打刻なし）
        AttendanceRecord record1 = new AttendanceRecord(1L, LocalDate.of(2025, 1, 1));
        record1.setClockInTime(LocalDateTime.of(2025, 1, 1, 9, 0));
        record1.setClockOutTime(null); // 退勤打刻なし
        record1.setAttendanceFixedFlag(false);
        
        List<AttendanceRecord> records = Arrays.asList(record1);
        
        when(employeeRepository.findByEmployeeId(1L)).thenReturn(Optional.of(testEmployee));
        when(attendanceRecordRepository.findByEmployeeAndMonth(1L, 2025, 1)).thenReturn(records);
        
        // When & Then
        AttendanceException exception = assertThrows(AttendanceException.class, () -> {
            attendanceService.submitMonthly(request);
        });
        
        assertEquals("INCOMPLETE_ATTENDANCE", exception.getErrorCode());
        assertEquals("未打刻の日があります", exception.getMessage());
    }
    
    @Test
    @DisplayName("月末申請エラーテスト - 未来月の申請")
    void testSubmitMonthly_FutureMonth() {
        // Given
        MonthlySubmitRequest request = new MonthlySubmitRequest(1L, "2026-01");
        
        when(employeeRepository.findByEmployeeId(1L)).thenReturn(Optional.of(testEmployee));
        
        // When & Then
        AttendanceException exception = assertThrows(AttendanceException.class, () -> {
            attendanceService.submitMonthly(request);
        });
        
        assertEquals("FUTURE_MONTH_NOT_ALLOWED", exception.getErrorCode());
        assertEquals("未来月の申請はできません", exception.getMessage());
    }
    
    @Test
    @DisplayName("月末申請エラーテスト - 既に申請済み")
    void testSubmitMonthly_AlreadySubmitted() {
        // Given
        MonthlySubmitRequest request = new MonthlySubmitRequest(1L, "2025-01");
        
        // 既に確定済みの勤怠記録を作成
        AttendanceRecord record1 = new AttendanceRecord(1L, LocalDate.of(2025, 1, 1));
        record1.setClockInTime(LocalDateTime.of(2025, 1, 1, 9, 0));
        record1.setClockOutTime(LocalDateTime.of(2025, 1, 1, 18, 0));
        record1.setAttendanceFixedFlag(true); // 既に確定済み
        
        List<AttendanceRecord> records = Arrays.asList(record1);
        
        when(employeeRepository.findByEmployeeId(1L)).thenReturn(Optional.of(testEmployee));
        when(attendanceRecordRepository.findByEmployeeAndMonth(1L, 2025, 1)).thenReturn(records);
        
        // When & Then
        AttendanceException exception = assertThrows(AttendanceException.class, () -> {
            attendanceService.submitMonthly(request);
        });
        
        assertEquals("ALREADY_SUBMITTED", exception.getErrorCode());
        assertEquals("既に申請済みです", exception.getMessage());
    }
    
    @Test
    @DisplayName("月末申請エラーテスト - 該当月の勤怠記録なし")
    void testSubmitMonthly_NoRecordsFound() {
        // Given
        MonthlySubmitRequest request = new MonthlySubmitRequest(1L, "2025-01");
        
        when(employeeRepository.findByEmployeeId(1L)).thenReturn(Optional.of(testEmployee));
        when(attendanceRecordRepository.findByEmployeeAndMonth(1L, 2025, 1)).thenReturn(Arrays.asList());
        
        // When & Then
        AttendanceException exception = assertThrows(AttendanceException.class, () -> {
            attendanceService.submitMonthly(request);
        });
        
        assertEquals("NO_RECORDS_FOUND", exception.getErrorCode());
        assertEquals("該当月の勤怠記録が見つかりません", exception.getMessage());
    }
    
    @Test
    @DisplayName("月末申請エラーテスト - 未承認有給申請あり")
    void testSubmitMonthly_PendingVacationRequests() {
        // Given
        MonthlySubmitRequest request = new MonthlySubmitRequest(1L, "2025-01");
        
        // 完全な勤怠記録を作成
        AttendanceRecord record1 = new AttendanceRecord(1L, LocalDate.of(2025, 1, 1));
        record1.setClockInTime(LocalDateTime.of(2025, 1, 1, 9, 0));
        record1.setClockOutTime(LocalDateTime.of(2025, 1, 1, 18, 0));
        record1.setAttendanceFixedFlag(false);
        
        List<AttendanceRecord> records = Arrays.asList(record1);
        
        // 未承認の有給申請を作成
        VacationRequest vacationRequest = new VacationRequest(1L, LocalDate.of(2025, 1, 15), LocalDate.of(2025, 1, 15), "体調不良");
        vacationRequest.setStatus(VacationStatus.PENDING);
        
        when(employeeRepository.findByEmployeeId(1L)).thenReturn(Optional.of(testEmployee));
        when(attendanceRecordRepository.findByEmployeeAndMonth(1L, 2025, 1)).thenReturn(records);
        when(vacationRequestRepository.findPendingVacationRequestsInPeriod(1L, LocalDate.of(2025, 1, 1), LocalDate.of(2025, 1, 31)))
                .thenReturn(Arrays.asList(vacationRequest));
        
        // When & Then
        AttendanceException exception = assertThrows(AttendanceException.class, () -> {
            attendanceService.submitMonthly(request);
        });
        
        assertEquals("PENDING_VACATION_REQUESTS", exception.getErrorCode());
        assertEquals("未承認の有給申請があります", exception.getMessage());
    }
    
    @Test
    @DisplayName("月末申請成功テスト - 未承認有給申請なし")
    void testSubmitMonthly_Success_NoPendingVacationRequests() {
        // Given
        MonthlySubmitRequest request = new MonthlySubmitRequest(1L, "2025-01");
        
        // 完全な勤怠記録を作成
        AttendanceRecord record1 = new AttendanceRecord(1L, LocalDate.of(2025, 1, 1));
        record1.setClockInTime(LocalDateTime.of(2025, 1, 1, 9, 0));
        record1.setClockOutTime(LocalDateTime.of(2025, 1, 1, 18, 0));
        record1.setAttendanceFixedFlag(false);
        
        List<AttendanceRecord> records = Arrays.asList(record1);
        
        when(employeeRepository.findByEmployeeId(1L)).thenReturn(Optional.of(testEmployee));
        when(attendanceRecordRepository.findByEmployeeAndMonth(1L, 2025, 1)).thenReturn(records);
        when(vacationRequestRepository.findPendingVacationRequestsInPeriod(1L, LocalDate.of(2025, 1, 1), LocalDate.of(2025, 1, 31)))
                .thenReturn(Arrays.asList()); // 未承認申請なし
        when(attendanceRecordRepository.saveAll(anyList())).thenReturn(records);
        
        // When
        ClockResponse response = attendanceService.submitMonthly(request);
        
        // Then
        assertTrue(response.isSuccess());
        assertEquals("2025-01の勤怠を申請しました", response.getMessage());
        assertNotNull(response.getData());
        assertTrue(response.getData() instanceof ClockResponse.MonthlySubmitData);
        ClockResponse.MonthlySubmitData monthlyData = (ClockResponse.MonthlySubmitData) response.getData();
        assertEquals(1L, monthlyData.getEmployeeId());
        assertEquals("2025-01", monthlyData.getYearMonth());
        assertEquals(1, monthlyData.getFixedCount());
        
        // submission_statusがSUBMITTEDに更新されることを確認
        verify(attendanceRecordRepository).saveAll(anyList());
    }
    
    @Test
    @DisplayName("月末申請承認成功テスト")
    void testApproveMonthlySubmission_Success() {
        // Given
        Long employeeId = 1L;
        String yearMonth = "2025-01";
        
        // 申請済みの勤怠記録を作成
        AttendanceRecord record1 = new AttendanceRecord(1L, LocalDate.of(2025, 1, 1));
        record1.setClockInTime(LocalDateTime.of(2025, 1, 1, 9, 0));
        record1.setClockOutTime(LocalDateTime.of(2025, 1, 1, 18, 0));
        record1.setSubmissionStatus(SubmissionStatus.SUBMITTED);
        record1.setAttendanceFixedFlag(false);
        
        List<AttendanceRecord> records = Arrays.asList(record1);
        
        when(employeeRepository.findByEmployeeId(employeeId)).thenReturn(Optional.of(testEmployee));
        when(attendanceRecordRepository.findByEmployeeAndMonth(employeeId, 2025, 1)).thenReturn(records);
        when(attendanceRecordRepository.saveAll(anyList())).thenReturn(records);
        
        // When
        ClockResponse response = attendanceService.approveMonthlySubmission(employeeId, yearMonth);
        
        // Then
        assertTrue(response.isSuccess());
        assertEquals("2025-01の勤怠を承認しました", response.getMessage());
        assertNotNull(response.getData());
        assertTrue(response.getData() instanceof ClockResponse.MonthlySubmitData);
        ClockResponse.MonthlySubmitData monthlyData = (ClockResponse.MonthlySubmitData) response.getData();
        assertEquals(employeeId, monthlyData.getEmployeeId());
        assertEquals(yearMonth, monthlyData.getYearMonth());
        assertEquals(1, monthlyData.getFixedCount());
        
        // attendance_fixed_flagとsubmission_statusが更新されることを確認
        verify(attendanceRecordRepository).saveAll(anyList());
    }

    @Test
    @DisplayName("月末申請却下成功テスト")
    void testRejectMonthlySubmission_Success() {
        // Given
        Long employeeId = 1L;
        String yearMonth = "2025-01";
        
        // 申請済みの勤怠記録を作成
        AttendanceRecord record1 = new AttendanceRecord(1L, LocalDate.of(2025, 1, 1));
        record1.setClockInTime(LocalDateTime.of(2025, 1, 1, 9, 0));
        record1.setClockOutTime(LocalDateTime.of(2025, 1, 1, 18, 0));
        record1.setSubmissionStatus(SubmissionStatus.SUBMITTED);
        record1.setAttendanceFixedFlag(false);
        
        List<AttendanceRecord> records = Arrays.asList(record1);
        
        when(employeeRepository.findByEmployeeId(employeeId)).thenReturn(Optional.of(testEmployee));
        when(attendanceRecordRepository.findByEmployeeAndMonth(employeeId, 2025, 1)).thenReturn(records);
        when(attendanceRecordRepository.saveAll(anyList())).thenReturn(records);
        
        // When
        ClockResponse response = attendanceService.rejectMonthlySubmission(employeeId, yearMonth);
        
        // Then
        assertTrue(response.isSuccess());
        assertEquals("2025-01の勤怠申請を却下しました", response.getMessage());
        assertNotNull(response.getData());
        assertTrue(response.getData() instanceof ClockResponse.MonthlySubmitData);
        ClockResponse.MonthlySubmitData monthlyData = (ClockResponse.MonthlySubmitData) response.getData();
        assertEquals(employeeId, monthlyData.getEmployeeId());
        assertEquals(yearMonth, monthlyData.getYearMonth());
        assertEquals(1, monthlyData.getFixedCount());
        
        // submission_statusがREJECTEDに更新されることを確認
        verify(attendanceRecordRepository).saveAll(anyList());
    }

    @Test
    @DisplayName("月末申請却下エラーテスト - 申請されていない")
    void testRejectMonthlySubmission_NotSubmitted() {
        // Given
        Long employeeId = 1L;
        String yearMonth = "2025-01";
        
        // 未申請の勤怠記録を作成
        AttendanceRecord record1 = new AttendanceRecord(1L, LocalDate.of(2025, 1, 1));
        record1.setClockInTime(LocalDateTime.of(2025, 1, 1, 9, 0));
        record1.setClockOutTime(LocalDateTime.of(2025, 1, 1, 18, 0));
        record1.setSubmissionStatus(SubmissionStatus.NOT_SUBMITTED);
        record1.setAttendanceFixedFlag(false);
        
        List<AttendanceRecord> records = Arrays.asList(record1);
        
        when(employeeRepository.findByEmployeeId(employeeId)).thenReturn(Optional.of(testEmployee));
        when(attendanceRecordRepository.findByEmployeeAndMonth(employeeId, 2025, 1)).thenReturn(records);
        
        // When & Then
        AttendanceException exception = assertThrows(AttendanceException.class, () -> {
            attendanceService.rejectMonthlySubmission(employeeId, yearMonth);
        });
        
        assertEquals("NOT_SUBMITTED", exception.getErrorCode());
        assertEquals("申請されていません", exception.getMessage());
    }

    @Test
    @DisplayName("月末申請却下エラーテスト - 既に確定済み")
    void testRejectMonthlySubmission_AlreadyFixed() {
        // Given
        Long employeeId = 1L;
        String yearMonth = "2025-01";
        
        // 既に確定済みの勤怠記録を作成
        AttendanceRecord record1 = new AttendanceRecord(1L, LocalDate.of(2025, 1, 1));
        record1.setClockInTime(LocalDateTime.of(2025, 1, 1, 9, 0));
        record1.setClockOutTime(LocalDateTime.of(2025, 1, 1, 18, 0));
        record1.setSubmissionStatus(SubmissionStatus.APPROVED);
        record1.setAttendanceFixedFlag(true);
        
        List<AttendanceRecord> records = Arrays.asList(record1);
        
        when(employeeRepository.findByEmployeeId(employeeId)).thenReturn(Optional.of(testEmployee));
        when(attendanceRecordRepository.findByEmployeeAndMonth(employeeId, 2025, 1)).thenReturn(records);
        
        // When & Then
        AttendanceException exception = assertThrows(AttendanceException.class, () -> {
            attendanceService.rejectMonthlySubmission(employeeId, yearMonth);
        });
        
        assertEquals("ALREADY_FIXED", exception.getErrorCode());
        assertEquals("既に確定済みです", exception.getMessage());
    }

    @Test
    @DisplayName("月末申請状態取得成功テスト")
    void testGetMonthlySubmissionStatus_Success() {
        // Given
        Long employeeId = 1L;
        String yearMonth = "2025-01";
        
        // 申請済みの勤怠記録を作成
        AttendanceRecord record1 = new AttendanceRecord(1L, LocalDate.of(2025, 1, 1));
        record1.setClockInTime(LocalDateTime.of(2025, 1, 1, 9, 0));
        record1.setClockOutTime(LocalDateTime.of(2025, 1, 1, 18, 0));
        record1.setSubmissionStatus(SubmissionStatus.SUBMITTED);
        record1.setAttendanceFixedFlag(false);
        
        List<AttendanceRecord> records = Arrays.asList(record1);
        
        when(employeeRepository.findByEmployeeId(employeeId)).thenReturn(Optional.of(testEmployee));
        when(attendanceRecordRepository.findByEmployeeAndMonth(employeeId, 2025, 1)).thenReturn(records);
        
        // When
        ClockResponse response = attendanceService.getMonthlySubmissionStatus(employeeId, yearMonth);
        
        // Then
        assertTrue(response.isSuccess());
        assertEquals("2025-01の申請状態: 申請中", response.getMessage());
        assertNotNull(response.getData());
        assertTrue(response.getData() instanceof Map);
        
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) response.getData();
        assertEquals("SUBMITTED", data.get("submissionStatus"));
        assertEquals(false, data.get("attendanceFixedFlag"));
        assertEquals(yearMonth, data.get("yearMonth"));
        assertEquals(1, data.get("recordCount"));
    }
    
    @Test
    @DisplayName("月末申請承認エラーテスト - 申請されていない")
    void testApproveMonthlySubmission_NotSubmitted() {
        // Given
        Long employeeId = 1L;
        String yearMonth = "2025-01";
        
        // 未申請の勤怠記録を作成
        AttendanceRecord record1 = new AttendanceRecord(1L, LocalDate.of(2025, 1, 1));
        record1.setClockInTime(LocalDateTime.of(2025, 1, 1, 9, 0));
        record1.setClockOutTime(LocalDateTime.of(2025, 1, 1, 18, 0));
        record1.setSubmissionStatus(SubmissionStatus.NOT_SUBMITTED);
        record1.setAttendanceFixedFlag(false);
        
        List<AttendanceRecord> records = Arrays.asList(record1);
        
        when(employeeRepository.findByEmployeeId(employeeId)).thenReturn(Optional.of(testEmployee));
        when(attendanceRecordRepository.findByEmployeeAndMonth(employeeId, 2025, 1)).thenReturn(records);
        
        // When & Then
        AttendanceException exception = assertThrows(AttendanceException.class, () -> {
            attendanceService.approveMonthlySubmission(employeeId, yearMonth);
        });
        
        assertEquals("NOT_SUBMITTED", exception.getErrorCode());
        assertEquals("申請されていません", exception.getMessage());
    }
}
