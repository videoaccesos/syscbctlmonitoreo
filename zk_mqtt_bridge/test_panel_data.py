#!/usr/bin/env python3
"""
Explorar datos del panel ZK C3-400

Lee todas las tablas disponibles: tarjetas, puertas, zonas horarias, etc.

Uso:
  python3 test_panel_data.py miguel.ddns.accessbot.net
"""

import sys
from datetime import datetime
from c3 import C3


def main():
    if len(sys.argv) < 2:
        print("Uso: python3 test_panel_data.py <host>")
        sys.exit(1)

    host = sys.argv[1]

    print("=" * 60)
    print(f"  ZK C3-400 - Explorar datos del panel")
    print(f"  Host: {host}")
    print(f"  Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    panel = C3(host)
    print(f"\nConectando a {host}...")
    panel.connect()
    print("Conectado OK")

    # --- Informacion basica ---
    print("\n" + "-" * 60)
    print("  INFORMACION DEL PANEL")
    print("-" * 60)
    print(f"  Serial:   {panel.serial_number}")
    print(f"  Firmware: {panel.firmware_version}")
    print(f"  Nombre:   {panel.device_name}")
    print(f"  Puertas:  {panel.nr_of_locks}")
    print(f"  MAC:      {panel.mac}")

    # --- Configuracion de puertas ---
    print("\n" + "-" * 60)
    print("  CONFIGURACION DE PUERTAS")
    print("-" * 60)
    for i in range(1, panel.nr_of_locks + 1):
        try:
            ds = panel.door_settings(i)
            print(f"\n  Puerta {i}:")
            # Mostrar todos los atributos del objeto
            for attr in dir(ds):
                if not attr.startswith('_'):
                    val = getattr(ds, attr)
                    if not callable(val):
                        print(f"    {attr}: {val}")
        except Exception as e:
            print(f"  Puerta {i}: Error - {e}")

    # --- Descubrir tablas disponibles ---
    print("\n" + "-" * 60)
    print("  TABLAS DE DATOS DISPONIBLES")
    print("-" * 60)
    try:
        data_cfg = panel._get_device_data_cfg()
        table_names = []
        for cfg in data_cfg:
            fields = [f.name for f in cfg.fields]
            print(f"\n  Tabla: {cfg.name}")
            print(f"    Campos: {', '.join(fields)}")
            print(f"    Registros: {cfg.count}")
            table_names.append(cfg.name)
    except Exception as e:
        print(f"  Error listando tablas: {e}")
        table_names = ['user', 'card', 'timezone', 'transaction',
                       'firstcard', 'multimcard']

    # --- Leer cada tabla ---
    print("\n" + "-" * 60)
    print("  CONTENIDO DE TABLAS")
    print("-" * 60)
    for table in table_names:
        print(f"\n  === TABLA: {table} ===")
        try:
            rows = panel.get_device_data(table)
            if not rows:
                print("    (vacia)")
                continue
            print(f"    {len(rows)} registros:")
            for i, row in enumerate(rows[:20]):  # Max 20 registros
                print(f"    [{i+1}] {row}")
            if len(rows) > 20:
                print(f"    ... ({len(rows) - 20} mas)")
        except Exception as e:
            print(f"    Error: {e}")

    # --- Parametros del dispositivo ---
    print("\n" + "-" * 60)
    print("  PARAMETROS DEL DISPOSITIVO")
    print("-" * 60)
    param_names = [
        '~SerialNumber', 'FirmVer', 'DeviceName',
        'IPAddress', 'GATEIPAddress', 'NetMask',
        'MACAddress', 'LockCount', 'ReaderCount',
        'AuxInCount', 'AuxOutCount',
        'DoorCloseTimeout1', 'DoorCloseTimeout2',
        'DoorCloseTimeout3', 'DoorCloseTimeout4',
        'DoorSensorType1', 'DoorSensorType2',
        'DoorSensorType3', 'DoorSensorType4',
        'AntiPassback',
    ]
    try:
        params = panel.get_device_param(param_names)
        for k, v in sorted(params.items()):
            print(f"  {k}: {v}")
    except Exception as e:
        print(f"  Error (batch): {e}")
        # Intentar uno por uno
        for p in param_names:
            try:
                val = panel.get_device_param([p])
                print(f"  {p}: {val}")
            except Exception:
                pass

    # --- Status de puertas ---
    print("\n" + "-" * 60)
    print("  STATUS ACTUAL")
    print("-" * 60)
    try:
        for i in range(1, panel.nr_of_locks + 1):
            lock = panel.lock_status(i)
            print(f"  Puerta {i} cerradura: {lock}")
    except Exception as e:
        print(f"  Lock status: {e}")

    try:
        for i in range(1, (panel.nr_aux_in or 0) + 1):
            aux = panel.aux_in_status(i)
            print(f"  Aux In {i}: {aux}")
    except Exception as e:
        pass

    try:
        for i in range(1, (panel.nr_aux_out or 0) + 1):
            aux = panel.aux_out_status(i)
            print(f"  Aux Out {i}: {aux}")
    except Exception as e:
        pass

    panel.disconnect()
    print("\n" + "=" * 60)
    print("  Desconectado OK")
    print("=" * 60)


if __name__ == '__main__':
    main()
