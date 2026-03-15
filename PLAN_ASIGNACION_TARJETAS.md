# Plan de Desarrollo: Asignación de Tarjetas de Acceso

## Estado Actual

El sistema YA tiene la estructura base funcional:
- CRUD de Tarjetas (lectura RFID, serie, tipo peatonal/vehicular)
- CRUD de Privadas (con campos `precioVehicular`, `precioPeatonal`, `precioMensualidad`)
- Página de Asignación de Tarjetas con formulario básico
- Dos tablas en BD: `residencias_residentes_tarjetas` (Folio H) y `residencias_residentes_tarjetas_no_renovacion` (Folio B)
- API GET que hace UNION de ambas tablas con indicador `folio_tipo`

## Brechas Identificadas

| # | Brecha | Impacto |
|---|--------|---------|
| 1 | El POST solo inserta en tabla Folio H, no hay opción para Folio B | No se pueden crear asignaciones sin renovación |
| 2 | No se auto-calcula el precio según tipo de tarjeta + privada | El usuario debe escribir el precio manualmente |
| 3 | No se actualiza el estatus de la tarjeta (1→2) al asignar | La tarjeta sigue apareciendo como "Activa" después de asignarse |
| 4 | No se libera la tarjeta (2→1) al cancelar una asignación | La tarjeta queda bloqueada como "Asignada" para siempre |
| 5 | Faltan campos en el formulario: descuento, IVA, tipo de pago, comprador, concepto, observaciones, seguro | No se captura información completa de la venta |
| 6 | No hay soporte para múltiples tarjetas (slots 2-5) en el formulario | Solo se puede asignar 1 tarjeta por registro |
| 7 | No se calcula automáticamente la fecha de vencimiento para Folio H | El usuario debe calcularla manualmente |
| 8 | No se muestra el folio tipo (H/B) en la tabla de resultados | No se distingue visualmente el tipo de asignación |

---

## Plan de Desarrollo por Tarea

### TAREA 1: Selector Folio H / Folio B en formulario
**Archivo:** `procesos/asignacion-tarjetas/page.tsx`

**Cambios:**
- Agregar campo `folioTipo` al estado del formulario con opciones:
  - `"H"` → Con renovación (vencimiento anual)
  - `"B"` → Sin renovación (tiempo indefinido)
- Cuando se selecciona `"B"`, ocultar el campo `fechaVencimiento`
- Cuando se selecciona `"H"`, mostrar `fechaVencimiento` como obligatorio
- Enviar `folioTipo` al API en el POST

**Resultado esperado:**
- El usuario elige el tipo de folio antes de asignar
- El formulario se adapta mostrando/ocultando fecha de vencimiento

---

### TAREA 2: Auto-cálculo de precio según privada + tipo de tarjeta
**Archivos:** `procesos/asignacion-tarjetas/page.tsx`, API route

**Cambios:**
- Al seleccionar un residente, ya se conoce su privada (viene en la respuesta de búsqueda)
- Al seleccionar una tarjeta del dropdown, se conoce su `tipoId` (1=Peatonal, 2=Vehicular)
- Cargar los precios de la privada del residente seleccionado
- Auto-poblar el campo `precio` con:
  - `precioVehicular` si tipoId=2
  - `precioPeatonal` si tipoId=1
- El usuario puede modificar el precio manualmente después del auto-llenado

**Resultado esperado:**
- Al seleccionar residente + tarjeta, el precio se llena automáticamente
- Se muestra label indicando: "Precio Vehicular Privada X: $500.00" (informativo)

---

### TAREA 3: Campos completos de venta en formulario
**Archivo:** `procesos/asignacion-tarjetas/page.tsx`

**Campos a agregar al formulario:**
- `descuento` (Float) — Monto de descuento aplicado
- `iva` (Float) — Calculado automáticamente como 16% del (precio - descuento)
- `tipoPago` (Int) — Select: 1=Efectivo, 2=Bancos
- `compradorId` (String) — Búsqueda de residente comprador (puede ser diferente al residente asignado)
- `mostrarNombreComprador` (Int) — Checkbox: mostrar nombre del comprador
- `concepto` (String) — Descripción de la venta
- `observaciones` (String) — Notas adicionales
- `utilizoSeguro` (Int) — Checkbox: la tarjeta usa seguro

**Cálculos automáticos:**
- Subtotal = precio
- Total con descuento = precio - descuento
- IVA = (precio - descuento) × 0.16
- Total final = (precio - descuento) + IVA

**Resultado esperado:**
- Formulario completo con todos los datos de la venta
- IVA se calcula automáticamente al cambiar precio o descuento
- Total se muestra en tiempo real

---

### TAREA 4: API POST con soporte Folio H y Folio B
**Archivo:** `api/procesos/asignacion-tarjetas/route.ts`

**Cambios al POST:**
- Recibir campo `folioTipo` en el body (`"H"` o `"B"`)
- Si `folioTipo === "H"`:
  - Insertar en `prisma.residenteTarjeta` (tabla con renovación)
  - Requerir `fechaVencimiento`
- Si `folioTipo === "B"`:
  - Insertar en `prisma.residenteTarjetaNoRenovacion` (tabla sin renovación)
  - No guardar `fechaVencimiento`
- Guardar campos adicionales: `descuento`, `IVA`, `tipoPago`, `compradorId`, `mostrarNombreComprador`, `concepto`, `observaciones`, `utilizoSeguro`

**Resultado esperado:**
- Las asignaciones se guardan en la tabla correcta según el tipo de folio
- Todos los campos de la venta se persisten

---

### TAREA 5: Actualizar estatus de tarjeta al asignar/cancelar
**Archivos:** `api/procesos/asignacion-tarjetas/route.ts` (POST), `[id]/route.ts` (DELETE)

**Al ASIGNAR (POST):**
- Después de crear la asignación exitosamente:
  - Actualizar `tarjetas.estatus_id = 2` (Asignada) para la tarjeta asignada
  - Validar que la tarjeta tenga estatus 1 (Activa) antes de asignar
  - Si la tarjeta ya está asignada (estatus 2), retornar error

**Al CANCELAR (DELETE):**
- Después de cancelar la asignación:
  - Leer el `tarjetaId` de la asignación cancelada
  - Actualizar `tarjetas.estatus_id = 1` (Activa) para liberar la tarjeta
  - Esto permite que la tarjeta se pueda re-asignar

**Resultado esperado:**
- Las tarjetas asignadas ya no aparecen en el dropdown de "disponibles"
- Al cancelar una asignación, la tarjeta vuelve a estar disponible
- No se puede asignar una tarjeta que ya está asignada

---

### TAREA 6: Cálculo automático de fecha de vencimiento (Folio H)
**Archivo:** `procesos/asignacion-tarjetas/page.tsx`

**Cambios:**
- Cuando folioTipo = "H", al seleccionar la fecha de asignación:
  - Auto-calcular `fechaVencimiento` = fecha actual + 1 año
  - El campo se pre-llena pero es editable
- Mostrar la fecha del contrato de la privada (`venceContrato`) como referencia

**Resultado esperado:**
- La fecha de vencimiento se sugiere automáticamente (1 año desde hoy)
- El usuario puede ajustarla si es necesario

---

### TAREA 7: Mostrar tipo de folio en tabla de resultados
**Archivo:** `procesos/asignacion-tarjetas/page.tsx`

**Cambios:**
- Agregar columna "Folio" en la tabla de asignaciones
- Mostrar badge:
  - `H` → Badge azul "Con Renovación"
  - `B` → Badge naranja "Sin Renovación"
- Agregar filtro por tipo de folio (H/B/Todos)

**Resultado esperado:**
- Se distingue visualmente cada tipo de asignación en la lista
- Se puede filtrar por tipo de folio

---

### TAREA 8: Soporte multi-tarjeta (slots 2-5)
**Archivo:** `procesos/asignacion-tarjetas/page.tsx`, API route

**Cambios:**
- Botón "Agregar tarjeta" en el formulario (hasta 5)
- Cada slot adicional tiene: dropdown de tarjeta disponible + checkbox de seguro
- El precio total se recalcula sumando el precio de cada tarjeta según su tipo
- Enviar `tarjetaId2-5`, `utilizoSeguro2-5` al API
- Al asignar, marcar TODAS las tarjetas como estatus 2
- Al cancelar, liberar TODAS las tarjetas

**Resultado esperado:**
- Se pueden asignar hasta 5 tarjetas en una sola operación
- Cada tarjeta suma su precio correspondiente al total
- Todas se marcan como asignadas/liberadas en bloque

---

## Orden de Implementación Recomendado

```
Tarea 5 (estatus tarjeta)     ← Crítica, previene inconsistencias
   ↓
Tarea 1 (selector folio H/B)  ← Base para las demás tareas
   ↓
Tarea 4 (API folio H/B)       ← Backend del selector
   ↓
Tarea 2 (auto-precio)         ← Mejora UX significativa
   ↓
Tarea 6 (fecha vencimiento)   ← Complementa folio H
   ↓
Tarea 3 (campos completos)    ← Captura datos de venta
   ↓
Tarea 7 (badges en tabla)     ← Visual, bajo riesgo
   ↓
Tarea 8 (multi-tarjeta)       ← Más compleja, último
```

## Archivos Afectados

| Archivo | Tareas |
|---------|--------|
| `src/app/(dashboard)/procesos/asignacion-tarjetas/page.tsx` | 1, 2, 3, 6, 7, 8 |
| `src/app/api/procesos/asignacion-tarjetas/route.ts` | 4, 5, 8 |
| `src/app/api/procesos/asignacion-tarjetas/[id]/route.ts` | 5 |
| `src/app/api/catalogos/privadas/route.ts` | (sin cambios, ya expone precios) |
| `src/app/api/catalogos/tarjetas/route.ts` | (sin cambios, ya filtra por estatus) |

## Resultados Esperados Globales

1. **Flujo completo de venta**: Seleccionar residente → elegir folio H/B → seleccionar tarjeta(s) → precio se auto-calcula → aplicar descuento → IVA automático → guardar
2. **Consistencia de datos**: Las tarjetas cambian de estatus automáticamente (Activa ↔ Asignada)
3. **Distinción clara H/B**: Folio H guarda fecha de vencimiento, Folio B no. Cada uno en su tabla correspondiente
4. **Trazabilidad**: Se registra comprador, tipo de pago, concepto, observaciones, uso de seguro
5. **Multi-tarjeta**: Hasta 5 tarjetas por asignación con precios individuales
