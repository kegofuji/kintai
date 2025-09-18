package com.kintai.dto;

import java.time.LocalDateTime;

/**
 * 打刻レスポンスDTO
 */
public class ClockResponse {
    
    private boolean success;
    private String message;
    private String errorCode;
    private Object data;
    
    // デフォルトコンストラクタ
    public ClockResponse() {
    }
    
    // 成功レスポンス用コンストラクタ
    public ClockResponse(boolean success, String message, ClockData data) {
        this.success = success;
        this.message = message;
        this.data = data;
    }
    
    // 月末申請成功レスポンス用コンストラクタ
    public ClockResponse(boolean success, String message, MonthlySubmitData data) {
        this.success = success;
        this.message = message;
        this.data = data;
    }
    
    // エラーレスポンス用コンストラクタ
    public ClockResponse(boolean success, String errorCode, String message) {
        this.success = success;
        this.errorCode = errorCode;
        this.message = message;
    }
    
    // ゲッター・セッター
    public boolean isSuccess() {
        return success;
    }
    
    public void setSuccess(boolean success) {
        this.success = success;
    }
    
    public String getMessage() {
        return message;
    }
    
    public void setMessage(String message) {
        this.message = message;
    }
    
    public String getErrorCode() {
        return errorCode;
    }
    
    public void setErrorCode(String errorCode) {
        this.errorCode = errorCode;
    }
    
    public Object getData() {
        return data;
    }
    
    public void setData(Object data) {
        this.data = data;
    }
    
    /**
     * 打刻データ内部クラス
     */
    public static class ClockData {
        private Long attendanceId;
        private LocalDateTime clockInTime;
        private LocalDateTime clockOutTime;
        private Integer lateMinutes;
        private Integer earlyLeaveMinutes;
        private Integer overtimeMinutes;
        private Integer nightShiftMinutes;
        
        // デフォルトコンストラクタ
        public ClockData() {
        }
        
        // コンストラクタ
        public ClockData(Long attendanceId, LocalDateTime clockInTime, LocalDateTime clockOutTime,
                        Integer lateMinutes, Integer earlyLeaveMinutes, Integer overtimeMinutes, Integer nightShiftMinutes) {
            this.attendanceId = attendanceId;
            this.clockInTime = clockInTime;
            this.clockOutTime = clockOutTime;
            this.lateMinutes = lateMinutes;
            this.earlyLeaveMinutes = earlyLeaveMinutes;
            this.overtimeMinutes = overtimeMinutes;
            this.nightShiftMinutes = nightShiftMinutes;
        }
        
        // ゲッター・セッター
        public Long getAttendanceId() {
            return attendanceId;
        }
        
        public void setAttendanceId(Long attendanceId) {
            this.attendanceId = attendanceId;
        }
        
        public LocalDateTime getClockInTime() {
            return clockInTime;
        }
        
        public void setClockInTime(LocalDateTime clockInTime) {
            this.clockInTime = clockInTime;
        }
        
        public LocalDateTime getClockOutTime() {
            return clockOutTime;
        }
        
        public void setClockOutTime(LocalDateTime clockOutTime) {
            this.clockOutTime = clockOutTime;
        }
        
        public Integer getLateMinutes() {
            return lateMinutes;
        }
        
        public void setLateMinutes(Integer lateMinutes) {
            this.lateMinutes = lateMinutes;
        }
        
        public Integer getEarlyLeaveMinutes() {
            return earlyLeaveMinutes;
        }
        
        public void setEarlyLeaveMinutes(Integer earlyLeaveMinutes) {
            this.earlyLeaveMinutes = earlyLeaveMinutes;
        }
        
        public Integer getOvertimeMinutes() {
            return overtimeMinutes;
        }
        
        public void setOvertimeMinutes(Integer overtimeMinutes) {
            this.overtimeMinutes = overtimeMinutes;
        }
        
        public Integer getNightShiftMinutes() {
            return nightShiftMinutes;
        }
        
        public void setNightShiftMinutes(Integer nightShiftMinutes) {
            this.nightShiftMinutes = nightShiftMinutes;
        }
    }
    
    /**
     * 月末申請データ内部クラス
     */
    public static class MonthlySubmitData {
        private Long employeeId;
        private String yearMonth;
        private Integer fixedCount;
        
        // デフォルトコンストラクタ
        public MonthlySubmitData() {
        }
        
        // コンストラクタ
        public MonthlySubmitData(Long employeeId, String yearMonth, Integer fixedCount) {
            this.employeeId = employeeId;
            this.yearMonth = yearMonth;
            this.fixedCount = fixedCount;
        }
        
        // ゲッター・セッター
        public Long getEmployeeId() {
            return employeeId;
        }
        
        public void setEmployeeId(Long employeeId) {
            this.employeeId = employeeId;
        }
        
        public String getYearMonth() {
            return yearMonth;
        }
        
        public void setYearMonth(String yearMonth) {
            this.yearMonth = yearMonth;
        }
        
        public Integer getFixedCount() {
            return fixedCount;
        }
        
        public void setFixedCount(Integer fixedCount) {
            this.fixedCount = fixedCount;
        }
    }
}
