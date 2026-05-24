package com.lavadero.api.ai.tools;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lavadero.api.catalog.domain.Employee;
import com.lavadero.api.catalog.service.EmployeeService;
import com.lavadero.api.payroll.service.DebtLedgerService;
import jakarta.persistence.EntityNotFoundException;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
class EmployeeDebtBalanceTool implements AiTool {
    private final DebtLedgerService debt;
    private final EmployeeService employees;
    private final ObjectMapper objectMapper;

    EmployeeDebtBalanceTool(DebtLedgerService debt, EmployeeService employees, ObjectMapper objectMapper) {
        this.debt = debt;
        this.employees = employees;
        this.objectMapper = objectMapper;
    }

    @Override
    public String name() {
        return "get_employee_debt_balance";
    }

    @Override
    public String description() {
        return "Return the current outstanding debt (deuda) balance for one employee, derived from the "
                + "debt ledger (advances minus payroll deductions minus cash repayments). Positive = "
                + "employee owes the business. Pass employeeId if you know it, otherwise pass "
                + "employeeName and the tool will resolve it (case-insensitive contains match). "
                + "Use for 'cuánto debe X', 'who has the highest debt', or balance lookups.";
    }

    @Override
    public JsonNode parametersSchema() {
        ObjectNode props = objectMapper.createObjectNode();
        props.set("employeeId", objectMapper.createObjectNode()
                .put("type", "integer")
                .put("description", "Numeric employee id from list_employees. Preferred."));
        props.set("employeeName", objectMapper.createObjectNode()
                .put("type", "string")
                .put("description", "Substring of the employee's full name. Used only if employeeId is absent."));
        return objectMapper.createObjectNode()
                .put("type", "object")
                .<ObjectNode>set("properties", props);
    }

    @Override
    public JsonNode execute(JsonNode args) {
        try {
            Long employeeId = null;
            String name = null;
            if (args != null) {
                if (args.has("employeeId") && !args.get("employeeId").isNull()) {
                    employeeId = args.get("employeeId").asLong();
                }
                if (args.has("employeeName") && !args.get("employeeName").isNull()) {
                    name = args.get("employeeName").asText(null);
                }
            }

            Employee employee;
            if (employeeId != null) {
                try {
                    employee = employees.get(employeeId);
                } catch (EntityNotFoundException ex) {
                    return objectMapper.createObjectNode().put("error",
                            "No employee with id " + employeeId);
                }
            } else if (name != null && !name.isBlank()) {
                String needle = name.trim().toLowerCase();
                List<Employee> matches = employees.list(null).stream()
                        .filter(e -> e.getFullName() != null
                                && e.getFullName().toLowerCase().contains(needle))
                        .toList();
                if (matches.isEmpty()) {
                    return objectMapper.createObjectNode().put("error",
                            "No employee found matching '" + name + "'");
                }
                if (matches.size() > 1) {
                    ObjectNode err = objectMapper.createObjectNode();
                    err.put("error", "Multiple employees match '" + name + "'. Disambiguate with employeeId.");
                    var arr = objectMapper.createArrayNode();
                    for (Employee m : matches) {
                        ObjectNode mn = objectMapper.createObjectNode();
                        mn.put("id", m.getId());
                        mn.put("fullName", m.getFullName());
                        arr.add(mn);
                    }
                    err.set("candidates", arr);
                    return err;
                }
                employee = matches.get(0);
            } else {
                return objectMapper.createObjectNode().put("error",
                        "Must provide either employeeId or employeeName");
            }

            BigDecimal balance = debt.balance(employee.getId());
            ObjectNode out = objectMapper.createObjectNode();
            out.put("employeeId", employee.getId());
            out.put("fullName", employee.getFullName());
            out.put("currentBalance", balance);
            out.put("owesBusiness", balance.signum() > 0);
            return out;
        } catch (Exception ex) {
            return objectMapper.createObjectNode().put("error", "Failed: " + ex.getMessage());
        }
    }
}
