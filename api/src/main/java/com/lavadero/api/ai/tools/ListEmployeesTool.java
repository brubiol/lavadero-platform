package com.lavadero.api.ai.tools;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lavadero.api.catalog.domain.Employee;
import com.lavadero.api.catalog.service.EmployeeService;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
class ListEmployeesTool implements AiTool {
    private final EmployeeService employees;
    private final ObjectMapper objectMapper;

    ListEmployeesTool(EmployeeService employees, ObjectMapper objectMapper) {
        this.employees = employees;
        this.objectMapper = objectMapper;
    }

    @Override
    public String name() {
        return "list_employees";
    }

    @Override
    public String description() {
        return "Return the roster of lavadores (washer employees): id, name, active flag, payroll type "
                + "(SALARY/COMMISSION/MIXED), base weekly salary, per-car commission, and primary shift. "
                + "Use this whenever the user asks about a person by name (to resolve the employee id "
                + "before calling other tools) or for headcount / 'qué empleados tengo' questions.";
    }

    @Override
    public JsonNode parametersSchema() {
        ObjectNode props = objectMapper.createObjectNode();
        props.set("activeOnly", objectMapper.createObjectNode()
                .put("type", "boolean")
                .put("description", "If true, only currently active employees. If false, only inactive. "
                        + "Omit to return all."));
        return objectMapper.createObjectNode()
                .put("type", "object")
                .<ObjectNode>set("properties", props);
    }

    @Override
    public JsonNode execute(JsonNode args) {
        try {
            Boolean active = args != null && args.has("activeOnly") && !args.get("activeOnly").isNull()
                    ? args.get("activeOnly").asBoolean()
                    : null;
            List<Employee> roster = employees.list(active);
            ObjectNode out = objectMapper.createObjectNode();
            out.put("count", roster.size());
            var arr = objectMapper.createArrayNode();
            for (Employee e : roster) {
                ObjectNode en = objectMapper.createObjectNode();
                en.put("id", e.getId());
                en.put("fullName", e.getFullName());
                en.put("phone", e.getPhone());
                en.put("active", e.isActive());
                en.put("payrollType", e.getPayrollType() == null ? null : e.getPayrollType().name());
                en.put("baseWeeklySalary", e.getBaseWeeklySalary());
                en.put("commissionRate", e.getCommissionRate());
                en.put("primaryShift", e.getPrimaryShift());
                arr.add(en);
            }
            out.set("employees", arr);
            return out;
        } catch (Exception ex) {
            return objectMapper.createObjectNode().put("error", "Failed: " + ex.getMessage());
        }
    }
}
