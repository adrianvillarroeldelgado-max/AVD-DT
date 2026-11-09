# AVD D.T Fútbol · Pizarra Táctica

Pizarra táctica, planificación, plantel, partidos y carga para entrenadores de fútbol (AVD · D.T Fútbol).

- **Web (raíz del repositorio)**: se publica con GitHub Pages en <https://adrianvillarroeldelgado-max.github.io/AVD-DT/>. Funciona sin conexión y se instala como PWA.
- **App de Android (`android/`)**: abre esa web, así que cada cambio que subas a la web llega a la app sin reinstalar. GitHub Actions compila el APK y el AAB y los publica en **Releases**.
- **Descargar la app**: <https://github.com/adrianvillarroeldelgado-max/AVD-DT/releases/latest/download/PizarraDTFutbol.apk>
- **Política de privacidad**: <https://adrianvillarroeldelgado-max.github.io/AVD-DT/privacidad.html>

## Actualizar

- **Cambios de la web**: sube los archivos a la raíz. La web y la app se actualizan solas. En `sw.js` sube el número de `pizarra-vN` para que las copias sin conexión se renueven.
- **Cambios de la app nativa** (icono, nombre, código Android): edita `android/` y GitHub compila una versión nueva.

## Firma de la app

La compilación necesita estos secretos en *Settings › Secrets and variables › Actions*: `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS` y `KEY_PASSWORD`. La clave **nunca** se sube al repositorio.

## Funciones

### Novedades v10: biblioteca por sub-etapa
- **8.730 ejercicios** organizados por **sub-etapa → parte de la sesión → contenido → consigna**: Egocéntrica I (1.350), Egocéntrica II (1.670), Sumativa I (2.480) y Sumativa II (3.230).
- En cada sub-etapa están sus contenidos y los de las sub-etapas anteriores, que se consolidan con más contexto de juego (se marcan «de Egocéntrica I», etc.; la casilla «Solo contenidos de la sub-etapa» los oculta). 10 ejercicios por consigna en cada sub-etapa, más 10 de Información y 10 de Vuelta a la calma por sub-etapa.
- Los ejercicios se **adaptan a la sub-etapa**: estrategias (en Egocéntrica I predominan duelos, invasión y partidos a varias porterías; en Sumativa II, juego de posición, posesión y transiciones), número de jugadores, espacio, estilo de enseñanza, gradiente, preguntas y la variante para avanzar a la sub-etapa siguiente.
- **Explorador por pasos** en Biblioteca › Ejercicios por consigna: 1 · Sub-etapa, 2 · Parte de la sesión, 3 · Contenido, 4 · Consigna, con el número de ejercicios en cada paso. Desde una sesión, «📚 Desde la biblioteca» abre ya filtrado por la sub-etapa, la fase, el contenido y la consigna de la sesión.

### Novedades v9 (versión completa)
- **📊 Rendimiento** (botón en la barra superior), con cinco pestañas:
  - **Partidos**: calendario de partidos con rival, fecha, hora, competición, condición y resultado; resumen PJ-G-E-P, goles y % de puntos. Cada partido tiene **convocatoria y titulares** (propuesta automática con los disponibles), **alineación en la pizarra** con los suplentes en las notas, **minutos, goles, asistencias, tarjetas y RPE** de cada jugador, **informe del rival** (sistema, fortalezas, debilidades, balón parado, jugadores clave, plan) con su propia pizarra, y PDF del partido.
  - **Asistencia**: porcentaje por jugador en el periodo elegido (presente, ausente, justificada, lesionado).
  - **Carga**: carga real sRPE (RPE × minutos) de sesiones y partidos, carga semanal media, carga aguda y crónica y **ACWR** con alertas (óptimo 0,8-1,3; vigilar 1,3-1,5; riesgo > 1,5).
  - **Bienestar**: cuestionario diario de sueño, fatiga, dolor muscular, estrés y ánimo (1-5) con alertas.
  - **Temporada**: sesiones, minutos, resultados, minutos por mes y por parte de la sesión, carga mensual, tabla de jugadores (partidos, titularidades, minutos, goles, asistencias, tarjetas, % de asistencia y carga) y **contenidos planificados frente a trabajados**.
- **Asistencia y RPE en cada sesión**: pasar lista con un toque (P/A/J/L), RPE para todos o por jugador y minutos reales.
- **Microciclo automático**: el día MD de cada sesión se calcula según los partidos (botón «⚽ MD según partidos» y en las sesiones nuevas); los partidos aparecen en la semana.
- **Ficha del jugador ampliada**: resumen (partidos, minutos, goles, asistencia, ACWR, bienestar), **historial de lesiones** (se abre solo al marcarlo «Lesionado» y se cierra al volver a «Disponible») y **tests físicos** con la evolución respecto al anterior; evolución del test ludológico.
- **Varios equipos**: selector «Equipo» en el Inicio y en Ajustes; filtra plantel, sesiones, partidos, carga y estadísticas.
- **⏱ Modo partido** en la pizarra: marcador, cronómetro por partes, notas con el minuto y guardado en el partido.
- **Copia de seguridad completa** (Ajustes › Datos o pie del Inicio): todas las tablas y, si quieres, los videos; restaurar combinando o reemplazando; aviso en el Inicio si pasan 7/14/30 días sin copia; la app pide al navegador almacenamiento persistente.
- **Compartir una sesión** con sus tareas en un archivo (WhatsApp, correo…) que tu compañero abre en Tácticas › Importar.
- **Calendario**: exporta sesiones y partidos en .ics para Google Calendar, iPhone u Outlook.
- **Biblioteca**: ★ favoritos y **Mis ejercicios** (en la ficha de una tarea: «📚 A mi biblioteca»).
- **Guía de inicio** al abrir la app por primera vez (y en Ajustes).

### Novedades v8
- **Marca AVD · D.T Fútbol**: logo AVD con el eslogan «D.T Fútbol», tipografías Barlow Condensed / Barlow y la paleta AVD. **Tema claro** (gris #EDEDED, azul marino #0B1F3A, naranja #FF5A1F) y **tema oscuro** (negro #0a0a0a, lima #d4f000). Botón ☾/☀ en la cabecera y en Ajustes → Apariencia (Automático, Claro, Oscuro). La preferencia se comparte con las demás apps AVD del mismo sitio (clave `avd_theme`).
- **PDF de cualquier trabajo**: ficha de tarea, sesión, microciclo de la semana, plan de temporada y mesociclo (horizontal), evaluaciones, plantel, táctica completa con todos sus pasos (Exportar) y ejercicios de la biblioteca. Vista previa de las páginas, **descarga directa del PDF** A4 con la cabecera AVD, impresión y, en el celular, compartir. Sin librerías externas: funciona sin conexión.
- **Biblioteca de ejercicios por consigna**: **3.230 ejercicios**, 10 por cada una de las 321 consignas del catálogo, repartidos por parte de la sesión (Activación, Principal 1, 2 y 3) según la estrategia didáctica, más 10 propuestas de **Información** y 10 de **Vuelta a la calma y reflexión**. Cada uno trae diagrama animado y la ficha completa (contenido, consigna, estrategia, tiempo, espacio, jugadores, material, normas, puntuación, gradiente y preguntas). Filtros por parte de la sesión, bloque, sub-etapa, contenido y consigna. Se usa en la pizarra, se añade a una sesión (botón «📚 Desde la biblioteca» en cada fase) o se descarga en PDF, también los 10 de una consigna juntos.

### 🏠 Inicio
Pantalla de entrada con la próxima sesión, los minutos y la carga prevista de la semana (con el color de cada día MD), la disponibilidad del plantel, el nivel de comprensión del juego del equipo, accesos rápidos a todas las funciones, el microciclo de la semana, los jugadores que requieren atención (con fecha de vuelta), el avance del plan de temporada mes a mes, las tácticas recientes y un explorador del catálogo de contenidos y consignas por sub-etapa, desde el que se crea una tarea en un toque. Se puede desactivar para abrir directamente en la pizarra.

### Metodología de planificación (Licencia B CIEF · metodología MBP / Coaches' Voice School)
- **📅 Planificación** con cinco pestañas: Semana, Plan de temporada, Mesociclo, Evaluación y Guía.
- **Evaluación (test ludológico)**: test de equipo con 10 situaciones ofensivas y 10 defensivas y descriptores por sub-etapa (Egocéntrica I-II, Sumativa I-II). Calcula el resultado con la regla del cuaderno: si coinciden, esa sub-etapa; si son correlativas, la más primaria; si no, repetir. Test individual por roles (atacante con y sin balón, defensor del atacante con y sin balón), guardado en la ficha del jugador.
- **Plan de temporada (6 meses)**: 3 días por semana, cada uno con activación (HMB/HME, habilidades perceptivas o gestión del espacio) y parte principal (FBI con balón, FBI sin balón o FBC). Revisión automática por mes de los mínimos exigidos y del contenido asignado.
- **Mesociclo**: consignas por semana para cada contenido del mes, con autocompletado progresivo (simples → avanzadas) y creación automática de las sesiones de la semana en el calendario.
- **Catálogo de contenidos y consignas**: bloque complementario (habilidades perceptivas por rol y gestión de los espacios) y bloque básico (FBI y FBC) de Egocéntrica I a Sumativa II, con consignas simples y avanzadas.
- **Sesión por fases**: Información → Activación → Principal 1 → Principal 2 → Principal 3 → Vuelta a la calma y reflexión, con contenido, consigna y estrategia didáctica sugerida en cada fase y avisos si una tarea no encaja.
- **Ficha de tarea en 9 pasos**: contenido y consigna, estrategia didáctica, participantes, espacio, puntuación (con las restricciones por estrategia), normas, gradiente, preguntas y representación gráfica. Indicador de pasos completados e impresión en el formato del cuaderno.
- **Cronómetro de tarea** en el modo presentación: organización y explicación, feedback, gradiente (≈60 %) y cierre reflexivo (≈90 %) con avisos sonoros.
- **Alto rendimiento**: microciclo MD con orientación por día y **carga prevista** (minutos × RPE) por tarea, sesión y semana.

### Para el día a día del entrenador
- **📝 Ficha de tarea**: cada táctica tiene su ficha con objetivo táctico y físico, parte de la sesión, intensidad, duración, series, trabajo/descanso, jugadores, consignas, puntuación y variantes. Calcula sola la **densidad (m² por jugador)**, el espacio y el material necesario. Se imprime o guarda como PDF.
- **📅 Sesiones y microciclo**: calendario semanal con los días MD-5 … MD+2, sesiones por bloques (calentamiento, parte principal, vuelta a la calma), tiempo total, jugadores máximos y lista de material de toda la sesión. Reordenar tareas, duplicar sesiones, imprimir la sesión completa en PDF y presentarla.
- **👤 Plantel**: jugadores con foto, dorsal, posición, pie, categoría, altura, peso y **estado** (disponible, con molestias, lesionado, sancionado, ausente) con detalle y fecha de vuelta. Cambio rápido de estado, filtros, resumen por estado e importación desde CSV (dorsal;nombre;posición;categoría).
- **Alinear desde el plantel**: en Equipos eliges jugadores del plantel y la formación; se colocan por posición con su nombre y dorsal, y la ficha muestra un aviso si el jugador está lesionado, con molestias o sancionado.
- **📽 Modo presentación**: pantalla completa sin barras para la charla técnica o el descanso; pasos con toque o flechas, consignas a la vista y, en una sesión, paso de una tarea a la siguiente.

### Pizarra táctica
- **Líneas de unión y bloques**: selecciona varias fichas y pulsa «Unir»: línea con la distancia entre jugadores o bloque con ancho y profundidad. Se mueven con las fichas en la animación.
- **Flechas curvas** (carrera y pase) con punto de ajuste; al animar, la ficha o el balón siguen la curva.
- **Sombra de pase**, **jugador destacado** y **narración con tu voz** al exportar el video.

### Más funciones

- **Campos**: Fútbol 11 (105×68), Fútbol 9 (75×50), Fútbol 7 (60×40), Fútbol sala/5 (40×20) o tamaño personalizado. Marcas completas, solo bandas o campo libre. Vista completa, medio campo o solo la zona delimitada. Al cambiar el tamaño, las fichas se reescalan solas.
- **Vistas del campo**: completo, 3/4, medio campo, último tercio, zona central, área grande, área chica o solo el espacio principal; lado derecho o izquierdo.
- **Espacios de juego personalizados**: herramienta ⛶ Delimitar con rectángulo, círculo o polígono libre, marcados con línea, platillos, conos, estacas, bandas o ligas (color y separación a elección). Las medidas en metros aparecen mientras dibujas y al terminar (lados, diámetro y superficie). Se pueden mover, ajustar desde las esquinas, editar (medidas exactas, material, nombre) y guardar en «Mis espacios» para reutilizarlos. Incluye 12 espacios predefinidos (rondos, posesión, partido reducido, rombo, hexágono, círculo, pasillos, zona de finalización, circuito). Divisiones en tercios, carriles o cuadrícula.
- **Medir**: regla para medir cualquier distancia en la pizarra.
- **Material**: platillos, conos, conos altos, picas/estacas, banderines, aros, escaleras, vallas, minivallas, maniquíes, barreras, rebotadores, porterías, balones, sacos de balones y petos; a escala real, con color y giro.
- **Barra en paneles**: Mover · Objetos ▾ · Dibujo ▾ · Espacio ▾ · Texto · Borrar · Editar ▾. Cada panel se despliega sobre la pizarra y se cierra al elegir.
- **Panel Objetos**: jugadores de cada equipo, porteros, comodines, todo el material y **porterías de 6 tamaños** (pop-up 1,2 m, mini 2×1, sala 3×2, F7 5×2, F9 6×2, F11 7,32×2,44) en un solo lugar, con recientes y color.
- **Cantidad**: coloca 1, 2, 4, 6, 8, 10… (hasta 40) de una vez, en línea, zigzag, cuadrícula o círculo. Toca para ponerlos con la separación elegida o arrastra para repartirlos en una distancia (con medida en vivo). Los jugadores se numeran solos.
- **Selección múltiple**: arrastra sobre una zona vacía para seleccionar varios y moverlos, duplicarlos, girarlos, cambiarles el color, guardarlos como espacio o eliminarlos. Ctrl+A selecciona todo, Ctrl+D duplica.
- **Panel Editar**: deshacer, rehacer, seleccionar todo / jugadores / material, duplicar, girar, eliminar, borrar dibujos del paso, quitar el material, vaciar la pizarra y tamaño de las fichas.
- **Equipos**: nombre y colores de los tres equipos; 11, 9, 8, 7, 6 o 5 jugadores con sus formaciones, o cualquier número de jugadores libres; lista de nombres y números; plantillas guardadas.
- **Dibujo**: carrera, pase, conducción, línea, lápiz, zonas, círculos y **texto** de varias líneas en 4 tamaños, con o sin fondo (doble toque para editarlo).
- **Animación** por pasos, con la posición del paso anterior como guía.
- **Mis tácticas**: búsqueda, categorías, orden por fecha/nombre/categoría y **selección múltiple** para mover de categoría, exportar, duplicar o borrar varias a la vez.
- **Importar**: archivos de esta app, copias de seguridad, **proyectos de TacticalPad (experimental)**, archivos ZIP, videos e imágenes.
- **Biblioteca de ejercicios**: 8.730 ejercicios por sub-etapa, parte de la sesión, contenido y consigna, y 11 jugadas animadas originales.
- **Biblioteca de videos e imágenes**: al subir un video se **convierte automáticamente a MP4** (720p por defecto, configurable en Ajustes) para que se reproduzca en cualquier dispositivo; admite MOV, AVI, MKV, WMV, MTS y más. Categorías con contador, gestión de categorías (crear, renombrar, quitar), etiquetas, búsqueda, miniaturas y duración. Reproductor con cámara lenta, dibujo sobre el video, capturas (se guardan en la biblioteca) y vínculo con una táctica.
- **Exportar**: imagen PNG, video de la animación, archivo .json y copia de seguridad completa.
- **PIN de acceso** opcional.

### Sobre la importación de TacticalPad

TacticalPad no publica el formato de sus proyectos. La app los lee de forma genérica (ZIP, plist de iOS, XML o JSON), detecta fichas, equipos, colores, números y pasos, y los guarda en la categoría «TacticalPad» para que revises las posiciones. Los videos e imágenes exportados desde TacticalPad se importan siempre bien. Si un proyecto no se reconoce, comparte un archivo de ejemplo para ajustar el importador.

### Sobre la conversión de videos

La conversión usa ffmpeg.wasm dentro del navegador: no se sube nada a internet. La primera vez descarga el motor (~30 MB) desde jsDelivr. Para no depender de esa descarga, copia `ffmpeg-core.js` y `ffmpeg-core.wasm` del paquete `@ffmpeg/core@0.12.6` (carpeta `dist/umd`) en `vendor/ffmpeg-core/`. Videos de más de 1,6 GB no se convierten; si ya se pueden reproducir se guardan tal cual.

Todo se guarda **solo en tu dispositivo** (IndexedDB). Nada se envía a ningún servidor. Por eso conviene hacer una **copia de seguridad completa** cada semana y guardarla en tu nube (Drive, iCloud…). Para usar la app en dos dispositivos, haz la copia en uno y restáurala en el otro con «Combinar».
