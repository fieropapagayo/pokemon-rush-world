# Changelog

## 2.15.0 · Control de Destinos y Atajos de Campo — 27 de octubre de 2026

- **🧭 Botón para Despejar Destino en el Mapa (`panels.ts`)**: botón directo `✕ Quitar destino` en la barra superior del Mapa del Mundo [M] para cancelar la ruta guiada sin tener que cerrar la ventana.
- **📖 Actualización de la Guía de Controles (`panels.ts`)**: incorporación del atajo de curación rápida `[Q]` y de los comandos de chat (`/dex`, `/equipo`, `/mochila`, `/mapa`, `/pocion`) en la ventana de Ayuda [H].
- **🔊 Navegación Sonora Unificada (`panels.ts`)**: acústica interactiva táctil al cambiar de categoría en la Mochila [I] y al pulsar los accesos directos de la Tarjeta de Entrenador [K].

## 2.14.0 · Progreso de Pokédex y Comandos Tácticos — 27 de octubre de 2026

- **📊 Cabecera de Pokédex con Porcentaje de Completado (`panels.ts`)**: etiquetas compactas con diseño sobrio para Vistos, Capturados con porcentaje exacto (`X%`) y Shinies con barra de progreso estilizada.
- **🎯 Flecha de Fijación Táctica en Placas (`GameScene.ts`)**: flecha cian sobre la placa del Pokémon fijado para inspección/captura, manteniendo la flecha roja reservada para ataque activo (`⚔ Luchar`).
- **💬 Nuevos Atajos de Chat (`hud.ts`)**: soporte para `/dex`, `/equipo`, `/mochila`, `/mapa` y `/pocion` para abrir paneles y gestionar recursos desde el teclado.
- **🔔 Retroalimentación Acústica en Expediciones y Gimnasios (`panels.ts`, `gyms.ts`)**: sonidos temáticos al despachar y recoger expediciones de reserva y al interactuar con los gimnasios.

## 2.13.0 · Fidelidad de IVs, Amistad y Sonido Ambiental — 27 de octubre de 2026

- **♥ Ordenación por Amistad en Equipo y Caja (`panels.ts`)**: añadido el filtro `Amistad (♥)` en la barra de control para ordenar tus Pokémon por su valor de felicidad (0 a 255), agilizando las evoluciones por afecto.
- **📊 Corrección de Escala IV en Fichas (`panels.ts`)**: actualizado el indicador numérico a `/31` en cada una de las 4 estadísticas (PS, Ataque, Defensa y Velocidad) tras la ampliación de la escala competitiva.
- **🌾 Crujido Suave en Hierba Alta (`GameScene.ts`)**: sutil efecto de pisada acústica al adentrarse en la vegetación junto a las hojas proyectadas.
- **🔊 Navegación Táctil Auditiva (`panels.ts`)**: sonido de confirmación al alternar pestañas en los paneles de Mejoras [U] y Social [O].

## 2.12.0 · Radar Shiny y Dinámica de Captura — 27 de octubre de 2026

- **🌟 Detección de Shinies en el Minimapa (`hud.ts`)**: los Pokémon Shiny salvajes se marcan en el minimapa como rombos dorados pulsantes con destello blanco central, evitando que pasen desapercibidos en la hierba alta o cuevas.
- **🎯 Retícula de Fijación en el Minimapa (`hud.ts`)**: el objetivo fijado en el mundo se enmarca en el radar con un recuadro táctico adaptativo (cian para captura/inspección y rojo cuando tu equipo lo está atacando).
- **✨ Rótulos Flotantes de Captura (`GameScene.ts`)**: textos flotantes visualmente claros y dinámicos (`¡CAPTURADO!` en verde esmeralda y `¡ESCAPÓ!` en carmesí suave) directos sobre la Poké Ball al terminar los balanceos.
- **🔊 Tactilidad Auditiva para [Tab] (`GameScene.ts`)**: sutil sonido de interfaz al rotar cíclicamente entre objetivos salvajes cercanos.
- **🎉 Celebración Visual de Nivel de Entrenador (`hud.ts`, `GameScene.ts`)**: anillo de luz y lluvia de estrellas doradas centrada en el personaje al subir de nivel.

## 2.11.0 · Feedback Táctico y Salud de Equipo — 27 de octubre de 2026

- **🩺 Alerta Visual de Salud Crítica en el HUD (`hud.ts`, `v24.css`)**: las ranuras del equipo en peligro de debilitarse (<25% PS) muestran un pulso luminoso ámbar-rojo suave, advirtiendo al entrenador para usar el atajo rápido de curación `[Q]`.
- **🔊 Botón Directo de Grito Procedural Retro (`panels.ts`)**: botón `🔊 Grito` en la Pokédex [P] y en la ficha del Pokémon en Equipo [T] para escuchar el grito retro chiptune sintetizado en 8-bit.
- **⚡ Feedback Auditivo y Avisos Tácticos para [B] y [V] (`hud.ts`)**: confirmación sonora inmediata y notificación discreta en pantalla al cambiar de Poké Ball equipada (`[B]`) o al rotar el modo táctico del equipo (`[V]`).
- **🍬 Uso Seguro de Caramelo Raro desde Mochila (`panels.ts`)**: al pulsar "Usar" en un Caramelo Raro desde la Mochila [I], se abre directamente el panel de Equipo con indicación en pantalla para seleccionar al Pokémon destinatario sin riesgo de asignación accidental.

## 2.11.0 · Rutas, Pueblos y Modelos — 27 de octubre de 2026

### Localizar, mucho más fácil
- **Ruta marcada de verdad**: al elegir un destino (mapa [M], botón "Ir" de cada zona, jefes, Centro Pokémon, líderes de gimnasio o clic en el mapa) el juego calcula el camino a pie por todo el mundo (A* que prefiere caminos y puentes y evita la hierba alta) y lo dibuja con **flechas doradas animadas en el suelo**.
- La ruta aparece también en el **minimapa** y en el **mapa del mundo** (línea discontinua y metros que faltan). Se recalcula sola si te desvías.
- **Brújula nueva**: metros y minutos a pie, botón **▶ para caminar solo** por la ruta (cualquier tecla lo para) y **×** para quitar el destino. Clic en la brújula abre el mapa.
- **Faro de luz** en el destino y flecha en el borde de la pantalla cuando aún está lejos. Con un Pokémon de agua la ruta puede cruzar lagos.

### Pueblos y flores
- Casas, Centro Pokémon y Tienda redibujados **al doble de resolución**: vigas de madera, contraventanas, jardineras en las ventanas, farolillo, chimenea de ladrillo, tejas escalonadas, cumbrera, sombra del alero y zócalo de piedra. El Centro tiene emblema Poké Ball con volumen y rótulo con cruces; la Tienda, toldo de rayas y macetas.
- **Calles empedradas**: adoquines cálidos de anchos distintos, cantos redondeados y musgo entre las juntas (antes, baldosa gris uniforme).
- **Decoración**: jardines con setos en las cuatro esquinas, bancos alrededor de la fuente, vallas blancas delante de las casas (con hueco en la puerta) y macizos de flores pisables junto a las fachadas.
- **Jardineras nuevas**: arriates redondos con borde de piedras, matas de hojas y flores de cinco pétalos en cuatro combinaciones.

### Modelos 3D de todos los Pokémon
- **50 % más de resolución** (96 px por fotograma) con filtrado suave dentro del mundo.
- Esferas más redondas, **luz por píxel** con brillos nítidos, **sombras que viran a violeta y luces cálidas**, **oclusión ambiental** donde se tocan las piezas, **líneas interiores** que separan patas, brazos y cabeza, bandas de sombreado tipo pixel art y contorno más suave del lado de la luz.
- Los árboles y los entrenadores usan el mismo motor y también ganan definición.

### Servidor 24 h en Render
- Nuevo **`subir-a-render.bat`**: crea el repositorio privado de GitHub, sube el juego, copia `CLOUD_KEY` al portapapeles y abre Render con todo listo para *Deploy Blueprint*.
- Después, **`run.bat` sube los cambios solo** y Render publica la nueva versión. Opción `JUGAR_EN_NUBE=true` para que `run.bat` abra directamente el juego de la nube.

### Comprobación
- Nuevo `npm run test:nav`: rutas desde Pueblo Paleta a todos los pueblos, sin pasar por casillas bloqueadas, en menos de 10 ms.
- `test:models` 11.648 fotogramas sin recortes · `test:visuals` 231 · `test:world`, `test:mechanics`, `test:gameplay`, `test:bots` 25/25, encuentros, exploración y clima: superadas.

## 2.10.0 · Feedback de Combate y Control Táctico — 27 de octubre de 2026

- **⚡ Subida de Nivel Dinámica y Estadísticas Flotantes (`GameScene.ts`, `game.ts`, `hud.ts`)**: sincronización de nivel exacto alcanzado por cada entidad con ráfaga de estrellas doradas, anillo de luz, rótulo dinámico `¡Nv. X!` y salto de estadísticas en verde (`+PS +ATK +DEF`) para tu equipo, más audio `levelup` y registro enriquecido en el cuaderno.
- **🎯 Retícula de Fijación Adaptativa (`GameScene.ts`)**: el anillo de selección a los pies del objetivo (`selRing`) ajusta su matiz en tiempo real según el contexto: dorado `0xffd700` ante Pokémon Shiny salvajes, rojo ofensivo `0xff4040` durante el combate activo (`⚔ Luchar`) y cian táctico `0x60d8ff` al fijar objetivo pacíficamente para captura o inspección.
- **🩹 Acceso Rápido a Pociones con Tecla [Q] (`GameScene.ts`, `hud.ts`)**: atajo inmediato para curar al equipo al vuelo con la mejor poción disponible en mochila (Poción o Superpoción) sin soltar el control del movimiento ni apartar el cursor de los rivales.
- **🔍 Filtro por Tipo Elemental en Pokédex (`panels.ts`)**: menú desplegable integrado junto al buscador que permite aislar al instante todas las especies de un tipo concreto (Fuego, Agua, Planta, Dragón, Fantasma, etc.) con botón `✕` para restablecer la búsqueda con un solo clic.

## 2.9.1 · Gritos Retro y Pulido de Combate — 27 de octubre de 2026

- **🔊 Gritos Retro Chiptune Procedurales (`audio.ts`, `panels.ts`, `GameScene.ts`)**: síntesis WebAudio de gritos retro estilo 8-bit con afinación, frecuencia y modulación única para cada una de las 91 especies; se reproducen al inspeccionar en la Pokédex, seleccionar en la Caja, acariciar a tus Pokémon en el mundo o toparse con un salvaje shiny.
- **⚔️ Pulido Táctil y Sonoro de Combate**: efectos sonoros y destellos visuales diferenciados para impactos críticos (`crit` estridente y sacudida de pantalla), súper eficaces (`hit` agudo brillante) y poco eficaces (`hit` apagado).
- **🌊 Salpicaduras y Ondas Acuáticas Bajo los Pies**: el efecto de ondas en agua se renderiza directamente sobre la lámina acuática bajo los pies del personaje y sus seguidores con micro-salpicaduras de gotas.
- **🏷️ Barra Flotante de Buffs en el HUD (`hud.ts`, `v24.css`)**: badges discretos y estilizados con temporizador en tiempo real para Incienso Raro, Potenciador de EXP x2 y Sinergias Link activas sin saturar la barra de recursos.
- **📦 Barra de Control Compactada en Equipo y Caja (`panels.ts`)**: se reemplazaron las dos filas de 19 botones de filtros por una única barra de herramientas compacta con selector de tipo, selector de rareza, buscador rápido, ordenación y píldoras esenciales (`[Todos]`, `[⭐]`, `[✦]`, `[★]`, `[▲]`).

## 2.9.0 · Desafío y Comunidad — 27 de octubre de 2026

### Más difícil, como pediste

- **Capturar cuesta de verdad.** La vida que le queda pesa mucho más: un común a vida completa ronda el 8 % con Poké Ball, y casi debilitado sube al 44 %. Los buenos son mucho más duros: raros ×0,65, épicos ×0,45, legendarios ×0,5 y míticos ×0,35 (los errantes, ×0,7 más). Un legendario dormido, al 2 % de vida y con Ultra Ball: ~1,4 % por intento. El porcentaje real se ve en el panel del objetivo.
- **Combates más largos**: los salvajes tienen el doble de vida y tu equipo un 60 % más, así que los combates duran bastante más y no se resuelven al instante.
- **Debilitarse se paga**: un Pokémon caído tarda 60 s en volver por sí solo (antes 8 s) y vuelve con el 15 % de vida. Revivir, el Centro Pokémon y el campamento lo aceleran.
- **Evolucionar es más complejo**: además del nivel, la piedra, la amistad o la hora, ahora cuesta **caramelos de la familia**: 25 de la primera etapa a la segunda, 75 de la segunda a la tercera. Se ganan al capturar (3 a 6, 12 con un shiny) y a veces al derrotar. La ficha del Pokémon muestra cuántos tienes.
- **Cada ejemplar es único**: IV de 0 a 31 en cada estadística (antes 0-15) y una **naturaleza** que sube una estadística un 10 % y baja otra. Dos Pikachu del mismo nivel pueden tener 39 o 50 de ataque. La ficha muestra la naturaleza, y "Élite" y "100 % IV" se adaptan a la nueva escala.
- **Niveles sin tope**: entrenador y Pokémon siguen subiendo más allá del 100, y cada nivel cuesta más: el 150 pide casi 500 veces más EXP que el 50.

### Tu equipo y el combate

- **Un clic solo selecciona** (ves su nivel, tipos y probabilidad de captura); **doble clic o el botón "⚔ Luchar"** ordena atacar. La tarjeta de encuentro y el panel del objetivo tienen el botón.
- **Neutral de verdad**: tu equipo no ataca a nadie hasta que un salvaje os golpee a ti o a ellos; entonces responde solo contra ese.
- **Nuevo modo "Libre" ❦**: tus Pokémon pasean a su aire por los alrededores (hasta unas 7 casillas) y solo pelean si les atacan.
- **Movimiento natural**: ya no corren tanto. Van casi a tu paso y solo trotan si se quedan muy atrás; al pasear o reunirse van despacio y se acercan a los enemigos sin prisa.
- **A 1 PS ya no se quedan parados**: solo se protege de rematar a shinies, legendarios y míticos (para que puedas capturarlos) y a especies nuevas si tienes el Lanzador automático. Al resto tu equipo lo derrota.
- **Nadar (Surf)**: con un Pokémon de agua en el equipo puedes cruzar lagos, ríos y el mar. El entrenador va medio sumergido y deja estela.

### Campamento de verdad 🏕

- Pulsa **Z** (o el botón Acampar) en un claro de una ruta: se monta una **tienda con hoguera** que dura 2 minutos y todos los jugadores cercanos ven.
- Junto al fuego (unas 3,5 casillas) tu equipo y el de tu grupo **se cura poco a poco**, se le quitan los estados y los debilitados se recuperan en 12 s. Tus Pokémon se sientan alrededor de la hoguera, de noche ilumina y los salvajes no se acercan a quien descansa.
- Solo en zonas salvajes, sobre hierba, arena, nieve o roca, sin Pokémon hostiles en 9 casillas y lejos de otro campamento. Se puede repetir cada 3 minutos.

### Juega con amigos

- **Enlace de invitación**: Social [O] → "🔗 Copiar enlace de invitación". Quien lo abra entra desde cualquier PC o móvil y te llega su solicitud para unirse a tu grupo (hasta 4). También se puede compartir el enlace de la web `…/jugar?amigo=TuNombre`.
- Nuevo **`url.txt`** en la carpeta del proyecto con la web, el enlace para jugar y cómo invitar a tus amigos.

### Interfaz y gráficos

- **Placas de nivel y vida rediseñadas**: fondo redondeado translúcido con borde de color (verde tus Pokémon, blanco los salvajes, rojo los agresivos y rivales, dorado los shinies y el seleccionado), nivel dentro de la placa y flecha roja cuando lo estás atacando. Los nombres de los entrenadores llevan su propia placa (la tuya con borde dorado).
- **Adiós al "hilo blanco"**: se quitan las líneas que unían a los miembros del equipo con Pokémon Link.
- **Hierba alta nueva**: matas irregulares con puntas claras y base oscura que se mecen al pasar, en vez de la franja plana de antes.
- **Botín con iconos**: los cofres, jefes y recompensas muestran el icono de cada cosa (Balls, pociones, piedras, dinero, cristales...) con su cantidad, en lugar de una lista de texto.
- **Poké Balls con volumen**: sombreado, franja, botón con aro y brillo en las cuatro Balls.
- **Equipo [T]**: filtro por **rareza** (legendarios y míticos, épicos, raros, poco comunes, comunes) junto a los de tipo, y naturaleza en la ficha.
- **Intro**: aviso **"🎃 Próximamente: Actualización de Halloween"**, las novedades a la vista y nuevos rótulos (estaciones y clima, legendarios y míticos, PvP y grupos, juega desde cualquier sitio) en lugar de "modelos 3D".

### Seguridad

- **Servidor de juego**: como mucho 12 accesos fallidos por IP cada 10 minutos y 40 conexiones por minuto; **5 contraseñas incorrectas bloquean la cuenta 5 minutos** aunque se cambie de IP.
- **Web (Cloudflare)**: límites guardados en la base de datos (12 inicios de sesión con Google por minuto y IP; 20 intentos con clave falsa bloquean la IP 10 minutos), límites por IP en el resto de la API y cabeceras de seguridad en todas las páginas (CSP, anti-iframe, nosniff...).

### Servidor 24/7 en la nube (preparado)

- Ahora también se recuperan desde la nube las **partidas de invitado** (con el mismo navegador, por el hash de su sesión, nunca el token).
- El servidor detecta su dirección pública en Render, Fly.io, Koyeb y Railway, y en esos hostings no abre túnel.
- La web despierta cada 10 minutos a los servidores de juego (los hostings gratuitos los duermen sin tráfico).
- `render.yaml`, `Dockerfile` ajustado y guía **`NUBE.md`** con las opciones (Render, Oracle Cloud Always Free, Fly.io/Koyeb). Falta que elijas el hosting y crees la cuenta.

### Comprobación

- `npm run test:mechanics` (nuevo): 12/12 — captura difícil y fácil al final, legendario durísimo, estadísticas distintas por ejemplar, niveles más allá del 100, seleccionar sin atacar, Luchar, nadar, campamento permitido y prohibido, y bloqueo de cuenta.
- `npm run test:gameplay` 17/17 · `npm run test:bots` 25/25 · encuentros, exploración, clima y mundo: superadas.
- En vivo (Cloudflare): cabeceras de seguridad, límite de Google (429 a partir del 13.º intento), bloqueo de claves falsas (429 a partir del 21.º) y `/jugar` redirigiendo al servidor activo.

## 2.8.1 · Atmósfera e Iluminación — 27 de octubre de 2026

- **🌅 Atmósfera Visual Avanzada y Gradación de Color Dinámica (`visuals.ts`, `GameScene.ts`)**: gradación cromática cinematográfica interpolada en tiempo real según la hora solar y las condiciones meteorológicas (lluvia, tormenta, niebla, nieve, sol radiante, ceniza volcánica y mazmorras) junto con viñeteado óptico suave en pantalla completa mediante postFX de cámara WebGL.
- **☁️ Sombras de Nubes en Movimiento y ☀️ Rayos Crepusculares**: sombras tenues de nubes que cruzan fluidamente el mapa arrastradas por la dirección del viento en días despejados o ventosos, y rayos de sol dorados entre el follaje de zonas salvajes y rutas boscosas.
- **💡 Luces Nocturnas de Color y Destellos en el Agua**: iluminación coloreada con mezcla aditiva en tiempo real para farolas de pueblo (ámbar cálido), hogueras de campamento (naranja incandescente), auras de aliados y Pokémon elementales (fuego, eléctrico, psíquico, hada, Umbreon y jefes), más destellos solares sobre aguas abiertas.
- **👣 Huellas Efímeras en Arena y Nieve**: marcas alternas de pisadas con rotación según la orientación del paso que se desvanecen suavemente tras unos segundos al caminar por playas o la ruta nevada.
- **⚙️ Ajuste Compacto Conmutable en Ajustes (`panels.ts`, `state.ts`)**: opción instantánea para activar/desactivar la iluminación ambiental y sombras sin alterar el rendimiento en equipos modestos.

## 2.8.0 · Volumen y Materiales — 27 de octubre de 2026

- Hierba alta más natural: matas de altura e inclinación variadas, superpuestas y sin las filas uniformes de la textura anterior.

- Entrenadores y 14 apariencias de PNJ reconstruidos en 3D: fotogramas 32×48, mochila con volumen, gorra con visera, chaqueta, zapatillas y accesorios. Mismo tamaño dentro del mundo y colores del vestidor conservados.
- Materiales por especie: pelaje, escamas, hojas, caparazones, roca, hielo y metal con texturas que siguen el giro del modelo. Ojos y detalles pequeños permanecen limpios; ataques luminosos y variantes shiny conservados.
- Charizard estrena alas verticales con membranas, nervaduras y puntas articuladas.
- Seis árboles, tres arbustos y cinco rocas reconstruidos con volumen y texturas al doble de resolución. Copas por capas, raíces, bayas, flores y musgo; balanceo suave de vegetación que responde al viento y se desactiva con calidad baja.
- Edificios con faldón lateral, cumbrera, sombra bajo aleros, zócalo biselado, puertas con paneles, reflejos de cristal y colectores en el laboratorio. Se conservan entradas y colisiones.
- Corregido el tamaño del Pokémon al escapar de una Poké Ball. Nuevas comprobaciones de márgenes, poses y escalas de los modelos del entorno y los entrenadores.

- Herramientas: `npm run test:visuals` comprueba 212 fotogramas; `npm run preview:visuals` genera `artifacts/visuals-2.8.png`. El test de Pokémon recorre 11.648 fotogramas de 91 especies.

## 2.7.0 · Estaciones y Leyendas — 26 de octubre de 2026

### Jugar desde cualquier sitio

- **"Jugar ahora" ya lleva al juego.** Al abrir `run.bat`, el servidor abre solo una dirección pública con Cloudflare (Quick Tunnel, gratis, sin tocar el router) y se la comunica a la web. El enlace fijo **<https://pokemon-rush-world.pokemonrush.workers.dev/jugar>** redirige siempre a la dirección vigente; si el servidor está apagado, lo dice. Los jugadores no descargan nada: basta un navegador en cualquier PC o móvil.
- `TUNNEL=true` por defecto (`false` para jugar solo en casa). `cloudflared` instalado en el PC servidor; si se cierra, el túnel se reabre solo.

### Entrar con Google

- Botón **Entrar con Google** en el menú del juego y en la web. El inicio de sesión se hace en la web fija; ella valida la cuenta con Google y entrega al juego un **pase firmado** (HMAC con la clave secreta, válido 5 minutos, en el fragmento de la URL para que no quede en registros).
- La primera vez se elige el nombre de entrenador; después se entra directo. La cuenta de Google queda vinculada en la nube, así que se recupera aunque el servidor pierda `data/`.
- Se rechazan pases falsificados o caducados, y una cuenta de Google no puede entrar con contraseña.
- **Falta un paso tuyo**: crear el ID de cliente de Google (gratis) y pegarlo en `web/wrangler.toml` (instrucciones en `web/README.md`). Hasta entonces el botón no aparece.

### Estaciones y clima

- **Cuatro estaciones** que duran un día real cada una: Primavera, Verano, Otoño e Invierno.
- **Clima por zona** que cambia cada 12 minutos según la estación: despejado, soleado, lluvia, tormenta, nieve, niebla, viento y ceniza. Picos Helados nieva casi siempre, el volcán echa ceniza, el pantano y el cementerio tienen niebla, y en la costa llueve en vez de nevar. Servidor y jugadores calculan lo mismo, sin tráfico extra.
- **El clima y la estación cambian los Pokémon**: lluvia → agua ×2,2; tormenta → eléctricos ×3; sol → fuego y planta; nieve → hielo ×3; niebla → fantasmas y psíquicos; viento → voladores. Primavera favorece planta, bicho y hada; verano fuego, agua y eléctrico; otoño fantasma, siniestro y veneno; invierno hielo.
- **Especies de temporada**: Hoppip, Mareep y Togepi en primavera; Houndour y Wooper en verano; Murkrow y Misdreavus en otoño; Swinub y Sneasel en invierno. Algunas salen también con su tiempo (Wooper con lluvia, Mareep con tormenta, Swinub con nieve).
- Se ve en pantalla (lluvia con ondas, tormenta con relámpagos, nieve, niebla, hojas con viento y en otoño, pétalos en primavera) y en el HUD (hora · estación · tiempo). Aviso al cambiar el tiempo de tu zona o la estación.

### Más Pokémon, legendarios y míticos (73 → 91 especies)

- **9 especies nuevas**: Mareep, Hoppip, Wooper, Murkrow, Misdreavus, Sneasel, Swinub, Houndour y Togepi.
- **6 legendarios errantes nuevos**: Raikou (Campos Voltio y Pradera, ×3 con tormenta), Entei (volcán y montes, más en verano), Suicune (lago y costa, ×3 con lluvia), Lugia (costa y lago, de noche, con tormenta o lluvia), Ho-Oh (Picos y Pradera, de día con sol) y Rayquaza (Picos y Montes, con tormenta o viento; el más raro: 1 de cada 6.000 encuentros).
- **3 míticos nuevos**: Celebi (Bosque Verde, más en primavera), Jirachi (praderas, solo de noche) y Darkrai (cementerio y Torre, solo de noche). 1 de cada 9.000 encuentros, como Mew.
- Articuno, Zapdos y Moltres ahora también dependen del tiempo (nieve, tormenta, sol o ceniza).
- Modelos 3D propios para las 18 (normal y shiny, 8 direcciones y 8 poses).

### Movimiento, animaciones e interfaz

- **Pokémon más suaves**: su posición sigue la interpolación con un muelle suave, la dirección ya no parpadea al girar y el salto al andar es más natural. Respiran en reposo, aparecen de la hierba con un pequeño estirón y al debilitarse se tambalean y caen de lado.
- **Nivel y vida más finos**: el "NV5" grande y gordo se sustituye por un número pequeño en una plaquita junto a una barra fina con borde, tramos cada 25 % y rastro del daño. Las etiquetas se escalan para quedar nítidas a cualquier zoom. Los nombres de jugadores y vecinos también son más pequeños.
- **Vecinos que pasean**: caminan alrededor de su sitio con paradas, se giran hacia ti cuando te acercas y todos los jugadores los ven en el mismo lugar. Joy, los dependientes y los líderes se quedan en su puesto.
- **Salvajes más vivos y menos numerosos**: solo un 35 % de la densidad de la zona pasea a la vista (antes 50 %). Ahora recorren la zona con paradas en vez de quedarse en un punto, y los tranquilos aparecen ya caminando, cruzándose en tu camino.

### Comprobación

- `npm run test:models`: 11.648 fotogramas de las 91 especies (incluidas las 18 nuevas, normal y shiny), sin recortes.
- `npm run test:weather` (nuevo): 11/11 — estaciones, clima determinista y variado, nieve en Picos, sin clima en cuevas e interiores, especies de temporada, Raikou con tormenta y Darkrai solo de noche.
- `npm run test:google` (nuevo): 6/6 — alta con nombre, vuelta directa, pase falsificado, pase caducado y sin contraseña.
- `npm run test:gameplay`: 17/17. `npm run test:bots`: 25/25. `npm run test:encounters` y `npm run test:world`: superadas.
- En vivo: túnel abierto por el servidor, `/jugar` redirigiendo a él y el juego cargando desde Internet; web publicada con las rutas nuevas.
- Navegador: HUD con estación y tiempo, 91 especies en la Pokédex, nueva etiqueta de nivel y vecinos en movimiento.


### Modelos 3D, Entrenador Volumétrico, Filtros Inteligentes y Calidad de Vida

- **Estudio 3D Interactivo 360° en Pokédex, Equipo, Selección de Inicial y Atelier**:
  - Controles en vivo bajo el retrato de cada Pokémon para girarlo en sus **8 orientaciones** (`◀` / `▶`), activar la **rotación automática continua (`⟳ 360°`)** y alternar en tiempo real sus **animaciones 3D** (`Reposo`, `Caminar` y `¡Ataque!`).
  - **Atelier 3D (`/?gallery=n`) ampliado**: barras de estadísticas base + BST, chips de movimientos aprendidos por nivel, selector interactivo de familia evolutiva y atajos de teclado (`←`/`→`, `Espacio`, `S`).
  - **Selección de inicial 3D en vivo y Creador de Entrenador**: los iniciales se animan y giran en 360° con vista previa **✦ Shiny** y cadena evolutiva; el creador de personaje anima al entrenador caminando en varias direcciones (`⟳ Vista`) e incorpora el botón **🎲 Aleatorio**.
- **Shader 3D Emisivo (Auto-Iluminación)**:
  - Las llamas, chispas eléctricas, los anillos dorados de Umbreon y las gemas psíquicas de Espeon y Golduck cuentan con luz propia emisiva en el rasterizador 3D, brillando con intensidad desde cualquier ángulo.
- **Modelos 3D anatómicos enriquecidos**:
  - **Eevee y Growlithe**: Eevee con collar gorguera esponjoso de 8 mechones crema y cola de punta estrellada; Growlithe con tupé frontal y pelaje crema.
  - **Zubat, Golbat y Crobat**: Zubat con doble púa caudal; Golbat con 4 colmillos vampíricos (superiores e inferiores), lengua rosada e iris carmesí; Crobat con 4 alas en X, ojos amarillos y patas inferiores.
  - **Voltorb, Electrode, Magnemite y Magneton**: Voltorb con cejas fruncidas en V; Electrode con sonrisa dentada; Magnemite con tornillos inferiores; descargas eléctricas doradas en los fotogramas de ataque.
  - **Gastly**: nube de gas espectral de 7 volutas que rota dinámicamente en cada fotograma de animación.
  - **Rattata y Raticate**: Raticate con mofletes crema prominentes y grandes incisivos; Rattata con punta de cola rizada.
  - **Ponyta y Rapidash**: cernejas de llamas en los cascos que arden al galopar y trotar; Rapidash con cuerno de unicornio frontal y crin continua de fuego.
  - **Golem y Geodude**: Golem con garras afiladas en manos y pies reptilianos sobre su coraza de adoquines; Geodude con nudillos y nódulos rocosos de impacto.
  - **Zapdos y Moltres**: Zapdos con plumaje caudal espinoso de rayo negro; Moltres con cola ardiente ondulante de fuego.
  - **Magikarp**: cresta dorsal de triple punta en corona dorada y motas de escamas laterales.
  - **Efectos elementales en poses de ataque 3D (`frame >= 6`)**: chorros de agua presurizada en los cañones de **Blastoise**, aliento de fuego en **Charmander/Charmeleon/Charizard**, látigos cepa en **Bulbasaur/Ivysaur**, descargas eléctricas en los mofletes de **Pikachu/Raichu**, orbes psíquicos en las cucharas de **Kadabra/Alakazam**, hiperrayo en **Gyarados** y **Dragonite**, rayo hielo y pecho crema en **Lapras**, llamarada en **Arcanine**, **Vulpix**, **Ninetales** y **Houndour**, tajo aéreo en las guadañas de **Scyther**, polvo psíquico en **Butterfree**, notas musicales al cantar en **Jigglypuff/Wigglytuff**, esfera psíquica en **Mew/Mewtwo**, ventisca/trueno/fuego sagrado en **Articuno/Zapdos/Moltres**, **Raikou/Entei/Suicune** y **Lugia/Ho-Oh**, ojo verdadero ventral en **Jirachi**, orbe temporal en **Celebi**, brecha negra en **Darkrai**, chispas caudales en **Mareep** y pulso dragón en **Rayquaza**.
  - **Blastoise y Squirtle**: Blastoise con cañones hidráulicos dobles retráctiles metálicos en los hombros del caparazón; Squirtle con cola rizada en espiral.
  - **Wartortle**: orejas plumosas aladas celestes y cola rizada de nube.
  - **Venusaur**: tronco central con flor tropical de 5 pétalos rosados, motas estaminales amarillas y 4 hojas de palmera basales expandidas.
  - **Machamp**: 4 brazos musculados (dos superiores y dos inferiores) con puños cerrados y cinturón de campeón dorado con rubí.
  - **Machoke**: franjas deltoides vasculares carmesí en los hombros y cinturón de combate.
  - **Caterpie**: cuerno osmeterio en Y rojizo en la frente y anillos amarillos segmentados a los costados.
  - **Metapod**: cresta dorsal angular endurecida y ápice facial.
  - **Marowak**: cráneo óseo reforzado con cuernos y hueso de combate extendido con dos cabezas redondeadas.
  - **Mewtwo**: tubo craneal dorsal que conecta la nuca a la columna vertebral, placa pectoral y cola prensil engrosada con punta bulbosa.
  - **Gengar y Haunter**: Haunter con manos flotantes independientes de 3 garras afiladas y fauces con colmillos; Gengar con púas dorsales, sonrisa de dientes divididos y espinas laterales.
  - **Onix y Gyarados**: Onix con nódulos en cada roca y gran cuerno frontal; Gyarados con tridente azul de 3 puntas, garganta carmesí, 4 colmillos blancos y bigotes dorados.
  - **Dragonite y Dragonair**: Dragonite con cuerno nasal, crestas alares, vientre estriado y antenas; Dragonair con orbes de zafiro en cuello y cola y alas de ángel auriculares.
  - **Evoluciones de Eevee**: Vaporeon con collar gorguera y aleta caudal doble de sirena; Jolteon con collar de púas de rayo y grupa erizada; Flareon con melena y cola esponjosa; Espeon con cola bífida y rubí psíquico; Umbreon con anillos dorados luminosos.
- **Texturas de Terreno, Sprites de Entrenadores y Objetos del Mundo**:
  - **Terrenos enriquecidos (`tileArt.ts`)**: arena de playa con conchas marinas (`#fff6ee` / `#f4a4b8`), pantanos con hojas de nenúfar flotantes y capullos de loto rosados, suelos de cueva con destellos minerales de cuarzo y amatista, y suelo de la Torre Pokémon con baldosas rúnicas místicas.
  - **Objetos del mundo mejorados (`objectArt.ts`)**: fuentes con ondas concéntricas; estatuas con ojos de zafiro luminosos e insignia dorada; cristales de cueva con reflejos prismáticos; entradas de cueva con estalactitas y destellos interiores; farolas con capitel forjado; carteles de ruta con franja azul y remaches; PCs con fondo de escritorio de Poké Ball.
  - **Modelo de Entrenador y PNJs volumétrico rediseñado (`trainerArt.ts`, `GameScene.ts`)**:
    - Ojos expresivos estilo RPG con brillo especular blanco, cejas definidas y rubor cálido en las mejillas.
    - Chaqueta abierta con camiseta interior blanca, solapas en el cuello, cremallera central, puños vueltos en las mangas y correas de mochila sobre los hombros.
    - Cinturón de cuero con hebilla dorada y una **mini Poké Ball enganchada en la cintura**.
    - **Mochila de aventurero 3D** en vistas lateral y trasera con solapa superior iluminada, bolsillo inferior y cierre metálico dorado, además de **zapatillas deportivas bicolor** con lengüeta blanca.
    - **Animación fluida en el mundo**: balanceo de zancada con rebote vertical al caminar y respiración suave en reposo.
    - **👕 Vestidor del Entrenador en Vivo** integrado en **Ajustes** y accesible desde la **Tarjeta de Entrenador**: permite personalizar en cualquier momento la gorra, ropa, piel y pelo con vista animada en 3 direcciones (`⟳ Vista`) y botón **🎲 Aleatorio**, actualizando al instante tu personaje en el mundo multijugador y en el HUD.
- **Sistema de Racha de Combate (`🔥 Racha xN`)**:
  - Al encadenar 3 o más victorias seguidas aparece el cartel flotante **¡RACHA xN!**, un indicador **🔥 xN** en la barra de recursos del HUD y un efecto sonoro especial cada 5 derrotas.
- **Alertas visuales de combate y estados**:
  - Carteles flotantes dinámicos al aplicar problemas de estado: **¡QUEMADO!** (naranja fuego), **¡ENVENENADO!** (púrpura veneno), **¡PARALIZADO!** (dorado eléctrico), **¡DORMIDO!** (azul suave) y **¡CONGELADO!** (cian hielo), acompañados de sonido y anillo expansivo.
  - Pancartas de efectividad en combate: **¡CRÍTICO!**, **¡EFICAZ!** y **POCO EFICAZ**.
- **Efectos de pisadas y superficies**:
  - Ondas de agua (**water ripples**) al caminar por agua y orillas.
  - Nubecillas de arena y polvo al caminar sobre dunas y caminos.
  - Partículas de copos de nieve en cumbres heladas.
  - Shimmer dorado constante sobre los Pokémon shiny salvajes.

### Nuevas Funcionalidades y Calidad de Vida

- **✨ Interfaz Ultra-Compacta Sin Ruido Visual, 🚀 Envío Rápido de Expediciones, ◓ Vínculo Pokédex→Caja y Estela Elemental Pokémon Link (`hud.ts`, `panels.ts`, `GameScene.ts`)**:
  - **Compactación Visual en HUD y Ventanas**: barra de acción inferior estilizada (`🏕 [Z]`), panel de objetivo sin etiquetas duplicadas (`◓ %` + `⚔ ×2`), rastreador de misiones del HUD plegable con un clic (`▾`/`▸`) e indicadores dorados discretos en el dock de menús cuando hay misiones listas, expediciones completadas o evoluciones disponibles.
  - **Secciones Plegables (`<details>`)**: el Calendario Diario y los Trofeos/Estadísticas en **Misiones (`J`)**, las Esencias y Caramelos en **Mochila (`I`)**, el armador de sinergias en **Equipo (`T`)**, la lista de movimientos en **Pokédex (`P`)** y el Radar de Jefes en **Mapa (`M`)** se presentan de forma compacta y desplegable para evitar cualquier ruido visual.
  - **🚀 Envío Rápido en Expediciones (`X`) y ◓ Salto Pokédex→Caja (`P`)**: botón **`🚀 Envío rápido (3 mejores)`** para despachar una expedición en 1 solo clic, botón **`◓ En Caja (N)`** en la Pokédex para inspeccionar directamente tus ejemplares de esa especie en **Equipo (`T`)**, y chispa elemental sutil al caminar cuando tienes una sinergia *Pokémon Link* activa.
- **🏕 Hoguera de Campamento (`Z`), ♥ Acariciar Pokémon en el Mundo, ⚡ Armador de Sinergias Pokémon Link, ⚔ Predictor Elemental + DPS en Vivo, ☠ Radar de Jefes y 🏅 Trofeos (`GameScene.ts`, `hud.ts`, `panels.ts`, `server/game.ts`)**:
  - **🏕 Hoguera de Campamento Interactiva (`[Z]` / `/acampar`)**: enciende una hoguera animada durante 12 s fuera de combate con troncos cruzados, llamas danzantes, brasas ascendentes, iluminación nocturna cálida y pulsos curativos cada segundo que restauran PS a tu entrenador y al equipo de todos los entrenadores cercanos.
  - **♥ Acariciar Pokémon Compañeros en el Mundo y en Equipo (`T`)**: haz clic sobre tus propios Pokémon seguidores en el mapa (o pulsa **`♥ Acariciar`** en su ficha 3D) para que den un salto de alegría con lluvia de corazones (`<3 ¡FELIZ!`, `<3 ¡LEAL!`) y consulta su nivel de amistad.
  - **⚡ Armador Automático de Sinergias Pokémon Link (`Equipo [T]`)**: detecta qué sinergias (`Electric Chain`, `Firestorm`, `Ocean Surge`, `Prism Team`, `Evolution Resonance`, etc.) puedes formar con tu Caja y ofrece botones de 1 clic (`⚡ Armar sinergia`) que equipan automáticamente la combinación de mayor PC.
  - **⚔ Predictor Elemental en Objetivo y Medidor de DPS en Vivo (`HUD`)**: el panel del Pokémon objetivo indica en tiempo real si tu equipo tiene ventaja elemental (`⚔ ×2`) o si resiste tus ataques, muestra etiquetas `👑 ALFA` / `⚡ ERRANTE` y estados alterados, y añade el medidor **`⚔ DPS/s`** en vivo en la barra superior durante el combate.
  - **☠ Radar de los 7 Jefes de Mundo en Mapa (`M`) y 🏅 Trofeos de Coleccionista en Misiones (`J`)**: panel desplegable en el Mapa con el estado en vivo (`● Vivo` o cuenta atrás `⏳`) y botón **`⌖ Ir`** para los 7 Jefes de Mundo, más 6 **Trofeos de Coleccionista** evolutivos (`Bronce`, `Plata`, `Oro`, `Platino`) y estadísticas de **`Golpe Máx.`** y **`Daño Sesión`** en Misiones (`J`).
- **⇄ Sustitución Directa en Equipo (`T`), Subida `+5 Nv`, Venta Rápida en Mochila (`I`), Buscador de Hábitats en Mapa (`M`) y Atelier 3D con Filtros (`panels.ts`, `gallery.ts`)**:
  - **Equipo (`T`)**: cada ficha muestra el **📍 Origen y Fecha de Captura**, añade un botón **`+5 Nv`** para subir 5 niveles de golpe con caramelos y ofrece una barra **`⇄ Sustituir por...`** para intercambiar directamente un Pokémon de la Caja con cualquier miembro de tu equipo titular en un clic cuando el equipo está lleno.
  - **Mochila (`I`)**: botón **`💰 +₽`** para vender objetos directamente desde la mochila mientras estás en un pueblo, botón **`▲ Equipo`** en piedras evolutivas para filtrar tus Pokémon evolucionables y acceso directo **`🛒 Abrir Tienda`**.
  - **Mapa (`M`)**: buscador en tiempo real **`🔍 Filtrar por Pokémon, tipo o ruta…`** que filtra y despliega automáticamente las zonas donde habita cualquier especie o tipo elemental, más botón **`✈ Viaje Rápido`** al último Centro Pokémon visitado.
  - **Atelier 3D (`/?gallery=n`) y Ayuda (`H`)**: filtros por categoría (`Todos`, `★ Leyendas`, `Iniciales`, `Jefes`) y botón **`🎲 Azar`** en el visor 3D, más botón **`📓 Abrir Libreta de Novedades [N]`** en Ayuda.
- **🎯 Probabilidad de Captura en Tiempo Real, ⚡ Captura Crítica y ⛓️ Cadena Shiny (`hud.ts`, `GameScene.ts`)**:
  - El panel de objetivo calcula en vivo tu **porcentaje exacto de captura (`🎯 %`)** según los PS, estado alterado, nivel, especie, mejoras y Ball seleccionada, e incorpora un botón directo **`◓ %`** para lanzar la Ball con un clic.
  - Animación y aviso flotante **`¡CAPTURA CRÍTICA!`** en cian brillante con destellos cuando se activa una captura crítica.
  - Textos flotantes **`+EXP`** y **`+Esencia Elemental`** (con partículas del color del tipo) al derrotar Pokémon salvajes, e indicador de **⛓️ Cadena de Captura (`xN · Shiny x1.N`)** en el HUD y en la tarjeta de captura.
- **🧭 Radar Cercano con Distancia, Cobertura en Gimnasios y Cobro Rápido en Diario (`exploration.ts`, `gyms.ts`, `panels.ts`)**:
  - El **Cuaderno de Viaje y Radar Cercano** muestra la distancia en metros (`m`) a cada Pokémon cercano, destaca ejemplares **👑 Alfa** y permite minimizar/expandir el panel (`▾`/`▸`).
  - **Gimnasios (`G`)** analiza tu equipo titular actual e indica qué Pokémon tuyos tienen ventaja elemental frente a cada Líder.
  - **Diario de Campo (`R`)** añade el botón **`🎉 Entregar listas`**, y **Mejoras (`U`)** añade una barra superior de **Bonificaciones Totales Activas** y el botón **`⚡ Mejorar`** para adquirir al instante la mejora disponible más económica.
- **📓 Libreta de Novedades Interactiva (`[N]`) y Actualización en Tiempo Real (`live_update`)**:
  - Cuaderno de campo estilo RPG con anillas metálicas, cinta marcapáginas y páginas rayadas que se abre al entrar al juego (y con la tecla `N`, el botón `📓 Novedades` del HUD o `/novedades`), mostrando las novedades actuales y el historial de versiones.
  - Sincronización en tiempo real: cuando el servidor publica una nueva compilación, guarda las partidas de todos los jugadores conectados y actualiza el cliente en vivo preservando tu sesión y coordenadas.
- **⇄ Intercambios de Pokémon en Vivo entre Jugadores (`Social [O]`)**:
  - Solicita intercambios a entrenadores cercanos desde **Social (`O`)** o con `/intercambio nombre`.
  - Ventana de intercambio en tiempo real con oferta de hasta 6 Pokémon y Pokédólares, doble confirmación con cuenta atrás de seguridad de 3 segundos, registro de Entrenador Original (`EO`) y **evolución automática por intercambio** para **Kadabra → Alakazam**, **Graveler → Golem**, **Haunter → Gengar** y **Machoke → Machamp**.
- **🏆 Salón de la Fama del Servidor y Tabla Top PvP Elo (`Social [O]`)**:
  - Nuevas pestañas **🏆 Salón de la Fama** (Top 10 del servidor en **Nivel**, **Pokédex**, **Medallas**, **Jefes**, **Shinies** y **Victorias** con medallas `🥇 🥈 🥉`) y **⚔ Top Duelos PvP** en vivo dentro de **Social (`O`)** (o con `/ranking`).
- **🎁 Calendario de Recompensa Diaria (7 Días), ⭐ Favoritos, ✏ Motes y 💰 Venta en Tienda**:
  - **Calendario de Racha Diaria de 7 Días** visible en **Misiones (`J`)** y ventana emergente al iniciar sesión cada día con recompensas crecientes de Pokédólares, Cristales Rush, Fragmentos de Jefe, Caramelos Raros e Inciensos.
  - **⭐ Favoritos y ✏ Motes personalizados** en la ficha de cada Pokémon: ponles nombre propio (visible en el HUD, Equipo, Caja y Tarjeta de Entrenador), márcalos como `⭐ Favorito` para protegerlos frente a transferencias accidentales y fíltralos con la pestaña `⭐ Favoritos`.
  - **💰 Venta de Objetos en la Tienda Pokémon**: nueva pestaña `💰 Vender objetos (50% ₽)` en la Tienda de cualquier pueblo para vender objetos sobrantes por Pokédólares.
- **Ficha del Pokémon con Calculadora Elemental, IVs de Élite y Amistad clásica**:
  - **Tabla de Debilidades y Resistencias Elementales** integrada tanto en la ficha del Equipo como en la Pokédex: calcula automáticamente multiplicadores `×2` / `×4` (Débil a) y `×0.5` / `×0.25` (Resiste) según los tipos del Pokémon.
  - Medidor de potencial genético automático: distintivos **✦ 100% IV** (fucsia) y **★ Élite** (dorado para ejemplares con +85% de IVs totales), junto a estrellas en la cuadrícula de la caja.
  - Medidor de amistad clásico con 5 corazones interactivos (`♥♥♥♥♥`).
- **Expediciones Rápidas y Barras de Progreso en Mejoras**:
  - Botón **⚡ Elegir 3 mejores** en Expediciones para seleccionar con un clic a tus 3 Pokémon de reserva de mayor nivel, y botón **🎉 Recoger listas** para reclamar todas las expediciones completadas a la vez.
  - Barras de progreso visual (`nivel / máx`) en cada tarjeta del panel de Mejoras.
- **🏕 Campamento y descanso en la naturaleza**:
  - Nuevo botón **🏕 Acampar** en la barra de acciones para recuperar un 60 % de los PS del equipo y reanimar a Pokémon caídos fuera de poblados y duelos (fuego de campamento, ascuas y melodía de recuperación con 45 s de recarga).
- **Acceso rápido a Revivir**:
  - Botón directo en la barra de acciones para utilizar **Revivir** sin tener que abrir la mochila.
- **Tarjeta de Entrenador oficial con Vitrina 3D (tecla K o clic en avatar)**:
  - Vitrina del **Equipo Titular en 3D** con nivel, indicador shiny y porcentaje de IV de cada compañero, además de contador de **Pokémon Élite (≥85% IV)** y racha actual.
  - Título y rango honorífico según medallas y Pokédex, estuche de medallas con multiplicadores activos de daño y EXP y estadísticas completas.
- **Panel de Gimnasios Estratégico (`G`)**:
  - Recomendación automática de **tipos con ventaja elemental** frente a cada Líder de Gimnasio, insignia **★ As** para su Pokémon estrella e indicador de distancia en tiempo real.
- **Pokédex con visor 3D Shiny y BST**:
  - Botón interactivo para alternar entre el modelo 3D normal y la versión **✦ Shiny** con animación de destello y sonido WebAudio dedicado.
  - Indicador de **BST (Estadísticas Base Totales)** y barras de color para PS, Ataque, Defensa y Velocidad.
  - Tabla de movimientos aprendidos por nivel con tipo y potencia.
- **Filtros rápidos de tipo en el Equipo**:
  - Pestañas de filtrado (Todos, ✦ Shinies, Planta, Fuego, Agua, Eléctrico, Psíquico, Fantasma, Roca, Dragón).
- **Audio sintetizado WebAudio enriquecido**:
  - Nuevos efectos chiptune: destello brillante (`sparkle`), subida/bajada de estadísticas (`statup`/`statdown`), alerta de peligro y fanfarria de victoria en gimnasios.

### Encuentros y combate

- **Encuentros sorpresa (estilo hierba alta / Pokémon GO).** Ya no hay decenas de Pokémon esperando a la vista: solo unos pocos pasean (la mitad que antes) y el resto **salta de repente** mientras caminas. Cada casilla recorrida tiene una probabilidad según el terreno: hierba alta 7,5 %, cuevas 4,5-5 %, bosque y ceniza 3-3,4 %, hierba 2,2 %, arena 1,6 %, caminos 0,4 % y nada en los pueblos. Mínimo 6,5 s entre encuentros, la probabilidad sube hasta ×2 si llevas un rato sin ver ninguno y como mucho hay dos emboscados vivos a la vez por jugador. Aparecen a 2,6-4,2 casillas, preferiblemente por delante.
- **Agresivos, tranquilos y asustadizos.** Al aparecer se decide si van a por ti: 72 % en especies agresivas, 18 % en las tranquilas, 4 % en las asustadizas, +10 % de noche y hasta +20 % en zonas de nivel alto. Los agresivos detectan a 7,5 casillas, corren más, pegan un 12 % más y su nivel se ve en rojo. Los asustadizos pueden salir huyendo.
- **Tarjeta de encuentro**: "¡TE ATACA!" o "ENCUENTRO SALVAJE" con especie, nivel, tipos, rareza y si es nuevo para tu Pokédex, y botones **Luchar**, **Capturar [C]** y **Huir [F]**. Signo "!" sobre el Pokémon, hojas o arena saltando y sonido.
- **Huir [F]**: los salvajes que te persiguen te pierden el rastro 15 s, los emboscados normales desaparecen y tu equipo se calma 5 s. Puede fallar contra rivales más rápidos (o alfa y legendarios); cada intento fallido da +18 % al siguiente.
- **Ejemplares fuertes y alfa naturales**: el 12 % de los encuentros tiene de +2 a +4 niveles sobre la zona y 1 de cada 220 es un **alfa** gigante.
- **Cofres de salvajes**: al derrotar a un Pokémon puede caer un cofre (3,5 % base; ×1,6 agresivos, ×2,5 raros, ×12 alfa, ×40 legendarios). Durante 20 s solo puede abrirlo quien más daño hizo; luego cualquiera. Desaparece a los 90 s. Pasa por encima para abrirlo.
- **Dificultad más alta**: los salvajes hacen un 22 % más de daño a tu equipo y un 36 % más al entrenador, caer cuesta el 8 % del dinero (antes el 5 %), el entrenador se regenera más lento (2,5 %/s tras 5 s sin daño) y la EXP por derrota baja ligeramente.

### Legendarios, míticos y shinies

- **Legendarios errantes**: Articuno (Picos Helados), Zapdos (Campos Voltio) y Moltres (Volcán Canela) aparecen en 1 de cada 1.400 encuentros de su zona; **Mew**, ahora de rareza **Mítica**, en 1 de cada 9.000 encuentros de casi cualquier ruta. El Incienso Raro lo triplica. Solo puede haber uno de cada especie a la vez en el mundo.
- Llegan con **columna de luz, ondas, destello y temblor de cámara**, tienen ×3,2 PS e IV altos, y casi todos atacan. Todo el servidor ve un **anuncio a pantalla completa** con rayos animados y el aviso en el chat. Capturar un legendario también se anuncia.
- **Shiny legendario / shiny mítico**: combina la probabilidad del legendario con la de su shiny (de 12 a 16 veces más rara que la de un shiny normal). Tiene su propio anuncio dorado.
- **Etiquetas de rareza** sobre el Pokémon: ÉPICO, RARO, ALFA, ✦ SHINY, ✦ ALFA SHINY, LEGENDARIO, MÍTICO, ✦ SHINY LEGENDARIO.
- **Adiós al destello blanco**: el brillo blanco aditivo que tenían los Pokémon raros se sustituye por un **aura de color en el suelo** (dorada, rosa, roja o morada según la rareza) que late suavemente.

### Tu equipo

- **Modos del equipo [V]** (también en la barra de acciones): **Pasivo** (solo atacan al objetivo que fijes, +12 % defensa), **Neutral** (solo se defienden de quien os ataca), **Ataque** (como antes) y **Agresivo** (+50 % de alcance, +10 % daño, -10 % defensa). Se guarda en la partida.
- **Seguimiento natural**: el equipo ya no va en una formación rígida y simétrica. Cada Pokémon pisa tu rastro a su propia distancia, con un balanceo lateral propio y velocidades distintas; cuando te paras se dispersan a tu alrededor y cambian de sitio cada pocos segundos. Al ir a por un objetivo lo rodean en vez de ir en fila.

### PvP

- **Duelos entre entrenadores**: botón **⚔ Retar** en Social [O] o comando `/duelo nombre`. Arena de 11 casillas marcada en el suelo, cuenta atrás de 3,5 s y 2:30 de combate. Los equipos luchan con sus movimientos, tipos y sinergias reales (daño al 55 % para que duren). Gana quien deja al rival sin Pokémon; si se acaba el tiempo, quien conserva más vida; salir de la arena es rendirse.
- **Ranking Elo** (empieza en 1.000), victorias y derrotas guardadas en la partida, premio en Pokédólares y aviso en el chat. Sin penalización: al terminar se cura a ambos.

### Mundo

- **Casas con interior**: 25 interiores (Centros Pokémon, Tiendas, dos casas por pueblo y el Laboratorio). Las puertas se cruzan de verdad y dentro solo se ve la habitación. La Enfermera Joy cura desde el mostrador y el dependiente vende.
- **Muebles dibujados por código**: camas, mesas, estanterías, librerías, macetas, televisores, mostradores, PC, sofás, alfombras, máquinas de laboratorio, cocinas, ventanas, felpudos y jardineras.
- **Vecinos con nombre e historia** (Mamá, Abuela Rosa, Pescador Iván, Señor Fuji, el Campeón Rojo retirado...) con consejos sobre las nuevas mecánicas y **regalos únicos** (pociones, Balls, piedras evolutivas, un Caramelo Raro y hasta una Master Ball).
- **Relieve**: colinas y mesetas en praderas, bosques, campos y cementerio, con ladera de tierra, borde de hierba colgante y sombra.
- **Texturas**: arbustos con volumen, brotes iluminados, bayas o flores; hierba con briznas sueltas y manchas; caminos de tierra con rodadas, guijarros y humedad; jardineras en los pueblos.

### Interfaz

- **Arreglado el menú desordenado**: los botones de la esquina se apilaban de forma irregular. Ahora es un **dock en rejilla** de 4×3 con iconos, nombre y tecla.
- **Nivel encima de cada Pokémon** cercano (verde tus aliados, rojo los agresivos y los rivales de duelo) y **barras de vida nuevas** con borde, brillo y rastro del daño reciente.
- **Mapa [M]** con la **dificultad de cada zona** respecto a tu equipo (Fácil, Adecuada, Exigente, Peligrosa, Mortal), etiquetas de nivel sobre el mapa y lista desplegable de los Pokémon que viven en cada zona (☾ de noche, ✔ capturados).
- **Intro rediseñada**: paisaje animado en capas (cielo, montañas nevadas, colinas, bosque, pradera y camino), Pokémon corriendo, un ave legendaria que cruza el cielo de vez en cuando, logo con Poké Ball, pantalla de inicial con estadísticas y pasos, y pantalla de carga con consejos.
- **Tutorial para novatos** en 7 pasos que se completan jugando: moverse, encontrar Pokémon, fijar objetivo, capturar, modos del equipo, huir y curarse, y los menús.
- La **Tarjeta de Entrenador** pasa a la tecla **K**: con la C había dejado de funcionar el lanzamiento de Balls.

### Nube y web (carpeta `web/`)

- **Cloudflare Worker + D1 (gratis)** con instalador `web/desplegar.bat`: copia de seguridad de todas las partidas, estadísticas, latido del servidor y muro de momentos épicos.
- **Web pública de ranking**: nivel, Pokédex, shinies, legendarios, Elo, capturas y tiempo jugado; perfil de cada entrenador; estado del servidor con botón **Jugar ahora**.
- **Recuperación de cuentas**: si un servidor no tiene la cuenta (por ejemplo, tras perder `data/`), al iniciar sesión con usuario y contraseña la recupera de la nube con su partida.
- El servidor guarda cada 30 s (antes 60 s) y al instante al capturar algo raro o terminar un duelo; antes de apagarse hace una última subida.
- **Despliegue automático**: `run.bat` vuelve a publicar la web en Cloudflare cuando cambia la carpeta `web/` (si no hay cambios no hace nada). Sesión de Cloudflare propia del proyecto en `web/.wrangler-home/`, comprobación de la cuenta antes de publicar y token de API opcional como alternativa al navegador.
- Web publicada en <https://pokemon-rush-world.pokemonrush.workers.dev>.

### Economía

Revisada con `scripts/balance-sim.ts`. Precios y recompensas se mantienen; cambia el ritmo: al haber menos Pokémon a la vista y más peligro se progresa más despacio que antes, y los cofres de salvajes y los regalos compensan parte del dinero.

### Comprobación

- `npm run check`: tipado sin errores.
- `npm run test:gameplay` (nuevo, servidor real): 17/17. Encuentros sorpresa (3 en 40 s, 2 agresivos), cadencia mínima, pocos salvajes a la vista, cuatro modos de equipo, huida, entrar en una casa, regalo único y duelo PvP completo con Elo.
- `npm run test:cloud` (nuevo, con el Worker en local): subida de la partida, perfil en la web, recuperación de la cuenta en otro servidor y contraseña protegida.
- `npm run test:world` (nuevo): 25 interiores con puertas accesibles, colinas en el 4,1 % del terreno y todos los pueblos conectados por tierra.
- `npm run test:bots`: 25/25. `npm run test:encounters` y `npm run test:exploration` (10/10): superadas.
- API del Worker probada en local: sincronización, ranking, perfil, latido, muro, copia protegida (401 sin clave) y cron.
- Navegador: intro, inicial, interior con regalo, colinas, tutorial, dock y aparición legendaria de Zapdos.

## 2.5.0 · Senda del Campeón — 26 de octubre de 2026

### Modelos 3D y Refinamiento Anatómico

- **Línea Fantasma (Gengar, Haunter, Gastly)**:
  - *Gengar*: cuatro púas piramidales afiladas descendiendo por la espina dorsal, espinas en ambos costados, orejas demoníacas con sombreado de profundidad púrpura y amplia sonrisa espectral con división de dientes.
  - *Haunter*: garras fantasmales flotantes independientes con tres dedos garra articulados y boca zigzagueante con colmillos blancos.
  - *Gastly*: orbe etéreo oscuro envuelto en una corona oscilante de ocho nubes de gas venenoso.
- **Onix**:
  - Cuerno rocoso masivo en la cima del cráneo, arcos superciliares pétreos y nódulos rocosos facetados que sobresalen a ambos lados de cada eslabón del cuerpo.
- **Gyarados**:
  - Cresta dorsal de tridente cian de 3 puntas, boca desencajada con fauces carmesí, cuatro colmillos blancos afilados y bigotes dorados.
- **Línea Dragón (Dragonite, Dragonair, Dratini)**:
  - *Dragonite*: cuerno blanco en el hocico, morro redondeado con orificios nasales, antenas gemelas y vientre anillado color crema.
  - *Dragonair*: joya de zafiro en la garganta, alas angelicales blancas en los laterales de la cabeza, cuerno frontal y orbes gemelos en la punta de la cola.
  - *Dratini*: botón perlado blanco en el hocico y pequeñas aletas blancas de cabeza.
- **Línea Psíquica (Alakazam, Kadabra, Abra)**:
  - *Alakazam*: bigotes dorados largos que caen hacia el pecho, hombreras acorazadas de combate y cucharas de plata curvadas en ambas manos.
  - *Kadabra*: cuchara de plata en mano derecha, estrella roja de cinco puntas en la frente y bandas protectoras en el abdomen.
  - *Abra*: hombreras angulares de meditación y porte relajado.
- **Scyther**:
  - Cresta triangular mantis, abdomen segmentado verde oscuro y guadañas con doble hoja afilada y filo interior claro.
- **Lapras**:
  - Cuerno blanco estriado en la frente, orejas rizadas marinas y caparazón acorazado con protuberancias.
- **Evoluciones de Eevee**:
  - *Vaporeon*: aleta caudal doble de sirena al final de la cola y cuello con gorguera blanca.
  - *Jolteon*: cuello de agujas eléctricas blancas y púas de erizo en la grupa.
  - *Flareon*: cuello con melena esponjosa y copete dorado en la frente.
  - *Espeon*: cola bifurcada dividida en dos puntas aterciopeladas y gema de rubí psíquica frontal.
  - *Umbreon*: anillos dorados en orejas, patas, cola y frente.
- **Pidgeot**:
  - Cresta tricolor con penachos dorados laterales y cresta central carmesí en cascada.

### Tarjeta de Entrenador (Trainer Card)

- **Acceso Inmediato**: accesible pulsando en el retrato o nombre del entrenador en el HUD superior izquierdo, o pulsando la tecla `C`.
- **Rango Honorífico**: cálculo dinámico de título oficial según progreso en medallas y Pokédex (`Aspirante de Kanto`, `Entrenador Promesa`, `Veterano de Gimnasio`, `As de la Liga`, `Campeón de la Meseta Añil` y distintivo `✦ Shiny Hunter`).
- **Medallero de Terciopelo**: vitrina que exhibe las 6 medallas oficiales de los Líderes de Gimnasio con sus colores e insignias (`Arcoíris`, `Roca`, `Cascada`, `Espectro`, `Volcán`, `Dragón`), indicando el multiplicador pasivo total de daño y experiencia.
- **Panel de Récords**: registro instantáneo de especies vistas, capturadas y shinies; cálculo del Poder de Combate (PC) total y estrella del equipo; divisas y victorias en gimnasios.

### Pokédex: Movimientos por Nivel

- **Tabla de Aprendizaje**: cada ficha de especie en la Pokédex ahora incluye la lista detallada de movimientos que aprende al subir de nivel, especificando el nivel requerido, nombre, tipo elemental, categoría y potencia.

### Visuales de Combate y Efectos de Daño

- **Textos Flotantes Clásicos**:
  - `¡CRÍTICO!` en tipografía dorada brillante y sacudida de cámara reforzada.
  - `¡EFICAZ!` en naranja cálido para impactos super eficaces.
  - `POCO EFICAZ` en tono azul pizarra para ataques resistidos.
- **Nuevas Texturas Pixel Art**:
  - `meteor`: meteorito incandescente con núcleo de plasma para Cometa Draco.
  - `sludge`: masa de lodo tóxico con gotas salpicantes para Bomba Lodo.
  - `heart`: corazón rosa luminoso para movimientos de tipo Hada y melodías curativas.
- **Animaciones Actualizadas**:
  - *Cometa Draco*: proyectiles de meteoritos cayendo con estela de fuego y generando fisuras en el suelo.
  - *Bomba Lodo*: proyectiles con arco de parábola y salpicadura venenosa.
  - *Fuerza Lunar y Brillo Mágico*: estallido de estrellas y corazones.
  - *Danza Pétalo*: vórtice continuo de pétalos sakura.

### Atmósfera y Clima Dinámico

- **Relámpagos y Truenos en Tormentas**: destellos de pantalla durante tormentas eléctricas con truenos lejanos.
- **Pétalos Primaverales**: partículas de pétalos flotando en la brisa diurna de Pueblo Paleta y Ruta 1.
- **Fanfarria de Victoria WebAudio**: melodía sintetizada al ganar desafíos de gimnasio y duelos PvP.

## 2.4.0 · Impacto y Torbellino — 26 de octubre de 2026

### Modelos 3D y Anatomía de Especies

- **Machamp y Machoke**:
  - *Machamp*: cuatro brazos anatómicos e independientes con postura de doble flexión superior y puños adelantados de ataque con vendajes blancos de lucha; cinturón de campeón dorado con hebilla grabada y rubí central.
  - *Machoke*: bañador oscuro de culturismo con cinturón dorado de campeonato.
- **Golem y Graveler**:
  - *Golem*: caparazón esférico acorazado con placas de roca facetadas y biseladas; cabeza reptiliana saliente con ojos rojos y hocico pétreo; robustas garras y patas de roca maciza.
  - *Graveler*: cuatro brazos rocosos diferenciados (par superior de puños pesados y par inferior de garras de apoyo en el tórax).
- **Arcanine**:
  - Majestuosa melena esponjosa en nube cremosa rodeando el cuello, tupé de cabeza, penacho y voluminosa cola ondulante; pelaje en los tobillos de las cuatro patas y rayas de tigre negras flameadas.
- **Snorlax**:
  - Vientre blanco crema redondeado, ojos rasgados dormilones, colmillos inferiores sobresalientes y patas redondeadas con garras que reposan hacia adelante.
- **Marowak**:
  - Casco craneal evolucionado con dos cuernos curvos barridos hacia atrás y maza ósea bífida de dos extremos en la mano derecha.
- **Golduck**:
  - Aleta craneal estilizada, gema de rubí bermellón en la frente y manos palmeadas acuáticas.
- **Mewtwo y Mew**:
  - *Mewtwo*: conducto genético cráneo-cervical que conecta la base del cráneo a la nuca y espina dorsal superior; coraza pectoral y yemas de dedos psíquicas redondeadas.
  - *Mew*: larga cola psíquica ondulante con bulbo terminal perlado, flotación grácil en suspensión y grandes ojos celestes.
- **Venusaur, Blastoise y Charizard**:
  - *Venusaur*: frondas de hojas de palmera amplias bajo los pétalos de la flor de la espalda y colmillos blancos salientes en el maxilar inferior.
  - *Blastoise*: cañones gemelos de agua orientados en la parte superior del caparazón con bocas de disparo biseladas y orejas angulares.
  - *Charizard*: cuernos gemelos swept-back, y llama de la cola con núcleo blanco ardiente que parpadea dinámicamente.
- **Butterfree, Rapidash y Magneton**:
  - *Butterfree*: antenas curvas negras con puntas bulbosas y ojos compuestos de facetas rubí.
  - *Rapidash*: cuerno de unicornio estilizado con destello áureo en la frente.
  - *Magneton*: arco electromagnético oscilante que une las tres unidades en fotogramas de animación.
- **Aves Legendarias (Articuno, Zapdos, Moltres)**:
  - *Articuno*: plumaje pectoral de hielo cristalino y cola de cinta con estela ondeante.
  - *Zapdos*: cresta de púas negras y plumas de trueno puntiagudas.
  - *Moltres*: cresta de fuego vivo en degradado carmesí y dorado.

### Combate Cinemático y Efectos Visuales

- **Tajos cortantes dinámicos (`slash`)**:
  - Arcos de corte afilados y luminosos que se orientan en el ángulo exacto del impacto para `Arañazo`, `Corte Furia`, `Psicocorte`, `Garra Dragón` y doble tajo cruzado para `Tajo Cruzado`.
- **Carga de energía estelar (`chargeAura`)**:
  - `Rayo Solar` e `Hiperrayo` concentran un torbellino de partículas luminosas implosionando hacia el Pokémon antes de desatar un rayo colosal de plasma con sacudida de pantalla.
- **Llamarada Kanji**:
  - `Llamarada` despliega una estrella de 5 llamaradas en abanico antes de la deflagración explosiva central.
- **Magia oscura y escarcha**:
  - `Bola Sombra` y `Tinieblas` disparan orbes de materia oscura con núcleo púrpura brillante (`shadoworb`).
  - `Ventisca` y `Rayo Hielo` proyectan cristales de escarcha hexagonales (`frost`) con ráfagas heladas.
- **Fisuras y oleaje de terreno**:
  - `Terremoto` provoca grietas sísmicas ramificadas en el suelo (`groundFissure`) con piedras y escombros rocosos saltando por los aires.
  - `Surf` y `Cascada` generan ondas de expansión concéntricas de agua (`ripple`) con espuma marina.
- **Micro-partículas de estados alterados en el mundo**:
  - Los Pokémon afectados por estados muestran efectos visuales continuos: chispas de fuego para *Quemado*, burbujas violetas para *Envenenado*, centellas eléctricas para *Paralizado* y prismas de escarcha para *Congelado*.

### Atmósfera, Audio y Usabilidad

- **Partículas de movimiento en el mundo**:
  - Nubes de polvo sutiles al caminar sobre caminos, tierra y roca.
  - Crujido de hojas al correr por la hierba alta.
  - Salpicaduras de arena en playas y dunas.
  - Ondas de agua concéntricas en ríos y pantanos.
  - Hojas mecidas por el viento que flotan en el dosel de Bosque Verde.
- **Audio Chiptune para todos los tipos**:
  - Síntesis de sonido WebAudio dedicada para tipos *Lucha* (golpe marcial percusivo), *Volador* (ráfaga de viento cortante) y *Acero* (resonancia y choque metálico).
- **Poder de Combate (PC / CP)**:
  - Cálculo instantáneo de Poder de Combate para cada criatura visible en la ficha detallada y en las celdas de la caja.
  - Nuevo botón de ordenación por **Poder** en el panel de Equipo para ordenar de mayor a menor PC.
- **Pokédex con buscador en tiempo real**:
  - Barra de búsqueda interactiva con debounce para filtrar al instante por nombre, número de la Pokédex (ej. `#025`) o tipo elemental.
- **Mochila con pestañas**: la ventana de inventario ahora incluye pestañas directas (`Todos`, `Poké Balls`, `Curación`, `Evolución`, `Especiales`) para organizar rápidamente los objetos.
- **Uso directo de Caramelo Raro**: se puede usar el Caramelo Raro directamente desde la mochila en el Pokémon líder con un solo clic.

### Comprobación

- `npm run check`: TypeScript verificado sin errores.
- `npm run test:models`: 9.344 fotogramas renderizados, 73 especies en normal y shiny, 8 direcciones y 8 poses sin desbordamiento.
- `npm run test:encounters`: ratios y shiny boost cap superados.
- `npm run test:exploration`: 10 escenarios de rutas y gimnasios superados.
- `npm run test:bots`: 25/25 pruebas multijugador superadas en servidor en vivo.
- **Pruebas en navegador real**: Chrome headless cargando `http://localhost:3012` y la galería 3D interactiva con las 73 especies.
- `npm run build`: compilación de producción con Vite limpia.

## 2.3.0 · Resplandor y Detalle — 26 de octubre de 2026

### Modelos 3D y Shaders

- **Iluminación de silueta (Fresnel / Rim Lighting)**: cálculo por vértice que ilumina sutilmente los bordes tangentes a la cámara, realzando los volúmenes tridimensionales y separando la criatura de cualquier fondo. En Pokémon de tipo Fantasma (Gastly, Haunter, Gengar), este resplandor es aún más pronunciado, otorgando un aura espectral.
- **Luz de rebote cálida (Fill Light)**: luz ambiental secundaria proyectada desde abajo y lateralmente para evitar que los vientres, patas y zonas inferiores caigan en negro plano, mejorando el relieve anatómico.
- **Materiales físicos diferenciados**:
  - *Metálico*: brillo specular especular anisotropic de alto contraste para Pokémon y piezas de acero (Magnemite, Magneton, cañones de Blastoise, Scyther, Onix).
  - *Acuático / Dragón*: brillo suave satinado (sheen) para especies acuáticas y serpentinas (Lapras, Vaporeon, Gyarados, Magikarp, Dratini, Dragonair).
  - *Gemas y orbes*: destello prismático nítido para perlas y joyas (Dragonair, Espeon, Golduck).
  - *Brillo celestial Shiny*: las formas shiny cuentan con un destello estelar adicional en su iluminación 3D, haciéndolas visualmente únicas e inconfundibles.
- **Anatomía y rasgos icónicos ampliados**:
  - *Electrode*: se independiza visualmente de Voltorb con su hemisferio superior blanco, hemisferio inferior rojo, ojos expresivos en la cúpula superior y amplia sonrisa traviesa con dientes.
  - *Magikarp*: largos bigotes dorados en las comisuras de la boca, aletas pectorales y gran aleta dorsal en corona.
  - *Gyarados*: bigotes faciales articulados, colmillos blancos afilados y espinas dorsales.
  - *Haunter*: garras flotantes desacopladas del cuerpo con tres garras afiladas y púas en las mejillas.
  - *Gengar*: púas craneales, cresta dorsal, ojos carmesí y amplia sonrisa burlona de dientes blancos.
  - *Jigglypuff y Wigglytuff*: Jigglypuff con su característico tupé rizado en espiral en la frente; Wigglytuff con orejas estilizadas con pelusa interior blanca y penacho frontal.
  - *Abra, Kadabra y Alakazam*: Alakazam con largos mostachos dorados cayendo a los lados del hocico, dos cucharas de plata y hombreras; Kadabra con estrella roja psíquica en la frente.
  - *Oddish, Gloom y Vileplume*: Gloom con gota de néctar ambarino goteando de la boca; Vileplume con motas blancas sobre sus grandes pétalos rojizos.
  - *Vulpix y Ninetales*: Vulpix con mechones rizados sobre la cabeza y seis colas; Ninetales con nueve colas de puntas estilizadas y cresta aristocrática.
  - *Eeveelutions*: Flareon con abundante melena y cola de nube de fuego; Jolteon con gorguera blanca de agujas y flancos puntiagudos; Vaporeon con aletas de membrana auricular, gorguera blanca y aleta caudal de sirena; Espeon con cola bífida doble; Umbreon con anillos dorados resplandecientes en frente, orejas y cola.
  - *Dragonite*: antenas gemelas sobre la cabeza y vientre estriado en crema.
  - *Scyther*: guadañas curvadas con filo biselado en marfil y verde, crestas aerodinámicas y alas de insecto.
  - *Mewtwo*: conducto biológico que une el cráneo a la nuca, placas pectorales y cola púrpura musculosa.
  - *Aves legendarias*: Articuno con cola de cinta de hielo ondulante y cresta triple; Zapdos con alas relámpago erizadas de plumaje negro y amarillo; Moltres con alas y cresta de fuego vivo.

### Texturas y Mundo

- **Agua tropical animada**: motor de agua con cáusticas ondulantes de frecuencia dual, gradiente de profundidad entre turquesa y azul índigo, y destellos solares en movimiento continuo.
- **Lava volcánica independiente**: motor de lava propio con corteza de basalto oscura en enfriamiento, fisuras de magma ardiente y núcleos incandescentes en ebullición.
- **Espuma de orilla**: olas con gradiente de transparencia y rompiente blanca espumosa sobre las orillas.
- **Relieve de acantilados y cuevas**: caras de pared con estratos geológicos horizontales, cincelado de roca natural y vetas de musgo o minerales.
- **Texturas de suelo renovadas**:
  - *Caminos*: adoquines redondeados con textura de mortero y guijarros de río dispersos.
  - *Arena*: crestas de viento onduladas, minerales finos y motas de conchas marinas rosáceas.
  - *Flores*: cuatro tipos botánicos variados (amapolas carmesí, acianos celestes, caléndulas doradas y tréboles lavanda) con centro brillante y tallos.
  - *Hierba alta*: briznas estilizadas con gradiente de luz en la punta y sombra en la raíz.
  - *Nieve*: ventisqueros con sombra azulada tenue y destellos de cristales de hielo.
  - *Puentes*: tablones de madera con vetas de roble, juntas en sombra y remaches de hierro en los extremos.
  - *Pueblos*: losas de piedra biseladas con juntas de mortero y acabado pulido.
- **Estructuras y objetos**:
  - *Centro Pokémon*: tejado rojo con tejas biseladas, logo Poké Ball con núcleo iluminado, puertas correderas de cristal con reflejo celeste y jardineras florales decorativas a ambos lados de la entrada.
  - *Tienda Pokémon*: tejado azul con marquesina, escaparate y símbolo dorado del Poké-Dólar.
  - *Casas*: chimeneas de ladrillo con volutas de humo ascendente.
  - *Laboratorio*: antena/parabólica de comunicaciones en el tejado y paneles de investigación.
  - *Cofres*: vetas de madera noble con herrajes de bronce; al abrirse muestran monedas de oro y gemas relucientes (rubíes, zafiros y esmeraldas).
  - *Item Ball*: Poké Ball 3D esférica en el suelo con botón de apertura metálico, reflejo especular en la cúpula roja y sombra de contacto.

### Efectos visuales y Lógica

- **Partículas Shiny en el mundo**: los Pokémon shiny salvajes y aliados emiten destellos dorados con estrellas fugaces y chispas de luz cada pocos segundos.
- **Consumo de Caramelos Raros y alimento**: si un Pokémon ya alcanzó el nivel 100, se muestra un mensaje informativo claro indicando que está en su nivel máximo y no se consume el objeto ni los caramelos por error.
- **Amistad por Caramelo Raro**: usar Caramelos Raros incrementa la amistad del Pokémon (+5), respetando la mecánica tradicional de la saga.
- **Evoluciones por intercambio**: al intercambiar un Pokémon con evolución por trade (Kadabra, Graveler, Haunter, Machoke), su especie y estadísticas se actualizan inmediatamente de forma atómica.

### Comprobación

- `npm run check`: tipado TypeScript estricto verificado sin errores.
- `npm run test:models`: 9.344 fotogramas renderizados, 73 especies, variantes normales y shiny, ocho orientaciones, ocho poses y verificación de no-recorte de bordes.
- `npm run test:encounters`: ratios de aparición, shiny boost y protección de capturas.
- `npm run test:exploration`: diez escenarios de rutas, obstáculos, recompensas idempotentes y ciclo de gimnasios.
- `npm run test:bots`: 25/25 pruebas multijugador superadas en servidor local (movimiento, sincronización, combate, comercio, chat y antihacks).
- **Pruebas en navegador real**: ejecución con Chrome headless en `http://localhost:3011`, comprobando la carga del menú principal, la interacción en la Pokédex/Atelier 3D con las 73 especies, la consola sin errores y el renderizado en canvas.
- `npm run build`: compilación de producción con Vite exitosa en 4,3 s.

## 2.2.0 · Expedición Viva — 26 de octubre de 2026

### Modelos y mundo

- Las 73 especies pasan de fotogramas de 40×40 a 64×64, conservando su escala en el mundo. Se mantienen ocho orientaciones, ocho poses y las variantes shiny.
- Sombreado suave por superficie, reflejos para materiales acuáticos y metálicos, sombreado facetado para roca y contornos que conservan el color del modelo.
- Anatomía y marcas más reconocibles: Venusaur e Ivysaur, Butterfree, evoluciones de Squirtle, hocicos y garras de dragones, bigotes de roedores, detalles eléctricos, evoluciones de Eevee, aves y Lapras. Variaciones de proporción en varias evoluciones.
- Ocho variantes de terreno, matas irregulares, variación continua del color del suelo, arena ondulada, agua turquesa, adoquines con bisel y puentes con vetas y remaches.
- Sombras direccionales de árboles, rocas y edificios, calculadas al cargar el terreno; hojas y corteza, tejas, detalles de mampostería, reflejos de ventanas y jardineras.

### Exploración y contenido

- Movimiento con clic en el suelo y búsqueda local de camino con colisiones. WASD/flechas lo interrumpen; los destinos bloqueados o demasiado lejanos se rechazan sin congelar el juego.
- Guía de siguiente acción, botón contextual de interacción, radar que permite seleccionar salvajes y prioridad visual para shinies y especies sin capturar.
- Destinos desde el mapa, las regiones, Centros Pokémon y líderes. Brújula con distancia y marcador en el minimapa. La brújula indica una dirección; no es una ruta global automática.
- Diario de campo con doce investigaciones y cuatro rangos. Los registros existentes cuentan; cada recompensa se cobra una sola vez y se valida en el servidor. No requiere migrar la base de datos.
- Panel de gimnasios para los seis líderes ya implementados: equipos, requisitos, ubicación, medallas, bonificaciones permanentes y revanchas. Hablar con un líder abre el panel; el combate muestra rivales restantes y tiempo.

### Interfaz y correcciones

- HUD con nuevos colores y espaciado, chat plegable, habilidades con etiquetas, botones de acción y disposición adaptada al ancho disponible.
- Los diálogos avanzan con Enter; los campos de texto y las ventanas impiden ejecutar acciones de juego accidentalmente. Se ignora la repetición de teclas para acciones instantáneas.
- Abrir una ventana cancela el movimiento con clic; los portales automáticos solo se activan al moverse.
- Los cofres en recarga se omiten al buscar la interacción cercana.
- Poción muestra el inventario combinado, usa Superpoción cuando no quedan pociones normales y se desactiva al agotarse.
- Los Pokémon de gimnasio se identifican como rivales y no se sugieren para capturar.
- Changelog disponible en el menú inicial y en Ayuda [H].

### Comprobación

- `npm run check` y `npm run build`.
- `npm run test:models`: 9.344 fotogramas, 73 especies, shiny, orientación, animación y límites del dibujo.
- `npm run test:exploration`: diez escenarios de rutas, obstáculos, guardados antiguos, recompensas, duplicados y ciclo de gimnasio.
- `npm run test:encounters`: probabilidades, bonificaciones shiny y protección durante la captura.
- `npm run test:bots -- 3011`: prueba con servidor local y base de datos de pruebas independiente.
- Revisión visual en navegador del mundo, HUD, diario, mapa y modelos.

### Aplicación de la actualización

Si el servidor ya estaba abierto antes de actualizar, ciérralo con Ctrl+C para guardar las partidas y vuelve a ejecutar `run.bat`. Recarga el navegador. Las partidas se conservan.

## 2.1 · Pixel 3D

- 73 especies con modelos articulados en ocho direcciones, animaciones de movimiento, vuelo y ataque.
- Sombras según tamaño y altura, brillos shiny, tasas de aparición más escasas y visor de modelos.
- Protección de shinies salvajes a 1 PS y ajustes de autocaptura.
