package com.kintai.controller;

import com.kintai.dto.ClockInRequest;
import com.kintai.dto.ClockOutRequest;
import com.kintai.dto.ClockResponse;
import com.kintai.exception.AttendanceException;
import com.kintai.service.AttendanceService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

/**
 * 勤怠管理コントローラー
 */
@RestController
@RequestMapping("/api/attendance")
@Validated
public class AttendanceController {
    
    @Autowired
    private AttendanceService attendanceService;
    
    /**
     * 出勤打刻API
     * @param request 出勤打刻リクエスト
     * @return 打刻レスポンス
     */
    @PostMapping("/clock-in")
    public ResponseEntity<ClockResponse> clockIn(@Valid @RequestBody ClockInRequest request) {
        try {
            ClockResponse response = attendanceService.clockIn(request);
            return ResponseEntity.ok(response);
        } catch (AttendanceException e) {
            ClockResponse errorResponse = new ClockResponse(false, e.getErrorCode(), e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            ClockResponse errorResponse = new ClockResponse(false, "INTERNAL_ERROR", "内部エラーが発生しました");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
    
    /**
     * 退勤打刻API
     * @param request 退勤打刻リクエスト
     * @return 打刻レスポンス
     */
    @PostMapping("/clock-out")
    public ResponseEntity<ClockResponse> clockOut(@Valid @RequestBody ClockOutRequest request) {
        try {
            ClockResponse response = attendanceService.clockOut(request);
            return ResponseEntity.ok(response);
        } catch (AttendanceException e) {
            ClockResponse errorResponse = new ClockResponse(false, e.getErrorCode(), e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        } catch (Exception e) {
            ClockResponse errorResponse = new ClockResponse(false, "INTERNAL_ERROR", "内部エラーが発生しました");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
    
    /**
     * ヘルスチェックAPI
     * @return ヘルスステータス
     */
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("勤怠管理システムは正常に動作しています");
    }
}
