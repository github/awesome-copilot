<!-- spa-sharepoint-power-automate · references/19-reportes-power-bi-listas.md · sección §31 -->
<!-- Nueva (2026-09-24). Verificado contra Microsoft Learn (Power BI: refresco y límites; conector de listas de SharePoint Online v2.0). Índice: ../SKILL.md -->

# 31 · Reportes y dashboards sobre listas de SharePoint

Las listas que llena el pipeline terminan alimentando **tableros** (Power BI o un dashboard propio). Este capítulo junta lo que falla **después** de que los datos ya están bien guardados.

## 31.1 Power BI sobre una lista: lo que hay que saber

| Punto | Dato verificado |
|---|---|
| Uniones por consulta (conector **SharePoint Online list v2.0**) | Máximo **12**; una consulta que toca más de 12 columnas Lookup/Persona falla. Arreglo documentado: **vista por defecto con menos de 12 columnas lookup** |
| Fechas | El backend de SharePoint entrega **UTC** y Power BI **no convierte**: hay que pasar la columna a `datetimezone` y aplicar `DateTimeZone.ToLocal` (o convertir en el flow al guardar) |
| Filtrado por OData | La URL del feed OData tiene un límite de ~**2.100 caracteres** |
| Refrescos programados por día | **8** (Pro / capacidad compartida) · **48** (Premium por usuario, Premium/Fabric) |
| Duración máxima de un refresco programado | **2 horas** (compartida) · **5 horas** (Premium) |
| Tamaño máximo de un modelo importado | **1 GB**; en capacidad compartida hay además un tope de **10 GB** de datos sin comprimir procesados por refresco |
| Fallos consecutivos | Tras **4** fallos seguidos, Power BI **desactiva** el refresco programado |
| Inactividad | Tras **2 meses** sin que nadie abra un informe del modelo, se **pausa** el refresco programado |
| DirectQuery | Devuelve como máximo **1 millón de filas** y tiene un tiempo de respuesta máximo de **225 segundos** |

### Consecuencias prácticas

- **"El tablero muestra datos de ayer"** casi siempre es uno de estos: refresco **desactivado por 4 fallos** (mirá el correo del propietario), **credenciales vencidas** (cambio de contraseña), o refresco **pausado por inactividad**.
- Si la lista tiene **muchas columnas Lookup/Persona**, no importes la lista entera: creá una **vista** solo con las columnas necesarias y usala como origen (§27.4).
- Para tableros de **campo** donde el dato tiene que estar en minutos, 8 refrescos por día no alcanza: considerá capacidad Premium, **DirectQuery** (con su límite de 1 M de filas y 225 s), o un flow que precalcule un resumen en una lista chica.
- **Refresco incremental** para modelos de más de 1 GB o que tardan horas.
- Enviá los **avisos de fallo de refresco** a un alias del equipo, no solo al propietario (Power BI permite contactos adicionales). No admite alias de grupo para las notificaciones móviles.

## 31.2 Diseñar la lista pensando en el reporte

Reglas de §27 que más pesan acá:

1. **Desnormalizar** lo que se filtra o agrupa (folio, sector, fecha local) en la lista hija en lugar de traerlo por Lookup.
2. **Fecha local guardada como columna propia** además del UTC, para no depender de conversiones en cada informe.
3. **Choice** con valores estables para los ejes de los gráficos: un Choice que cambia de texto rompe las series históricas.
4. **Un ID numérico** para las relaciones del modelo, no el Title.
5. Columnas **Calculated** con cuidado: solo lectura y se recalculan; mejor calcular en el flow o en Power BI.

## 31.3 Dashboards propios (SPA) sobre datos de SharePoint

Si en lugar de Power BI armás un dashboard web:

- **No expongas una lista por una URL de trigger pública** "de lectura" sin control: cualquiera con la URL lee todo (§1, §21.1). Para lectura, exigí **autenticación real** (Entra, §21.1) o publicá solo **resúmenes agregados** sin datos personales.
- Los datos **se consumen mejor ya agregados** (una lista de resumen por período) que leyendo miles de ítems desde el navegador (§23).
- **Guardá el reporte en el servidor** (Power BI Service, o un archivo generado por un flow programado) en lugar de reconstruirlo en cada visita.
- Si publicás datos sensibles en un sitio estático (por ejemplo cifrados en el cliente), la **clave** no puede viajar en el mismo bundle (§1).

## 31.4 Qué monitorear

Sumá a §13: estado del **último refresco** de cada modelo, **fecha de última actualización** visible en el propio informe, y el **conteo de filas** de la lista frente al informe (una diferencia grande indica filtro roto o refresco viejo).

## Fuentes (Microsoft Learn)

- *Data refresh in Power BI* — `learn.microsoft.com/power-bi/connect-data/refresh-data`
- *Configure scheduled refresh* — `learn.microsoft.com/power-bi/connect-data/refresh-scheduled-refresh`
- *Troubleshoot refresh scenarios* — `learn.microsoft.com/power-bi/connect-data/refresh-troubleshooting-refresh-scenarios`
- *SharePoint Online list* (conector de Power Query: 12 uniones, UTC, longitud de URL OData) — `learn.microsoft.com/power-query/connectors/sharepoint-online-list`
