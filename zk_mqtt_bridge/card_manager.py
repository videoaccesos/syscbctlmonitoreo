#!/usr/bin/env python3
"""
Gestor de tarjetas del panel ZK C3-400

Permite listar, activar, desactivar, agregar y eliminar tarjetas
directamente en el panel de control de acceso.

Uso:
  python3 card_manager.py <host> list
  python3 card_manager.py <host> check <card_no>
  python3 card_manager.py <host> enable <card_no>
  python3 card_manager.py <host> disable <card_no>
  python3 card_manager.py <host> add <card_no> [--pin PIN] [--doors 1,2]
  python3 card_manager.py <host> delete <card_no>
  python3 card_manager.py <host> expired

Ejemplos:
  python3 card_manager.py interlomas.ddns.accessbot.net list
  python3 card_manager.py 192.168.1.201 enable 12345678
  python3 card_manager.py 192.168.1.201 disable 12345678
  python3 card_manager.py 192.168.1.201 add 99887766 --pin 100 --end "2026-12-31 23:59:59"
"""

import sys
import argparse
import logging
from datetime import datetime
from zk_c3 import ZKC3Panel, c3_datetime_decode

logger = logging.getLogger("card_manager")


def connect(host, port=4370, timeout=5):
    """Conectar al panel."""
    panel = ZKC3Panel(host, port, timeout)
    print(f"  Conectando a {host}:{port} (backend: {panel.backend})...")
    if not panel.connect():
        print(f"  ERROR: No se pudo conectar a {host}")
        sys.exit(1)
    serial = panel.get_serial()
    print(f"  Conectado - Serial: {serial}")
    print()
    return panel


def cmd_list(panel, args):
    """Lista todos los usuarios/tarjetas del panel."""
    print("=" * 70)
    print("  TARJETAS REGISTRADAS EN EL PANEL")
    print("=" * 70)

    users = panel.get_users()
    if not users:
        print("  No se encontraron usuarios registrados.")
        return

    now = datetime.now()
    active_count = 0
    expired_count = 0

    print(f"  {'#':>3}  {'Tarjeta':<12} {'Pin':<8} {'Grupo':<6} "
          f"{'Inicio':<20} {'Fin':<20} {'Estado':<10}")
    print("  " + "-" * 66)

    for i, user in enumerate(users, 1):
        card = str(user.get("CardNo", ""))
        pin = str(user.get("Pin", ""))
        group = str(user.get("Group", ""))
        start_raw = user.get("StartTime", 0)
        end_raw = user.get("EndTime", 0)
        sa = int(user.get("SuperAuthorize", 0))

        # Decodificar fechas C3 (enteros)
        start = c3_datetime_decode(start_raw) if isinstance(start_raw, int) else str(start_raw)
        end = c3_datetime_decode(end_raw) if isinstance(end_raw, int) else str(end_raw)

        # Determinar estado
        status = "ACTIVA"
        try:
            end_dt = datetime.strptime(end, "%Y-%m-%d %H:%M:%S")
            if end_dt < now:
                status = "EXPIRADA"
                expired_count += 1
            else:
                active_count += 1
        except ValueError:
            active_count += 1

        if sa:
            status += " [S]"

        print(f"  {i:>3}  {card:<12} {pin:<8} {group:<6} "
              f"{start:<20} {end:<20} {status:<10}")

    print()
    print(f"  Total: {len(users)} | Activas: {active_count} | "
          f"Expiradas: {expired_count}")
    print()


def cmd_check(panel, args):
    """Verifica el estado de una tarjeta especifica."""
    card_no = args.card_no
    print(f"  Verificando tarjeta: {card_no}")
    print()

    result = panel.is_card_valid(card_no)

    if not result["found"]:
        print(f"  Tarjeta {card_no} NO ENCONTRADA en el panel")
        return

    print(f"  Tarjeta:      {result['card_no']}")
    print(f"  Pin:          {result['pin']}")
    print(f"  Grupo:        {result['group']}")
    print(f"  Inicio:       {result['start_time']}")
    print(f"  Fin:          {result['end_time']}")
    print(f"  Super:        {'SI' if result['super_authorize'] else 'NO'}")
    print()

    if result["active"]:
        print(f"  Estado: ACTIVA - La tarjeta tiene acceso vigente")
    else:
        print(f"  Estado: INACTIVA - La tarjeta esta expirada o fuera de rango")
    print()


def cmd_enable(panel, args):
    """Activa una tarjeta."""
    card_no = args.card_no
    end_time = getattr(args, 'end', None) or "2099-12-31 23:59:59"

    print(f"  Activando tarjeta: {card_no}")
    print(f"  Validez hasta: {end_time}")

    if panel.enable_card(card_no, end_time=end_time):
        print(f"  TARJETA {card_no} ACTIVADA exitosamente")
    else:
        print(f"  ERROR al activar tarjeta {card_no}")
    print()


def cmd_disable(panel, args):
    """Desactiva una tarjeta."""
    card_no = args.card_no

    print(f"  Desactivando tarjeta: {card_no}")

    if panel.disable_card(card_no):
        print(f"  TARJETA {card_no} DESACTIVADA exitosamente")
        print(f"  (EndTime establecido a 2000-01-01 00:00:00)")
    else:
        print(f"  ERROR al desactivar tarjeta {card_no}")
    print()


def cmd_add(panel, args):
    """Agrega una nueva tarjeta al panel."""
    card_no = args.card_no
    pin = getattr(args, 'pin', None) or card_no
    group = getattr(args, 'group', None) or 1
    start = getattr(args, 'start', None) or "2000-01-01 00:00:00"
    end = getattr(args, 'end', None) or "2099-12-31 23:59:59"
    doors = getattr(args, 'doors', None) or "1,2,3,4"

    print(f"  Agregando tarjeta al panel:")
    print(f"    Tarjeta:  {card_no}")
    print(f"    Pin:      {pin}")
    print(f"    Grupo:    {group}")
    print(f"    Inicio:   {start}")
    print(f"    Fin:      {end}")
    print(f"    Puertas:  {doors}")
    print()

    if panel.set_user(card_no=card_no, pin=pin, group=int(group),
                      start_time=start, end_time=end, doors=doors):
        print(f"  TARJETA {card_no} AGREGADA exitosamente")
    else:
        print(f"  ERROR al agregar tarjeta {card_no}")
    print()


def cmd_delete(panel, args):
    """Elimina una tarjeta del panel."""
    card_no = args.card_no

    # Confirmar
    print(f"  ATENCION: Se eliminara la tarjeta {card_no} del panel")
    result = panel.is_card_valid(card_no)
    if result["found"]:
        print(f"    Pin: {result['pin']}, Grupo: {result['group']}")

    if panel.delete_user(card_no=card_no):
        print(f"  TARJETA {card_no} ELIMINADA del panel")
    else:
        print(f"  ERROR al eliminar tarjeta {card_no}")
    print()


def cmd_expired(panel, args):
    """Lista tarjetas expiradas."""
    print("=" * 70)
    print("  TARJETAS EXPIRADAS")
    print("=" * 70)

    users = panel.get_users()
    now = datetime.now()
    expired = []

    for user in users:
        end_raw = user.get("EndTime", 0)
        end = c3_datetime_decode(end_raw) if isinstance(end_raw, int) else str(end_raw)
        try:
            end_dt = datetime.strptime(end, "%Y-%m-%d %H:%M:%S")
            if end_dt < now:
                expired.append((user, end))
        except ValueError:
            pass

    if not expired:
        print("  No hay tarjetas expiradas.")
        return

    print(f"  {'#':>3}  {'Tarjeta':<12} {'Pin':<8} {'Expiro':<20}")
    print("  " + "-" * 46)

    for i, (user, end) in enumerate(expired, 1):
        card = str(user.get("CardNo", ""))
        pin = str(user.get("Pin", ""))
        print(f"  {i:>3}  {card:<12} {pin:<8} {end:<20}")

    print()
    print(f"  Total expiradas: {len(expired)} de {len(users)}")
    print()


def main():
    parser = argparse.ArgumentParser(
        description="Gestor de tarjetas ZK C3-400",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Comandos:
  list              Lista todas las tarjetas registradas
  check <card>      Verifica estado de una tarjeta
  enable <card>     Activa una tarjeta (fecha fin = 2099)
  disable <card>    Desactiva una tarjeta (fecha fin = 2000)
  add <card>        Agrega nueva tarjeta
  delete <card>     Elimina tarjeta del panel
  expired           Lista tarjetas expiradas
        """)

    parser.add_argument("host",
                        help="IP o hostname del panel")
    parser.add_argument("--port", "-p", type=int, default=4370,
                        help="Puerto TCP (default: 4370)")
    parser.add_argument("--timeout", "-t", type=int, default=5,
                        help="Timeout TCP en segundos (default: 5)")
    parser.add_argument("--verbose", "-v", action="store_true",
                        help="Mostrar logs detallados")

    subparsers = parser.add_subparsers(dest="command", help="Comando")

    # list
    subparsers.add_parser("list", help="Lista tarjetas")

    # check
    p_check = subparsers.add_parser("check", help="Verificar tarjeta")
    p_check.add_argument("card_no", help="Numero de tarjeta")

    # enable
    p_enable = subparsers.add_parser("enable", help="Activar tarjeta")
    p_enable.add_argument("card_no", help="Numero de tarjeta")
    p_enable.add_argument("--end", default="2099-12-31 23:59:59",
                          help="Fecha fin de validez (default: 2099-12-31)")

    # disable
    p_disable = subparsers.add_parser("disable", help="Desactivar tarjeta")
    p_disable.add_argument("card_no", help="Numero de tarjeta")

    # add
    p_add = subparsers.add_parser("add", help="Agregar tarjeta")
    p_add.add_argument("card_no", help="Numero de tarjeta")
    p_add.add_argument("--pin", default=None,
                       help="PIN/ID usuario (default: card_no)")
    p_add.add_argument("--group", type=int, default=1,
                       help="Grupo de acceso (default: 1)")
    p_add.add_argument("--start", default="2000-01-01 00:00:00",
                       help="Fecha inicio validez")
    p_add.add_argument("--end", default="2099-12-31 23:59:59",
                       help="Fecha fin validez")
    p_add.add_argument("--doors", default="1,2,3,4",
                       help="Puertas autorizadas (default: 1,2,3,4)")

    # delete
    p_delete = subparsers.add_parser("delete", help="Eliminar tarjeta")
    p_delete.add_argument("card_no", help="Numero de tarjeta")

    # expired
    subparsers.add_parser("expired", help="Listar tarjetas expiradas")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    if args.verbose:
        logging.basicConfig(level=logging.DEBUG,
                            format="%(asctime)s %(name)s %(levelname)s %(message)s")
    else:
        logging.basicConfig(level=logging.WARNING)

    panel = connect(args.host, args.port, args.timeout)

    commands = {
        "list": cmd_list,
        "check": cmd_check,
        "enable": cmd_enable,
        "disable": cmd_disable,
        "add": cmd_add,
        "delete": cmd_delete,
        "expired": cmd_expired,
    }

    try:
        commands[args.command](panel, args)
    finally:
        panel.disconnect()


if __name__ == "__main__":
    main()
