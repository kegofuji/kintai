package com.kintai.service;

import com.kintai.dto.VacationRequestDto;
import com.kintai.entity.Employee;
import com.kintai.entity.VacationRequest;
import com.kintai.entity.VacationStatus;
import com.kintai.exception.VacationException;
import com.kintai.repository.EmployeeRepository;
import com.kintai.repository.VacationRequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * 有給休暇申請サービス
 */
@Service
@Transactional
public class VacationService {
    
    @Autowired
    private VacationRequestRepository vacationRequestRepository;
    
    @Autowired
    private EmployeeRepository employeeRepository;
    
    /**
     * 有給休暇申請処理
     * @param employeeId 従業員ID
     * @param startDate 開始日
     * @param endDate 終了日
     * @param reason 理由
     * @return 申請レスポンス
     */
    public VacationRequestDto createVacationRequest(Long employeeId, LocalDate startDate, 
                                                  LocalDate endDate, String reason) {
        try {
            // 1. 従業員存在チェック
            Employee employee = employeeRepository.findByEmployeeId(employeeId)
                    .orElseThrow(() -> new VacationException(
                            VacationException.EMPLOYEE_NOT_FOUND, 
                            "従業員が見つかりません"));
            
            // 2. 退職者チェック
            if (employee.isRetired()) {
                throw new VacationException(
                        VacationException.RETIRED_EMPLOYEE, 
                        "退職済みの従業員です");
            }
            
            // 3. 日付範囲バリデーション
            validateDateRange(startDate, endDate);
            
            // 4. 重複申請チェック
            if (vacationRequestRepository.existsOverlappingRequest(employeeId, startDate, endDate)) {
                throw new VacationException(
                        VacationException.DUPLICATE_REQUEST, 
                        "既に申請済みの日付を含んでいます");
            }
            
            // 5. 申請日数計算
            int days = calculateVacationDays(startDate, endDate);
            
            // 6. 有給申請作成
            VacationRequest vacationRequest = new VacationRequest(employeeId, startDate, endDate, reason);
            vacationRequest.setDays(days);
            
            // 7. データベース保存
            VacationRequest savedRequest = vacationRequestRepository.save(vacationRequest);
            
            // 8. レスポンス作成
            VacationRequestDto.VacationData data = new VacationRequestDto.VacationData(
                    savedRequest.getVacationId(),
                    savedRequest.getEmployeeId(),
                    savedRequest.getStartDate(),
                    savedRequest.getEndDate(),
                    savedRequest.getDays(),
                    savedRequest.getStatus().name()
            );
            
            String message = "有給申請を受け付けました";
            return new VacationRequestDto(true, message, data);
            
        } catch (VacationException e) {
            throw e;
        } catch (Exception e) {
            e.printStackTrace();
            throw new VacationException("INTERNAL_ERROR", "内部エラーが発生しました: " + e.getMessage());
        }
    }
    
    /**
     * 有給申請ステータス更新
     * @param vacationId 申請ID
     * @param status 新しいステータス
     * @return 更新レスポンス
     */
    public VacationRequestDto updateVacationStatus(Long vacationId, VacationStatus status) {
        try {
            // 1. 申請存在チェック
            VacationRequest vacationRequest = vacationRequestRepository.findById(vacationId)
                    .orElseThrow(() -> new VacationException(
                            VacationException.VACATION_NOT_FOUND, 
                            "申請が見つかりません"));
            
            // 2. ステータス変更バリデーション
            validateStatusChange(vacationRequest.getStatus(), status);
            
            // 3. ステータス更新
            vacationRequest.setStatus(status);
            VacationRequest savedRequest = vacationRequestRepository.save(vacationRequest);
            
            // 4. レスポンス作成
            VacationRequestDto.VacationData data = new VacationRequestDto.VacationData(
                    savedRequest.getVacationId(),
                    savedRequest.getEmployeeId(),
                    savedRequest.getStartDate(),
                    savedRequest.getEndDate(),
                    savedRequest.getDays(),
                    savedRequest.getStatus().name()
            );
            
            String message = String.format("申請を%sしました", status.getDisplayName());
            return new VacationRequestDto(true, message, data);
            
        } catch (VacationException e) {
            throw e;
        } catch (Exception e) {
            e.printStackTrace();
            throw new VacationException("INTERNAL_ERROR", "内部エラーが発生しました: " + e.getMessage());
        }
    }
    
    /**
     * 従業員の有給申請一覧取得
     * @param employeeId 従業員ID
     * @return 申請一覧
     */
    public List<VacationRequest> getVacationRequestsByEmployee(Long employeeId) {
        return vacationRequestRepository.findByEmployeeIdOrderByCreatedAtDesc(employeeId);
    }
    
    /**
     * 日付範囲のバリデーション
     * @param startDate 開始日
     * @param endDate 終了日
     */
    private void validateDateRange(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null) {
            throw new VacationException(
                    VacationException.INVALID_DATE_RANGE, 
                    "開始日と終了日は必須です");
        }
        
        if (startDate.isAfter(endDate)) {
            throw new VacationException(
                    VacationException.INVALID_DATE_RANGE, 
                    "開始日は終了日より前である必要があります");
        }
        
        if (startDate.isBefore(LocalDate.now())) {
            throw new VacationException(
                    VacationException.INVALID_DATE_RANGE, 
                    "過去の日付は申請できません");
        }
    }
    
    /**
     * 有給日数を計算
     * @param startDate 開始日
     * @param endDate 終了日
     * @return 日数
     */
    private int calculateVacationDays(LocalDate startDate, LocalDate endDate) {
        return (int) ChronoUnit.DAYS.between(startDate, endDate) + 1;
    }
    
    /**
     * ステータス変更のバリデーション
     * @param currentStatus 現在のステータス
     * @param newStatus 新しいステータス
     */
    private void validateStatusChange(VacationStatus currentStatus, VacationStatus newStatus) {
        if (currentStatus == VacationStatus.APPROVED || currentStatus == VacationStatus.REJECTED) {
            throw new VacationException(
                    VacationException.INVALID_STATUS_CHANGE, 
                    "既に処理済みの申請は変更できません");
        }
        
        if (currentStatus == newStatus) {
            throw new VacationException(
                    VacationException.INVALID_STATUS_CHANGE, 
                    "同じステータスに変更することはできません");
        }
    }
}
