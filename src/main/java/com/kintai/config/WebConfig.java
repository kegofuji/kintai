package com.kintai.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

/**
 * Web設定クラス
 */
@Configuration
public class WebConfig {
    
    /**
     * RestTemplateのBeanを定義
     * FastAPIマイクロサービスとの通信に使用
     */
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
