package com.lavadero.api.ai.provider;

import org.springframework.stereotype.Component;

@Component
public class DeterministicAiProvider implements AiProvider {
    @Override
    public String complete(AiRequest request) {
        return switch (request.featureType()) {
            case DAILY_BRIEF -> "Resumen generado con datos del sistema. Revisa ingresos, salidas y caja antes de cerrar decisiones del dia.";
            case ANOMALY_ALERT -> "Alerta generada por reglas del negocio. Conviene revisar el soporte antes de cerrar el periodo.";
            case MONTHLY_ADVISOR -> "Revision mensual generada con datos historicos y operativos. Prioriza caja, gastos e inventario.";
            case ANALYST_CHAT -> "Respuesta basada en los reportes disponibles. Usa los numeros de soporte para tomar la decision.";
            case AGENT_INVESTIGATION -> "Investigacion completada usando resumen diario, historico, caja, lavadores e inventario.";
        };
    }

    @Override
    public String name() {
        return "deterministic-local";
    }
}
