package com.kintai.entity;

/**
 * 勤怠申請ステータス
 */
public enum SubmissionStatus {
    NOT_SUBMITTED("未申請"),
    SUBMITTED("申請済"),
    APPROVED("承認済");
    
    private final String displayName;
    
    SubmissionStatus(String displayName) {
        this.displayName = displayName;
    }
    
    public String getDisplayName() {
        return displayName;
    }
}
