<!-- spa-sharepoint-power-automate · references/21-datos-personales.md · sección §33 -->
<!-- Nueva (2026-09-24). NO ES ASESORÍA LEGAL. Los puntos sobre la Ley 25.326 vienen de una búsqueda web sobre el texto legal y fuentes secundarias; las prácticas técnicas son del autor. Índice: ../SKILL.md -->

# 33 · Datos personales en apps de campo (DNI, GPS, fotos, firmas, pasaportes)

> ⚠️ **Esto es una guía técnica, no asesoría legal.** Las obligaciones concretas dependen del país, del sector y de los contratos. Consultá con el responsable de datos o el área legal de tu organización antes de recolectar datos personales.

Las apps de este pipeline **recolectan datos personales sin darse cuenta**: el DNI de un chofer, la ubicación GPS de un recorrido, la foto de una persona, una firma, la lectura de un pasaporte. Que la app sea "pública y sin login" **no elimina** la obligación de cuidarlos; la vuelve más delicada, porque cualquiera puede enviar datos y nadie ve un aviso.

## 33.1 Marco (Argentina)

La **Ley 25.326 de Protección de los Datos Personales** rige en Argentina. Puntos de la ley que importan para diseñar (según su texto y resúmenes secundarios):

- El tratamiento de datos personales es lícito solo con el **consentimiento libre, expreso e informado** del titular, que debe constar **por escrito o por un medio equivalente** (art. 5).
- **Finalidad**: los datos se recolectan para fines **determinados** y no pueden usarse de forma incompatible con ellos.
- **Exactitud** y actualización de los datos.
- La autoridad de control es la **Agencia de Acceso a la Información Pública (AAIP)**; existe un **registro de bases de datos** de consulta pública.
- Hay una categoría de **datos sensibles** con reglas más estrictas.

Si además hay usuarios en la UE, puede aplicar el **RGPD** (fuera del alcance de esta guía). Verificá también las **políticas internas** de tu organización (ISO 27001, SGI).

## 33.2 Mapa: qué dato personal toca cada parte del pipeline

| Dato | Dónde queda | Riesgo |
|---|---|---|
| DNI, nombre, teléfono | Campo del formulario → payload → columna de lista → **historial de corridas** → correo → PDF | Se copia a 5+ lugares |
| **Ubicación GPS** | Payload y columna | Revela rutinas y domicilios de personas |
| **Fotos** | Adjuntos de SharePoint, correo, PDF | Rostros, matrículas, documentos en pantalla |
| **Firma** | Imagen en el payload | Es un dato personal identificatorio |
| Pasaporte / documento leído por OCR o IA | El proveedor de OCR/IA | El dato sale a un **tercero** |
| Borrador del formulario | `localStorage` del dispositivo | Queda en un teléfono compartido |

## 33.3 Checklist técnico

1. **Minimizá**: no pidas el dato si no lo vas a usar. ¿Necesitás el DNI completo o alcanza con los últimos dígitos o un legajo?
2. **Aviso y consentimiento en el formulario**: qué datos se recolectan, para qué, quién los ve y por cuánto tiempo. Guardá **fecha y versión del texto aceptado** junto con el registro, con la hora del **servidor** (`utcNow()`, §19.4), no la del cliente.
3. **Historial de corridas**: el payload completo queda visible en *Run history*. Activá **entradas y salidas seguras** en el trigger y en las acciones que tocan datos personales (§22.6). Anotá cuáles lo tienen.
4. **Correo**: no repitas datos personales en los correos de **error** (§30.5); enlazá el registro en lugar de copiarlo.
5. **Permisos de la lista**: el acceso a la lista que guarda datos personales debe ser **restringido** (§27.5), no heredar todo el sitio.
6. **Retención**: definí **cuánto tiempo** se guardan y **cómo se borran** (incluye adjuntos y corridas; el historial de corridas se conserva unos **28-30 días**: la interfaz habla de 28 y los límites de servicio de 30, y una **etiqueta de retención** de Microsoft Purview es una opción que conviene consultar con el administrador). Sin proceso de borrado, el dato se acumula para siempre.
7. **Fotos**: al recomprimir con `canvas` se pierden los metadatos EXIF (incluida la ubicación de la cámara), lo que reduce la fuga de datos; **verificalo** con una foto real antes de confiar en eso.
8. **GPS**: pedí la ubicación **solo cuando hace falta** y guardá la precisión mínima útil (§5, geolocalización). Si se deniega el permiso, la app debe funcionar sin ella y decirlo claro.
9. **Borrador local**: limpiá el `localStorage` al terminar y no guardes datos personales de más (§6). En un teléfono compartido, ofrecé "borrar mis datos".
10. **Proveedores externos** (OCR, IA, mapas): revisá **qué datos salen**, dónde se procesan y si el proveedor los reutiliza. No mandes documentos de identidad a un servicio sin contrato o sin base legal.
11. **Descargas e informes**: quien exporta a Excel o Power BI multiplica las copias (§31); limitá quién puede.
12. **Derechos del titular** (acceso, rectificación, supresión): ten un **canal y un procedimiento** para atenderlos, con quién responde y en qué plazo.

## 33.4 Qué **no** decir en la app pública

- No muestres datos de **otras personas** (autocompletar un nombre a partir de un DNI ajeno equivale a un buscador de datos personales).
- Un **PIN** de 4 dígitos protege poco: aplicá el bloqueo por intentos (§19.4).
- No publiques **identificadores internos** en la pantalla de éxito (§1).

## Fuentes

- Texto de la Ley 25.326 — `oas.org/juridico/pdfs/arg_ley25326.pdf` y `www3.hcdn.gob.ar/…/Ley_25326.pdf` (texto actualizado)
- Resúmenes: Diario Judicial (*¿Sigue siendo suficiente la Ley 25.326 en 2026?*), BDO Argentina, XMS Latam. Consultados por búsqueda web el 2026-09-24; **no equivalen a asesoría legal**.
- Microsoft: *Secure data used in cloud flows* (entradas y salidas seguras) — `learn.microsoft.com/power-automate/guidance/coding-guidelines/use-secure-inputs-outputs-triggers`
