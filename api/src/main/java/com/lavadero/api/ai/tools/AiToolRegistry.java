package com.lavadero.api.ai.tools;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

/**
 * Spring auto-discovers every {@link AiTool} bean and stuffs the list here.
 * The provider's chat loop reads from this registry to build the OpenAI
 * tools array; it also dispatches name→tool when the model emits a
 * tool_call.
 *
 * Adding a new tool = drop a new {@code @Component} that implements
 * AiTool. No registration boilerplate.
 */
@Component
public class AiToolRegistry {
    private final Map<String, AiTool> byName;

    public AiToolRegistry(List<AiTool> tools) {
        Map<String, AiTool> map = new LinkedHashMap<>();
        for (AiTool tool : tools) {
            if (map.containsKey(tool.name())) {
                throw new IllegalStateException("Duplicate AI tool name: " + tool.name());
            }
            map.put(tool.name(), tool);
        }
        this.byName = Map.copyOf(map);
    }

    public List<AiTool> all() {
        return List.copyOf(byName.values());
    }

    public AiTool get(String name) {
        return byName.get(name);
    }

    public boolean isEmpty() {
        return byName.isEmpty();
    }
}
