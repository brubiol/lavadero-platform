package com.lavadero.api.ai.provider;

public interface AiProvider {
    String complete(AiRequest request);

    String name();
}
