// Скрипт: управление "по-экранным" скроллом + GSAP-анимации
// Требования: подключён GSAP (см. header.php), этот файл подключается после DOMContentLoaded

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('snapContainer');
  const sections = Array.from(container.querySelectorAll('.snap-section'));
  const navLinks = document.querySelectorAll('.nav-link');

  // -- Помощники для навигации между секциями --
  function getCurrentSectionIndex() {
    // вычисляет ближайшую секцию к верхней границе контейнера
    const top = container.scrollTop;
    let closest = 0;
    let minDiff = Infinity;
    sections.forEach((sec, i) => {
      const offset = sec.offsetTop;
      const diff = Math.abs(offset - top);
      if (diff < minDiff) { minDiff = diff; closest = i; }
    });
    return closest;
  }

  function scrollToSection(index) {
    if (index < 0) index = 0;
    if (index >= sections.length) index = sections.length - 1;
    sections[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // -- Обработка колесика и тача: одно "переходное" действие за раз --
  let isThrottled = false;
  const throttleDuration = 750; // ms — длительность анимации/блокировки

  function handleWheel(e) {
    if (isThrottled) return;
    const delta = e.deltaY;
    const current = getCurrentSectionIndex();
    if (delta > 0) scrollToSection(current + 1);
    else if (delta < 0) scrollToSection(current - 1);
    isThrottled = true;
    setTimeout(() => isThrottled = false, throttleDuration);
  }

  // Для тач-событий: считаем общую вертикальную дельту
  let touchStartY = 0;
  function handleTouchStart(e) {
    touchStartY = e.touches[0].clientY;
  }
  function handleTouchEnd(e) {
    const touchEndY = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientY : touchStartY;
    const diff = touchStartY - touchEndY;
    if (Math.abs(diff) < 30) return; // порог
    if (isThrottled) return;
    const current = getCurrentSectionIndex();
    if (diff > 0) scrollToSection(current + 1);
    else scrollToSection(current - 1);
    isThrottled = true;
    setTimeout(() => isThrottled = false, throttleDuration);
  }

  // Клавиши вверх/вниз
  function handleKey(e) {
    if (isThrottled) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown') {
      scrollToSection(getCurrentSectionIndex() + 1);
      isThrottled = true;
      setTimeout(() => isThrottled = false, throttleDuration);
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      scrollToSection(getCurrentSectionIndex() - 1);
      isThrottled = true;
      setTimeout(() => isThrottled = false, throttleDuration);
    }
  }

  // Подписываем обработчики
  container.addEventListener('wheel', handleWheel, { passive: true });
  container.addEventListener('touchstart', handleTouchStart, { passive: true });
  container.addEventListener('touchend', handleTouchEnd, { passive: true });
  window.addEventListener('keydown', handleKey);

  // Навигация из шапки
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetIndex = parseInt(link.getAttribute('data-target'), 10) || 0;
      scrollToSection(targetIndex);
    });
  });

  // -- ANIMATIONS: GSAP + IntersectionObserver --
  // Будем анимировать заголовки, абзацы и изображения при появлении секции
  const observerOptions = {
    root: container,
    rootMargin: '0px',
    threshold: 0.55 // считаем, что секция в видимой зоне если 55% видно
  };

  const onIntersect = (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const sec = entry.target;
        // анимируем элементы внутри секции
        const title = sec.querySelector('h1, h2');
        const paras = sec.querySelectorAll('p');
        const imgs = sec.querySelectorAll('.img-grid img');

        // Заголовок
        if (title) {
          gsap.fromTo(title, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out' });
        }
        // Абзацы
        if (paras.length) {
          gsap.fromTo(paras, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.12, ease: 'power3.out' });
        }
        // Изображения
        if (imgs.length) {
          gsap.fromTo(imgs, { y: 20, opacity: 0, scale: 0.98 }, { y: 0, opacity: 1, scale: 1, duration: 0.9, stagger: 0.12, ease: 'power3.out' });
        }

        // можно снять наблюдение после первого входа, если нужно
        // observer.unobserve(sec);
      }
    });
  };

  const observer = new IntersectionObserver(onIntersect, observerOptions);
  sections.forEach(s => observer.observe(s));

  // При загрузке анимируем первую секцию сразу
  const first = sections[0];
  if (first) {
    const t = first.querySelector('h1, h2');
    const p = first.querySelectorAll('p');
    const imgs = first.querySelectorAll('.img-grid img');
    if (t) gsap.fromTo(t, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', delay: 0.1 });
    if (p.length) gsap.fromTo(p, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.12, ease: 'power3.out', delay: 0.25 });
    if (imgs.length) gsap.fromTo(imgs, { y: 10, opacity: 0, scale: 0.98 }, { y: 0, opacity: 1, scale: 1, duration: 0.9, stagger: 0.12, ease: 'power3.out', delay: 0.4 });
  }

  // Опционально: обновляем состояние нав-элементов (например, добавлять active класс)
  function updateNavActive() {
    const idx = getCurrentSectionIndex();
    document.querySelectorAll('.nav-link').forEach(link => {
      const t = parseInt(link.getAttribute('data-target'), 10);
      if (t === idx) link.classList.add('active');
      else link.classList.remove('active');
    });
  }
  container.addEventListener('scroll', () => {
    // обновляем реже для производительности
    if (!this._navTick) {
      this._navTick = true;
      requestAnimationFrame(() => {
        updateNavActive();
        this._navTick = false;
      });
    }
  });

});
