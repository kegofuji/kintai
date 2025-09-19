package com.kintai.service;

import com.kintai.dto.InconsistencyResponse;
import com.kintai.entity.AttendanceRecord;
import com.kintai.entity.Employee;
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
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * AttendanceConsistencyCheckServiceのユニットテスト
 */
class AttendanceConsistencyCheckServiceTest {
    
    @Mock
    private AttendanceRecordRepository attendanceRecordRepository;
    
    @Mock
    private EmployeeRepository employeeRepository;
    
    @Mock
    private TimeCalculator timeCalculator;
    
    @InjectMocks
    private AttendanceConsistencyCheckService attendanceConsistencyCheckService;
    
    private Employee testEmployee1;
    private Employee testEmployee2;
    private Employee testEmployee3;
    
    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        
        // テスト用の従業員データ
        testEmployee1 = new Employee("EMP001", "山田", "太郎", "yamada@example.com", LocalDate.of(2020, 4, 1));
        testEmployee1.setEmployeeId(2L);
        testEmployee1.setIsActive(true);
        
        testEmployee2 = new Employee("EMP002", "佐藤", "花子", "sato@example.com", LocalDate.of(2020, 4, 1));
        testEmployee2.setEmployeeId(3L);
        testEmployee2.setIsActive(true);
        
        testEmployee3 = new Employee("EMP003", "田中", "次郎", "tanaka@example.com", LocalDate.of(2020, 4, 1));
        testEmployee3.setEmployeeId(4L);
        testEmployee3.setIsActive(true);
    }
    
    @Test
    @DisplayName("退勤漏れチェックテスト")
    void testCheckInconsistencies_MissingClockOut() {
        // Given
        LocalDate testDate = LocalDate.of(2025, 9, 1);
        AttendanceRecord record = new AttendanceRecord(2L, testDate);
        record.setClockInTime(LocalDateTime.of(2025, 9, 1, 9, 0));
        record.setClockOutTime(null); // 退勤漏れ
        
        List<AttendanceRecord> records = Arrays.asList(record);
        List<Employee> employees = Arrays.asList(testEmployee1);
        
        when(attendanceRecordRepository.findAll()).thenReturn(records);
        when(employeeRepository.findAll()).thenReturn(employees);
        
        // When
        List<InconsistencyResponse> result = attendanceConsistencyCheckService.checkInconsistencies();
        
        // Then
        assertEquals(1, result.size());
        assertEquals(2L, result.get(0).getEmployeeId());
        assertEquals("山田太郎", result.get(0).getEmployeeName());
        assertEquals(testDate, result.get(0).getDate());
        assertEquals("退勤漏れ", result.get(0).getIssue());
    }
    
    @Test
    @DisplayName("出勤漏れチェックテスト")
    void testCheckInconsistencies_MissingClockIn() {
        // Given
        LocalDate testDate = LocalDate.of(2025, 9, 1);
        AttendanceRecord record = new AttendanceRecord(2L, testDate);
        record.setClockInTime(null); // 出勤漏れ
        record.setClockOutTime(LocalDateTime.of(2025, 9, 1, 18, 0));
        
        List<AttendanceRecord> records = Arrays.asList(record);
        List<Employee> employees = Arrays.asList(testEmployee1);
        
        when(attendanceRecordRepository.findAll()).thenReturn(records);
        when(employeeRepository.findAll()).thenReturn(employees);
        
        // When
        List<InconsistencyResponse> result = attendanceConsistencyCheckService.checkInconsistencies();
        
        // Then
        assertEquals(1, result.size());
        assertEquals(2L, result.get(0).getEmployeeId());
        assertEquals("山田太郎", result.get(0).getEmployeeName());
        assertEquals(testDate, result.get(0).getDate());
        assertEquals("出勤漏れ", result.get(0).getIssue());
    }
    
    @Test
    @DisplayName("遅刻チェックテスト")
    void testCheckInconsistencies_LateArrival() {
        // Given
        LocalDate testDate = LocalDate.of(2025, 9, 1);
        LocalDateTime lateClockIn = LocalDateTime.of(2025, 9, 1, 9, 5);
        AttendanceRecord record = new AttendanceRecord(3L, testDate);
        record.setClockInTime(lateClockIn);
        record.setClockOutTime(LocalDateTime.of(2025, 9, 1, 18, 0));
        
        List<AttendanceRecord> records = Arrays.asList(record);
        List<Employee> employees = Arrays.asList(testEmployee2);
        
        when(attendanceRecordRepository.findAll()).thenReturn(records);
        when(employeeRepository.findAll()).thenReturn(employees);
        when(timeCalculator.calculateLateMinutes(lateClockIn)).thenReturn(5);
        
        // When
        List<InconsistencyResponse> result = attendanceConsistencyCheckService.checkInconsistencies();
        
        // Then
        assertEquals(1, result.size());
        assertEquals(3L, result.get(0).getEmployeeId());
        assertEquals("佐藤花子", result.get(0).getEmployeeName());
        assertEquals(testDate, result.get(0).getDate());
        assertEquals("遅刻", result.get(0).getIssue());
    }
    
    @Test
    @DisplayName("早退チェックテスト")
    void testCheckInconsistencies_EarlyLeave() {
        // Given
        LocalDate testDate = LocalDate.of(2025, 9, 1);
        LocalDateTime earlyClockOut = LocalDateTime.of(2025, 9, 1, 17, 50);
        AttendanceRecord record = new AttendanceRecord(4L, testDate);
        record.setClockInTime(LocalDateTime.of(2025, 9, 1, 9, 0));
        record.setClockOutTime(earlyClockOut);
        
        List<AttendanceRecord> records = Arrays.asList(record);
        List<Employee> employees = Arrays.asList(testEmployee3);
        
        when(attendanceRecordRepository.findAll()).thenReturn(records);
        when(employeeRepository.findAll()).thenReturn(employees);
        when(timeCalculator.calculateEarlyLeaveMinutes(earlyClockOut)).thenReturn(10);
        
        // When
        List<InconsistencyResponse> result = attendanceConsistencyCheckService.checkInconsistencies();
        
        // Then
        assertEquals(1, result.size());
        assertEquals(4L, result.get(0).getEmployeeId());
        assertEquals("田中次郎", result.get(0).getEmployeeName());
        assertEquals(testDate, result.get(0).getDate());
        assertEquals("早退", result.get(0).getIssue());
    }
    
    @Test
    @DisplayName("複数の不整合チェックテスト")
    void testCheckInconsistencies_MultipleIssues() {
        // Given
        LocalDate testDate = LocalDate.of(2025, 9, 1);
        
        // 退勤漏れ
        AttendanceRecord record1 = new AttendanceRecord(2L, testDate);
        record1.setClockInTime(LocalDateTime.of(2025, 9, 1, 9, 0));
        record1.setClockOutTime(null);
        
        // 遅刻
        LocalDateTime lateClockIn = LocalDateTime.of(2025, 9, 1, 9, 5);
        AttendanceRecord record2 = new AttendanceRecord(3L, testDate);
        record2.setClockInTime(lateClockIn);
        record2.setClockOutTime(LocalDateTime.of(2025, 9, 1, 18, 0));
        
        // 早退
        LocalDateTime earlyClockOut = LocalDateTime.of(2025, 9, 1, 17, 50);
        AttendanceRecord record3 = new AttendanceRecord(4L, testDate);
        record3.setClockInTime(LocalDateTime.of(2025, 9, 1, 9, 0));
        record3.setClockOutTime(earlyClockOut);
        
        List<AttendanceRecord> records = Arrays.asList(record1, record2, record3);
        List<Employee> employees = Arrays.asList(testEmployee1, testEmployee2, testEmployee3);
        
        when(attendanceRecordRepository.findAll()).thenReturn(records);
        when(employeeRepository.findAll()).thenReturn(employees);
        when(timeCalculator.calculateLateMinutes(lateClockIn)).thenReturn(5);
        when(timeCalculator.calculateEarlyLeaveMinutes(earlyClockOut)).thenReturn(10);
        
        // When
        List<InconsistencyResponse> result = attendanceConsistencyCheckService.checkInconsistencies();
        
        // Then
        assertEquals(3, result.size());
        
        // 退勤漏れ
        assertEquals("退勤漏れ", result.get(0).getIssue());
        
        // 遅刻
        assertEquals("遅刻", result.get(1).getIssue());
        
        // 早退
        assertEquals("早退", result.get(2).getIssue());
    }
    
    @Test
    @DisplayName("不整合なしテスト")
    void testCheckInconsistencies_NoIssues() {
        // Given
        LocalDate testDate = LocalDate.of(2025, 9, 1);
        AttendanceRecord record = new AttendanceRecord(2L, testDate);
        record.setClockInTime(LocalDateTime.of(2025, 9, 1, 9, 0));
        record.setClockOutTime(LocalDateTime.of(2025, 9, 1, 18, 0));
        
        List<AttendanceRecord> records = Arrays.asList(record);
        List<Employee> employees = Arrays.asList(testEmployee1);
        
        when(attendanceRecordRepository.findAll()).thenReturn(records);
        when(employeeRepository.findAll()).thenReturn(employees);
        when(timeCalculator.calculateLateMinutes(any())).thenReturn(0);
        when(timeCalculator.calculateEarlyLeaveMinutes(any())).thenReturn(0);
        
        // When
        List<InconsistencyResponse> result = attendanceConsistencyCheckService.checkInconsistencies();
        
        // Then
        assertTrue(result.isEmpty());
    }
}
