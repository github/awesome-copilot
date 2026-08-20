---
applyTo: '**/*.py,**/*.ts,**/*.js,**/*.tsx,**/*.go,**/*.rs,**/*.java,**/*.cs,**/*.sql'
description: 'Canonical field naming for industrial equipment telemetry (CNC, robots, PLCs, vehicles, HVAC). 366 field names generated from the MIT-licensed FoundryNet canonical schema and verified against it at build time, with an alias table for the plausible-but-wrong spellings an LLM otherwise invents.'
---

# FoundryNet Canonical Schema — field naming for industrial telemetry
#
# Generated from https://github.com/FoundryNet/canonical-schema v1.0.0 (366 fields, 16,908 vendor mappings).
# Do not hand-edit: run gen_configs.py to regenerate.

When working with industrial equipment telemetry — CNC machines, robots, PLCs,
vehicles, 3D printers, building automation — use the FoundryNet Canonical
Schema for field names. It is the target vocabulary that vendor-specific tags
normalize into.

## The single most important rule

DO NOT INVENT FIELD NAMES. The schema is irregular because it was extracted
from a real corpus of 16,908 vendor tags, not designed on a whiteboard. Names
you would expect to exist frequently do not:

  spindle_temperature_c, spindle_temp, spindle_temp_c
    -> spindle_temperature
  spindle.speed, spindle_rotary_velocity, rotary_velocity
    -> spindle_speed_rpm
  spindle.load, spindle_load_percent
    -> spindle_load_pct
  motor_temperature_c, motor_temp
    -> motor_temperature
  vibration_mm_s, vibration_rms_mm_s, vibration.rms
    -> vibration_rms
  motor_power_kw, power_kw, electrical_power_kw
    -> power_consumption_kw

If you need a field that is not listed below, look it up rather than guessing:

  curl https://forge.foundrynet.io/v1/coverage        # production: what is supported, per OEM
  https://github.com/FoundryNet/canonical-schema/blob/main/schema/fields.json   # every field, with type + unit

Or run the sandbox locally and query it with no API key at all. Note that
/v1/canonical-fields is a SANDBOX endpoint — production serves /v1/coverage
and the full dictionary lives in the schema repo:

  docker run -p 8000:8000 ghcr.io/foundrynet/forge-sandbox
  curl localhost:8000/v1/canonical-fields

## Naming conventions that actually hold

These suffixes are real and consistent enough to rely on:

  _pct       percentage, 0-100        (3 fields)
  _rpm       revolutions per minute   (1 fields)
  _hours     hours                    (2 fields)
  _seconds   seconds                  (1 fields)
  _kwh       kilowatt-hours           (2 fields)
  _kw        kilowatts                (1 fields)
  _kg        kilograms                (2 fields)
  _c         degrees Celsius          (1 fields)

## Conventions that do NOT hold — do not assume them

- Unit suffixes are NOT universal. Only 58 of 366 fields declare a
  unit at all. `sensor_readings.coolant_temp` has no `_c`; `feed_rate` has no
  `_mm_min`. Never append a unit suffix to make a name "consistent".
- Never infer the unit from the name. Read the `unit` property, or convert
  explicitly. A field named `..._temp` may be Celsius or Fahrenheit depending
  on the source tag; Forge reports the conversion it applied.
- Percentages are mostly `_pct`, but `axes.0.load_percent` uses `_percent`.
- Some fields are dot-namespaced (`sensor_readings.*`, `axes.*`, `robot.*`,
  `ros.*`) and some are flat. There is no rule; use the exact published name.
- `axes.0.*` and `axes.x_*` are BOTH real and mean different things in
  different packs. Do not normalize one into the other.

## High-frequency fields

Ordered by how many real vendor tags map to each. If you only remember a
handful, remember the top of this list.

CNC (82 fields total)
  spindle_speed_rpm                  rpm     307 mappings
  spindle_load_pct                   %       255 mappings
  axes.0.position_actual             —       232 mappings
  axes.0.temperature_c               degC    222 mappings
  axes.0.load_percent                %       215 mappings
  feed_rate                          —       215 mappings
  axes.1.position_actual             —       211 mappings
  sensor_readings.coolant_temp       —       209 mappings
  axes.2.position_actual             —       203 mappings
  tool_id                            —       164 mappings
  sensor_readings.coolant_flow       —       153 mappings
  spindle_speed_commanded            —        62 mappings
  feed_rate_actual                   —        61 mappings
  axes.y_load_pct                    %        60 mappings
  axes.z_load_pct                    %        60 mappings
  axes.x_load_pct                    %        58 mappings
  axes.x_position_actual             —        53 mappings
  axes.y_position_actual             —        52 mappings

ROBOTICS (53 fields total)
  sensor_readings.tcp_speed          —       152 mappings
  robot.joint.position               —        33 mappings
  robot.tcp.pose                     —        24 mappings
  robot.joint.effort                 —        18 mappings
  robot.joint.temperature            —        18 mappings
  robot.tcp.speed                    —        15 mappings
  robot.safety.protective_stop       —        14 mappings
  robot.joint.current                —        12 mappings
  robot.mode                         —        12 mappings
  robot.joint.velocity               —        11 mappings
  robot.program.state                —        10 mappings
  robot.speed_scaling                —         8 mappings

UNIVERSAL (151 fields total)
  sensor_readings.vibration_x        —       229 mappings
  operating_hours                    h       227 mappings
  energy_kwh                         kWh     226 mappings
  alarm_code                         —       218 mappings
  part_count                         —       212 mappings
  sensor_readings.total_temp_lpc_outlet —       204 mappings
  sensor_readings.total_temp_lpt_outlet —       191 mappings
  sensor_readings.total_temp_hpc_outlet —       190 mappings
  sensor_readings.hydraulic_pressure —       187 mappings
  sensor_readings.pressure_fan_inlet —       184 mappings
  alarm_description                  —       179 mappings
  sensor_readings.good_parts         —       176 mappings
  sensor_readings.core_speed_rpm     rpm     157 mappings
  alarm_severity                     —       155 mappings
  sensor_readings.air_pressure       —       154 mappings
  sensor_readings.cycle_time         —       154 mappings
  sensor_readings.fan_speed_rpm      rpm     154 mappings
  sensor_readings.voltage            —       154 mappings
  metadata.controller_model          —       153 mappings
  payload_kg                         kg      153 mappings

VEHICLE (64 fields total)
  vehicle.ambient.air_temp           —        12 mappings
  vehicle.brake.primary_air_pressure —         7 mappings
  vehicle.engine.demand_torque_pct   %         7 mappings
  vehicle.engine.intake_manifold_pressure —         7 mappings
  vehicle.engine.intake_manifold_temp —         7 mappings
  vehicle.engine.oil_pressure        —         7 mappings
  vehicle.engine.oil_temp            —         7 mappings
  vehicle.transmission.oil_temp      —         7 mappings
  vehicle.turbocharger.rpm           —         7 mappings
  vehicle.acceleration_x             —         6 mappings

ADDITIVE (6 fields total)
  sensor_readings.hotend_temp        —        43 mappings
  filament_used_cm3                  —         1 mappings
  filament_used_mm                   —         1 mappings
  sensor_readings.hotend2_target     —         1 mappings
  sensor_readings.hotend2_temp       —         1 mappings
  sensor_readings.hotend_target      —         1 mappings

AMR (10 fields total)
  amr.battery.charge                 —         6 mappings
  amr.position.theta                 —         6 mappings
  amr.battery.charging               —         5 mappings
  amr.battery.voltage                —         5 mappings
  amr.position.x                     —         5 mappings
  amr.position.y                     —         5 mappings

## Normalizing raw vendor telemetry

Do not hand-write a mapping table. Send the raw payload to Forge and use what
comes back:

  POST https://forge.foundrynet.io/v1/normalize
  Authorization: Bearer YOUR_FORGE_KEY
  {"oem": "haas", "data": {"S SPEED (RPM)": 8500, "SP_LOAD_PCT (%)": 84.7}}

  -> {"normalized": {"spindle_speed_rpm": 8500, "spindle_load_pct": 84.7},
       "coverage_pct": 100.0}

Check `unresolved_tags` in the response. Anything listed there did not map, and
inventing a name for it locally defeats the purpose.

Or connect an agent directly over MCP: https://mcp.foundrynet.io/mcp

## Predictions are stateless

`predict_breach`, `remaining_life`, and `fleet_health` never read stored
telemetry. You must pass `time_series` (16+ points, oldest to newest) on every
call. Sending {machine_id, field, threshold} and expecting a lookup is a 422.
