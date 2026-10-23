"""Проверка входящих данных. Всё, что пришло из браузера, — недоверенное: длины, форматы, перечни значений."""
from __future__ import annotations

import re
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

NAME_RE = re.compile(r"^[A-Za-zА-Яа-яЁё][A-Za-zА-Яа-яЁё .'\-]{0,79}$")
EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+\-]{1,64}@[A-Za-z0-9.\-]{1,190}\.[A-Za-zА-Яа-я]{2,24}$")
# cover:<лекало>:<сочетание>[:mats][:install] — стандартное сочетание; custom:<лекало>:<ключ> — комплект из конструктора, его выбор в config
ITEM_RE = re.compile(r"^(cover:[a-z0-9_\-]{2,80}:[a-z0-9\-]{2,40}(:mats)?(:install)?|custom:[a-z0-9_\-]{2,80}:[a-z0-9]{4,16})$")
CTRL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def clean_text(v: Optional[str], limit: int) -> str:
    """Убираем управляющие символы и лишние пробелы, режем по длине. HTML экранируется при выводе."""
    v = CTRL_RE.sub("", str(v or "")).strip()
    v = re.sub(r"[ \t]+", " ", v)
    return v[:limit]


def normalize_phone(raw: str) -> str:
    """+7 (913) 123-45-67 для России и Казахстана; остальные — +<код> и 10–15 цифр."""
    digits = re.sub(r"\D", "", raw or "")
    if len(digits) == 11 and digits[0] == "8":
        digits = "7" + digits[1:]
    elif len(digits) == 10 and digits[0] in "3456789":
        digits = "7" + digits
    if len(digits) == 11 and digits[0] == "7":
        if digits[1] == "0" or digits[1] == "1":
            raise ValueError("Проверьте номер телефона")
        return f"+7 ({digits[1:4]}) {digits[4:7]}-{digits[7:9]}-{digits[9:11]}"
    if 10 <= len(digits) <= 15 and (raw or "").strip().startswith("+"):
        return "+" + digits
    raise ValueError("Укажите телефон в формате +7 900 000-00-00")


def inn_valid(inn: str) -> bool:
    """Контрольные цифры ИНН организации (10) или ИП (12)."""
    if not inn.isdigit() or len(inn) not in (10, 12):
        return False
    d = [int(c) for c in inn]
    check = lambda coefs, n: sum(c * x for c, x in zip(coefs, d)) % 11 % 10 == d[n]
    if len(inn) == 10:
        return check([2, 4, 10, 3, 5, 9, 4, 6, 8], 9)
    return check([7, 2, 4, 10, 3, 5, 9, 4, 6, 8], 10) and check([3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8], 11)


class _In(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)


class Meta(_In):
    page: str = ""
    referrer: str = ""
    utm: Dict[str, str] = Field(default_factory=dict)
    elapsed_ms: Optional[int] = None   # сколько форма была открыта — антиспам
    hp: str = ""                        # скрытое поле-ловушка
    captcha: str = ""

    @field_validator("page", "referrer")
    @classmethod
    def _cut(cls, v: str) -> str:
        return clean_text(v, 300)

    @field_validator("utm")
    @classmethod
    def _utm(cls, v: Dict[str, str]) -> Dict[str, str]:
        keys = ("utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "yclid", "gclid")
        return {k: clean_text(v[k], 120) for k in keys if k in v and v[k]}


class Customer(_In):
    name: str
    phone: str
    email: str = ""
    city: str = ""
    contact: Literal["", "call", "whatsapp", "telegram", "max"] = ""

    @field_validator("name")
    @classmethod
    def _name(cls, v: str) -> str:
        v = clean_text(v, 80)
        if not NAME_RE.match(v):
            raise ValueError("Укажите имя буквами")
        return v

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str) -> str:
        return normalize_phone(v)

    @field_validator("email")
    @classmethod
    def _email(cls, v: str) -> str:
        v = clean_text(v, 160)
        if v and not EMAIL_RE.match(v):
            raise ValueError("Проверьте e-mail")
        return v.lower()

    @field_validator("city")
    @classmethod
    def _city(cls, v: str) -> str:
        return clean_text(v, 120)


class Item(_In):
    id: str
    qty: int = Field(1, ge=1, le=10)
    config: Dict[str, object] = Field(default_factory=dict)   # только для custom: выбор в конструкторе
    label: str = Field("", max_length=400)                    # только для custom: описание комплекта для менеджера

    @field_validator("id")
    @classmethod
    def _id(cls, v: str) -> str:
        if not ITEM_RE.match(v):
            raise ValueError("Неизвестная позиция")
        return v


class Extras(_In):
    mats: bool = False
    install: bool = False


class OrderIn(_In):
    items: List[Item] = Field(min_length=1, max_length=20)
    customer: Customer
    delivery: Literal["dpd", "ems", "pickup", "nsk", "other"]
    address: str = ""
    payment: Literal["prepay", "full", "invoice"]
    company: str = ""
    inn: str = ""
    vin: str = ""
    extras: Extras = Field(default_factory=Extras)
    comment: str = ""
    consent: bool
    meta: Meta = Field(default_factory=Meta)

    @field_validator("address")
    @classmethod
    def _addr(cls, v: str) -> str:
        return clean_text(v, 300)

    @field_validator("comment")
    @classmethod
    def _comment(cls, v: str) -> str:
        return clean_text(v, 1500)

    @field_validator("vin")
    @classmethod
    def _vin(cls, v: str) -> str:
        return clean_text(v, 24).upper()

    @field_validator("company")
    @classmethod
    def _company(cls, v: str) -> str:
        return clean_text(v, 200)

    @field_validator("inn")
    @classmethod
    def _inn(cls, v: str) -> str:
        return re.sub(r"\D", "", v or "")

    @model_validator(mode="after")
    def _rules(self):
        if not self.consent:
            raise ValueError("Нужно согласие с офертой и обработкой персональных данных")
        if self.payment == "invoice":
            if not self.company:
                raise ValueError("Для счёта укажите организацию")
            if not inn_valid(self.inn):
                raise ValueError("Проверьте ИНН организации")
        if len({i.id for i in self.items}) != len(self.items):
            raise ValueError("Позиции в заказе повторяются")
        return self


class RequestIn(_In):
    """Заявки: конструктор, вопрос, сообщение с контактов, опт, отзыв."""
    kind: Literal["custom", "question", "contact", "wholesale", "review"]
    name: str = ""
    phone: str = ""
    contact: str = ""          # «Телефон или e-mail» в форме вопроса
    email: str = ""
    city: str = ""
    contact_method: Literal["", "call", "whatsapp", "telegram", "max"] = ""
    topic: str = ""
    car: str = ""
    message: str = ""
    vin: str = ""
    model: str = ""            # лекало из конструктора
    config: Dict[str, object] = Field(default_factory=dict)
    summary: List[List[str]] = Field(default_factory=list, max_length=20)
    consent: bool
    meta: Meta = Field(default_factory=Meta)

    @field_validator("name")
    @classmethod
    def _name(cls, v: str) -> str:
        v = clean_text(v, 80)
        if v and not NAME_RE.match(v):
            raise ValueError("Укажите имя буквами")
        return v

    @field_validator("topic", "car", "city")
    @classmethod
    def _short(cls, v: str) -> str:
        return clean_text(v, 160)

    @field_validator("message")
    @classmethod
    def _msg(cls, v: str) -> str:
        return clean_text(v, 3000)

    @field_validator("vin")
    @classmethod
    def _vin(cls, v: str) -> str:
        return clean_text(v, 24).upper()

    @field_validator("model")
    @classmethod
    def _model(cls, v: str) -> str:
        v = clean_text(v, 80)
        return v if re.match(r"^[a-z0-9_\-]*$", v) else ""

    @field_validator("config")
    @classmethod
    def _config(cls, v: Dict[str, object]) -> Dict[str, object]:
        out: Dict[str, object] = {}
        for k, val in list(v.items())[:20]:
            k = clean_text(k, 24)
            if isinstance(val, bool):
                out[k] = val
            elif isinstance(val, list):
                out[k] = [clean_text(x, 24) for x in val[:10] if isinstance(x, str)]
            elif isinstance(val, (str, int, float)):
                out[k] = clean_text(str(val), 40)
        return out

    @field_validator("summary")
    @classmethod
    def _summary(cls, v: List[List[str]]) -> List[List[str]]:
        return [[clean_text(p[0], 60), clean_text(p[1], 200)] for p in v if isinstance(p, list) and len(p) == 2]

    @model_validator(mode="after")
    def _rules(self):
        if not self.consent:
            raise ValueError("Нужно согласие на обработку персональных данных")
        raw = self.phone or self.contact
        if not raw and self.kind != "review":
            raise ValueError("Укажите телефон")
        if self.contact and "@" in self.contact and not self.phone:
            if not EMAIL_RE.match(self.contact):
                raise ValueError("Проверьте e-mail")
            self.email, self.contact = self.contact.lower(), ""
        elif raw:
            self.phone = normalize_phone(raw)
        if self.email and not EMAIL_RE.match(self.email):
            raise ValueError("Проверьте e-mail")
        if self.kind in ("question", "review") and len(self.message) < 3:
            raise ValueError("Напишите сообщение")
        return self
