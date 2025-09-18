package com.kintai.controller;

import com.kintai.dto.VacationRequestDto;
import com.kintai.entity.VacationRequest;
import com.kintai.entity.VacationStatus;
import com.kintai.exception.VacationException;
import com.kintai.service.VacationService;
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

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * VacationControllerのテスト
 */
@WebMvcTest(VacationController.class)
@Import(TestSecurityConfig.class)
class VacationControllerTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @MockBean
    private VacationService vacationService;
    
    
    private VacationRequestDto.VacationData testVacationData;
    private VacationRequest testVacationRequest;
    
    @BeforeEach
    void setUp() {
        // テスト用の有給申請データ
        testVacationData = new VacationRequestDto.VacationData(
                1L, 1L, LocalDate.of(2025, 9, 20), 
                LocalDate.of(2025, 9, 22), 3, "PENDING"
        );
        
        testVacationRequest = new VacationRequest(1L, LocalDate.of(2025, 9, 20), LocalDate.of(2025, 9, 22), "帰省のため");
        testVacationRequest.setVacationId(1L);
        testVacationRequest.setDays(3);
        testVacationRequest.setStatus(VacationStatus.PENDING);
    }
    
    @Test
    @DisplayName("有給申請成功テスト")
    void testCreateVacationRequest_Success() throws Exception {
        // Given
        String requestJson = """
            {
                "employeeId": 1,
                "startDate": "2025-09-20",
                "endDate": "2025-09-22",
                "reason": "帰省のため"
            }
            """;
        
        VacationRequestDto successResponse = new VacationRequestDto(true, "有給申請を受け付けました", testVacationData);
        
        when(vacationService.createVacationRequest(anyLong(), any(LocalDate.class), any(LocalDate.class), anyString()))
                .thenReturn(successResponse);
        
        // When & Then
        mockMvc.perform(post("/api/vacation/request")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("有給申請を受け付けました"))
                .andExpect(jsonPath("$.data.vacationId").value(1))
                .andExpect(jsonPath("$.data.employeeId").value(1))
                .andExpect(jsonPath("$.data.startDate").value("2025-09-20"))
                .andExpect(jsonPath("$.data.endDate").value("2025-09-22"))
                .andExpect(jsonPath("$.data.days").value(3))
                .andExpect(jsonPath("$.data.status").value("PENDING"));
    }
    
    @Test
    @DisplayName("有給申請エラーテスト - 重複申請")
    void testCreateVacationRequest_DuplicateRequest() throws Exception {
        // Given
        String requestJson = """
            {
                "employeeId": 1,
                "startDate": "2025-09-21",
                "endDate": "2025-09-23",
                "reason": "旅行のため"
            }
            """;
        
        VacationException exception = new VacationException(
                VacationException.DUPLICATE_REQUEST, 
                "既に申請済みの日付を含んでいます"
        );
        
        when(vacationService.createVacationRequest(anyLong(), any(LocalDate.class), any(LocalDate.class), anyString()))
                .thenThrow(exception);
        
        // When & Then
        mockMvc.perform(post("/api/vacation/request")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("DUPLICATE_REQUEST"))
                .andExpect(jsonPath("$.message").value("既に申請済みの日付を含んでいます"));
    }
    
    @Test
    @DisplayName("有給申請エラーテスト - 日付範囲不正")
    void testCreateVacationRequest_InvalidDateRange() throws Exception {
        // Given
        String requestJson = """
            {
                "employeeId": 1,
                "startDate": "2025-09-22",
                "endDate": "2025-09-20",
                "reason": "帰省のため"
            }
            """;
        
        VacationException exception = new VacationException(
                VacationException.INVALID_DATE_RANGE, 
                "開始日は終了日より前である必要があります"
        );
        
        when(vacationService.createVacationRequest(anyLong(), any(LocalDate.class), any(LocalDate.class), anyString()))
                .thenThrow(exception);
        
        // When & Then
        mockMvc.perform(post("/api/vacation/request")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("INVALID_DATE_RANGE"))
                .andExpect(jsonPath("$.message").value("開始日は終了日より前である必要があります"));
    }
    
    @Test
    @DisplayName("有給申請エラーテスト - 退職済み従業員")
    void testCreateVacationRequest_RetiredEmployee() throws Exception {
        // Given
        String requestJson = """
            {
                "employeeId": 1,
                "startDate": "2025-09-20",
                "endDate": "2025-09-22",
                "reason": "帰省のため"
            }
            """;
        
        VacationException exception = new VacationException(
                VacationException.RETIRED_EMPLOYEE, 
                "退職済みの従業員です"
        );
        
        when(vacationService.createVacationRequest(anyLong(), any(LocalDate.class), any(LocalDate.class), anyString()))
                .thenThrow(exception);
        
        // When & Then
        mockMvc.perform(post("/api/vacation/request")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("RETIRED_EMPLOYEE"))
                .andExpect(jsonPath("$.message").value("退職済みの従業員です"));
    }
    
    @Test
    @DisplayName("ステータス更新成功テスト - 承認")
    void testUpdateVacationStatus_Success_Approved() throws Exception {
        // Given
        String requestJson = """
            {
                "status": "APPROVED"
            }
            """;
        
        VacationRequestDto.VacationData approvedData = new VacationRequestDto.VacationData(
                1L, 1L, LocalDate.of(2025, 9, 20), 
                LocalDate.of(2025, 9, 22), 3, "APPROVED"
        );
        VacationRequestDto successResponse = new VacationRequestDto(true, "申請を承認しました", approvedData);
        
        when(vacationService.updateVacationStatus(anyLong(), any(VacationStatus.class)))
                .thenReturn(successResponse);
        
        // When & Then
        mockMvc.perform(put("/api/vacation/1/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("申請を承認しました"))
                .andExpect(jsonPath("$.data.status").value("APPROVED"));
    }
    
    @Test
    @DisplayName("ステータス更新成功テスト - 却下")
    void testUpdateVacationStatus_Success_Rejected() throws Exception {
        // Given
        String requestJson = """
            {
                "status": "REJECTED"
            }
            """;
        
        VacationRequestDto.VacationData rejectedData = new VacationRequestDto.VacationData(
                1L, 1L, LocalDate.of(2025, 9, 20), 
                LocalDate.of(2025, 9, 22), 3, "REJECTED"
        );
        VacationRequestDto successResponse = new VacationRequestDto(true, "申請を却下しました", rejectedData);
        
        when(vacationService.updateVacationStatus(anyLong(), any(VacationStatus.class)))
                .thenReturn(successResponse);
        
        // When & Then
        mockMvc.perform(put("/api/vacation/1/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("申請を却下しました"))
                .andExpect(jsonPath("$.data.status").value("REJECTED"));
    }
    
    @Test
    @DisplayName("ステータス更新エラーテスト - 無効なステータス")
    void testUpdateVacationStatus_InvalidStatus() throws Exception {
        // Given
        String requestJson = """
            {
                "status": "INVALID_STATUS"
            }
            """;
        
        // When & Then
        mockMvc.perform(put("/api/vacation/1/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("INVALID_STATUS"))
                .andExpect(jsonPath("$.message").value("無効なステータスです"));
    }
    
    @Test
    @DisplayName("ステータス更新エラーテスト - 申請不存在")
    void testUpdateVacationStatus_VacationNotFound() throws Exception {
        // Given
        String requestJson = """
            {
                "status": "APPROVED"
            }
            """;
        
        VacationException exception = new VacationException(
                VacationException.VACATION_NOT_FOUND, 
                "申請が見つかりません"
        );
        
        when(vacationService.updateVacationStatus(anyLong(), any(VacationStatus.class)))
                .thenThrow(exception);
        
        // When & Then
        mockMvc.perform(put("/api/vacation/999/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("VACATION_NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("申請が見つかりません"));
    }
    
    @Test
    @DisplayName("従業員の有給申請一覧取得テスト")
    void testGetVacationRequests() throws Exception {
        // Given
        List<VacationRequest> requests = Arrays.asList(testVacationRequest);
        
        when(vacationService.getVacationRequestsByEmployee(1L)).thenReturn(requests);
        
        // When & Then
        mockMvc.perform(get("/api/vacation/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].vacationId").value(1))
                .andExpect(jsonPath("$[0].employeeId").value(1))
                .andExpect(jsonPath("$[0].startDate").value("2025-09-20"))
                .andExpect(jsonPath("$[0].endDate").value("2025-09-22"))
                .andExpect(jsonPath("$[0].days").value(3))
                .andExpect(jsonPath("$[0].status").value("PENDING"));
    }
    
    @Test
    @DisplayName("内部エラーテスト")
    void testCreateVacationRequest_InternalError() throws Exception {
        // Given
        String requestJson = """
            {
                "employeeId": 1,
                "startDate": "2025-09-20",
                "endDate": "2025-09-22",
                "reason": "帰省のため"
            }
            """;
        
        when(vacationService.createVacationRequest(anyLong(), any(LocalDate.class), any(LocalDate.class), anyString()))
                .thenThrow(new RuntimeException("データベースエラー"));
        
        // When & Then
        mockMvc.perform(post("/api/vacation/request")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestJson))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("INTERNAL_ERROR"))
                .andExpect(jsonPath("$.message").value("内部エラーが発生しました"));
    }
}
