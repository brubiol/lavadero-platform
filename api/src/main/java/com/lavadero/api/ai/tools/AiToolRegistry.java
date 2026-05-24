package com.lavadero.api.ai.tools;

import java.util.ArrayList;
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

    /**
     * Curated view of the registry for surfaces that should not expose every
     * tool to the model (e.g. dailyBrief stays focused on summary tools, not
     * employee lookups). Preserves the requested order so the model sees them
     * in the priority the caller intends. Unknown names fail fast.
     */
    public List<AiTool> subset(String... names) {
        List<AiTool> out = new ArrayList<>(names.length);
        for (String name : names) {
            AiTool tool = byName.get(name);
            if (tool == null) {
                throw new IllegalArgumentException("Unknown AI tool: " + name);
            }
            out.add(tool);
        }
        return List.copyOf(out);
    }
}
