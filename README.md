# Lavadero — Sistema de Operacion Diaria

Sistema para gestionar la operacion diaria de un lavadero de autos. Reemplaza el flujo de Excel con tickets digitales, control de turnos, nomina semanal, inventario y reportes con exportacion a Excel.

---

## Requisitos para correrlo localmente

| Herramienta | Version minima |
|-------------|---------------|
| Java | 21 |
| Maven | incluido (`./mvnw`) |
| Node.js | 18+ |
| Docker Desktop | cualquier version reciente |

---

## Como iniciar la aplicacion

Abre **3 terminales** y corre lo siguiente:

**Terminal 1 — Base de datos**
```bash
docker compose up -d
```

**Terminal 2 — Backend**
```bash
cd api
SPRING_PROFILES_ACTIVE=local ../mvnw spring-boot:run
```

**Terminal 3 — Frontend**
```bash
cd web
npm install
npm run dev
```

Abre el navegador en: **http://localhost:5173**

---

## Primer inicio de sesion

| Campo | Valor por defecto |
|-------|------------------|
| Usuario | `dueno` |
| Contrasena | `cambia-esto-123` |

> Cambia estos valores antes de usar en produccion con las variables de entorno `LAVADERO_JWT_SECRET`, `LAVADERO_BOOTSTRAP_USERNAME`, `LAVADERO_BOOTSTRAP_PASSWORD`.

---

## Roles de usuario

| Rol | Que puede hacer |
|-----|----------------|
| **DUENO** | Todo — incluyendo reportes y exportacion Excel |
| **GERENTE** | Tickets, gastos, corte, nomina, inventario, catalogos |
| **OPERADOR** | Crear tickets y ver operacion del dia |

---

## Flujo diario — paso a paso

### 1. Abrir el dia (cada manana)

Al entrar al **Dashboard** veras una barra de estado en la parte superior.

- Si el dia no esta abierto → aparece boton **"Abrir dia de hoy"** (naranja)
- Si el dia esta abierto pero sin turno → aparece boton **"Turno Matutino"** o **"Turno Vespertino"** (azul)
- Si el turno esta activo → barra verde con el nombre del turno

Solo el GERENTE o DUENO puede abrir el dia y los turnos.

---

### 2. Crear tickets

Ve a **Nuevo ticket** en el menu lateral.

1. Selecciona el turno activo
2. Selecciona el servicio (Lavado Basico, Completo, Encerado, etc.)
3. Selecciona el tamano del vehiculo (Chico, Mediano, Grande, Camioneta)
4. Escribe una descripcion del vehiculo (opcional, ej. "Tsuru rojo")
5. Selecciona uno o mas lavadores que hicieron el trabajo
6. El precio se calcula automaticamente
7. Si es cortesia, marca la casilla y escribe el motivo

El ticket queda guardado con numero de nota automatico (ej. `20260504-0001`).

**Reglas importantes:**
- Solo se pueden crear tickets si hay un turno ABIERTO
- Una vez cerrado el turno, no se pueden editar los tickets de ese turno
- Las cortesias guardan $0 de ingreso pero si cuentan como carro lavado

---

### 3. Registrar gastos del dia

Ve a **Gastos** en el menu.

Hay 3 tipos de salidas de dinero:

| Tipo | Cuando usarlo |
|------|--------------|
| **Nuevo gasto** | Gastos del negocio (jabon, CFE, agua, etc.) |
| **Nuevo retiro** | El dueno saca dinero de la caja |
| **Nuevo prestamo** | Adelanto de sueldo a un lavador |

Los prestamos se descuentan automaticamente en la nomina de la semana.

---

### 4. Cerrar el turno (Corte)

Ve a **Corte** al final del turno.

El corte tiene 4 pasos:

**Paso 1 — Contar el efectivo**
Escribe cuantos billetes y monedas hay en la caja. El sistema calcula el total contado en tiempo real.

**Paso 2 — Ver gastos y retiros**
El sistema muestra los ingresos de tickets, gastos registrados y retiros del turno.

**Paso 3 — Revision**
| Campo | Que significa |
|-------|--------------|
| Esperado | Lo que deberia haber (ingresos - gastos - retiros) |
| Contado | Lo que contaste fisicamente |
| Diferencia | Sobrante (+) o Faltante (-) |

- Si hay **sobrante**: puedes cerrar sin problema
- Si hay **faltante**: el sistema exige que escribas el motivo antes de cerrar

**Paso 4 — Cerrar turno**
Haz clic en "Cerrar turno". El turno queda CERRADO y no se pueden crear mas tickets en el.

> Si corres turno matutino y vespertino por separado, cada uno tiene su propio corte. Si prefieres un solo corte al dia, usa un solo turno.

---

### 5. Nomina semanal

Ve a **Nomina** (requiere GERENTE o DUENO).

La nomina es **semanal de domingo a sabado**.

1. Crea un periodo nuevo — el sistema calcula el sabado automaticamente
2. Haz clic en **Recalcular** para calcular los pagos
3. Revisa cada lavador:
   - **Sueldo base**: configurado en Catalogos
   - **Bono por carros**: $10 MXN por cada carro lavado (proporcional si fue con otro lavador)
   - **Adelantos descontados**: prestamos del periodo
   - **Neto a pagar**: lo que se le entrega al lavador
4. Haz clic en **Bloquear** cuando el pago este listo — despues no se puede modificar

---

### 6. Inventario

Ve a **Inventario** (requiere GERENTE o DUENO).

El inventario es por movimientos — el stock se calcula sumando entradas y restando salidas.

| Tipo de movimiento | Efecto |
|-------------------|--------|
| Compra | Aumenta el stock |
| Venta | Reduce el stock |
| Fiado | Reduce el stock (sin cobro inmediato) |
| Ajuste | Correccion manual (requiere motivo) |

---

### 7. Reportes y exportacion Excel

Ve a **Reportes** (requiere DUENO).

Selecciona un rango de fechas y puedes ver:
- Resumen diario (ingresos, gastos, resultado por dia)
- Resumen mensual
- Cortes de turno (sobrantes y faltantes)
- Desempeno de lavadores (carros y tickets por empleado)

Haz clic en **Descargar Excel** para exportar todo en un archivo `.xlsx` con 8 hojas: Resumen, Tickets, Gastos, Retiros, Prestamos, Cortes, Inventario y Nomina.

---

## Configuracion inicial (primera vez)

Antes de usar el sistema por primera vez, el DUENO debe configurar los catalogos. Ve a **Catalogos** en el menu.

### Orden recomendado:

1. **Lavadores** — nombre, telefono y sueldo base semanal de cada empleado
2. **Servicios** — los tipos de lavado que ofrecen (Basico, Completo, Encerado, etc.)
3. **Tamanos** — los tamanos de vehiculo (Chico, Mediano, Grande, Camioneta/SUV)
4. **Precios** — precio por cada combinacion de servicio + tamano

Ejemplo de matriz de precios:

|              | Chico | Mediano | Grande | Camioneta |
|--------------|-------|---------|--------|-----------|
| Basico       | $80   | $100    | $120   | $140      |
| Completo     | $120  | $150    | $180   | $220      |
| Encerado     | $200  | $250    | $300   | $350      |

---

## Estructura del proyecto

```
lavadero-api/
├── api/                  Backend Spring Boot (Java 21)
│   ├── src/main/java/    Codigo fuente
│   └── src/main/resources/db/migration/   Migraciones de base de datos
├── web/                  Frontend React + TypeScript
│   └── src/App.tsx       Toda la interfaz de usuario
├── docker-compose.yml    Postgres para desarrollo local
└── scripts/              Scripts utilitarios
```

## Stack tecnologico

| Capa | Tecnologia |
|------|-----------|
| Backend | Spring Boot 3.4, Java 21 |
| Base de datos | PostgreSQL 16, Flyway |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Auth | JWT + refresh tokens opacos, BCrypt |
| Testing | Testcontainers + MockMvc |
| Exportacion | Apache POI (Excel) |

---

## Correr los tests

```bash
cd api
../mvnw test
```

Los tests levantan una base de datos temporal con Docker y prueban todos los flujos de negocio.

---

## Variables de entorno para produccion

```bash
LAVADERO_JWT_SECRET=<cadena larga y aleatoria, minimo 32 caracteres>
LAVADERO_BOOTSTRAP_USERNAME=<tu usuario>
LAVADERO_BOOTSTRAP_PASSWORD=<tu contrasena segura>
LAVADERO_BOOTSTRAP_FULL_NAME=<tu nombre>
SPRING_PROFILES_ACTIVE=local
```
