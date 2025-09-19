package com.kintai.controller;

import com.kintai.dto.InconsistencyResponse;
import com.kintai.service.AttendanceConsistencyCheckService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.DisplayName;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import com.kintai.config.TestSecurityConfig;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * AttendanceConsistencyCheckControllerのユニットテスト
 */
@WebMvcTest(AttendanceConsistencyCheckController.class)
@Import(TestSecurityConfig.class)
class AttendanceConsistencyCheckControllerTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @MockBean
    private AttendanceConsistencyCheckService attendanceConsistencyCheckService;
    
    
    @BeforeEach
    void setUp() {
        // テスト前のセットアップ
    }
    
    @Test
    @DisplayName("勤怠整合チェックAPI正常系テスト")
    void testGetInconsistencies_Success() throws Exception {
        // Given
        List<InconsistencyResponse> mockInconsistencies = Arrays.asList(
            new InconsistencyResponse(2L, "山田太郎", LocalDate.of(2025, 9, 1), "退勤漏れ"),
            new InconsistencyResponse(3L, "佐藤花子", LocalDate.of(2025, 9, 1), "遅刻"),
            new InconsistencyResponse(4L, "田中次郎", LocalDate.of(2025, 9, 1), "早退")
        );
        
        when(attendanceConsistencyCheckService.checkInconsistencies()).thenReturn(mockInconsistencies);
        
        // When & Then
        mockMvc.perform(get("/api/admin/attendance/inconsistencies")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].employeeId").value(2))
                .andExpect(jsonPath("$[0].employeeName").value("山田太郎"))
                .andExpect(jsonPath("$[0].date").value("2025-09-01"))
                .andExpect(jsonPath("$[0].issue").value("退勤漏れ"))
                .andExpect(jsonPath("$[1].employeeId").value(3))
                .andExpect(jsonPath("$[1].employeeName").value("佐藤花子"))
                .andExpect(jsonPath("$[1].issue").value("遅刻"))
                .andExpect(jsonPath("$[2].employeeId").value(4))
                .andExpect(jsonPath("$[2].employeeName").value("田中次郎"))
                .andExpect(jsonPath("$[2].issue").value("早退"));
    }
    
    @Test
    @DisplayName("勤怠整合チェックAPI空結果テスト")
    void testGetInconsistencies_EmptyResult() throws Exception {
        // Given
        when(attendanceConsistencyCheckService.checkInconsistencies()).thenReturn(Arrays.asList());
        
        // When & Then
        mockMvc.perform(get("/api/admin/attendance/inconsistencies")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }
}
