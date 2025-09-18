package com.kintai.controller;

import com.kintai.dto.VacationRequestDto;
import com.kintai.entity.VacationRequest;
import com.kintai.entity.VacationStatus;
import com.kintai.exception.VacationException;
import com.kintai.service.VacationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * 有給休暇申請コントローラー
 */
@RestController
@RequestMapping("/api/vacation")
@Validated
public class VacationController {
    
    @Autowired
    private VacationService vacationService;
    
    /**
     * 有給休暇申請API
     * @param request 有給申請リクエスト
     * @return 申請レスポンス
     */
    @PostMapping("/request")
    public ResponseEntity<VacationRequestDto> createVacationRequest(@Valid @RequestBody VacationRequestRequest request) {
        try {
            VacationRequestDto response = vacationService.createVacationRequest(
                    request.getEmployeeId(),
                    request.getStartDate(),
                    request.getEndDate(),
                    request.getReason()
            );
            return ResponseEntity.ok(response);
        } catch (VacationException e) {
            VacationRequestDto errorResponse = new VacationRequestDto(false, e.getErrorCode(), e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            VacationRequestDto errorResponse = new VacationRequestDto(false, "INTERNAL_ERROR", "内部エラーが発生しました");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
    
    /**
     * 有給申請ステータス更新API
     * @param vacationId 申請ID
     * @param request ステータス更新リクエスト
     * @return 更新レスポンス
     */
    @PutMapping("/{vacationId}/status")
    public ResponseEntity<VacationRequestDto> updateVacationStatus(
            @PathVariable Long vacationId,
            @Valid @RequestBody StatusUpdateRequest request) {
        try {
            VacationStatus status = VacationStatus.valueOf(request.getStatus().toUpperCase());
            VacationRequestDto response = vacationService.updateVacationStatus(vacationId, status);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            VacationRequestDto errorResponse = new VacationRequestDto(false, "INVALID_STATUS", "無効なステータスです");
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (VacationException e) {
            VacationRequestDto errorResponse = new VacationRequestDto(false, e.getErrorCode(), e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            VacationRequestDto errorResponse = new VacationRequestDto(false, "INTERNAL_ERROR", "内部エラーが発生しました");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
    
    /**
     * 従業員の有給申請一覧取得API
     * @param employeeId 従業員ID
     * @return 申請一覧
     */
    @GetMapping("/{employeeId}")
    public ResponseEntity<List<VacationRequest>> getVacationRequests(@PathVariable Long employeeId) {
        try {
            List<VacationRequest> requests = vacationService.getVacationRequestsByEmployee(employeeId);
            return ResponseEntity.ok(requests);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * CSRFトークン取得API
     * @param request HTTPリクエスト
     * @return CSRFトークン
     */
    @GetMapping("/csrf-token")
    public ResponseEntity<CsrfToken> getCsrfToken(HttpServletRequest request) {
        CsrfToken csrfToken = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
        return ResponseEntity.ok(csrfToken);
    }
    
    /**
     * 有給申請リクエスト内部クラス
     */
    public static class VacationRequestRequest {
        private Long employeeId;
        private LocalDate startDate;
        private LocalDate endDate;
        private String reason;
        
        // デフォルトコンストラクタ
        public VacationRequestRequest() {
        }
        
        // ゲッター・セッター
        public Long getEmployeeId() {
            return employeeId;
        }
        
        public void setEmployeeId(Long employeeId) {
            this.employeeId = employeeId;
        }
        
        public LocalDate getStartDate() {
            return startDate;
        }
        
        public void setStartDate(LocalDate startDate) {
            this.startDate = startDate;
        }
        
        public LocalDate getEndDate() {
            return endDate;
        }
        
        public void setEndDate(LocalDate endDate) {
            this.endDate = endDate;
        }
        
        public String getReason() {
            return reason;
        }
        
        public void setReason(String reason) {
            this.reason = reason;
        }
    }
    
    /**
     * ステータス更新リクエスト内部クラス
     */
    public static class StatusUpdateRequest {
        private String status;
        
        // デフォルトコンストラクタ
        public StatusUpdateRequest() {
        }
        
        // ゲッター・セッター
        public String getStatus() {
            return status;
        }
        
        public void setStatus(String status) {
            this.status = status;
        }
    }
}
