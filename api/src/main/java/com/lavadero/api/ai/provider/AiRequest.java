package com.lavadero.api.ai.provider;

import com.lavadero.api.ai.domain.AiFeatureType;

public record AiRequest(AiFeatureType featureType, String systemPrompt, String userPrompt) {
}
