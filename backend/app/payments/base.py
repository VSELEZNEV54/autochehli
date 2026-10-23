from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional


class PaymentError(Exception):
    pass


@dataclass
class ReceiptLine:
    description: str
    quantity: int
    amount_kop: int          # сумма строки (за всё количество)
    payment_mode: str        # full_prepayment | partial_prepayment | advance | full_payment
    payment_subject: str = "commodity"


@dataclass
class PaymentRequest:
    amount_kop: int
    description: str
    return_url: str
    idempotence_key: str
    metadata: dict
    customer_email: str = ""
    customer_phone: str = ""
    receipt: List[ReceiptLine] = field(default_factory=list)


@dataclass
class ProviderPayment:
    id: str
    status: str                       # pending | waiting_for_capture | succeeded | canceled
    amount_kop: int
    paid: bool = False
    confirmation_url: str = ""
    method: str = ""
    cancel_reason: str = ""
    metadata: Optional[dict] = None
    raw: Optional[dict] = None


class Provider:
    name = "base"

    async def create(self, req: PaymentRequest) -> ProviderPayment:  # pragma: no cover
        raise NotImplementedError

    async def fetch(self, payment_id: str) -> ProviderPayment:  # pragma: no cover
        raise NotImplementedError


def split_amount(total_kop: int, weights: List[int]) -> List[int]:
    """Делит сумму пропорционально весам без потери копеек (метод наибольшего остатка) — для чека предоплаты по позициям."""
    s = sum(weights)
    if not weights or s <= 0:
        return [total_kop] if weights else []
    raw = [total_kop * w / s for w in weights]
    out = [int(x) for x in raw]
    rest = total_kop - sum(out)
    for i in sorted(range(len(raw)), key=lambda i: raw[i] - out[i], reverse=True)[:rest]:
        out[i] += 1
    return out
