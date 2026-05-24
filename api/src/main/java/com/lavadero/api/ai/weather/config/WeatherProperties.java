package com.lavadero.api.ai.weather.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "lavadero.weather")
public class WeatherProperties {

    private boolean enabled = false;
    private double lat = 26.05;
    private double lon = -98.28;
    private String archiveBaseUrl = "https://archive-api.open-meteo.com/v1/archive";
    private String forecastBaseUrl = "https://api.open-meteo.com/v1/forecast";
    private int timeoutSeconds = 10;
    private int forecastDays = 14;

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public double getLat() { return lat; }
    public void setLat(double lat) { this.lat = lat; }

    public double getLon() { return lon; }
    public void setLon(double lon) { this.lon = lon; }

    public String getArchiveBaseUrl() { return archiveBaseUrl; }
    public void setArchiveBaseUrl(String archiveBaseUrl) { this.archiveBaseUrl = archiveBaseUrl; }

    public String getForecastBaseUrl() { return forecastBaseUrl; }
    public void setForecastBaseUrl(String forecastBaseUrl) { this.forecastBaseUrl = forecastBaseUrl; }

    public int getTimeoutSeconds() { return timeoutSeconds; }
    public void setTimeoutSeconds(int timeoutSeconds) { this.timeoutSeconds = timeoutSeconds; }

    public int getForecastDays() { return forecastDays; }
    public void setForecastDays(int forecastDays) { this.forecastDays = forecastDays; }
}
