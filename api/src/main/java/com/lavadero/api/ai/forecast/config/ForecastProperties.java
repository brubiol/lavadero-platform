package com.lavadero.api.ai.forecast.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Routing flag for the demand forecaster. {@code provider} selects between the
 * in-process Java seasonal model ({@code "java"}, default) and the out-of-process
 * Python LightGBM sidecar ({@code "python"}). Default keeps existing behavior
 * intact; the python path is opt-in per environment.
 */
@Component
@ConfigurationProperties(prefix = "lavadero.forecast")
public class ForecastProperties {

    private String provider = "java";
    private String pythonBaseUrl = "http://lavadero-forecast:8081";
    private int pythonTimeoutSeconds = 30;

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }

    public String getPythonBaseUrl() { return pythonBaseUrl; }
    public void setPythonBaseUrl(String pythonBaseUrl) { this.pythonBaseUrl = pythonBaseUrl; }

    public int getPythonTimeoutSeconds() { return pythonTimeoutSeconds; }
    public void setPythonTimeoutSeconds(int pythonTimeoutSeconds) { this.pythonTimeoutSeconds = pythonTimeoutSeconds; }
}
