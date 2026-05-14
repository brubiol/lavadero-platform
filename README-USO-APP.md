# Guía de uso diario de Turbo Lavado

Esta guía es para las personas que usan el sistema en el lavadero: encargado, caja, gerente y dueño. No necesitas saber de programación. Solo sigue el orden de trabajo.

Si tienes prisa, el flujo normal es:

1. Abrir día y turno.
2. Capturar tickets.
3. Capturar gastos, retiros y vales.
4. Contar caja.
5. Cerrar turno.
6. Al final de la semana, revisar y bloquear nómina.

## Para qué sirve

Turbo Lavado ayuda a llevar el control diario del lavadero:

- tickets de lavado
- ingresos en efectivo y tarjeta
- gastos, retiros y vales
- corte de caja por turno
- nómina semanal
- inventario
- reportes
- auditoría de cambios importantes

La idea es que el negocio ya no dependa de hojas sueltas, Excel o PDFs para saber cuánto se vendió, cuánto hay en caja y cuánto se debe pagar de nómina.

## Roles de usuario

Hay tres tipos de usuarios:

| Rol | Qué puede hacer |
| --- | --- |
| Operador | Capturar tickets, ver el día, guardar conteo de caja |
| Gerente / Encargado | Además puede cerrar turno, registrar gastos, vales, retiros, nómina e inventario |
| Dueño | Además puede ver reportes, auditoría y hacer correcciones especiales |

Si no ves una pantalla, normalmente es porque tu usuario no tiene permiso para esa parte. No es error del sistema.

## Flujo diario para el encargado

Este es el orden más simple para trabajar cada día.

### 1. Abrir el día

Entra al sistema y ve al inicio o a **Cierre del día**.

Si el sistema dice que no hay día abierto:

1. Presiona **Abrir día de hoy**.
2. Abre el turno que corresponde: **Matutino** o **Vespertino**.

Sin día y turno abiertos, no captures tickets.

### 2. Capturar tickets

Ve a **Nuevo ticket**.

Para cada lavado:

1. Selecciona el servicio.
2. Selecciona el tamaño del vehículo.
3. Revisa el precio.
4. Selecciona si pagó en **efectivo** o **tarjeta**.
5. Selecciona el lavador o lavadores que hicieron el trabajo.
6. Guarda el ticket.

Si es cortesía:

1. Marca **Cortesía**.
2. Escribe el motivo.
3. Guarda el ticket.

Importante: si el ticket ya no debe contar, no lo borres. Anúlalo con motivo, para que quede registro.

### 3. Registrar gastos, retiros y vales

Ve a **Gastos**.

Ahí se capturan:

- gastos del negocio, por ejemplo material, agua, CFE, Telmex, taxi
- retiros de efectivo
- vales o adelantos a empleados

Captura esto el mismo día que ocurre. Si se deja para después, el corte de caja puede salir mal.

### 4. Revisar Cierre del día antes de cerrar

Ve a **Cierre del día**.

Esta pantalla sirve como resumen rápido:

- si el día está abierto
- turnos abiertos o cerrados
- tickets del día
- carros lavados
- ingresos
- gastos
- diferencia de caja

Usa esta pantalla para confirmar que no falte nada antes de hacer el corte.

### 5. Hacer corte de turno

Ve a **Corte**.

Para cerrar un turno:

1. Selecciona el turno.
2. Cuenta el efectivo físico en caja.
3. Captura billetes, monedas y morralla.
4. Presiona **Guardar conteo**.
5. Revisa:
   - ingresos en efectivo
   - ingresos en tarjeta
   - gastos
   - retiros
   - efectivo esperado
   - efectivo contado
   - diferencia
6. Si hay faltante, escribe el motivo.
7. Presiona **Cerrar turno**.

Después de cerrar el turno, ya no se deben editar tickets de ese turno sin permiso del dueño.

## Qué revisar antes de cerrar turno

Antes de presionar **Cerrar turno**, confirma esto:

- todos los tickets del turno están capturados
- los tickets de tarjeta están marcados como tarjeta
- los tickets de efectivo están marcados como efectivo
- las cortesías tienen motivo
- los gastos están capturados
- los retiros están capturados
- los vales o adelantos están capturados
- el efectivo contado sí coincide con el dinero físico en caja

Si algo falta, corrígelo antes de cerrar.

## Nómina semanal

La nómina está en **Nómina**.

La semana debe iniciar en domingo. El sistema calcula de domingo a sábado.

### Crear una nómina

1. Ve a **Nómina**.
2. Selecciona el domingo de la semana.
3. Presiona **Crear periodo**.
4. Presiona **Recalcular**.

El sistema calcula:

- sueldo base para empleados de sueldo
- comisión para empleados por comisión
- bono por carros cuando aplique
- vales o préstamos descontados
- ajustes manuales
- neto a pagar

### Ajustes manuales de nómina

Antes de bloquear la nómina, puedes agregar ajustes por empleado.

Ejemplos de extras:

- extra
- puntualidad
- bono manual

Ejemplos de deducciones:

- vales
- deducción
- falta
- permiso
- clima

Pasos:

1. Selecciona el empleado.
2. Selecciona si es **Extra** o **Deducción**.
3. Selecciona el concepto.
4. Escribe el monto.
5. Agrega una nota si hace falta.
6. Presiona **Agregar**.
7. Presiona **Recalcular** otra vez.

Importante: si agregas o quitas ajustes, siempre vuelve a presionar **Recalcular** antes de bloquear.

### Exportar nómina

Cuando quieras revisar o imprimir:

1. Selecciona el periodo.
2. Presiona **Exportar nómina**.
3. Se descargará un archivo Excel.

Ese archivo sirve como resumen semanal parecido a las hojas que se usaban antes.

### Bloquear nómina

Cuando ya esté revisada:

1. Confirma que los montos estén correctos.
2. Presiona **Bloquear**.

Después de bloquear, ya no se pueden cambiar ajustes ni recalcular, a menos que el dueño la desbloquee.

## Qué revisar antes de bloquear nómina

Antes de presionar **Bloquear**, revisa:

- que la semana sea la correcta
- que todos los lavadores aparezcan
- que los carros lavados tengan sentido
- que los vales o préstamos estén descontados
- que los extras estén capturados
- que faltas, permisos o deducciones estén capturados
- que el neto a pagar sea correcto

Cuando esté correcta, exporta la nómina y luego bloquéala.

## Inventario

Ve a **Inventario**.

Sirve para controlar productos y movimientos:

- ventas
- compras
- ajustes
- fiados

Registra compras y ventas el mismo día para que el stock esté actualizado.

## Reportes

La pantalla **Reportes** es para el dueño.

Ahí se pueden revisar:

- ventas por día
- ventas por rango de fechas
- cortes de caja
- desempeño de lavadores
- exportaciones a Excel
- historial

Usa reportes para revisar el negocio. No es una pantalla para capturar datos del día.

## Auditoría

La pantalla **Auditoría** es para el dueño.

Muestra cambios importantes como:

- tickets creados, editados o anulados
- gastos registrados
- retiros
- vales
- conteos de caja
- cierres de turno
- reaperturas de turno
- nómina calculada, ajustada, bloqueada o desbloqueada

Sirve para responder preguntas como:

- quién cambió algo
- cuándo se cambió
- qué se corrigió
- por qué se reabrió un turno o nómina

## Correcciones especiales para el dueño

Los errores pasan. Lo importante es corregirlos con motivo, sin borrar historial.

### Reabrir un turno cerrado

Solo el dueño puede hacerlo.

Usa esto si se cerró el turno pero faltó capturar o corregir algo.

1. Ve a **Corte**.
2. Selecciona el turno cerrado.
3. Presiona **Reabrir turno**.
4. Escribe el motivo.
5. Corrige lo necesario.
6. Vuelve a hacer el corte.

### Desbloquear una nómina

Solo el dueño puede hacerlo.

Usa esto si una nómina ya fue bloqueada pero faltó un ajuste.

1. Ve a **Nómina**.
2. Selecciona el periodo bloqueado.
3. Presiona **Desbloquear**.
4. Escribe el motivo.
5. Agrega o corrige ajustes.
6. Presiona **Recalcular**.
7. Revisa y vuelve a **Bloquear**.

## Reglas importantes

- No compartas usuarios. Cada persona debe usar su cuenta.
- No cierres turno si falta capturar gastos o retiros.
- No bloquees nómina hasta revisar los ajustes.
- No borres información para corregir. Usa anular, reabrir o desbloquear.
- Si algo no cuadra, revisa primero tickets, gastos, retiros y vales del día.
- El dueño debe asegurarse de que existan respaldos de la información.

## Respaldo de información

El encargado no necesita hacer respaldos desde la aplicación.

El dueño debe confirmar que alguien responsable revise los respaldos y sepa cómo recuperar la información si pasa algo.

Recomendación: hacer una prueba real de recuperación de información antes de depender completamente del sistema.

## Qué hacer si algo se ve mal

Antes de asumir que el sistema falló, revisa:

1. ¿El día correcto está abierto?
2. ¿El turno correcto está seleccionado?
3. ¿El ticket fue capturado en efectivo o tarjeta correctamente?
4. ¿Se capturaron gastos, retiros o vales?
5. ¿La nómina fue recalculada después de ajustes?
6. ¿El periodo o turno está bloqueado/cerrado?
7. ¿Hay eventos en Auditoría que expliquen el cambio?

Si todavía no cuadra, anota:

- fecha
- turno
- ticket o empleado afectado
- qué se esperaba
- qué muestra el sistema

Con eso será mucho más fácil revisar el problema.

## Guía rápida por pantalla

| Pantalla | Para qué se usa |
| --- | --- |
| Inicio | Ver resumen general del día |
| Nuevo ticket | Capturar cada lavado |
| Tickets | Revisar tickets existentes |
| Gastos | Capturar gastos, retiros y vales |
| Cierre del día | Ver si falta algo antes de cerrar |
| Corte | Contar caja y cerrar turno |
| Nómina | Calcular, ajustar, exportar y bloquear nómina |
| Inventario | Registrar productos, compras, ventas y ajustes |
| Reportes | Revisar resultados del negocio |
| Auditoría | Ver cambios importantes y correcciones |

