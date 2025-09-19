package com.kintai.controller;

import com.kintai.dto.AdjustmentRequestDto;
import com.kintai.entity.AdjustmentRequest;
import com.kintai.exception.AttendanceException;
import com.kintai.service.AdjustmentRequestService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 勤怠修正申請コントローラー（社員用）
 */
@RestController
@RequestMapping("/api/attendance")
@Validated
public class AdjustmentRequestController {
    
    @Autowired
    private AdjustmentRequestService adjustmentRequestService;
    
    /**
     * 修正申請作成API
     * @param requestDto 修正申請DTO
     * @return 作成された修正申請
     */
    @PostMapping("/adjustment")
    public ResponseEntity<Map<String, Object>> createAdjustmentRequest(@Valid @RequestBody AdjustmentRequestDto requestDto) {
        try {
            AdjustmentRequest adjustmentRequest = adjustmentRequestService.createAdjustmentRequest(requestDto);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "修正申請が正常に作成されました");
            response.put("adjustmentRequestId", adjustmentRequest.getAdjustmentRequestId());
            response.put("status", adjustmentRequest.getStatus());
            response.put("createdAt", adjustmentRequest.getCreatedAt());
            
            return ResponseEntity.ok(response);
        } catch (AttendanceException e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("errorCode", e.getErrorCode());
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("errorCode", "INTERNAL_ERROR");
            errorResponse.put("message", "内部エラーが発生しました");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
    
    /**
     * 修正申請一覧取得API（社員用）
     * @param employeeId 従業員ID
     * @return 修正申請リスト
     */
    @GetMapping("/adjustment/{employeeId}")
    public ResponseEntity<Map<String, Object>> getAdjustmentRequests(@PathVariable Long employeeId) {
        try {
            List<AdjustmentRequest> adjustmentRequests = adjustmentRequestService.getAdjustmentRequestsByEmployee(employeeId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", adjustmentRequests);
            response.put("count", adjustmentRequests.size());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("errorCode", "INTERNAL_ERROR");
            errorResponse.put("message", "内部エラーが発生しました");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
}
