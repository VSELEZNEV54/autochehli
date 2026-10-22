/* Товары разделов «Накидки», «Коврики EVA», «Оплётки», «Экокожа оптом». Цены не публикуются: на старом сайте их нет, стоимость сообщает менеджер. Позиции с demo: true — примеры. */
window.AS_PRODUCTS = [
  /* Накидки: на старом сайте раздела нет — все позиции примеры, цены не публикуем */
  { id: "c1", cat: "capes", demo: true, title: "Накидка из алькантары на переднее сиденье", sub: "Пример позиции", img: "assets/photos/avtochehol2.jpg" },
  { id: "c2", cat: "capes", demo: true, title: "Накидки из алькантары, комплект на передние сиденья", sub: "Пример позиции", img: "assets/photos/seat2.jpg" },
  { id: "c3", cat: "capes", demo: true, title: "Накидка из экокожи с перфорацией", sub: "Пример позиции", img: "assets/photos/6p.jpg" },
  { id: "c4", cat: "capes", demo: true, title: "Накидка на заднее сиденье", sub: "Пример позиции", img: "assets/photos/seat6.jpg" },

  /* Коврики: на старом сайте — «Автоковрики EVA в цвет авточехлов», ассортимента и цен нет */
  { id: "m1", cat: "mats", title: "Автоковрики EVA в цвет авточехлов", sub: "Производство «Автостиль» · по модели автомобиля", img: "assets/products/mat-4.jpg" },
  { id: "m2", cat: "mats", demo: true, title: "Коврики EVA в салон", sub: "Пример позиции", img: "assets/products/mat-1.jpg" },
  { id: "m3", cat: "mats", demo: true, title: "Коврики EVA с бортами", sub: "Пример позиции", img: "assets/products/mat-2.jpg" },
  { id: "m4", cat: "mats", demo: true, title: "Коврик EVA в багажник", sub: "Пример позиции", img: "assets/products/mat-3.jpg" },

  /* Оплётки: на старом сайте — акция «Оплётка на руль за 500 ₽ в подарок» */
  { id: "w1", cat: "wheel", gift: true, title: "Оплётка на руль в подарок к комплекту чехлов", sub: "Акция: оплётка стоимостью 500 ₽ · подробности у менеджеров", img: "assets/swatches/eco-black.jpg" },
  { id: "w2", cat: "wheel", demo: true, title: "Оплётка на руль из экокожи с перфорацией", sub: "Пример позиции", img: "assets/swatches/perf-grey.jpg" },
  { id: "w3", cat: "wheel", demo: true, title: "Оплётка на руль из алькантары", sub: "Пример позиции", img: "assets/swatches/alca-grey.jpg" },
  { id: "w4", cat: "wheel", demo: true, title: "Оплётка на руль из бежевой экокожи", sub: "Пример позиции", img: "assets/swatches/eco-beige.jpg" },

  /* Экокожа оптом: на старом сайте — поставки автомобильной и мебельной экокожи, прайс по заявке */
  { id: "f1", cat: "fabrics", title: "Экокожа автомобильная «Аригон»", sub: "Полиуретановое покрытие на хлопковой основе · 1,05–1,15 мм · 500 г/п. м", note: "оптовый прайс по заявке", img: "assets/swatches/eco-black.jpg" },
  { id: "f2", cat: "fabrics", title: "Экокожа мебельная", sub: "Поставки из Китая · склад в наличии", note: "оптовый прайс по заявке", img: "assets/swatches/eco-choco.jpg" },
  { id: "f3", cat: "fabrics", title: "Мебельные и автомобильные ткани", sub: "Жаккард, флок · ассортимент уточняйте", note: "оптовый прайс по заявке", img: "assets/swatches/jac-bw.jpg" },
  { id: "f4", cat: "fabrics", demo: true, title: "Экокожа с перфорацией", sub: "Пример позиции", note: "оптовый прайс по заявке", img: "assets/swatches/perf-black.jpg" }
];
/* Статьи блога: список для главной блога и блоков «Читайте также» */
window.AS_POSTS = [
  { slug: "blog-news-fabrics", title: "Расширение оптового ассортимента тканей", date: "1 октября 2021", tag: "Новости", img: "assets/swatches/eco-choco.jpg", lead: "В ассортименте для оптовых покупателей экокожи и автомобильных тканей появились мебельная экокожа и мебельные ткани." },
  { slug: "blog-news-prius", title: "Запущено производство для Toyota Prius A", date: "1 сентября 2021", tag: "Новости", img: "assets/photos/seat5.jpg", lead: "В базе появились лекала авточехлов для Toyota Prius A в кузове 2011–2014 годов. Комплект подойдёт на 5-местную комплектацию салона." },
  { slug: "blog-news-khabarovsk", title: "Открыто новое представительство в Хабаровске", date: "1 августа 2021", tag: "Новости", img: "assets/photos/1p.jpg", lead: "У «Чехлы Автостиль» появился официальный дилер в Хабаровске — теперь заказ можно забрать самовывозом." },
  { slug: "blog-eco-vs-alcantara", title: "Экокожа, жаккард или алькантара: что выбрать", date: "", tag: "Материалы", img: "assets/photos/avtochehol1.jpg", lead: "Чем отличаются материалы, из которых мы шьём чехлы, и как выбрать под свой салон." },
  { slug: "blog-winter-care", title: "Уход за чехлами из экокожи", date: "", tag: "Уход", img: "assets/photos/3p.jpg", lead: "Как убрать бытовые загрязнения и продлить срок службы экокожи." },
  { slug: "blog-install-mistakes", title: "Как правильно надеть чехлы на сиденья", date: "", tag: "Установка", img: "assets/photos/2p.jpg", lead: "Порядок установки, на что обратить внимание и почему важно не перепутать правое и левое кресло." },
  { slug: "blog-airbag", title: "Чехлы и подушки безопасности", date: "", tag: "Безопасность", img: "assets/photos/seat2.jpg", lead: "Зачем в чехлах разрывные швы и как ставить чехлы с ярлыком AIRBAG." }
];
