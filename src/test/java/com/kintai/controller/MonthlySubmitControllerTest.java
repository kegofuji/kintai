package com.kintai.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kintai.dto.MonthlySubmitRequest;
import com.kintai.entity.AttendanceRecord;
import com.kintai.entity.Employee;
import com.kintai.repository.AttendanceRecordRepository;
import com.kintai.repository.EmployeeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import com.kintai.config.TestSecurityConfig;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * 月末申請APIの統合テスト
 */
@WebMvcTest(AttendanceController.class)
@Import(TestSecurityConfig.class)
class MonthlySubmitControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private EmployeeRepository employeeRepository;

    @MockBean
    private AttendanceRecordRepository attendanceRecordRepository;

    @MockBean
    private com.kintai.service.AttendanceService attendanceService;

    private Employee testEmployee;

    @BeforeEach
    void setUp() {
        // テスト用の従業員データを作成
        testEmployee = new Employee("EMP001", "田中", "太郎", "tanaka@example.com", LocalDate.of(2020, 4, 1));
        testEmployee.setEmployeeId(1L);
        testEmployee.setIsActive(true);
        
        // モックの設定
        when(employeeRepository.findByEmployeeId(1L)).thenReturn(java.util.Optional.of(testEmployee));
        when(employeeRepository.findByEmployeeId(999L)).thenReturn(java.util.Optional.empty());
    }

    @Test
    @DisplayName("月末申請成功テスト - 全日打刻あり")
    void testMonthlySubmitSuccess() throws Exception {
        // Given: 完全な勤怠記録をモックで設定
        java.util.List<AttendanceRecord> records = createCompleteAttendanceRecords(1L, "2025-09", 3);
        when(attendanceRecordRepository.findByEmployeeAndMonth(anyLong(), anyString()))
            .thenReturn(records);

        // When & Then
        mockMvc.perform(post("/api/attendance/monthly-submit")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(
                    new MonthlySubmitRequest(1L, "2025-09"))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.message").value("2025-09の勤怠を申請しました"))
            .andExpect(jsonPath("$.data.employeeId").value(1))
            .andExpect(jsonPath("$.data.yearMonth").value("2025-09"))
            .andExpect(jsonPath("$.data.fixedCount").value(3));
    }

    @Test
    @DisplayName("月末申請エラーテスト - 未打刻の日がある")
    void testIncompleteAttendance() throws Exception {
        // Given: 未打刻の勤怠記録を作成（退勤打刻なし）
        createIncompleteAttendanceRecords(1L, "2025-09", 2);

        // When & Then
        mockMvc.perform(post("/api/attendance/monthly-submit")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(
                    new MonthlySubmitRequest(1L, "2025-09"))))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.errorCode").value("INCOMPLETE_ATTENDANCE"))
            .andExpect(jsonPath("$.message").value("未打刻の日があります"));
    }

    @Test
    @DisplayName("月末申請エラーテスト - 未来月の申請")
    void testFutureMonthNotAllowed() throws Exception {
        // When & Then
        mockMvc.perform(post("/api/attendance/monthly-submit")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(
                    new MonthlySubmitRequest(1L, "2026-01"))))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.errorCode").value("FUTURE_MONTH_NOT_ALLOWED"))
            .andExpect(jsonPath("$.message").value("未来月の申請はできません"));
    }

    @Test
    @DisplayName("月末申請エラーテスト - 既に申請済み")
    void testAlreadySubmitted() throws Exception {
        // Given: 既に確定済みの勤怠記録を作成
        createFixedAttendanceRecords(1L, "2025-09", 2);

        // When & Then
        mockMvc.perform(post("/api/attendance/monthly-submit")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(
                    new MonthlySubmitRequest(1L, "2025-09"))))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.errorCode").value("ALREADY_SUBMITTED"))
            .andExpect(jsonPath("$.message").value("既に申請済みです"));
    }

    @Test
    @DisplayName("月末申請エラーテスト - 従業員が存在しない")
    void testEmployeeNotFound() throws Exception {
        // When & Then
        mockMvc.perform(post("/api/attendance/monthly-submit")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(
                    new MonthlySubmitRequest(999L, "2025-09"))))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.errorCode").value("EMPLOYEE_NOT_FOUND"))
            .andExpect(jsonPath("$.message").value("従業員が見つかりません"));
    }

    @Test
    @DisplayName("月末申請エラーテスト - 該当月の勤怠記録なし")
    void testNoRecordsFound() throws Exception {
        // When & Then
        mockMvc.perform(post("/api/attendance/monthly-submit")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(
                    new MonthlySubmitRequest(1L, "2025-08"))))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.errorCode").value("NO_RECORDS_FOUND"))
            .andExpect(jsonPath("$.message").value("該当月の勤怠記録が見つかりません"));
    }

    @Test
    @DisplayName("月末申請バリデーションエラーテスト - 従業員IDがnull")
    void testValidationErrorEmployeeIdNull() throws Exception {
        // When & Then
        mockMvc.perform(post("/api/attendance/monthly-submit")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"employeeId\":null,\"yearMonth\":\"2025-09\"}"))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("月末申請バリデーションエラーテスト - 年月が不正な形式")
    void testValidationErrorInvalidYearMonth() throws Exception {
        // When & Then
        mockMvc.perform(post("/api/attendance/monthly-submit")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"employeeId\":1,\"yearMonth\":\"2025/09\"}"))
            .andExpect(status().isBadRequest());
    }

    /**
     * 完全な勤怠記録を作成（出勤・退勤両方打刻済み）
     */
    private java.util.List<AttendanceRecord> createCompleteAttendanceRecords(Long employeeId, String yearMonth, int count) {
        java.util.List<AttendanceRecord> records = new java.util.ArrayList<>();
        for (int i = 1; i <= count; i++) {
            AttendanceRecord record = new AttendanceRecord(employeeId, LocalDate.of(2025, 9, i));
            record.setClockInTime(LocalDateTime.of(2025, 9, i, 9, 0));
            record.setClockOutTime(LocalDateTime.of(2025, 9, i, 18, 0));
            record.setAttendanceFixedFlag(false);
            records.add(record);
        }
        return records;
    }

    /**
     * 未打刻の勤怠記録を作成（退勤打刻なし）
     */
    private java.util.List<AttendanceRecord> createIncompleteAttendanceRecords(Long employeeId, String yearMonth, int count) {
        java.util.List<AttendanceRecord> records = new java.util.ArrayList<>();
        for (int i = 1; i <= count; i++) {
            AttendanceRecord record = new AttendanceRecord(employeeId, LocalDate.of(2025, 9, i));
            record.setClockInTime(LocalDateTime.of(2025, 9, i, 9, 0));
            record.setClockOutTime(null); // 退勤打刻なし
            record.setAttendanceFixedFlag(false);
            records.add(record);
        }
        return records;
    }

    /**
     * 既に確定済みの勤怠記録を作成
     */
    private java.util.List<AttendanceRecord> createFixedAttendanceRecords(Long employeeId, String yearMonth, int count) {
        java.util.List<AttendanceRecord> records = new java.util.ArrayList<>();
        for (int i = 1; i <= count; i++) {
            AttendanceRecord record = new AttendanceRecord(employeeId, LocalDate.of(2025, 9, i));
            record.setClockInTime(LocalDateTime.of(2025, 9, i, 9, 0));
            record.setClockOutTime(LocalDateTime.of(2025, 9, i, 18, 0));
            record.setAttendanceFixedFlag(true); // 既に確定済み
            records.add(record);
        }
        return records;
    }
}
