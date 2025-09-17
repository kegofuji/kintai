package com.kintai.service;

import com.kintai.dto.ClockInRequest;
import com.kintai.dto.ClockOutRequest;
import com.kintai.dto.ClockResponse;
import com.kintai.entity.AttendanceRecord;
import com.kintai.entity.AttendanceStatus;
import com.kintai.entity.Employee;
import com.kintai.exception.AttendanceException;
import com.kintai.repository.AttendanceRecordRepository;
import com.kintai.repository.EmployeeRepository;
import com.kintai.util.TimeCalculator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 勤怠管理サービス
 */
@Service
@Transactional
public class AttendanceService {
    
    @Autowired
    private AttendanceRecordRepository attendanceRecordRepository;
    
    @Autowired
    private EmployeeRepository employeeRepository;
    
    @Autowired
    private TimeCalculator timeCalculator;
    
    /**
     * 出勤打刻処理
     * @param request 出勤打刻リクエスト
     * @return 打刻レスポンス
     */
    public ClockResponse clockIn(ClockInRequest request) {
        Long employeeId = request.getEmployeeId();
        LocalDate today = LocalDate.now();
        LocalDateTime now = timeCalculator.getCurrentTokyoTime();
        
        // 1. 従業員存在チェック
        Employee employee = employeeRepository.findByEmployeeId(employeeId)
                .orElseThrow(() -> new AttendanceException(
                        AttendanceException.EMPLOYEE_NOT_FOUND, 
                        "従業員が見つかりません"));
        
        // 2. 退職者チェック
        if (employee.isRetired()) {
            throw new AttendanceException(
                    AttendanceException.RETIRED_EMPLOYEE, 
                    "退職済みの従業員です");
        }
        
        // 3. 重複出勤チェック
        if (attendanceRecordRepository.existsByEmployeeIdAndAttendanceDateAndClockInTimeIsNotNull(employeeId, today)) {
            throw new AttendanceException(
                    AttendanceException.ALREADY_CLOCKED_IN, 
                    "既に出勤打刻済みです");
        }
        
        // 4. 出勤打刻記録作成
        AttendanceRecord attendanceRecord = new AttendanceRecord(employeeId, today);
        attendanceRecord.setClockInTime(now);
        
        // 5. 遅刻時間計算
        int lateMinutes = timeCalculator.calculateLateMinutes(now);
        attendanceRecord.setLateMinutes(lateMinutes);
        
        // 6. 勤怠ステータス設定
        if (lateMinutes > 0) {
            attendanceRecord.setAttendanceStatus(AttendanceStatus.LATE);
        }
        
        // 7. データベース保存
        AttendanceRecord savedRecord = attendanceRecordRepository.save(attendanceRecord);
        
        // 8. レスポンス作成
        ClockResponse.ClockData data = new ClockResponse.ClockData(
                savedRecord.getAttendanceId(),
                savedRecord.getClockInTime(),
                null,
                savedRecord.getLateMinutes(),
                null,
                null,
                null
        );
        
        String message = lateMinutes > 0 ? 
                String.format("出勤打刻完了（%d分遅刻）", lateMinutes) : 
                "出勤打刻完了";
        
        return new ClockResponse(true, message, data);
    }
    
    /**
     * 退勤打刻処理
     * @param request 退勤打刻リクエスト
     * @return 打刻レスポンス
     */
    public ClockResponse clockOut(ClockOutRequest request) {
        try {
            Long employeeId = request.getEmployeeId();
            LocalDate today = LocalDate.now();
            LocalDateTime now = timeCalculator.getCurrentTokyoTime();
            
            // 1. 従業員存在チェック
            Employee employee = employeeRepository.findByEmployeeId(employeeId)
                    .orElseThrow(() -> new AttendanceException(
                            AttendanceException.EMPLOYEE_NOT_FOUND, 
                            "従業員が見つかりません"));
            
            // 2. 退職者チェック
            if (employee.isRetired()) {
                throw new AttendanceException(
                        AttendanceException.RETIRED_EMPLOYEE, 
                        "退職済みの従業員です");
            }
            
            // 3. 出勤済みチェック
            AttendanceRecord attendanceRecord = attendanceRecordRepository
                    .findEditableRecord(employeeId, today)
                    .orElseThrow(() -> new AttendanceException(
                            AttendanceException.NOT_CLOCKED_IN, 
                            "出勤打刻がされていません"));
            
            // 4. 既に退勤済みチェック
            if (attendanceRecord.getClockOutTime() != null) {
                throw new AttendanceException(
                        AttendanceException.ALREADY_CLOCKED_IN, 
                        "既に退勤打刻済みです");
            }
            
            // 5. 退勤時刻設定
            attendanceRecord.setClockOutTime(now);
            
            // 6. 時間計算
            LocalDateTime clockInTime = attendanceRecord.getClockInTime();
            
            // 早退時間計算
            int earlyLeaveMinutes = timeCalculator.calculateEarlyLeaveMinutes(now);
            attendanceRecord.setEarlyLeaveMinutes(earlyLeaveMinutes);
            
            // 実働時間計算
            int workingMinutes = timeCalculator.calculateWorkingMinutes(clockInTime, now);
            
            // 残業時間計算
            int overtimeMinutes = timeCalculator.calculateOvertimeMinutes(workingMinutes);
            attendanceRecord.setOvertimeMinutes(overtimeMinutes);
            
            // 深夜勤務時間計算
            int nightShiftMinutes = timeCalculator.calculateNightShiftMinutes(clockInTime, now);
            attendanceRecord.setNightShiftMinutes(nightShiftMinutes);
            
            // 7. 勤怠ステータス更新
            updateAttendanceStatus(attendanceRecord, earlyLeaveMinutes, overtimeMinutes, nightShiftMinutes);
            
            // 8. データベース保存
            AttendanceRecord savedRecord = attendanceRecordRepository.save(attendanceRecord);
            
            // 9. レスポンス作成
            ClockResponse.ClockData data = new ClockResponse.ClockData(
                    savedRecord.getAttendanceId(),
                    savedRecord.getClockInTime(),
                    savedRecord.getClockOutTime(),
                    savedRecord.getLateMinutes(),
                    savedRecord.getEarlyLeaveMinutes(),
                    savedRecord.getOvertimeMinutes(),
                    savedRecord.getNightShiftMinutes()
            );
            
            String message = buildClockOutMessage(overtimeMinutes, earlyLeaveMinutes, nightShiftMinutes);
            
            return new ClockResponse(true, message, data);
        } catch (AttendanceException e) {
            throw e;
        } catch (Exception e) {
            e.printStackTrace();
            throw new AttendanceException("INTERNAL_ERROR", "内部エラーが発生しました: " + e.getMessage());
        }
    }
    
    /**
     * 勤怠ステータスを更新
     * @param record 勤怠記録
     * @param earlyLeaveMinutes 早退分数
     * @param overtimeMinutes 残業分数
     * @param nightShiftMinutes 深夜勤務分数
     */
    private void updateAttendanceStatus(AttendanceRecord record, int earlyLeaveMinutes, 
                                      int overtimeMinutes, int nightShiftMinutes) {
        boolean isLate = record.getLateMinutes() > 0;
        boolean isEarlyLeave = earlyLeaveMinutes > 0;
        boolean isOvertime = overtimeMinutes > 0;
        boolean isNightShift = nightShiftMinutes > 0;
        
        if (isLate && isEarlyLeave) {
            record.setAttendanceStatus(AttendanceStatus.LATE_AND_EARLY_LEAVE);
        } else if (isLate) {
            record.setAttendanceStatus(AttendanceStatus.LATE);
        } else if (isEarlyLeave) {
            record.setAttendanceStatus(AttendanceStatus.EARLY_LEAVE);
        } else if (isNightShift) {
            record.setAttendanceStatus(AttendanceStatus.NIGHT_SHIFT);
        } else if (isOvertime) {
            record.setAttendanceStatus(AttendanceStatus.OVERTIME);
        } else {
            record.setAttendanceStatus(AttendanceStatus.NORMAL);
        }
    }
    
    /**
     * 退勤メッセージを構築
     * @param overtimeMinutes 残業分数
     * @param earlyLeaveMinutes 早退分数
     * @param nightShiftMinutes 深夜勤務分数
     * @return メッセージ
     */
    private String buildClockOutMessage(int overtimeMinutes, int earlyLeaveMinutes, int nightShiftMinutes) {
        StringBuilder message = new StringBuilder("退勤打刻完了");
        
        if (overtimeMinutes > 0) {
            message.append(String.format("（%d分残業）", overtimeMinutes));
        }
        
        if (earlyLeaveMinutes > 0) {
            message.append(String.format("（%d分早退）", earlyLeaveMinutes));
        }
        
        if (nightShiftMinutes > 0) {
            message.append(String.format("（%d分深夜勤務）", nightShiftMinutes));
        }
        
        return message.toString();
    }
}
