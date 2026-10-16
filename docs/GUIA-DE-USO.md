# Guía de uso: Turbo Lavado

Esta guía es para el **dueño**, los **gerentes** y los **operadores (cajeros)**. Explica cómo usar el sistema en el día a día, sin tecnicismos.

> ¿Eres ingeniero o reclutador? El README técnico está en [../README.md](../README.md).

---

## 1. ¿Qué es y cómo entro?

Turbo Lavado reemplaza las notas en papel y el Excel. Aquí se registran los carros lavados, el dinero del turno, los gastos, la nómina y el inventario. Todo queda guardado y se puede revisar después.

- **Entrar:** abre **https://turbolavado.org** en el celular, la tablet o la computadora, y escribe tu usuario y contraseña.
- **Usuarios:** cada persona tiene **su propio usuario**. No compartas tu contraseña: todo lo que se hace en el sistema queda registrado con el nombre de quien lo hizo.
- **Contraseña olvidada:** pídele al dueño o a Brandon que te la restablezca.

---

## 2. ¿Quién ve qué?

El menú muestra solo lo que tu rol puede usar. Cada rol ve todo lo del rol anterior, más lo suyo.

| Pantalla | Operador | Gerente | Dueño |
|---|:-:|:-:|:-:|
| Dashboard, Nuevo ticket, Tickets, Clientes | ✓ | ✓ | ✓ |
| Gastos, Corte, Cierre del día, Asistencia | ✓ | ✓ | ✓ |
| Nómina, Inventario, Catálogos, Lealtad, Reportes | | ✓ | ✓ |
| AI, Vigilancia, Auditoría | | | ✓ |

---

## 3. Un día normal

![Dashboard](screenshots/dashboard.png)

### Al abrir
1. En el **Dashboard**, toca **Abrir día** si todavía no está abierto.
2. Abre tu turno: **MATUTINO** (mañana) o **VESPERTINO** (tarde).

### Cada carro: Nuevo ticket
![Nuevo ticket](screenshots/nuevo-ticket.png)

1. Elige el **servicio** y el **tamaño del vehículo**. **El precio sale solo** del catálogo, así que no hay que escribirlo.
2. Escribe el auto (por ejemplo, *CHEYENNE BLANCO*) y agrega **extras** si los lleva (encerado, motor, etc.). Cada extra suma su precio.
3. Asigna al **lavador** o lavadores que hicieron el carro.
4. Opciones especiales:
   - **Cortesía:** lavado gratis. Escribe el motivo. Muchas cortesías en un día se marcan para revisión del dueño.
   - **Cliente con paquete:** si el cliente tiene un paquete prepagado, se descuenta un lavado. Si hoy trae un carro **más grande** que el del paquete, el sistema avisa y cobra la diferencia.
5. Guarda. El ticket recibe su **número de nota**.

Al abrir un ticket desde **Tickets** se ve cómo se armó el precio (base + extras = total) y lo que gana cada lavador por ese carro.

![Detalle de ticket](screenshots/ticket-detalle.png)

**¿Te equivocaste?** Se puede corregir o cancelar el ticket. Queda registrado quién lo hizo y por qué.

### Durante el turno: Gastos
En **Gastos** se registra todo el dinero que sale de la caja:
- **Gasto:** CFE, TELMEX, basura, material, etc.
- **Retiro:** dinero que se saca de la caja a media jornada.
- **Préstamo:** adelanto de efectivo a un lavador. Queda como deuda del lavador y se descuenta en su nómina.

### Al terminar el turno: Corte
1. Cuenta el dinero por **denominación** (billetes y monedas). La **morralla** se captura como un solo total.
2. El sistema calcula cuánto **debería haber**: ventas en efectivo + paquetes + ventas de inventario + abonos de deuda − gastos − retiros − préstamos.
3. Compara con lo que contaste:
   - **Sobrante:** hay más de lo esperado.
   - **Faltante:** hay menos. **No se puede cerrar sin escribir una explicación.**
4. Cierra el turno.

### Al cerrar el negocio: Cierre del día
En **Cierre del día** se revisa que todos los turnos estén cerrados y se cierra el día.

---

## 4. Cada semana: Nómina (gerente y dueño)

La semana de nómina va de **domingo a sábado**.

- **Pago por carro:** cada lavador gana una **cantidad fija por carro**, no un porcentaje del precio. Si dos lavadores hacen el mismo carro, se reparte según su parte.
- **Las cortesías sí cuentan** para el pago del lavador, porque él hizo el trabajo.
- **Faltas:**

  | Faltas en la semana | Pago por carro (lavador estándar) |
  |---|---|
  | 0 o 1 | $30 |
  | 2 | $15 por **toda** la semana |
  | 3 o más | $10 por **toda** la semana |

  Solo cuenta la **falta**. Clima, descanso, enfermo y permiso **no** bajan el pago. Se registran en **Asistencia**.
- **Préstamos y deudas:** se descuentan de la nómina. El lavador también puede **abonar en efectivo** cuando quiera, y ese dinero entra en el corte del turno.
- **Exportar:** la nómina se puede descargar en Excel.

---

## 5. Clientes y paquetes

- **Carro registrado:** se puede guardar el tamaño y la descripción del carro de un cliente, para capturar más rápido.
- **Paquetes prepagados:** el cliente paga varios lavados por adelantado. Cada visita descuenta uno. El paquete es para un **tamaño** de carro. Si trae uno más grande, se cobra la diferencia.
- **Lealtad:** el programa de cliente frecuente se administra en **Lealtad** (gerente y dueño).

---

## 6. Solo para el dueño

- **AI:**
  - Resumen del día.
  - Alertas automáticas (por ejemplo, faltantes o muchas cortesías).
  - Un chat para preguntar sobre el negocio, como *"¿cómo fue la semana?"*.
  - **Solo da consejos:** nunca cambia tickets, dinero, nómina ni precios.
- **Vigilancia** (imagen abajo): muestra patrones por operador, como muchas cortesías, tickets cancelados, ediciones rápidas o faltantes repetidos. Sirve para detectar problemas a tiempo.
- **Auditoría:** el historial de quién hizo qué y cuándo.

![Vigilancia](screenshots/vigilancia.png)

---

## 7. Problemas comunes

| Problema | Qué hacer |
|---|---|
| No puedo entrar | Revisa usuario y contraseña. Si la olvidaste, pide que te la restablezcan. |
| El corte no cuadra | Revisa que todos los gastos, retiros, préstamos y abonos del turno estén capturados. Si sigue sin cuadrar, explica el faltante al cerrar. |
| Capturé un ticket mal | Ábrelo en **Tickets** y corrígelo o cancélalo, con el motivo. |
| No veo una pantalla | Tu rol no tiene acceso. Pídeselo al gerente o al dueño. |
| El sistema no carga | Revisa el internet. Si sigue fallando, avísale a Brandon. |

**Soporte:** Brandon Rubio.
