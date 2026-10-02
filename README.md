# Casa de la Judería (Olivenza) · web «Roseta»

> **Maqueta de propuesta para un negocio real, sin publicar.** Dos apartamentos turísticos
> (licencia AT-BA-00410 según Booking) en la calle Santiago 7A de Olivenza (Badajoz); anfitrión,
> Javier. Todas las páginas llevan `noindex, nofollow` hasta que la web sea la oficial.
> Lleva un **mando de maqueta** (solo con `?revision`) que **no debe viajar al cliente**: ver
> «Quitar el mando de maqueta».

Datos y fuentes: `../casa-juderia-olivenza-bocetos/DATOS-CASA-JUDERIA.md` y `CONTEXTO-JUDERIA.md`.

---

## El concepto: «Roseta»

En la chimenea portuguesa de su fachada hay una **Cruz del Calvario** sobre peana entre dos
**rosetas hexapétalas**. Su logo está hecho con esos relieves, y dentro de la casa cuelga un
cartel de Miguel Ángel Vallecillo, director del Museo González Santana, que explica la cruz como
símbolo de protección y la roseta como «antiguo talismán solar».

La web es **la casa bajo la roseta**. Todo sale de lo que ya es suyo (su fachada, su logo y su
cartel), nada se inventa:

- **La cortina «el compás»** traza la roseta como se traza de verdad: una punta de compás marca el
  centro y dibuja el círculo, caen los seis arcos del mismo radio y aparecen los pétalos, sale el
  anillo y los dientes brotan a la vez. La roseta se duplica a los lados de la cruz, que sube desde
  su peana, y el símbolo vuela exacto a su sitio en el héroe mientras la crema se retira.
- **La roseta es el sol**: gira despacio con el scroll en la sección de la chimenea, y en «Olivenza
  a pie» es el centro de un sol con un rayo hacia cada sitio, en su rumbo real.
- **El friso**: los dientes de la corona de la roseta, desenrollados (paso 24, base del 80 %, como
  en el logo), separan las secciones como el relieve de la chimenea y se desplazan con el scroll.
- **El logo se forma una sola vez** por página (en la cortina); después solo se usa.

Por qué: es el único rasgo que la distingue de verdad de cualquier otro alojamiento del casco
antiguo, y viene con su propia explicación firmada. Además, **no es Casa María**, el otro
alojamiento real de Olivenza a pocas calles: ni línea continua, ni casa abierta, ni Gilda + Mulish,
ni cobre y cacao. Comparadas lado a lado (`scripts/fuentes/comparacion-casa-maria.png`, las dos
páginas enteras a 1440 px), esta se lee **más oscura** (L* medio 55,8 frente a 84,8; el 44 % de la
superficie es oscura, frente al 10 %) y **más fría** (en las zonas claras, a* −0,42 frente a 0,98 y
b* 3,50 frente a 3,86: papel `#ECEAE3`, matiz 94° en OKLCH, frente al rosado `#F6F0EA` de 68°).

## Mapa de secciones

| # | Sección | Qué hace |
|---|---|---|
| — | Cortina «el compás» | ≤ 2,2 s, encadenada, `expo.inOut`; retirada garantizada sin GSAP y con movimiento reducido; una vez por sesión |
| 1 | Héroe | Fachada b06 (verticales corregidas), símbolo + rótulo vectorizados, titular, 9,7 y 5,0 ★ sin recuento, «Consultar disponibilidad» y «Reservar en Booking». En móvil, símbolo arriba sobre papel y texto abajo sobre la foto, todo en flujo |
| — | Cinta | Marquee con la velocidad ligada al scroll, separada por rosetas |
| 2 | La chimenea | El sol: la foto de la chimenea ocupa el disco de una roseta en miel cuya corona de dientes gira con el scroll como rayos; la cruz y las rosetas en tres líneas, cita corta del cartel y el cartel superpuesto |
| 3 | Dos apartamentos, una puerta | Elegidor (¿cuántos sois? / ¿qué os importa más?) que ilumina J o A sin ocultar ninguna; fichas con galería propia y su letra grande; la «J» real junto a su puerta |
| 4 | Olivenza a pie | Diagrama radial (1, 3 y 5 minutos) con los diez lugares en su rumbo real + la misma información en `<ol>`; la frase del nombre y el contexto histórico con fuentes |
| 5 | Lo que dicen | 9,7 en Booking y 5,0 ★ en Google con botón a cada ficha; cuatro citas literales sin nombre |
| 6 | Normas y cómo llegar | Normas con tacto; la chimenea como señal, la escalera, el aparcamiento cerca y el mapa bajo clic |
| 7 | Llamar | Cierre con los dos botones |
| — | Pie | Rótulo, dirección, teléfono, «Anfitrión: Javier», licencia AT-BA-00410, friso y enlaces legales |

Movimiento (listón motionsites del PLIEGO §2): Lenis (jsDelivr), char-reveal por palabra
(`inline-block` + `nowrap`), botones magnéticos, marquee ligado al scroll, cursor propio
(punto + aro), máscaras circulares que se abren, contadores, sol scrubbeado y roseta de lectura.

## Construir y comprobar

```
python scripts/fotos.py          # verticales corregidas + gradación → scripts/fuentes/graduadas/
node   scripts/fotos.mjs         # AVIF/WebP/JPG en assets/fotos y medidas en data/fotos.json
python scripts/logo.py           # roseta, símbolo, rótulo, favicon y sprite inyectado en los HTML
node   scripts/construir.mjs     # <picture> desde fotos.json; lista y diagrama desde lugares.json
node   scripts/generar-og.mjs    # assets/og-casa-juderia.jpg (1200×630)
node   scripts/versionar.mjs     # ?v=<huella> en CSS y JS (caché de GitHub Pages)
node   scripts/verificar.mjs --capturas
node   scripts/servir.mjs        # http://127.0.0.1:4197 (también se abre con doble clic)
```

`scripts/lugares.mjs` rehace `data/lugares.json` desde OpenStreetMap (con `--sin-red`, solo
recalcula rumbos y distancias). `scripts/paleta.py` imprime los tokens y sus contrastes.
`scripts/medir_roseta.py` saca las medidas de la roseta del JPG.

`verificar.mjs` da **154/154** (2026-10-02). Comprueba, entre otras cosas: el checklist de web desde cero (cursor, cookies,
menú bajo `backdrop-filter`, héroe en 360×640, 375×667, 390×844 y 768×1024, `autoRound`
muestreado en el tiempo), las prohibiciones de contenido, las citas contra DATOS, las cuatro
combinaciones del elegidor, los rumbos del diagrama contra `lugares.json`, la cortina (fotogramas a
mitad, aterrizaje a ±2 px, sin GSAP, movimiento reducido), el contraste AA de cada pareja de tokens
en las tres paletas, las dos densidades × tres paletas y la receta de borrado del mando. Con
`--capturas` deja 39 capturas en `screenshots/` (fuera del repo): cortina a 0,82 / 1,62 / 1,92 s,
cada sección a 1440 y 390, héroe a 360×640, 375×667, 390×844 y 768×1024, sin GSAP, movimiento
reducido, menú, elegidor, 2 densidades × 3 paletas y 404.

## El mando de maqueta (`?revision`)

Abajo a la izquierda, **solo si la URL lleva `?revision`** (el enlace que recibe el cliente sale
limpio). Se aparta mientras está el aviso de cookies.

- **Versión «Roseta»** (la cargada): el sol en la chimenea, el friso entre todas las secciones,
  rosetas como viñetas, la roseta de lectura que gira y el diagrama de Olivenza a pie.
- **Versión «Sobria»**: la roseta solo en el héroe y en la chimenea; filetes lisos en vez de friso.
  **Intercambia dibujo por dato**: el diagrama pasa a tabla de minutos con números grandes, y las
  fichas **añaden una comparativa** (m², plantas, baños, exterior, capacidad) que la cargada no tiene.
- **Color**: la paleta real (marrón del logo) y dos derivadas girando el matiz de la marca en OKLCH
  con la misma luminosidad y croma: **Azul** (el cartel cuenta que la cruz se enmarcaba en azul) y
  **Oliva**. Tinta, papel, miel y **el logo no cambian**. Contraste medido en el navegador.

### Quitar el mando de maqueta

**Caso A — se queda la versión «Roseta» con la paleta real** (comprobado por script):

```
node scripts/quitar-mando.mjs ../casa-juderia-entrega
node scripts/comprobar-borrado.mjs ../casa-juderia-entrega
```

La copia de `../casa-juderia-entrega` sale sin `scripts/` ni `screenshots/`, sin el mando, sin la
comparativa, sin las reglas de la sobria ni las paletas alternativas, sin la lectura de `?revision`
en el `<head>` y sin la fila de esas claves en la privacidad; los `?v=` se recalculan.
`comprobar-borrado.mjs` busca 14 rastros y confirma 8 piezas que no deben perderse (cortina,
elegidor, diagrama, cookies…). `verificar.mjs` lo ejecuta en cada pasada y carga la copia.

**Caso B — Javier elige la «Sobria»**: antes de quitar el mando, en `index.html` cambiar
`densidad-roseta` por `densidad-sobria` en `<html>` y, en `css/estilos.css`, sacar del bloque
`[MANDO DE MAQUETA] Versión «Sobria»` las reglas `html.densidad-sobria …` (dejándolas fuera de las
marcas) y mover la comparativa fuera de su bloque en `index.html`. Después, caso A.

**Caso C — otro color**: copiar los dos valores de `html.paleta-azul` (o `-oliva`) a `--marca` y
`--marca-hondo` de `:root`. Después, caso A.

## Decisiones y fuentes

**Nombre.** «Casa de la Judería», como en su placa; en el pie, el nombre legal de Booking.
Nunca «casa rural»: es un apartamento turístico.

**La judería.** La web no dice que la casa ni la calle Santiago estuvieran en la judería (ninguna
fuente lo dice), ni usa símbolos judíos (no sobrevive ninguno de Olivenza). Lo que sí dice, con
fuente (CONTEXTO): la frase del nombre («La casa toma su nombre del barrio judío medieval de
Olivenza, cuya calle de la sinagoga, la antigua rua da Esnoga, está a dos minutos a pie»), que la
calle Santiago es la antigua Rua Nova, que Olivenza estuvo bajo la Corona de Portugal de 1297 a
1801, y que la comunidad judía terminó con el decreto de 1496 y la conversión forzosa de 1497 (no
en 1492). Nada sobre la soberanía.

**Superlativos del texto del anfitrión** (verificados el 2026-10-02):
- La Magdalena, «El Mejor Rincón de España 2012»: **sí**, con su fuente. Lo otorgó la Guía Repsol
  por votación popular; página del concurso archivada
  (web.archive.org/web/20120927125132/http://apps.repsol.com/elmejorrincon/) y Turismo de
  Extremadura. Ojo: turismodeolivenza.com lo llama «Rincón Más Bonito de España», que no es el
  nombre oficial.
- El Árbol de Jesé, «el más grande del mundo»: **no**. La fuente oficial (Turismo de Extremadura,
  turismodeolivenza.com) dice «el mayor que se conserva», sin ámbito, y da 10,29 m. La web lo cita
  así, entrecomillado y atribuido.
- El museo «de los mejores de España»: **no**. Solo lo dice la web municipal de turismo; los
  premios fueron del fundador, no del museo. La web dice dónde está y nada más.
- El Ayuntamiento como antiguo palacio de los Duques de Cadaval: coinciden varias guías (fuente
  secundaria) y el anfitrión. No es un superlativo.

**Iglesias de las fotos.** 42 y 43 son la Iglesia de Santa María Magdalena (se lee la placa
«Parroquia de Santa María Magdalena»), y 44 la Torre del Homenaje; comparadas con Wikimedia Commons.

**Opiniones.** Sin número de reseñas en ningún sitio (memoria «pocas reseñas»). Citas literales
de DATOS, sin nombre, firmadas «Opinión en Booking/Google», sin las partes negativas.

**Datos que se contradicen** (manda Booking): sin aparcamiento propio («Javier os indica dónde
aparcar cerca», como cuentan los huéspedes), sin mascotas, el exterior del J es un patio y el A es
«perfecto para 2».

**Cartel.** Una sola cita corta, literal y atribuida; lo demás, parafraseado y atribuido. No se usa
el párrafo del pentalfa («sello de Salomón»): esa expresión se asocia también a la estrella de seis
puntas y la web no quiere ni rozar la simbología que no es de la casa. Transcripción completa, abajo.

**Fotos.** Solo las de Booking (las subió el alojamiento). Las de Google en alta (puerta 03/06 de
6048 px, fachada 08 de 4284 px) no dicen quién las subió; si Javier confirma que son suyas, pueden
sustituir a b09/b08. La del atardecer es de un huésped: **no se usa**; en su sitio hay un dibujo
(la roseta como sol que se pone sobre los tejados) marcado con `data-pendiente="foto-atardecer"`.
- **Verticales corregidas** (`scripts/fotos.py`): punto de fuga de las verticales con Canny +
  HoughLinesP y ajuste robusto; homografía que deja fija la base y abre la parte de arriba al 85 %,
  sin que el lado opuesto se ensanche más de 1,4 veces, con un 30 % de compensación de aspecto.
  El recorte es solo el rectángulo que queda dentro (informe en `scripts/fuentes/verticales.json`).
  La b08 converge tanto (10°) que solo se corrige un tercio; por eso el héroe es la b06.
- **Gradación común** (sin desenfoque: son estancias): parche blanco hacia la cal, brillo medio
  común, curva en S suave, sombras hacia el marrón del logo, negros hacia el «hondo» y saturación
  contenida en lo muy vivo. Antes y después en `scripts/fuentes/hoja-antes-despues.jpg`.
- Versiones AVIF/WebP/JPG a 480/960/1440 (héroe hasta 2200) con `srcset`.

**Logo** (no hay vector; `scripts/logo.py`):
- **La roseta, con geometría de compás**: círculo de radio r = 53,5 (px del JPG) y seis arcos del
  mismo radio centrados sobre él; las lentes claras entre las puntas las cierran otros seis arcos de
  radio r centrados a r·√3 (en el JPG el claro empieza a 0,73·r, y √3 − 1 = 0,732). Anillo de 53,5
  a 68,5 y **14 dientes** de punta hacia dentro (de 76 a 96, base del 80 % del paso): 14 tiene la
  roseta izquierda del logo y las de la chimenea; la derecha del logo, dibujada a mano, 16.
- **Cruz y peana, con medidas**; la «estrellita» de la peana son seis brazos finos en forma de
  pétalo, uno hacia arriba, como en el logo y la chimenea.
- **El rótulo, con potrace por componentes conexos** (cada letra y la tilde, un `<path>`).
- Superposición sobre el JPG en `scripts/fuentes/comprobacion-simbolo.png`.

**Letra.** El rótulo del logo **no es de Google Fonts** (se probaron las 1.245 familias latinas no
manuscritas, letra a letra, con la misma altura de mayúscula y línea base). La más cercana es
**Katibeh** (Eduardo Tunni; OFL): trazo que se ensancha sin serifa, la «J» que remata a la izquierda
sobre la línea base, la C, la d, la e, la O, la n y la z casi calcan las del logo estrechadas al
75 %; difieren los remates (cuña en el logo, gota en Katibeh), la «v» y la cabeza de la «a». Nadie
la usa en la carpeta, ni a Commissioner (texto). Katibeh se **autoaloja**
(`assets/fuentes/katibeh-latin.woff`, 18,6 KB, solo latín) porque sus métricas verticales son
distintas en Windows y en Mac/iOS/Android (la línea base caía 0,41 em más abajo); la copia las
iguala (`scripts/katibeh_fix.py`; la OFL lo permite y va al lado). Solo tiene peso 400
(`font-synthesis: none`) y su altura x es 2/3 de la de Commissioner: `size-adjust: 150%`. Sale un
tercio más ancha que el rótulo, que es un dibujo comprimido. Hojas de comparación en
`scripts/fuentes/tipografia-8-candidatas.png` y `tipografia-letra-a-letra.png`; segunda opción,
Kalnia; tercera, Amarante (ya viene estrecha).

**Paleta** (medida, `scripts/paleta.py`): marrón del logo `#483526` (núcleo del trazo); el fondo
del logo es blanco (`#FDFDFD`), así que el papel `#ECEAE3` sale del mármol de la jamba de la 7A,
aclarado y enfriado; cal `#F7F6F2`; hondo `#221C18` para las secciones oscuras; miel `#B5773A` de la madera de la puerta (mediana `#884815`,
zona iluminada `#B36B29`), **solo decorativo**; `--miel-texto` `#895D32` (4,75:1) y `--miel-claro`
`#CEA77E` (7,6:1 sobre el hondo) para cuando el miel tiene que ser texto. Las alternativas
Azul y Oliva giran el matiz de la marca (`#483526` → `#2D3A50` / `#3A3C21`) y del hondo
(`#19202B` / `#1F2114`, con un croma de 0,023 para que el matiz se note).

**Olivenza a pie.** Rumbos con las coordenadas de OSM de cada lugar (`data/lugares.json`, con su
elemento OSM y su URL); distancias a pie de OSRM; minutos = ceil(m / 80). Los puntos van en su
rumbo exacto; solo las etiquetas con el número se separan unos grados si chocan (máximo 5,2°,
anotado en `data-etiqueta-desvio`). No hay nada entre los 190° y los 340°: la casa está en el
borde oeste del casco y los monumentos quedan al este y al sureste. El Centro de Interpretación no
está en OSM: su punto es la Plaza de Santa María.

## Pendientes para Javier

1. **Vector del logo** (el de la web está redibujado desde el JPG de Booking).
2. **Licencia**: confirmar AT-BA-00410 (el registro abierto de la Junta acaba en enero de 2025) y
   qué es el «7A» (el Catastro solo tiene el nº 7, con tres plantas).
3. **Por qué «Casa de la Judería»**: si hay una tradición familiar o local, se puede contar como
   tradición.
4. **Email** de contacto.
5. **WhatsApp**: si el 647 33 29 44 lo tiene, se añade un botón.
6. **Política de cancelación** (depende de la tarifa en Booking).
7. **Permiso para la foto del atardecer** (es de un huésped, en Google) y **para citar el cartel
   entero**.
8. Si el **Centro de Interpretación del Pasado Judaico** sigue abierto, y su horario.
9. Una **foto de la placa de azulejo de la calle Santiago**, para ver qué nombre portugués lleva.
10. Titular legal (nombre completo y NIF) para el aviso legal y la privacidad.
11. Si las fotos de Google en alta resolución (la puerta y la fachada) son suyas.
12. Si la ficha de Google tiene una URL propia para el botón «Ver en Google» (ahora es una búsqueda).

## Créditos

- Fotografías: ficha de Booking del alojamiento (subidas por el propio alojamiento), graduadas.
- Logo: del alojamiento, redibujado en vector.
- Cartel «Simbología popular sobre chimeneas y jambas en Olivenza»: texto de Miguel Ángel
  Vallecillo, doctor en Historia del Arte y director del Museo González Santana.
- Mapa de lugares: © colaboradores de OpenStreetMap (ODbL); rutas a pie, OSRM.
- Letras: Google Fonts (OFL). Librerías: GSAP 3.12.5, ScrollTrigger, Lenis 1.1.13 (jsDelivr).

### Transcripción del cartel (foto b11)

> **SIMBOLOGÍA POPULAR SOBRE CHIMENEAS Y JAMBAS EN OLIVENZA**
>
> Colocar cruces, estrellas, rosetas y otros símbolos sobre las chimeneas, jambas de puertas o
> ventanas tenían un carácter apotropaico, de ahuyentar el mal, proteger el hogar de malos
> espíritus, llámense brujas, tormentas, la luna…, lo desconocido.
>
> Se trata de creencias populares, fuertemente arraigadas en el Alentejo, que nunca fueron
> reconocidas por la Iglesia.
>
> Las más frecuentes fueron la cruz; en el caso de la chimenea que nos ocupa, la que se encuentra en
> esta fachada de Casa de la Judería, es la Cruz del Calvario, funciona como protección divina y de
> fe. Es curioso indicar que esta Cruz solía ser enmarcada con color azul, ligado al cristianismo.
>
> Otro símbolo que se graba en esta chimenea es la roseta hexapétala, flor de seis pétalos, antiguo
> talismán solar, que representa a Jesús como sol y luz; se solía enmarcar con color amarillo.
>
> Muy utilizado fue también el pentalfa, que viene a representar los cinco sentidos, las cinco
> Llagas de Cristo, una mano y hasta el cuerpo humano. Muchos lo denominan: «sello de Salomón».
>
> Como se ha dicho, la finalidad de estos y otros símbolos era alejar el mal, «o mal de olho». De
> hecho, se conservan aún apodos en Olivenza que se refieren a ellos. Además, se empleaban para
> evitar que entrase la luna y «alunase» a los bebés de la casa. Si eran «cogidos por la luna», era
> obligado hacer un ritual, al que solo tenían acceso determinadas mujeres quienes se lo
> transmitían a sus hijas, nunca a los varones.
>
> Hoy día se siguen manteniendo algunas costumbres populares como, una vez guisada la carne de la
> matanza, realizar una cruz sobre ella, para que no se estropee, una cruz sobre la ceniza de la
> chimenea o dejar una tenaza abierta en forma de cruz en el suelo de ella.
>
> Se encuentra usted en una casa que mantiene vivas estas tradiciones: Casa de la Judería de Olivenza
>
> *Texto: Miguel Ángel Vallecillo. Doctor en Historia del Arte. Director del Museo González Santana.*
