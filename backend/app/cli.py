"""Команды обслуживания:
  python -m app.cli create-admin <логин> [--role admin|manager] — создать пользователя админки (пароль спросит)
  python -m app.cli reset-password <логин>                        — новый пароль, сброс блокировки и 2FA
  python -m app.cli vin <VIN или номер кузова>                    — проверить расшифровку
  python -m app.cli vin-coverage                                  — сколько лекал каталога покрыто правилами VIN"""
from __future__ import annotations

import getpass
import json
import sys

from sqlalchemy import select

from .db import init_db, session_scope
from .models import AdminSession, AdminUser
from .security import hash_password, password_problems


def _ask_password() -> str:
    while True:
        p1 = getpass.getpass("Пароль: ")
        problem = password_problems(p1)
        if problem:
            print(problem)
            continue
        if getpass.getpass("Ещё раз: ") != p1:
            print("Пароли не совпали")
            continue
        return p1


def main(argv) -> int:
    if not argv:
        print(__doc__)
        return 1
    cmd, args = argv[0], argv[1:]
    init_db()
    if cmd == "create-admin" and args:
        role = args[args.index("--role") + 1] if "--role" in args else "admin"
        with session_scope() as db:
            if db.scalar(select(AdminUser).where(AdminUser.username == args[0].lower())):
                print("Такой пользователь уже есть")
                return 1
            db.add(AdminUser(username=args[0].lower(), role=role, password_hash=hash_password(_ask_password())))
        print(f"Готово: {args[0]} ({role})")
        return 0
    if cmd == "reset-password" and args:
        with session_scope() as db:
            u = db.scalar(select(AdminUser).where(AdminUser.username == args[0].lower()))
            if not u:
                print("Нет такого пользователя")
                return 1
            u.password_hash, u.totp_secret, u.failed_logins, u.locked_until = hash_password(_ask_password()), "", 0, None
            db.execute(AdminSession.__table__.delete().where(AdminSession.user_id == u.id))
        print("Пароль изменён, 2FA и сессии сброшены")
        return 0
    if cmd == "vin" and args:
        from .vin import vin_base
        print(json.dumps(vin_base.decode(" ".join(args)), ensure_ascii=False, indent=1))
        return 0
    if cmd == "vin-coverage":
        from .catalog import catalog
        from .vin import vin_base
        covered = {s for rules in vin_base.vin_rules.values() for r in rules for s in r.slugs}
        framed = {s for rules in vin_base.frame_rules.values() for r in rules for s in r.slugs}
        print(json.dumps(vin_base.stats, ensure_ascii=False))
        print(f"Лекал в каталоге: {len(catalog.models)}; по VIN: {len(covered)}; по номеру кузова: {len(framed)}; "
              f"всего покрыто: {len(covered | framed)}")
        miss = sorted(set(catalog.models) - covered - framed)
        print("Не покрыты:", ", ".join(miss) if miss else "—")
        return 0
    print(__doc__)
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
