"""Таблицы. Деньги — в копейках (int), время — UTC."""
from __future__ import annotations

import datetime as dt
from typing import List, Optional

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def utcnow() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc).replace(tzinfo=None)


# Что пришло: заказ из корзины или одна из заявок
KINDS = {
    "order": "Заказ",
    "custom": "Заявка на пошив",
    "question": "Вопрос",
    "contact": "Сообщение",
    "wholesale": "Опт",
    "review": "Отзыв",
}
STATUSES = {
    "new": "Новый",
    "confirmed": "Подтверждён",
    "production": "В пошиве",
    "shipped": "Отправлен",
    "done": "Выполнен",
    "canceled": "Отменён",
    "spam": "Спам",
}
REQUEST_STATUSES = {"new": "Новая", "in_work": "В работе", "done": "Обработана", "spam": "Спам"}
PAY_SCHEMES = {
    "prepay": "Предоплата",
    "full": "Полная оплата онлайн",
    "invoice": "Счёт для юрлица",
    "none": "Без оплаты",
}
PAY_STATUSES = {
    "not_required": "Не требуется",
    "pending": "Ждём оплату",
    "partially_paid": "Предоплата внесена",
    "paid": "Оплачен полностью",
    "invoice": "Ждём счёт",
    "refunded": "Возврат",
    "canceled": "Оплата отменена",
}


class Order(Base):
    """Заказ или заявка. kind различает тип, у заявок нет позиций и оплаты."""
    __tablename__ = "orders"
    __table_args__ = {"sqlite_autoincrement": True}  # номер заказа из id — не переиспользуем id после удаления

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    number: Mapped[Optional[str]] = mapped_column(String(20), unique=True, index=True)
    public_id: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    kind: Mapped[str] = mapped_column(String(16), index=True)
    status: Mapped[str] = mapped_column(String(16), default="new", index=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=utcnow, index=True)
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    # клиент и получатель
    name: Mapped[str] = mapped_column(String(120), default="")
    phone: Mapped[str] = mapped_column(String(32), default="", index=True)
    email: Mapped[str] = mapped_column(String(160), default="")
    city: Mapped[str] = mapped_column(String(120), default="")
    contact_method: Mapped[str] = mapped_column(String(32), default="")
    company: Mapped[str] = mapped_column(String(200), default="")
    inn: Mapped[str] = mapped_column(String(12), default="")

    # автомобиль (главный — для списка; у каждой позиции свой)
    car_slug: Mapped[str] = mapped_column(String(80), default="", index=True)
    car_title: Mapped[str] = mapped_column(String(200), default="")
    vin: Mapped[str] = mapped_column(String(24), default="", index=True)
    vin_info: Mapped[Optional[dict]] = mapped_column(JSON)
    vin_state: Mapped[str] = mapped_column(String(16), default="")  # ok | mismatch | unknown | frame | bad | ""
    vin_confirmed_slug: Mapped[str] = mapped_column(String(80), default="")

    # доставка
    delivery_method: Mapped[str] = mapped_column(String(16), default="")
    delivery_title: Mapped[str] = mapped_column(String(120), default="")
    delivery_address: Mapped[str] = mapped_column(String(300), default="")
    delivery_kop: Mapped[Optional[int]] = mapped_column(Integer)  # None — по тарифу ТК
    track_number: Mapped[str] = mapped_column(String(64), default="")

    # деньги
    pay_scheme: Mapped[str] = mapped_column(String(16), default="none")
    pay_status: Mapped[str] = mapped_column(String(16), default="not_required", index=True)
    items_kop: Mapped[int] = mapped_column(Integer, default=0)
    total_kop: Mapped[int] = mapped_column(Integer, default=0)       # товары + известная доставка
    due_now_kop: Mapped[int] = mapped_column(Integer, default=0)     # к оплате онлайн при оформлении
    paid_kop: Mapped[int] = mapped_column(Integer, default=0)

    extras: Mapped[Optional[dict]] = mapped_column(JSON)    # {"mats": bool, "install": bool, "gift": "…"}
    config: Mapped[Optional[dict]] = mapped_column(JSON)    # конструктор: выбор и сводка
    topic: Mapped[str] = mapped_column(String(120), default="")
    message: Mapped[str] = mapped_column(Text, default="")
    comment: Mapped[str] = mapped_column(Text, default="")

    # откуда пришёл и согласие на обработку ПДн (152-ФЗ)
    source_page: Mapped[str] = mapped_column(String(300), default="")
    referrer: Mapped[str] = mapped_column(String(300), default="")
    utm: Mapped[Optional[dict]] = mapped_column(JSON)
    ip: Mapped[str] = mapped_column(String(64), default="")
    user_agent: Mapped[str] = mapped_column(String(300), default="")
    consent_at: Mapped[Optional[dt.datetime]] = mapped_column(DateTime)
    consent_doc: Mapped[str] = mapped_column(String(120), default="")
    spam_score: Mapped[int] = mapped_column(Integer, default=0)

    items: Mapped[List["OrderItem"]] = relationship(back_populates="order", cascade="all, delete-orphan", order_by="OrderItem.id")
    payments: Mapped[List["Payment"]] = relationship(back_populates="order", cascade="all, delete-orphan", order_by="Payment.id")
    events: Mapped[List["OrderEvent"]] = relationship(back_populates="order", cascade="all, delete-orphan", order_by="OrderEvent.id")

    @property
    def is_order(self) -> bool:
        return self.kind == "order"

    @property
    def rest_kop(self) -> int:
        return max(0, self.total_kop - self.paid_kop)

    @property
    def kind_title(self) -> str:
        return KINDS.get(self.kind, self.kind)

    @property
    def status_title(self) -> str:
        return (STATUSES if self.is_order else REQUEST_STATUSES).get(self.status, self.status)


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    key: Mapped[str] = mapped_column(String(120))          # cover:<лекало>:<сочетание>
    title: Mapped[str] = mapped_column(String(240))
    brand_id: Mapped[str] = mapped_column(String(40), default="")
    brand: Mapped[str] = mapped_column(String(80), default="")
    model: Mapped[str] = mapped_column(String(80), default="")
    generation: Mapped[str] = mapped_column(String(80), default="")
    salon: Mapped[str] = mapped_column(String(120), default="")
    years: Mapped[str] = mapped_column(String(40), default="")
    slug: Mapped[str] = mapped_column(String(80), default="", index=True)
    variant_id: Mapped[str] = mapped_column(String(40), default="")
    material: Mapped[str] = mapped_column(String(80), default="")
    color: Mapped[str] = mapped_column(String(120), default="")
    variant_name: Mapped[str] = mapped_column(String(160), default="")
    options: Mapped[Optional[dict]] = mapped_column(JSON)
    qty: Mapped[int] = mapped_column(Integer, default=1)
    price_kop: Mapped[int] = mapped_column(Integer, default=0)
    old_price_kop: Mapped[int] = mapped_column(Integer, default=0)
    sum_kop: Mapped[int] = mapped_column(Integer, default=0)

    order: Mapped[Order] = relationship(back_populates="items")


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    public_id: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    provider: Mapped[str] = mapped_column(String(16))
    provider_payment_id: Mapped[Optional[str]] = mapped_column(String(64), unique=True, index=True)
    purpose: Mapped[str] = mapped_column(String(16))     # prepay | full | rest | manual
    amount_kop: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(24), default="new")  # new | pending | waiting_for_capture | succeeded | canceled | refunded | error
    confirmation_url: Mapped[str] = mapped_column(String(600), default="")
    idempotence_key: Mapped[str] = mapped_column(String(64))
    method: Mapped[str] = mapped_column(String(40), default="")     # bank_card | sbp | sberbank | cash | invoice…
    cancel_reason: Mapped[str] = mapped_column(String(120), default="")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=utcnow)
    paid_at: Mapped[Optional[dt.datetime]] = mapped_column(DateTime)
    raw: Mapped[Optional[dict]] = mapped_column(JSON)
    created_by: Mapped[str] = mapped_column(String(60), default="customer")

    order: Mapped[Order] = relationship(back_populates="payments")


class OrderEvent(Base):
    """История: создание, смена статуса, оплаты, заметки менеджеров, уведомления."""
    __tablename__ = "order_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    at: Mapped[dt.datetime] = mapped_column(DateTime, default=utcnow)
    actor: Mapped[str] = mapped_column(String(60), default="system")
    type: Mapped[str] = mapped_column(String(24))
    text: Mapped[str] = mapped_column(Text, default="")
    data: Mapped[Optional[dict]] = mapped_column(JSON)

    order: Mapped[Order] = relationship(back_populates="events")


class AdminUser(Base):
    __tablename__ = "admin_users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(60), unique=True)
    name: Mapped[str] = mapped_column(String(120), default="")
    role: Mapped[str] = mapped_column(String(16), default="manager")  # admin | manager
    password_hash: Mapped[str] = mapped_column(String(300))
    totp_secret: Mapped[str] = mapped_column(String(64), default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    failed_logins: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[Optional[dt.datetime]] = mapped_column(DateTime)
    last_login_at: Mapped[Optional[dt.datetime]] = mapped_column(DateTime)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=utcnow)


class AdminSession(Base):
    """Серверные сессии: в cookie только случайный токен, в базе — его хеш. Можно отозвать."""
    __tablename__ = "admin_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("admin_users.id", ondelete="CASCADE"), index=True)
    csrf: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=utcnow)
    last_seen_at: Mapped[dt.datetime] = mapped_column(DateTime, default=utcnow)
    expires_at: Mapped[dt.datetime] = mapped_column(DateTime)
    ip: Mapped[str] = mapped_column(String(64), default="")
    user_agent: Mapped[str] = mapped_column(String(300), default="")

    user: Mapped[AdminUser] = relationship()


class VinLearned(Base):
    """VIN, подтверждённые менеджером: начало VIN (8 символов) или код кузова → лекало каталога.
    Так база сама дополняется реальными машинами клиентов."""
    __tablename__ = "vin_learned"
    __table_args__ = (UniqueConstraint("key", "slug", name="uq_vin_learned"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    key: Mapped[str] = mapped_column(String(24), index=True)   # «XTA21901» или «FRAME:NZE141»
    slug: Mapped[str] = mapped_column(String(80))
    years: Mapped[Optional[list]] = mapped_column(JSON)         # модельные годы подтверждённых VIN
    hits: Mapped[int] = mapped_column(Integer, default=1)
    example: Mapped[str] = mapped_column(String(24), default="")  # VIN без серийного номера
    order_id: Mapped[Optional[int]] = mapped_column(Integer)
    created_by: Mapped[str] = mapped_column(String(60), default="")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)
