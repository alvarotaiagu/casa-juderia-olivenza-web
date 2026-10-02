/* Casa de la Judería · «Roseta»
   Todo lo que se mueve sale de la roseta de la chimenea: la cortina la traza a
   compás, el sol gira con el scroll, el friso son sus dientes desenrollados y
   el indicador de lectura es una roseta que gira.

   Banderas (PLIEGO §5): gsapListo = GSAP + ScrollTrigger cargados; motion =
   gsapListo y sin movimiento reducido. El contenido (contadores, elegidor,
   galería, progreso) se actualiza siempre; solo el movimiento depende de motion. */
(function () {
  'use strict';

  var h = document.documentElement;
  var reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gsapListo = !!(window.gsap && window.ScrollTrigger);
  var motion = gsapListo && !reducido;
  if (gsapListo) gsap.registerPlugin(ScrollTrigger);
  h.classList.add(motion ? 'con-movimiento' : 'sin-movimiento');
  if (!gsapListo) h.classList.add('sin-gsap');

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var cabeceraAlto = function () { return ($('#cabecera') || {}).offsetHeight || 68; };

  /* ───────────── Lenis: único motor de scroll ───────────── */
  var lenis = null;
  if (motion && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.11, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
  }
  function irA(destino) {
    if (!destino) return;
    if (lenis) lenis.scrollTo(destino, { offset: destino === 0 ? 0 : -cabeceraAlto() + 1, duration: 1.3 });
    else if (destino === 0) window.scrollTo({ top: 0, behavior: reducido ? 'auto' : 'smooth' });
    else destino.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth' });
  }
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var destino = id === '#inicio' ? 0 : document.querySelector(id);
      if (destino === null) return;
      e.preventDefault();
      cerrarMenu();
      irA(destino);
      if (destino && destino.focus && id !== '#inicio') { destino.setAttribute('tabindex', '-1'); destino.focus({ preventScroll: true }); }
    });
  });

  /* ───────────── cortina «el compás» ───────────── */
  var cortina = $('#cortina');
  var simbolo = $('#simbolo-heroe');
  var abierta = false, colaAbrir = [];
  function alAbrirse(fn) { if (abierta) fn(); else colaAbrir.push(fn); }
  function abrir() { if (abierta) return; abierta = true; colaAbrir.splice(0).forEach(function (f) { f(); }); }
  var retirada = false;
  function retirar() {
    if (retirada) return;
    retirada = true;
    abrir();
    if (cortina) cortina.classList.add('oculta');
    h.classList.remove('cortina-viva');
    var escena = $('#cortina-escena');
    if (escena) escena.innerHTML = '';
    try { sessionStorage.setItem('cdlj-cortina', 'vista'); } catch (e) {}
    if (gsapListo) {
      if (lenis) gsap.ticker.lagSmoothing(0);   /* al retirar, nunca antes: si no, el tirón de la carga salta el trazado */
      requestAnimationFrame(function () { ScrollTrigger.refresh(); });
    }
  }
  var cortinaVisible = cortina && getComputedStyle(cortina).display !== 'none';
  if (!cortinaVisible || !motion || !simbolo) retirar();
  else correrCortina();
  setTimeout(retirar, 5200);   /* red de seguridad de main.js (la del <head> va a 6,5 s) */

  function correrCortina() {
    h.classList.add('cortina-viva');
    var escena = $('#cortina-escena');
    var panel = $('.cortina__panel', cortina);
    var curva = $('.cortina__curva', cortina);
    var clon = simbolo.cloneNode(true);
    clon.removeAttribute('id');
    clon.setAttribute('class', 'cortina__simbolo');
    $$('[id]', clon).forEach(function (el) {
      var viejo = el.id; el.id = viejo + '-cortina';
      $$('[clip-path="url(#' + viejo + ')"]', clon).forEach(function (u) { u.setAttribute('clip-path', 'url(#' + viejo + '-cortina)'); });
    });
    clon.style.width = '540px'; clon.style.height = '424px';
    escena.appendChild(clon);

    var izq = $('.simbolo__roseta--izq', clon), der = $('.simbolo__roseta--der', clon);
    var rosI = $('.roseta', izq), rosD = $('.roseta', der);
    var X0 = 270, Y0 = 189.5, XI = 107, XD = 433;
    var pos = { i: X0, d: X0 };
    var colocar = function () {
      izq.setAttribute('transform', 'translate(' + pos.i + ' ' + Y0 + ')');
      der.setAttribute('transform', 'translate(' + pos.d + ' ' + Y0 + ')');
    };
    colocar();

    /* la punta del compás: aguja en el centro, brazo y lápiz que recorre el círculo */
    var NS = 'http://www.w3.org/2000/svg';
    var compas = document.createElementNS(NS, 'g'); compas.setAttribute('class', 'compas');
    var brazo = document.createElementNS(NS, 'line'); brazo.setAttribute('class', 'compas__brazo');
    brazo.setAttribute('x1', 0); brazo.setAttribute('y1', 0); brazo.setAttribute('x2', 53.5); brazo.setAttribute('y2', 0);
    var punta = document.createElementNS(NS, 'circle'); punta.setAttribute('class', 'compas__punta'); punta.setAttribute('r', 2.8);
    var lapiz = document.createElementNS(NS, 'circle'); lapiz.setAttribute('class', 'compas__lapiz'); lapiz.setAttribute('cx', 53.5); lapiz.setAttribute('r', 3.4);
    compas.appendChild(brazo); compas.appendChild(lapiz); compas.appendChild(punta);
    rosI.appendChild(compas);
    var giro = { a: 0 };
    var girarCompas = function () { compas.setAttribute('transform', 'rotate(' + giro.a + ')'); };

    var traza = $('.roseta__traza', rosI);
    var circulo = $('.traza__circulo', traza);
    var petalos = $$('.traza__petalo', traza);
    var lentes = $$('.traza__lente', traza);
    var trazos = [circulo].concat(petalos, lentes);
    gsap.set(trazos, { strokeDasharray: '1 1', strokeDashoffset: 1, opacity: 0 });
    gsap.set([$('.roseta__huecos', rosI), $('.roseta__anillo', rosI), $('.roseta__dientes', rosI)], { opacity: 0 });
    gsap.set($('.roseta__anillo', rosI), { scale: 0.82, transformOrigin: '50% 50%' });
    gsap.set($('.roseta__dientes', rosI), { scale: 0.55, transformOrigin: '50% 50%' });
    gsap.set(der, { opacity: 0 });
    gsap.set($('.cruz', clon), { y: 300 });
    gsap.set($('.peana__mesa', clon), { scaleX: 0, transformOrigin: '50% 50%' });
    gsap.set([$('.peana__cuerpo', clon), $('.peana__flor', clon), $('.peana__base', clon)], { opacity: 0, y: 10 });
    gsap.set(compas, { opacity: 0 });

    /* tres encuadres: A = la roseta grande en el centro; B = el símbolo entero; C = su sitio en el héroe */
    var vw = window.innerWidth, vh = window.innerHeight;
    var dA = Math.min(vw * 0.62, vh * 0.5, 400), sA = dA / 192;
    var wB = Math.min(vw * 0.84, vh * 0.6 * 540 / 424, 600), sB = wB / 540;
    gsap.set(clon, { x: vw / 2 - X0 * sA, y: vh / 2 - Y0 * sA, scale: sA, transformOrigin: '0 0' });

    var tl = gsap.timeline({ defaults: { ease: 'expo.inOut' } });
    var dibuja = function (el, en, dur, ease) {
      tl.set(el, { opacity: 1 }, en);
      tl.to(el, { strokeDashoffset: 0, duration: dur, ease: ease || 'power2.inOut', autoRound: false }, en);
    };
    /* 1 · la punta marca el centro y traza el círculo */
    tl.to(compas, { opacity: 1, duration: 0.14, ease: 'power1.out' }, 0);
    dibuja(circulo, 0.1, 0.52);
    tl.to(giro, { a: 360, duration: 0.52, ease: 'power2.inOut', onUpdate: girarCompas }, 0.1);
    tl.to(compas, { opacity: 0, duration: 0.16, ease: 'power1.in' }, 0.62);
    /* 2 · caen los seis arcos y aparecen los pétalos */
    petalos.forEach(function (p, i) { dibuja(p, 0.6 + i * 0.05, 0.22, 'power2.out'); });
    tl.to($('.roseta__huecos', rosI), { opacity: 1, duration: 0.24, ease: 'power2.out' }, 0.98);
    lentes.forEach(function (p, i) { dibuja(p, 0.98 + i * 0.025, 0.16, 'power2.out'); });
    /* 3 · el anillo y los dientes, que brotan a la vez como rayos */
    tl.to($('.roseta__anillo', rosI), { opacity: 1, scale: 1, duration: 0.3, ease: 'expo.out' }, 1.1);
    tl.to($('.roseta__dientes', rosI), { opacity: 1, scale: 1, duration: 0.34, ease: 'back.out(1.7)' }, 1.18);
    tl.to(traza, { opacity: 0, duration: 0.24, ease: 'power1.out' }, 1.3);
    /* 4 · la roseta se duplica a los dos lados de la cruz, que sube desde su peana */
    tl.to(clon, { x: (vw - wB) / 2, y: (vh - 424 * sB) / 2, scale: sB, duration: 0.46 }, 1.28);
    tl.set(der, { opacity: 1 }, 1.36);
    tl.to(pos, { i: XI, d: XD, duration: 0.42, onUpdate: colocar }, 1.36);
    tl.to($('.peana__mesa', clon), { scaleX: 1, duration: 0.28, ease: 'expo.out' }, 1.4);
    tl.to([$('.peana__cuerpo', clon), $('.peana__flor', clon), $('.peana__base', clon)], { opacity: 1, y: 0, duration: 0.3, ease: 'expo.out', stagger: 0.03 }, 1.46);
    tl.to($('.cruz', clon), { y: 0, duration: 0.44, ease: 'expo.out' }, 1.5);
    /* 5 · la crema se retira y el símbolo vuela exacto a su sitio */
    tl.add(function () { abrir(); }, 1.7);
    tl.to(panel, { yPercent: -100, duration: 0.5 }, 1.7);
    tl.fromTo(curva, { scaleY: 0 }, { scaleY: 1, duration: 0.25, ease: 'power2.out', immediateRender: false }, 1.7);
    tl.to(curva, { scaleY: 0, duration: 0.25, ease: 'power2.in' }, 1.95);
    /* el destino se mide al empezar el vuelo (valores en función: GSAP los lee en su primer fotograma) */
    var destino = null;
    var medirDestino = function () { if (!destino) destino = simbolo.getBoundingClientRect(); return destino; };
    tl.to(clon, {
      x: function () { return medirDestino().left; },
      y: function () { return medirDestino().top; },
      scale: function () { return medirDestino().width / 540; },
      duration: 0.42
    }, 1.78);
    tl.eventCallback('onComplete', retirar);

    /* un gesto del visitante la termina en el acto (no se pelea con el scroll) */
    var terminar = function () {
      if (retirada) return;
      tl.kill(); gsap.killTweensOf(clon);
      retirar();
      ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (ev) { window.removeEventListener(ev, terminar); });
    };
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (ev) { window.addEventListener(ev, terminar, { passive: true }); });
    window.__cortina = tl;   /* para verificar.mjs: pausar y mirar un fotograma a medias */
  }

  /* ───────────── cabecera y menú ───────────── */
  var cabecera = $('#cabecera'), menu = $('#menu'), botonMenu = $('#boton-menu');
  function pegar() { cabecera.classList.toggle('es-pegada', window.scrollY > 8); }
  pegar();
  window.addEventListener('scroll', pegar, { passive: true });
  function abrirMenu() {
    menu.classList.add('es-abierto'); botonMenu.setAttribute('aria-expanded', 'true');
    if (lenis) lenis.stop();
    var primero = $('a', menu); if (primero) primero.focus({ preventScroll: true });
  }
  function cerrarMenu() {
    if (!menu.classList.contains('es-abierto')) return;
    menu.classList.remove('es-abierto'); botonMenu.setAttribute('aria-expanded', 'false');
    if (lenis) lenis.start();
  }
  botonMenu.addEventListener('click', function () { menu.classList.contains('es-abierto') ? cerrarMenu() : abrirMenu(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('es-abierto')) { cerrarMenu(); botonMenu.focus(); } });
  window.addEventListener('resize', function () { if (window.innerWidth > 980) cerrarMenu(); });

  /* ───────────── char-reveal: palabra inline-block + nowrap, letras dentro ───────────── */
  $$('[data-letras]').forEach(function (el) {
    var texto = el.textContent.replace(/\s+/g, ' ').trim();
    el.setAttribute('aria-label', texto);
    var envoltura = document.createElement('span');
    envoltura.setAttribute('aria-hidden', 'true');
    var i = 0;
    texto.split(' ').forEach(function (p, k) {
      if (k) envoltura.appendChild(document.createTextNode(' '));
      var palabra = document.createElement('span'); palabra.className = 'palabra mascara-linea';
      Array.prototype.forEach.call(p, function (c) {
        var l = document.createElement('span'); l.className = 'letra'; l.textContent = c;
        l.style.transition = 'transform 1s cubic-bezier(.16,1,.3,1) ' + (i * 16) + 'ms, opacity .6s ease ' + (i * 16) + 'ms';
        palabra.appendChild(l); i++;
      });
      envoltura.appendChild(palabra);
    });
    el.textContent = ''; el.appendChild(envoltura);
  });

  /* ───────────── apariciones, máscaras y contadores (una sola vez: IntersectionObserver) ───────────── */
  function contar(el) {
    var final = parseFloat(el.getAttribute('data-cuenta'));
    var fmt = function (v) { return v.toFixed(1).replace('.', ','); };
    if (!motion) { el.textContent = fmt(final); return; }
    var t0 = null, dur = 1400;
    var paso = function (t) {
      if (t0 === null) t0 = t;
      var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4);
      el.textContent = fmt(final * e);
      if (k < 1) requestAnimationFrame(paso); else el.textContent = fmt(final);
    };
    requestAnimationFrame(paso);
  }
  var heroe = $('.heroe');
  var vigilados = $$('[data-letras], [data-aparece], [data-mascara], [data-cuenta]').filter(function (el) { return !heroe.contains(el); });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        el.classList.add('es-visible');
        if (el.hasAttribute('data-cuenta')) contar(el);
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0 });
    vigilados.forEach(function (el) { io.observe(el); });
  } else vigilados.forEach(function (el) { el.classList.add('es-visible'); });
  /* el héroe entra cuando la cortina EMPIEZA a retirarse */
  alAbrirse(function () {
    $$('[data-letras], [data-aparece], [data-mascara]', heroe).forEach(function (el) { el.classList.add('es-visible'); });
    $$('[data-cuenta]', heroe).forEach(contar);
    if (motion) {
      gsap.from('.heroe__rotulo', { y: 18, opacity: 0, duration: 1, ease: 'expo.out', delay: 0.15 });
      gsap.from(['.heroe__ante', '.heroe__notas', '.heroe__botones'], { y: 22, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.08, delay: 0.25 });
    }
  });

  /* ───────────── movimiento ligado al scroll ───────────── */
  if (motion) {
    /* la foto del héroe se asienta */
    var fotoHeroe = $('.heroe__foto img');
    if (fotoHeroe) {
      gsap.set(fotoHeroe, { scale: 1.12, transformOrigin: '50% 40%' });
      gsap.to(fotoHeroe, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.heroe', start: 'top top', end: 'bottom top', scrub: true } });
    }
    /* el sol de la chimenea gira despacio con el scroll */
    gsap.fromTo('#sol', { rotation: -50 }, { rotation: 70, ease: 'none', immediateRender: false, scrollTrigger: { trigger: '.chimenea', start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
  }

  /* cinta y friso: la velocidad crece con la del scroll */
  var pista = $('#cinta-pista');
  var bandas = $$('.friso__banda');
  if (motion && pista) {
    var trozo = pista.innerHTML;
    pista.innerHTML = trozo + trozo + trozo;
    var mitad = 0, xCinta = 0, velocidad = 0;
    var medir = function () { mitad = pista.scrollWidth / 3; };
    medir(); window.addEventListener('resize', medir);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(medir);
    var setX = gsap.quickSetter(pista, 'x', 'px');
    if (lenis) lenis.on('scroll', function (e) { velocidad = e.velocity || 0; });
    gsap.ticker.add(function (t, dt) {
      var v = 38 + Math.min(Math.abs(velocidad) * 22, 420);
      xCinta -= v * (dt / 1000);
      if (mitad && xCinta <= -mitad) xCinta += mitad;
      setX(xCinta);
      velocidad *= 0.92;
    });
  }
  function moverFriso() {
    var x = -((window.scrollY * 0.22) % 24);
    bandas.forEach(function (b) { b.setAttribute('x', x.toFixed(2)); });
  }
  if (motion) { moverFriso(); window.addEventListener('scroll', moverFriso, { passive: true }); }

  /* indicador de lectura: la roseta gira (movimiento) y su aro se llena (contenido: siempre) */
  var progreso = $('#progreso');
  if (progreso) {
    var aro = $('.progreso__aro', progreso), giroP = $('.progreso__giro', progreso);
    var tickProgreso = function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      aro.style.strokeDashoffset = (1 - p).toFixed(4);
      if (!reducido) giroP.setAttribute('transform', 'rotate(' + (p * 540).toFixed(1) + ')');
      progreso.classList.toggle('es-visible', window.scrollY > window.innerHeight * 0.6);
    };
    tickProgreso();
    window.addEventListener('scroll', tickProgreso, { passive: true });
    window.addEventListener('resize', tickProgreso);
  }

  /* ───────────── botones magnéticos ───────────── */
  var ratonFino = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (motion && ratonFino) {
    $$('[data-iman]').forEach(function (b) {
      var qx = gsap.quickTo(b, 'x', { duration: 0.5, ease: 'power3.out' });
      var qy = gsap.quickTo(b, 'y', { duration: 0.5, ease: 'power3.out' });
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        qx((e.clientX - (r.left + r.width / 2)) * 0.28);
        qy((e.clientY - (r.top + r.height / 2)) * 0.36);
      });
      b.addEventListener('pointerleave', function () { qx(0); qy(0); });
    });
  }

  /* ───────────── cursor propio: punto pegado + aro con retraso ───────────── */
  var cursor = $('.cursor');
  if (cursor && ratonFino) {
    var punto = $('.cursor__punto', cursor), aroC = $('.cursor__aro', cursor);
    var mover = gsapListo && !reducido
      ? (function () {
          var ax = gsap.quickTo(aroC, 'x', { duration: 0.35, ease: 'power3.out' });
          var ay = gsap.quickTo(aroC, 'y', { duration: 0.35, ease: 'power3.out' });
          return function (x, y) { gsap.set(punto, { x: x, y: y }); ax(x); ay(y); };
        })()
      : function (x, y) { punto.style.transform = aroC.style.transform = 'translate(' + x + 'px,' + y + 'px)'; };
    var activables = 'a, button, [data-galeria] li, .punto, .lugar, .opcion';
    window.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      if (!h.classList.contains('con-cursor')) h.classList.add('con-cursor');
      cursor.classList.remove('es-fuera');
      mover(e.clientX, e.clientY);
      var sobre = e.target.closest ? e.target.closest(activables) : null;
      cursor.classList.toggle('es-activo', !!sobre);
    }, { passive: true });
    document.addEventListener('mouseleave', function () { cursor.classList.add('es-fuera'); });
    document.addEventListener('mouseenter', function () { cursor.classList.remove('es-fuera'); });
  }

  /* ───────────── el elegidor: dos preguntas, se ilumina J o A; ninguna ficha se oculta ───────────── */
  var elegidor = $('#elegidor');
  if (elegidor) {
    var estado = { cuantos: null, importa: null };
    var respuesta = $('#elegidor-respuesta'), reiniciar = $('#elegidor-reiniciar');
    var fichas = { J: $('#ficha-j'), A: $('#ficha-a') };
    var INICIO = respuesta.innerHTML;
    var decidir = function (c, i) {
      if (c === '34' && i === 'terraza') return ['J', 'Para vosotros, <b>el J</b>: es el que tiene sitio para cuatro, con dos baños. La terraza con vistas es del A, pensado para dos; el J tiene patio.'];
      if (c === '34' && i === 'banos') return ['J', 'Para vosotros, <b>el J</b>: hasta cuatro personas, con dos baños y el salón aparte.'];
      if (c === '2' && i === 'terraza') return ['A', 'Para vosotros, <b>el A</b>: el dúplex con terraza amplia y vistas a la torre de una iglesia, pensado para dos.'];
      if (c === '2' && i === 'banos') return ['J', 'Para vosotros, <b>el J</b>: dormitorio con su propio baño, salón aparte y un segundo baño con bañera.'];
      if (c === '34') return ['J', 'Para tres o cuatro, <b>el J</b>. ¿Y qué os importa más?'];
      if (c === '2') return [null, 'Para dos os valen los dos. ¿Qué os importa más?'];
      if (i === 'terraza') return ['A', 'La terraza con vistas es <b>del A</b>. ¿Cuántos sois?'];
      if (i === 'banos') return ['J', 'Los dos baños son <b>del J</b>. ¿Cuántos sois?'];
      return [null, INICIO];
    };
    var pintar = function () {
      $$('.opcion', elegidor).forEach(function (b) {
        b.setAttribute('aria-pressed', String(estado[b.getAttribute('data-pregunta')] === b.getAttribute('data-valor')));
      });
      var r = decidir(estado.cuantos, estado.importa);
      respuesta.innerHTML = r[1];
      Object.keys(fichas).forEach(function (k) { fichas[k].classList.toggle('es-elegida', r[0] === k); });
      elegidor.setAttribute('data-elegido', r[0] || '');
      reiniciar.hidden = !(estado.cuantos || estado.importa);
    };
    $$('.opcion', elegidor).forEach(function (b) {
      b.addEventListener('click', function () {
        var p = b.getAttribute('data-pregunta'), v = b.getAttribute('data-valor');
        estado[p] = estado[p] === v ? null : v;
        pintar();
      });
    });
    reiniciar.addEventListener('click', function () { estado.cuantos = estado.importa = null; pintar(); $('.opcion', elegidor).focus(); });
    window.__elegir = function (c, i) { estado.cuantos = c; estado.importa = i; pintar(); return elegidor.getAttribute('data-elegido'); };
  }

  /* ───────────── galerías: pista horizontal con flechas; enfocable solo si desborda ───────────── */
  $$('[data-galeria]').forEach(function (g) {
    var pistaG = $('.galeria__pista', g), flechas = $$('.galeria__flecha', g), cuenta = $('.galeria__cuenta', g);
    var items = $$('li', pistaG);
    var actualizar = function () {
      var desborda = pistaG.scrollWidth > pistaG.clientWidth + 2;
      if (desborda) pistaG.setAttribute('tabindex', '0'); else pistaG.removeAttribute('tabindex');
      var izq = pistaG.scrollLeft, primero = 0;
      for (var i = 0; i < items.length; i++) { if (items[i].offsetLeft + items[i].offsetWidth / 2 >= izq) { primero = i; break; } }
      cuenta.textContent = 'Foto ' + (primero + 1) + ' de ' + items.length;
      flechas[0].disabled = izq <= 2;
      flechas[1].disabled = izq + pistaG.clientWidth >= pistaG.scrollWidth - 2;
    };
    flechas.forEach(function (f) {
      f.addEventListener('click', function () {
        pistaG.scrollBy({ left: Number(f.getAttribute('data-dir')) * pistaG.clientWidth * 0.86, behavior: reducido ? 'auto' : 'smooth' });
      });
    });
    pistaG.addEventListener('scroll', function () { window.requestAnimationFrame(actualizar); }, { passive: true });
    window.addEventListener('resize', actualizar);
    actualizar();
  });

  /* ───────────── Olivenza a pie: lista y diagrama se señalan a la vez ───────────── */
  var diagrama = $('.diagrama');
  function activar(id) {
    $$('.lugar').forEach(function (l) { l.classList.toggle('es-activo', l.getAttribute('data-id') === id); });
    $$('.punto').forEach(function (p) { p.classList.toggle('es-activo', p.getAttribute('data-id') === id); });
    $$('.rayo').forEach(function (r) { r.classList.toggle('es-activo', r.getAttribute('data-id') === id); });
    if (diagrama) diagrama.classList.toggle('es-enfocado', !!id);
  }
  $$('.lugar').forEach(function (l) {
    l.addEventListener('mouseenter', function () { activar(l.getAttribute('data-id')); });
    l.addEventListener('mouseleave', function () { activar(null); });
    l.addEventListener('click', function () { activar(l.classList.contains('es-activo') ? null : l.getAttribute('data-id')); });
  });
  $$('.punto').forEach(function (p) {
    p.addEventListener('mouseenter', function () { activar(p.getAttribute('data-id')); });
    p.addEventListener('mouseleave', function () { activar(null); });
    p.addEventListener('click', function () { activar(p.getAttribute('data-id')); });
  });

  /* ───────────── mapa solo bajo clic ───────────── */
  $$('.map-consent').forEach(function (b) {
    b.addEventListener('click', function () {
      var f = document.createElement('iframe');
      f.src = b.getAttribute('data-map-src');
      f.title = b.getAttribute('data-map-title');
      f.loading = 'lazy';
      f.referrerPolicy = 'no-referrer-when-downgrade';
      var caja = b.closest('.mapa');
      if (caja) { caja.classList.add('con-mapa'); caja.innerHTML = ''; caja.appendChild(f); } else b.replaceWith(f);
    });
  });

  /* ───────────── aviso de cookies ───────────── */
  var avisoCookies = $('#cookies');
  var CLAVE_COOKIES = 'cdlj-cookies';
  function verCookies(ver) {
    avisoCookies.hidden = !ver;
    h.classList.toggle('con-cookies', ver);
  }
  var vistas = false;
  try { vistas = localStorage.getItem(CLAVE_COOKIES) === '1'; } catch (e) {}
  verCookies(!vistas);
  $('#cookies-aceptar').addEventListener('click', function () {
    try { localStorage.setItem(CLAVE_COOKIES, '1'); } catch (e) {}
    verCookies(false);
  });
  $('#cookies-reabrir').addEventListener('click', function () { verCookies(true); $('#cookies-aceptar').focus(); });

  /* [MANDO DE MAQUETA] versión y paleta en vivo; solo con ?revision. No viaja al cliente. */
  (function mandoMaqueta() {
    var mando = $('#mando');
    if (!mando || !/[?&]revision\b/.test(location.search)) return;
    mando.hidden = false;
    var marcar = function () {
      $$('[data-densidad]', mando).forEach(function (b) { b.setAttribute('aria-pressed', String(h.classList.contains('densidad-' + b.getAttribute('data-densidad')))); });
      $$('[data-paleta]', mando).forEach(function (b) { b.setAttribute('aria-pressed', String(h.classList.contains('paleta-' + b.getAttribute('data-paleta')))); });
    };
    $$('[data-densidad]', mando).forEach(function (b) {
      b.addEventListener('click', function () {
        var d = b.getAttribute('data-densidad');
        h.classList.remove('densidad-roseta', 'densidad-sobria'); h.classList.add('densidad-' + d);
        try { localStorage.setItem('cdlj-densidad', d); } catch (e) {}
        marcar();
        if (gsapListo) ScrollTrigger.refresh();
      });
    });
    $$('[data-paleta]', mando).forEach(function (b) {
      b.addEventListener('click', function () {
        var p = b.getAttribute('data-paleta');
        h.classList.remove('paleta-real', 'paleta-azul', 'paleta-oliva'); h.classList.add('paleta-' + p);
        try { localStorage.setItem('cdlj-paleta', p); } catch (e) {}
        marcar();
      });
    });
    marcar();
  })();
  /* fin del bloque [MANDO DE MAQUETA] */

  var anio = $('#anio');
  if (anio) anio.textContent = String(new Date().getFullYear());

  if (gsapListo) {
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }
})();
