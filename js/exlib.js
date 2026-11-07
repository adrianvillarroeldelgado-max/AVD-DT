'use strict';
/*
  Biblioteca de ejercicios por SUB-ETAPA, PARTE DE LA SESIÓN, CONTENIDO y CONSIGNA.
  Se genera a partir del catálogo metodológico (method.js). Para cada sub-etapa de comprensión
  del juego (Egocéntrica I y II, Sumativa I y II) hay 10 ejercicios por cada consigna de cada
  contenido que se puede trabajar en ella (los de su sub-etapa y los de las anteriores, que se
  consolidan con más contexto), repartidos entre Activación, Principal 1, 2 y 3 con estrategias,
  formatos, número de jugadores y espacios adaptados a la sub-etapa, más 10 propuestas de
  Información y 10 de Vuelta a la calma y reflexión por sub-etapa.
  Cada ejercicio trae ficha completa (9 pasos) y diagrama animado; se puede usar en la pizarra,
  añadir a una sesión o descargar en PDF.
*/

/* ---------- utilidades ---------- */
function exHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function exRng(seed) { let s = seed || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
const exShort = (t, n = 70) => t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : t;
const exLow = t => t ? t.charAt(0).toLowerCase() + t.slice(1) : '';
const EX_N = { EGO1: 2, EGO2: 3, SUMA1: 4, SUMA2: 5 };
const EX_DEF_RE = /(marcaje|presi[oó]n|cobertura|intercep|entrada|repliegue|vigilancia|temporiz|basculaci|permuta|ayuda|anticipa|defens|carga|rechace|recuperaci)/i;

/* Perfil de cada sub-etapa: cómo se adaptan los ejercicios */
const EX_STAGE = {
  EGO1: { next: 'Hacia Egocéntrica II: añadir un compañero de apoyo y dar punto extra al pase que supera a un defensor.', focus: 'el jugador y el balón', adapt: 'Mucho contacto con el balón, duelos 1 contra 1 y 2 contra 1, espacios amplios, pocas reglas y superioridad atacante. Feedback individual, breve y en positivo.', q: '¿Qué has hecho con el balón para conseguirlo?', gDown: 'Más espacio y un defensor menos.', gUp: 'Reducir el tiempo para finalizar la acción.' },
  EGO2: { next: 'Hacia Sumativa I: dividir el espacio en zonas y obligar a ocupar una zona distinta a la del compañero.', focus: 'el compañero más cercano', adapt: 'Situaciones 2 contra 1, 3 contra 2 y 3 contra 3: reglas que obliguen a cooperar con el compañero más cercano (apoyo, pase y ayuda).', q: '¿Cómo te ha ayudado tu compañero y cómo le has ayudado tú?', gDown: 'Comodín que juega con el equipo en posesión.', gUp: 'Igualdad numérica y menos toques.' },
  SUMA1: { next: 'Hacia Sumativa II: añadir transición tras pérdida o recuperación y cambiar los roles a mitad de la tarea.', focus: 'el juego en zonas y por líneas', adapt: 'Situaciones 4 contra 4 a 6 contra 6 con zonas, comodines y superioridades: distribución racional del espacio y puntuación ligada a la consigna colectiva.', q: '¿Desde qué zona has ayudado más al equipo y por qué?', gDown: 'Zonas más grandes y un comodín.', gUp: 'Quitar comodines y limitar jugadores por zona.' },
  SUMA2: { next: 'Máximo nivel: aplicar la consigna en partido con el sistema del próximo rival y con marcador condicionado.', focus: 'el juego colectivo completo', adapt: 'Situaciones 6 contra 6 a 9 contra 9 con transiciones, cambios de rol y de formación: reestructuración del equipo según la fase del juego.', q: '¿Qué ha tenido que reajustar el equipo cuando ha cambiado la fase del juego?', gDown: 'Comodín de transición.', gUp: 'Cambio de sistema del rival a mitad de la tarea.' },
};
const exStageOk = (c, st) => !c.stage || STAGE_IDX[c.stage] <= STAGE_IDX[st];
/* Reparto de los 10 ejercicios de cada consigna: [fase, estrategia, variante] */
const EX_PLAN_STAGE = {
  EGO1: [['act', 'analitico', 0], ['act', 'coordinativo', 2], ['p1', 'duelos', 0], ['p1', 'duelos', 1], ['p1', 'rondo', 0], ['p1', 'posesion', 1], ['p2', 'invasion', 0], ['p2', 'invasion', 2], ['p3', 'real', 2], ['p3', 'real', 0]],
  EGO2: [['act', 'analitico', 0], ['p1', 'rondo', 0], ['p1', 'duelos', 1], ['p1', 'duelos', 2], ['p1', 'posesion', 0], ['p2', 'invasion', 0], ['p2', 'posicion', 2], ['p2', 'invasion', 1], ['p3', 'real', 0], ['p3', 'real', 2]],
  SUMA2: [['act', 'analitico', 2], ['p1', 'rondo', 2], ['p1', 'posesion', 3], ['p1', 'rondo', 1], ['p1', 'posesion', 0], ['p2', 'posicion', 0], ['p2', 'posicion', 1], ['p2', 'invasion', 1], ['p3', 'real', 0], ['p3', 'real', 1]],
};
const EX_PLAN = {
  comp: [['act', 'circuito', 0], ['act', 'circuito', 1], ['act', 'coordinativo', 0], ['act', 'coordinativo', 1], ['act', 'analitico', 0], ['act', 'analitico', 1], ['p1', 'rondo', 0], ['p1', 'posesion', 0], ['p2', 'posicion', 0], ['p3', 'real', 0]],
  basic: [['act', 'analitico', 0], ['p1', 'rondo', 0], ['p1', 'duelos', 0], ['p1', 'posesion', 0], ['p1', 'duelos', 1], ['p2', 'posicion', 0], ['p2', 'invasion', 0], ['p2', 'invasion', 1], ['p3', 'real', 0], ['p3', 'real', 1]],
};

/* Cómo se incorpora la consigna según el tipo de contenido */
const EX_FOCUS = {
  fbi_con: x => x.def ? `El defensor aplica la consigna «${x.k}» en cada duelo con el poseedor.` : `El jugador con balón aplica la consigna «${x.k}» antes de pasar, conducir o finalizar.`,
  fbi_sin: x => x.def ? `Los defensores sin balón aplican la consigna «${x.k}» para recuperar o cerrar líneas de pase.` : `Los jugadores sin balón aplican la consigna «${x.k}» para ofrecer y recibir con ventaja.`,
  fbc: x => `La acción colectiva de 2 o 3 jugadores debe cumplir la consigna «${x.k}».`,
  percep: x => `Antes de cada acción hay que mirar: «${x.k}» (${x.level.toLowerCase()}).`,
  espacio: x => `Ocupación del espacio según la consigna «${x.k}».`,
  hmb: x => `Ejecución coordinativa con ambos perfiles: «${x.k}».`,
};
const exBonus = x => x.def ? `+1 punto a los defensores cada vez que recuperan aplicando la consigna` : `+1 punto extra cada vez que la acción cumple la consigna`;
const exQuestions = x => [
  `¿Qué has mirado o tenido en cuenta para «${exShort(exLow(x.k), 60)}»?`,
  `¿En qué momento del juego te ha servido más? ¿Por qué?`,
  x.def ? '¿Qué pasa con el atacante si no lo haces a tiempo?' : '¿Qué ventaja consigue el equipo cuando lo haces bien?',
].join('\n');

/* ---------- Plantillas por estrategia didáctica ---------- */
/* Cada plantilla recibe el contexto x y devuelve los datos del ejercicio.
   lay: tipo de diagrama · sp: [largo, ancho] del espacio · A/B/C: atacantes, defensores, comodines */
const EX_T = {
  circuito: [
    x => ({ name: 'Circuito de estaciones', lay: 'circuit', sp: [30, 20], A: 8, players: '8-12 jugadores en grupos de 3-4', dur: 12, series: 3, work: '45 s por estación', rest: '15 s cambio', int: 'media',
      desc: `Cuatro estaciones: escalera de coordinación, minivallas, slalom entre picas y pase o finalización a miniportería. ${EX_FOCUS[x.cat](x)} En la última estación se incorpora un estímulo del entrenador.`,
      rules: 'Rotación en sentido horario al oír la señal.\nTrabajo con ambos perfiles.\nCalidad antes que velocidad.', scoreType: 'otro', scoring: 'Cada grupo suma 1 punto por ejecución correcta en la última estación',
      gDown: 'Quitar la estación de finalización; más tiempo por estación.', gUp: 'Añadir un estímulo visual (color de cono) para decidir la salida.', mat: ['ladder', 'minihurdle', 'pole', 'goal'] }),
    x => ({ name: 'Circuito en Y con pase y desmarque', lay: 'circuitY', sp: [25, 16], A: 6, players: '6-10 jugadores en 3 filas', dur: 12, series: 2, work: '4 min', rest: '1 min', int: 'media',
      desc: `Conos en forma de Y. El jugador conduce hasta el vértice, pasa al compañero que se desmarca hacia el lado libre y ocupa su fila. ${EX_FOCUS[x.cat](x)}`,
      rules: 'Pase con el pie alejado del cono.\nEl receptor decide el lado según la señal del entrenador.', scoreType: 'otro', scoring: 'Cuenta de pases correctos por minuto',
      gDown: 'Sin señal: siempre al mismo lado.', gUp: 'Señal tardía; añadir un defensor pasivo en el vértice.', mat: ['cone', 'disc'] }),
    x => ({ name: 'Circuito de reacción por colores', lay: 'colors', sp: [20, 20], A: 8, players: '8-12 jugadores, cada uno con balón', dur: 10, series: 3, work: '2 min', rest: '45 s', int: 'media',
      desc: `Platillos de cuatro colores repartidos por el espacio. Los jugadores conducen libremente y, al color que dice el entrenador, llegan a ese platillo y vuelven. ${EX_FOCUS[x.cat](x)}`,
      rules: 'No tocar platillos ni compañeros.\nEl último en llegar hace un reto técnico.', scoreType: 'otro', scoring: 'Punto para los 3 primeros en llegar',
      gDown: 'Sin balón.', gUp: 'Dos colores encadenados; señal visual en lugar de verbal.', mat: ['disc'] }),
    x => ({ name: 'Circuito con aros, conducción y pase', lay: 'circuit2', sp: [28, 14], A: 6, players: '6-10 jugadores en 2 filas', dur: 12, series: 3, work: '3 min', rest: '1 min', int: 'media',
      desc: `Apoyos en los aros, conducción en slalom y pase a la fila contraria. ${EX_FOCUS[x.cat](x)}`,
      rules: 'Apoyos con un solo pie en cada aro.\nPase raso al pie del compañero.', scoreType: 'otro', scoring: 'Fila que completa más ciclos en el tiempo',
      gDown: 'Más distancia entre picas.', gUp: 'Pase de primera tras el slalom.', mat: ['hoop', 'pole'] }),
  ],
  coordinativo: [
    x => ({ name: 'Juego de los colores', lay: 'scatter', sp: [20, 20], A: 10, players: '10-14 jugadores con balón', dur: 10, series: 2, work: '3 min', rest: '1 min', int: 'media',
      desc: `Todos conducen dentro del espacio. El entrenador levanta un peto de color y los jugadores reaccionan (cambio de dirección, parada, giro). ${EX_FOCUS[x.cat](x)}`,
      rules: 'Cabeza alta en todo momento.\nNo chocar con compañeros.', scoreType: 'otro', scoring: 'Se elimina a quien no reacciona bien; vuelve tras un reto técnico',
      gDown: 'Señal verbal.', gUp: 'Señal visual y doble estímulo (color + número).', mat: ['bib'] }),
    x => ({ name: 'Pases en movimiento con señal', lay: 'pairs', sp: [25, 20], A: 8, players: '8-12 jugadores por parejas', dur: 10, series: 2, work: '3 min', rest: '1 min', int: 'media',
      desc: `Por parejas, pases en movimiento por todo el espacio. A la señal, cambio de pareja o de ritmo. ${EX_FOCUS[x.cat](x)}`,
      rules: 'Máximo dos toques.\nPasar solo si el compañero está orientado.', scoreType: 'otro', scoring: 'Pareja con más pases en 1 minuto',
      gDown: 'Toques libres.', gUp: 'Un toque; dos balones por cada trío.', mat: ['ball'] }),
    x => ({ name: 'Pañuelo con balón', lay: 'handkerchief', sp: [24, 16], A: 5, B: 5, players: '2 equipos de 5-7', dur: 10, series: 3, work: '3 min', rest: '1 min', int: 'alta',
      desc: `Cada jugador tiene un número. Al decirlo el entrenador, salen los dos jugadores con ese número a por el balón central y tratan de llevarlo a su línea. ${EX_FOCUS[x.cat](x)}`,
      rules: 'Solo se puede robar dentro del espacio.\nSi sale del espacio, punto para el rival.', scoreType: 'otro', scoring: '1 punto por llevar el balón a la línea propia',
      gDown: 'Llamar a un solo jugador por equipo con ventaja de salida.', gUp: 'Llamar a dos números: 2 contra 2.', mat: ['disc', 'ball'] }),
    x => ({ name: 'Cuadrado de transiciones', lay: 'corners', sp: [20, 20], A: 8, players: '8-12 jugadores en 4 esquinas', dur: 10, series: 2, work: '3 min', rest: '1 min', int: 'media',
      desc: `Grupos en las cuatro esquinas. El primero conduce hacia la esquina siguiente y entrega; el que recibe sale en la otra dirección. ${EX_FOCUS[x.cat](x)}`,
      rules: 'Cambiar el sentido a la señal.\nEntrega con el pie más alejado del cono.', scoreType: 'otro', scoring: 'Ciclos completos sin error',
      gDown: 'Sin cambio de sentido.', gUp: 'Dos balones a la vez en esquinas opuestas.', mat: ['cone', 'ball'] }),
  ],
  analitico: [
    x => ({ name: 'Ejercicio analítico por parejas', lay: 'lines2', sp: [15, 12], A: 8, players: 'Parejas', dur: 8, series: 2, work: '3 min', rest: '45 s', int: 'baja',
      desc: `Dos conos a 10 m. Ejecución repetida del gesto con el compañero, alternando perfiles. ${EX_FOCUS[x.cat](x)}`,
      rules: 'Cambiar de rol cada 10 repeticiones.\nCorregir el gesto entre series.', scoreType: 'otro', scoring: 'Repeticiones correctas',
      gDown: 'Balón en la mano / pase controlado.', gUp: 'Menos tiempo; oposición pasiva.', mat: ['cone', 'ball'] }),
    x => ({ name: 'Tríos en línea', lay: 'lines3', sp: [20, 12], A: 9, players: 'Tríos', dur: 8, series: 2, work: '3 min', rest: '45 s', int: 'baja',
      desc: `Tres jugadores en línea. El del centro recibe, aplica el gesto y entrega al lado contrario. ${EX_FOCUS[x.cat](x)}`,
      rules: 'Cambiar al jugador central cada minuto.\nPerfilarse antes de recibir.', scoreType: 'otro', scoring: 'Entregas correctas en 1 minuto',
      gDown: 'Más distancia y control libre.', gUp: 'Oposición pasiva detrás del central.', mat: ['disc', 'ball'] }),
    x => ({ name: 'Rueda de pases en rombo', lay: 'diamond', sp: [18, 18], A: 8, players: '8-10 jugadores', dur: 10, series: 2, work: '4 min', rest: '1 min', int: 'media',
      desc: `Rombo de conos. Pase y seguir al cono siguiente; cada cambio de sentido introduce una variante del gesto. ${EX_FOCUS[x.cat](x)}`,
      rules: 'Pase y sigo.\nDos toques como máximo.', scoreType: 'otro', scoring: 'Vueltas completas sin error',
      gDown: 'Toques libres.', gUp: 'Dos balones; pared en el cono central.', mat: ['cone', 'ball'] }),
    x => ({ name: '1 contra 1 con oposición pasiva', lay: 'passive', sp: [15, 10], A: 6, B: 6, players: 'Parejas', dur: 8, series: 3, work: '2 min', rest: '45 s', int: 'media',
      desc: `El defensor actúa de forma pasiva y luego semiactiva. ${EX_FOCUS[x.cat](x)}`,
      rules: 'Oposición pasiva → semiactiva → activa en cada serie.', scoreType: 'otro', scoring: 'Superar la línea del defensor aplicando la consigna',
      gDown: 'Defensor quieto.', gUp: 'Oposición activa desde el principio.', mat: ['disc', 'ball'] }),
  ],
  rondo: [
    x => ({ name: `Rondo ${x.n + 2} contra 2`, lay: 'ring', sp: [10 + x.n * 2, 10 + x.n * 2], A: x.n + 2, B: 2, players: `${x.n + 2} contra 2`, dur: 12, series: 3, work: '3 min', rest: '1 min', int: 'media',
      desc: `Los atacantes mantienen el balón en el cuadrado; los defensores intentan recuperarlo. ${EX_FOCUS[x.cat](x)}`,
      rules: 'Máximo dos toques.\nQuien pierde el balón pasa a defender con el compañero que lleva más tiempo dentro.', scoreType: 'otro', scoring: `10 pases seguidos = 1 punto. ${exBonus(x)}`,
      gDown: 'Toques libres o un solo defensor.', gUp: 'Un toque; reducir el espacio.' }),
    x => ({ name: 'Rondo con comodín central', lay: 'ring', center: true, sp: [12 + x.n * 2, 12 + x.n * 2], A: x.n + 1, B: 2, C: 1, players: `${x.n + 1} + 1 comodín contra 2`, dur: 12, series: 3, work: '3 min', rest: '1 min', int: 'media',
      desc: `Rondo con un comodín dentro que juega con los poseedores. ${EX_FOCUS[x.cat](x)}`,
      rules: 'El comodín juega a un toque.\nPase entre líneas al comodín = punto.', scoreType: 'otro', scoring: `Pase al comodín y salida = 1 punto. ${exBonus(x)}`,
      gDown: 'Comodín con toques libres.', gUp: 'Comodín a un toque y defensores que pueden presionarle.' }),
    x => ({ name: 'Rondo de transición en dos cuadrados', lay: 'tworings', sp: [30, 14], A: x.n + 2, B: x.n + 2, players: `Dos rondos ${x.n + 2} contra 2 conectados`, dur: 14, series: 3, work: '4 min', rest: '1 min', int: 'alta',
      desc: `Dos cuadrados juntos. Al recuperar, el balón se juega al otro cuadrado y los papeles cambian. ${EX_FOCUS[x.cat](x)}`,
      rules: 'Tras robar hay 5 segundos para cambiar el balón de cuadrado.', scoreType: 'otro', scoring: `8 pases = 1 punto; cambio de cuadrado tras robo = 1 punto. ${exBonus(x)}`,
      gDown: 'Más tiempo para la transición.', gUp: 'Cuadrados más pequeños; 3 segundos.' }),
    x => ({ name: 'Rondo en rombo con cambio de orientación', lay: 'ring', diamond: true, sp: [14 + x.n, 14 + x.n], A: 4 + Math.min(2, x.n - 1), B: 2, players: `${4 + Math.min(2, x.n - 1)} contra 2`, dur: 12, series: 3, work: '3 min', rest: '1 min', int: 'media',
      desc: `Disposición en rombo. Un pase de un vértice al opuesto vale doble. ${EX_FOCUS[x.cat](x)}`,
      rules: 'Dos toques.\nLos vértices se mueven por su lado.', scoreType: 'otro', scoring: `Pase al vértice opuesto = 2 puntos. ${exBonus(x)}`,
      gDown: 'Rombo más grande.', gUp: 'Un toque en el pase al vértice opuesto.' }),
  ],
  duelos: [
    x => ({ name: '1 contra 1 a miniporterías', lay: 'duel', sp: [20, 15], A: 1, B: 1, lanes: 3, players: 'Parejas en 3 pasillos', dur: 10, series: 4, work: '1 min por pareja', rest: '1 min', int: 'alta',
      desc: `En cada pasillo, 1 contra 1 con miniporterías a cada lado. ${EX_FOCUS[x.cat](x)}`,
      rules: 'El atacante sale conduciendo desde su línea.\nSi el defensor roba, puede marcar en la miniportería contraria.', scoreType: 'otro', scoring: `Gol en miniportería = 1 punto. ${exBonus(x)}`,
      gDown: 'Defensor sale con retraso.', gUp: 'Pasillos más estrechos; tiempo límite de 6 s.', mat: ['goal'] }),
    x => ({ name: '2 contra 1 en pasillo', lay: 'duel', sp: [24, 14], A: 2, B: 1, lanes: 2, players: '2 contra 1 en 2 pasillos', dur: 10, series: 4, work: '1 min por grupo', rest: '1 min', int: 'alta',
      desc: `Superioridad 2 contra 1 para superar la línea defensiva conduciendo. ${EX_FOCUS[x.cat](x)}`,
      rules: 'Hay que cruzar la línea final con el balón controlado.\nRotación de roles en cada acción.', scoreType: 'otro', scoring: `Cruzar la línea controlando = 1 punto. ${exBonus(x)}`,
      gDown: 'Defensor solo en su zona.', gUp: 'Defensor que puede recibir ayuda de un segundo que entra a los 3 s.' }),
    x => ({ name: '1 contra 1 con apoyo', lay: 'duel', sp: [22, 15], A: 1, B: 1, C: 1, lanes: 2, players: '1 contra 1 + comodín de apoyo', dur: 10, series: 4, work: '1 min', rest: '1 min', int: 'alta',
      desc: `Duelo con un comodín exterior que ofrece apoyo al poseedor. ${EX_FOCUS[x.cat](x)}`,
      rules: 'El comodín juega a un toque y no puede entrar.\nPunto solo si se aplica la consigna.', scoreType: 'otro', scoring: `Superar la línea o marcar = 1 punto. ${exBonus(x)}`,
      gDown: 'Comodín con dos toques.', gUp: 'Sin comodín tras el primer pase.', mat: ['goal'] }),
    x => ({ name: 'Duelos por oleadas de colores', lay: 'duel', sp: [26, 18], A: 2, B: 2, lanes: 1, players: '1 contra 1 que pasa a 2 contra 2', dur: 12, series: 3, work: '4 min', rest: '1 min', int: 'alta',
      desc: `Empieza un 1 contra 1; a los 4 s entra un jugador de cada equipo. ${EX_FOCUS[x.cat](x)}`,
      rules: 'El segundo jugador entra a la señal.\nCada acción dura como máximo 10 s.', scoreType: 'otro', scoring: `Gol = 1 punto; gol con la consigna = 2. ${exBonus(x)}`,
      gDown: 'Entrada del segundo solo del equipo atacante.', gUp: 'Entrada simultánea y espacio más reducido.', mat: ['goal'] }),
  ],
  posesion: [
    x => ({ name: `Posesión ${x.n + 1} contra ${x.n + 1} + 2 comodines`, lay: 'possession', sp: [16 + x.n * 4, 14 + x.n * 3], A: x.n + 1, B: x.n + 1, C: 2, players: `${x.n + 1} contra ${x.n + 1} + 2 comodines`, dur: 14, series: 3, work: '4 min', rest: '1 min', int: 'alta',
      desc: `Los comodines juegan con el equipo en posesión. ${EX_FOCUS[x.cat](x)}`,
      rules: 'Comodines a dos toques.\nNo se puede devolver al jugador que pasó.', scoreType: 'pasar', scoring: `Pasar el balón por la puerta central de conos = 1 punto. ${exBonus(x)}`,
      gDown: 'Más espacio; comodines con toques libres.', gUp: 'Menos espacio; un toque para los comodines.' }),
    x => ({ name: 'Posesión con zonas de llegada', lay: 'possession', endzones: true, sp: [20 + x.n * 4, 16 + x.n * 3], A: x.n + 1, B: x.n + 1, players: `${x.n + 1} contra ${x.n + 1}`, dur: 14, series: 3, work: '4 min', rest: '1 min', int: 'alta',
      desc: `Hay que llevar el balón controlado a la zona final rival. ${EX_FOCUS[x.cat](x)}`,
      rules: 'Llegar conduciendo o recibiendo dentro de la zona.\nTras llegar, se ataca la zona contraria.', scoreType: 'llegar', scoring: `Llegar a la zona = 1 punto. ${exBonus(x)}`,
      gDown: 'Zonas más anchas.', gUp: 'Solo vale recibir dentro de la zona (no conducir).' }),
    x => ({ name: 'Posesión con porterías de pase', lay: 'possession', gates: true, sp: [22 + x.n * 3, 18 + x.n * 2], A: x.n + 1, B: x.n + 1, players: `${x.n + 1} contra ${x.n + 1}`, dur: 14, series: 3, work: '4 min', rest: '1 min', int: 'alta',
      desc: `Puertas de conos repartidas por el espacio. ${EX_FOCUS[x.cat](x)}`,
      rules: 'No se puede pasar dos veces seguidas por la misma puerta.', scoreType: 'pasar', scoring: `Pase a un compañero a través de una puerta = 1 punto. ${exBonus(x)}`,
      gDown: 'Más puertas y más anchas.', gUp: 'Menos puertas; recibir orientado obligatoriamente.', mat: ['cone'] }),
    x => ({ name: 'Posesión con tres equipos', lay: 'possession', three: true, sp: [20 + x.n * 3, 18 + x.n * 2], A: x.n + 1, B: x.n + 1, C: x.n + 1, players: `3 equipos de ${x.n + 1}: dos atacan, uno defiende`, dur: 15, series: 3, work: '5 min', rest: '1 min', int: 'alta',
      desc: `Dos equipos mantienen el balón contra el tercero. Quien pierde el balón pasa a defender. ${EX_FOCUS[x.cat](x)}`,
      rules: 'Dos toques.\nEl equipo que pierde defiende.', scoreType: 'otro', scoring: `10 pases seguidos = 1 punto. ${exBonus(x)}`,
      gDown: 'Toques libres.', gUp: 'Espacio más reducido.' }),
  ],
  posicion: [
    x => ({ name: `Juego de posición ${x.n + 2} contra ${x.n + 2} + 3`, lay: 'positional', sp: [30 + x.n * 4, 24 + x.n * 3], A: x.n + 2, B: x.n + 2, C: 3, players: `${x.n + 2} contra ${x.n + 2} + 3 comodines`, dur: 15, series: 3, work: '4 min', rest: '1 min', int: 'alta',
      desc: `Espacio dividido en carriles. Cada jugador ocupa una zona y la abandona solo para crear superioridad. ${EX_FOCUS[x.cat](x)}`,
      rules: 'Máximo dos jugadores por zona.\nComodines a dos toques.', scoreType: 'otro', scoring: `Pase al comodín del extremo opuesto = 1 punto. ${exBonus(x)}`,
      gDown: 'Libertad de zonas.', gUp: 'Un toque para los comodines; menos espacio.' }),
    x => ({ name: 'Juego de posición por tercios', lay: 'thirds', sp: [36 + x.n * 3, 26 + x.n * 2], A: x.n + 3, B: x.n + 2, players: `${x.n + 3} contra ${x.n + 2}`, dur: 15, series: 3, work: '4 min', rest: '1 min', int: 'alta',
      desc: `El campo se divide en tres zonas. Para pasar a la zona siguiente hay que superar una línea de presión. ${EX_FOCUS[x.cat](x)}`,
      rules: 'Cada zona tiene un número fijo de defensores.\nNo se pueden saltar zonas.', scoreType: 'otro', scoring: `Progresar de zona = 1 punto; llegar al último tercio = 3. ${exBonus(x)}`,
      gDown: 'Un defensor menos en la primera zona.', gUp: 'Permitir que un defensor cambie de zona.' }),
    x => ({ name: 'Juego de posición con comodines exteriores', lay: 'positional', outside: true, sp: [28 + x.n * 3, 22 + x.n * 3], A: x.n + 1, B: x.n + 1, C: 4, players: `${x.n + 1} contra ${x.n + 1} + 4 comodines exteriores`, dur: 15, series: 3, work: '4 min', rest: '1 min', int: 'alta',
      desc: `Cuatro comodines en los lados. Se busca circular por fuera y entrar por dentro. ${EX_FOCUS[x.cat](x)}`,
      rules: 'Los comodines no pueden pasarse entre ellos.\nUn toque para los comodines.', scoreType: 'otro', scoring: `Pase de comodín a comodín a través de un interior = 1 punto. ${exBonus(x)}`,
      gDown: 'Comodines con dos toques.', gUp: 'Dos comodines menos.' }),
  ],
  invasion: [
    x => ({ name: 'Oleadas de superioridad a portería', lay: 'waves', sp: [34, 30], A: Math.min(4, x.n + 1), B: Math.max(1, Math.min(3, x.n)), gk: true, players: `${Math.min(4, x.n + 1)} contra ${Math.max(1, Math.min(3, x.n))} + portero`, dur: 15, series: 4, work: '3 min', rest: '1 min 30 s', int: 'alta',
      desc: `Los atacantes salen desde el medio campo y buscan finalizar. ${EX_FOCUS[x.cat](x)}`,
      rules: 'Cada oleada dura como máximo 12 s.\nSi el defensor roba, conduce hasta la línea de salida.', scoreType: 'porteria', scoring: `Gol = 1 punto; gol aplicando la consigna = 2. ${exBonus(x)}`,
      gDown: 'Un defensor menos.', gUp: 'Igualdad numérica a los 5 s.', mat: ['goal11'] }),
    x => ({ name: 'Ataque contra defensa con transición', lay: 'waves', counter: true, sp: [40, 34], A: x.n + 2, B: x.n + 1, gk: true, players: `${x.n + 2} contra ${x.n + 1} + portero`, dur: 16, series: 3, work: '4 min', rest: '1 min 30 s', int: 'alta',
      desc: `Ataque organizado a portería. Si los defensores recuperan, atacan dos miniporterías en la línea de salida. ${EX_FOCUS[x.cat](x)}`,
      rules: 'Fuera de juego desde la línea de tres cuartos.\nTransición defensiva inmediata.', scoreType: 'porteria', scoring: `Gol = 1 punto; gol defensor en miniportería = 1 punto. ${exBonus(x)}`,
      gDown: 'Superioridad +2.', gUp: 'Igualdad numérica.', mat: ['goal11', 'goal'] }),
    x => ({ name: 'Finalización en el último tercio', lay: 'waves', lastThird: true, sp: [30, 36], A: x.n + 1, B: x.n, gk: true, players: `${x.n + 1} contra ${x.n} + portero`, dur: 15, series: 4, work: '3 min', rest: '1 min', int: 'alta',
      desc: `Situaciones en el último tercio: centro, pared o regate para finalizar. ${EX_FOCUS[x.cat](x)}`,
      rules: 'Hay que finalizar en menos de 6 pases.\nEl portero inicia el siguiente ataque si atrapa.', scoreType: 'porteria', scoring: `Gol = 1 punto; gol de cabeza o de primera = 2. ${exBonus(x)}`,
      gDown: 'Atacante libre en banda.', gUp: 'Defensor extra que entra a los 4 s.', mat: ['goal11'] }),
  ],
  real: [
    x => ({ name: `Partido condicionado ${x.n + 3} contra ${x.n + 3}`, lay: 'match', sp: [40 + x.n * 6, 30 + x.n * 4], A: x.n + 3, B: x.n + 3, gk: true, players: `${x.n + 3} contra ${x.n + 3} + porteros`, dur: 18, series: 2, work: '8 min', rest: '2 min', int: 'alta',
      desc: `Partido con las reglas del juego real. ${EX_FOCUS[x.cat](x)}`,
      rules: 'Reglas del juego real.\nEl entrenador congela la jugada para preguntar.', scoreType: 'porteria', scoring: `Gol = 1 punto; gol tras cumplir la consigna = 2. ${exBonus(x)}`,
      gDown: 'Comodín ofensivo.', gUp: 'Limitar toques en el campo propio.', mat: ['goal7'] }),
    x => ({ name: 'Partido con carriles y provocación', lay: 'match', lanes: true, sp: [44 + x.n * 6, 32 + x.n * 4], A: x.n + 3, B: x.n + 3, gk: true, players: `${x.n + 3} contra ${x.n + 3} + porteros`, dur: 18, series: 2, work: '8 min', rest: '2 min', int: 'alta',
      desc: `Carriles laterales libres de oposición. Un gol tras jugar por un carril vale doble. ${EX_FOCUS[x.cat](x)}`,
      rules: 'En el carril solo puede entrar un atacante.\nLos defensores no pueden entrar en el carril.', scoreType: 'porteria', scoring: `Gol = 1; gol tras carril o con la consigna = 2. ${exBonus(x)}`,
      gDown: 'Dos atacantes por carril.', gUp: 'Un defensor puede entrar al carril.', mat: ['goal7'] }),
    x => ({ name: 'Partido a cuatro porterías', lay: 'match', four: true, sp: [40 + x.n * 4, 34 + x.n * 3], A: x.n + 3, B: x.n + 3, players: `${x.n + 3} contra ${x.n + 3}`, dur: 16, series: 2, work: '7 min', rest: '2 min', int: 'alta',
      desc: `Cada equipo ataca dos miniporterías y defiende otras dos. Obliga a cambiar el juego de orientación. ${EX_FOCUS[x.cat](x)}`,
      rules: 'Gol solo desde la mitad rival.\nSin porteros.', scoreType: 'porteria', scoring: `Gol = 1; gol tras cambio de orientación = 2. ${exBonus(x)}`,
      gDown: 'Porterías más grandes.', gUp: 'Gol solo de primera.', mat: ['goal'] }),
  ],
};

/* Información (inicio de la sesión) y Vuelta a la calma y reflexión: 10 propuestas cada una */
const EX_INFO = [
  ['Charla con la pizarra', 'El entrenador presenta el contenido y la consigna del día en la pizarra táctica, con una imagen del objetivo.'],
  ['Video corto de partido', 'Se proyecta una acción de partido (30-60 s) en la que se ve la consigna aplicada.'],
  ['Demostración del entrenador', 'El entrenador ejecuta el gesto o la situación con dos jugadores para que todos la vean.'],
  ['Pregunta reto', 'Se lanza una pregunta abierta sobre la consigna y los jugadores la responderán al final de la sesión.'],
  ['Jugador demostrador', 'Un jugador que domina la consigna la muestra al grupo y explica qué mira.'],
  ['Imagen congelada', 'Foto o dibujo de una situación de juego: los jugadores dicen qué harían.'],
  ['Tarjeta del objetivo', 'Cada jugador recibe una tarjeta con la consigna en una frase y la lleva durante la sesión.'],
  ['Recuerdo de la sesión anterior', 'Breve repaso de lo trabajado y conexión con la consigna de hoy.'],
  ['Mini-situación explicativa', 'Situación de 2 contra 1 a ritmo lento para explicar el porqué de la consigna.'],
  ['Compromiso de equipo', 'El grupo acuerda una palabra clave para recordar la consigna durante las tareas.'],
];
const EX_CALM = [
  ['Rueda de preguntas', 'En círculo, el entrenador pregunta sobre la consigna y cada jugador responde con un ejemplo de la sesión.'],
  ['Estiramientos guiados y preguntas', 'Estiramientos suaves mientras se comentan las situaciones en las que se aplicó la consigna.'],
  ['Valoración del esfuerzo (RPE)', 'Cada jugador indica de 1 a 10 cuánto le ha costado la sesión; se registra la carga.'],
  ['Semáforo de autoevaluación', 'Verde, amarillo o rojo: ¿cuánto he aplicado la consigna hoy? Se explica el porqué.'],
  ['Rondo suave de reflexión', 'Rondo a ritmo bajo; al recuperar, el defensor dice algo que ha aprendido.'],
  ['Dibuja la consigna', 'Por parejas, dibujan en la pizarra una situación en la que se aplica la consigna.'],
  ['El experto explica', 'El jugador que mejor lo ha hecho explica qué miraba y qué decidía.'],
  ['Pases suaves por parejas', 'Pases a ritmo bajo mientras cada pareja comenta un acierto y un error.'],
  ['Respiración y feedback colectivo', 'Respiración guiada y feedback del entrenador: un acierto del grupo y un reto.'],
  ['Compromiso para el próximo día', 'Cada jugador dice qué mejorará en el siguiente entrenamiento.'],
];

/* ---------- Índice de la biblioteca ---------- */
let EX_INDEX = null;
const exIsBasic = c => ['fbi_con', 'fbi_sin', 'fbc'].includes(c.cat);
const exPlanFor = (c, st) => exIsBasic(c) ? (EX_PLAN_STAGE[st] || EX_PLAN.basic) : EX_PLAN.comp;
function exIndex() {
  if (EX_INDEX) return EX_INDEX;
  const L = [];
  for (const [st] of STAGES) {
    for (const c of CONTENTS) {
      if (!exStageOk(c, st)) continue;
      const plan = exPlanFor(c, st);
      consignasOf(c.id).forEach((k, ci) => plan.forEach(([ph, sg], slot) => L.push({ id: `${st}|${c.id}|${ci}|${slot}`, phase: ph, strategy: sg, content: c.id, ci, cat: c.cat, stage: st, own: c.stage === st || !c.stage })));
    }
    EX_INFO.forEach((_, j) => L.push({ id: `info|${j}|${st}`, phase: 'info', strategy: '', content: '', cat: '', stage: st }));
    EX_CALM.forEach((_, j) => L.push({ id: `vuelta|${j}|${st}`, phase: 'vuelta', strategy: '', content: '', cat: '', stage: st }));
  }
  EX_INDEX = L; return L;
}
/* Identificadores antiguos (contenido|consigna|n) → sub-etapa propia del contenido */
function exNormId(id) {
  const p = id.split('|');
  if (p.length === 3 && CONTENT[p[0]]) return `${CONTENT[p[0]].stage || 'SUMA1'}|${id}`;
  if (p.length === 2 && (p[0] === 'info' || p[0] === 'vuelta')) return `${id}|SUMA1`;
  return id;
}
const EX_CACHE = new Map();
/* Devuelve el ejercicio completo. ctx opcional (contenido/consigna) para Información y Vuelta a la calma */
function exGet(id, ctx) {
  const key = id + (ctx ? '#' + (ctx.content || '') + '|' + (ctx.consigna || '') : '');
  if (EX_CACHE.has(key)) return EX_CACHE.get(key);
  id = exNormId(id);
  const [a, b, slot, sx] = id.split('|'); let ex;
  if (a === 'user') {
    const p = EX_USER.find(x => x.id === b); if (!p) return null; const t = p.task;
    return { id, user: true, proj: p, phase: t.phase || 'p1', strategy: t.strategy || '', content: t.content || '', consigna: t.consigna || '', stage: t.stage || '', name: p.name, title: p.name,
      dur: +t.duration || 10, players: t.players || '', desc: t.desc || p.notes || '', sp: [0, 0] };
  }
  if (a === 'info' || a === 'vuelta') {
    const [name, d] = (a === 'info' ? EX_INFO : EX_CALM)[+b], c = ctx && CONTENT[ctx.content], k = ctx && ctx.consigna, stg = slot || (c && c.stage) || '';
    const sp = EX_STAGE[stg];
    ex = { id, phase: a, strategy: '', name, title: name, content: c ? c.id : '', consigna: k || '', stage: stg, variants: sp ? `Sub-etapa ${STAGE[stg]}: centrar la explicación en ${sp.focus}.` : '', lay: a === 'info' ? 'talk' : 'calm', sp: [14, 10], A: 10,
      players: 'Todo el grupo', dur: a === 'info' ? 3 : 6, series: 1, work: '', rest: '', int: a === 'info' ? 'baja' : 'baja', style: 'descubrimiento',
      desc: d + (k ? `\nConsigna: «${k}».` : ''), rules: a === 'info' ? 'Explicación breve (menos de 3 minutos).\nTodos de frente al entrenador, sin balón en los pies.' : 'Ritmo bajo y voz tranquila.\nTodos participan al menos una vez.',
      scoreType: '', scoring: '', gDown: '', gUp: '', feedback: (k ? exQuestions({ k, def: EX_DEF_RE.test(k) }) : '¿Qué hemos aprendido hoy?\n¿Dónde lo podemos aplicar en el partido?') + (sp && a === 'vuelta' ? '\n' + sp.q : '') };
  } else {
    const stg = a, c = CONTENT[b], cons = consignasOf(b), ci = +slot, k = cons[ci]; if (!c || !k || !EX_STAGE[stg]) return null;
    const plan = exPlanFor(c, stg), pe = plan[+sx]; if (!pe) return null; const [ph, st, v] = pe;
    const T = EX_T[st], sp = EX_STAGE[stg], x = { c, k: k.t, level: k.level, ci, cat: c.cat, stage: stg, n: EX_N[stg] || 3, def: k.level === 'Defensor' || /^en defensa/i.test(k.t) || EX_DEF_RE.test(c.name) };
    const base = T[(v + ci) % T.length](x);
    const prior = c.stage && c.stage !== stg ? `Contenido de ${STAGE[c.stage]} que se consolida en ${STAGE[stg]}: más contexto de juego y más decisiones. ` : '';
    ex = { ...base, id, phase: ph, strategy: st, content: c.id, consigna: k.t, level: k.level, stage: stg, def: x.def,
      desc: base.desc + `\nSub-etapa ${STAGE[stg]} (${sp.focus}): ${prior}${sp.adapt}`,
      gDown: [base.gDown, sp.gDown].filter(Boolean).join(' '), gUp: [base.gUp, sp.gUp].filter(Boolean).join(' '),
      variants: sp.next,
      title: `${base.name} · ${c.name}`, style: ph === 'act' || stg === 'EGO1' ? 'mando' : stg === 'EGO2' ? 'mixto' : 'descubrimiento', feedback: exQuestions(x) + '\n' + sp.q, seed: exHash(id) };
  }
  ex.variants = ex.variants || '';
  EX_CACHE.set(key, ex); return ex;
}

/* ---------- Diagrama ---------- */
function exLayout(ex) {
  const [w, h] = ex.sp, cx = 52.5, cy = 34, x0 = cx - w / 2, y0 = cy - h / 2, x1 = cx + w / 2, y1 = cy + h / 2;
  const R = exRng(ex.seed || exHash(ex.id)), pl = [], eq = [], add = (t, x, y, gk) => pl.push({ t, x, y, gk: !!gk });
  const E = (type, x, y, rot, c) => eq.push({ type, x, y, rot: rot || 0, c });
  let anim = 'pass', path = null, dirX = 1;
  const jit = (v, a) => v + (R() - .5) * a;
  const nA = ex.A || 0, nB = ex.B || 0, nC = ex.C || 0;
  switch (ex.lay) {
    case 'ring': {
      const n = nA, r = Math.min(w, h) / 2;
      for (let i = 0; i < n; i++) {
        if (ex.diamond) { const a = i / n * Math.PI * 2; add('A', cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
        else { const per = i / n * 4, side = Math.floor(per), f = per - side; const pts = [[x0 + f * w, y0], [x1, y0 + f * h], [x1 - f * w, y1], [x0, y1 - f * h]]; add('A', ...pts[side].map((v, j) => j ? Math.min(y1, Math.max(y0, v)) : Math.min(x1, Math.max(x0, v)))); }
      }
      for (let i = 0; i < nB; i++) add('B', cx + (i ? 2 : -2), cy + (i ? 1.5 : -1));
      if (nC) add('C', cx + .5, cy + 2.5);
      break;
    }
    case 'tworings': {
      const sw = w / 2 - 1, k = Math.max(4, nA - 2);
      [[x0, 'A'], [x0 + w / 2 + 1, 'B']].forEach(([sx, t], j) => {
        for (let i = 0; i < k; i++) { const per = i / k * 4, side = Math.floor(per), f = per - side; const pts = [[sx + f * sw, y0], [sx + sw, y0 + f * h], [sx + sw - f * sw, y1], [sx, y1 - f * h]]; add(j ? 'B' : 'A', ...pts[side]); }
        const ccx = sx + sw / 2; add(j ? 'A' : 'B', ccx - 1.5, cy - 1); add(j ? 'A' : 'B', ccx + 1.5, cy + 1);
      });
      E('cone', cx - 1, y0); E('cone', cx - 1, y1); E('cone', cx + 1, y0); E('cone', cx + 1, y1);
      break;
    }
    case 'possession': case 'positional': case 'thirds': {
      const cols = ex.lay === 'thirds' ? 3 : Math.ceil(Math.sqrt(nA * 1.6));
      const rows = Math.ceil(nA / cols);
      for (let i = 0; i < nA; i++) { const c = i % cols, r = Math.floor(i / cols); add('A', x0 + w * (c + .5) / cols + jit(0, 2), y0 + h * (r + .5) / rows + jit(0, 2)); }
      for (let i = 0; i < nB; i++) { const c = i % cols, r = Math.floor(i / cols); add('B', x0 + w * (c + .5) / cols + w / cols * .3 + jit(0, 1.5), y0 + h * (r + .5) / rows + h / rows * .25 + jit(0, 1.5)); }
      if (ex.three) for (let i = 0; i < nC; i++) add('C', x0 + w * (i + .5) / nC, y0 + h * .82 + jit(0, 1));
      else if (ex.outside || ex.lay === 'positional') { const s = [[x0 - 1.2, cy], [x1 + 1.2, cy], [cx, y0 - 1.2], [cx, y1 + 1.2]]; for (let i = 0; i < nC; i++) add('C', ...s[i % 4]); }
      else for (let i = 0; i < nC; i++) add('C', i ? x1 - 1 : x0 + 1, cy);
      if (ex.gates) for (let i = 0; i < 4; i++) { const gx = x0 + w * (i % 2 ? .7 : .3), gy = y0 + h * (i < 2 ? .3 : .7); E('cone', gx - 1.5, gy, 0, '#ff6d00'); E('cone', gx + 1.5, gy, 0, '#ff6d00'); }
      if (ex.scoreType === 'pasar' && !ex.gates) { E('cone', cx, cy - 1.8, 0, '#ff6d00'); E('cone', cx, cy + 1.8, 0, '#ff6d00'); }
      if (ex.endzones) [x0 + 3, x1 - 3].forEach(x => { E('disc', x, y0, 0, '#ff1744'); E('disc', x, y1, 0, '#ff1744'); });
      if (ex.lay === 'thirds') [x0 + w / 3, x0 + 2 * w / 3].forEach(x => { E('disc', x, y0, 0, '#ffffff'); E('disc', x, y1, 0, '#ffffff'); });
      if (ex.lay === 'positional') [y0 + h / 3, y0 + 2 * h / 3].forEach(y => { E('disc', x0, y, 0, '#ffffff'); E('disc', x1, y, 0, '#ffffff'); });
      break;
    }
    case 'waves': {
      const gx = ex.lastThird ? x1 : x1; E('goal11', gx + .8, cy, Math.PI); add('B', gx - 1, cy, true);
      for (let i = 0; i < nA; i++) add('A', x0 + 3 + jit(0, 2), y0 + h * (i + .5) / nA);
      for (let i = 0; i < nB; i++) add('B', x1 - w * .35, y0 + h * (i + .5) / nB + jit(0, 2));
      if (ex.counter) { E('goal', x0 - .5, y0 + h * .25, 0); E('goal', x0 - .5, y0 + h * .75, 0); }
      if (ex.lastThird) { E('disc', x1 - 16.5, y0, 0, '#ffffff'); E('disc', x1 - 16.5, y1, 0, '#ffffff'); }
      break;
    }
    case 'match': {
      if (ex.four) { [[x0 + .6, y0 + h * .2, 0], [x0 + .6, y0 + h * .8, 0], [x1 - .6, y0 + h * .2, Math.PI], [x1 - .6, y0 + h * .8, Math.PI]].forEach(g => E('goal', ...g)); }
      else { E('goal7', x0 - .7, cy, 0); E('goal7', x1 + .7, cy, Math.PI); add('A', x0 + 1, cy, true); add('B', x1 - 1, cy, true); }
      const f = [[.2, .3], [.2, .7], [.38, .5], [.42, .15], [.42, .85], [.48, .35], [.48, .65], [.3, .5]];
      for (let i = 0; i < nA; i++) { const p = f[i % f.length]; add('A', x0 + w * p[0] + jit(0, 2), y0 + h * p[1] + jit(0, 2)); }
      for (let i = 0; i < nB; i++) { const p = f[i % f.length]; add('B', x1 - w * p[0] + jit(0, 2), y0 + h * p[1] + jit(0, 2)); }
      if (ex.lanes) [y0 + 5, y1 - 5].forEach(y => { E('disc', x0 + w * .25, y, 0, '#ffffff'); E('disc', cx, y, 0, '#ffffff'); E('disc', x1 - w * .25, y, 0, '#ffffff'); });
      break;
    }
    case 'duel': {
      const lanes = ex.lanes || 1, lh = h / lanes;
      for (let l = 0; l < lanes; l++) {
        const ly = y0 + lh * (l + .5);
        if (ex.mat && ex.mat.includes('goal')) { E('goal', x1 + .6, ly, Math.PI); E('goal', x0 - .6, ly, 0); }
        if (l) { E('disc', x0, y0 + lh * l, 0, '#ffffff'); E('disc', cx, y0 + lh * l, 0, '#ffffff'); E('disc', x1, y0 + lh * l, 0, '#ffffff'); }
        for (let i = 0; i < nA; i++) add('A', x0 + 2, ly + (i - (nA - 1) / 2) * Math.min(4, lh * .4));
        for (let i = 0; i < nB; i++) add('B', cx + 3, ly + (i - (nB - 1) / 2) * 3);
        if (nC) add('C', cx, l % 2 ? y1 + 1.2 : y0 - 1.2);
      }
      anim = 'dribble'; break;
    }
    case 'circuit': case 'circuit2': {
      const st = ex.lay === 'circuit' ? 4 : 3, sw = w / st;
      for (let i = 0; i < 6; i++) add('A', x0 + 1.5, y1 - 2 - i * 1.6);
      // estación 1: escalera / aros
      if (ex.lay === 'circuit') E('ladder', x0 + sw * .5, cy, 0, '#ffd600'); else for (let i = 0; i < 5; i++) E('hoop', x0 + sw * .2 + i * 1.6, cy + (i % 2 ? 1 : -1), 0, '#2979ff');
      // estación 2: minivallas
      if (ex.lay === 'circuit') for (let i = 0; i < 4; i++) E('minihurdle', x0 + sw * 1.25 + i * 1.6, cy, Math.PI / 2, '#ffd600');
      // slalom
      const sx = x0 + sw * (ex.lay === 'circuit' ? 2.15 : 1.15); for (let i = 0; i < 5; i++) E('pole', sx + i * sw * .16, cy + (i % 2 ? 1.2 : -1.2), 0, '#ffd600');
      if (ex.lay === 'circuit') E('goal', x1 + .6, cy, Math.PI); else { E('cone', x1 - 1, cy - 4); E('cone', x1 - 1, cy + 4); add('A', x1 - 1, cy + 5.5); }
      path = [[x0 + 1.5, y1 - 2], [x0 + sw * .2, cy], [x0 + sw * .9, cy], [x0 + sw * 1.15, cy - 1.5], [sx + sw * .8, cy - .5], [x1 - 1.5, cy]];
      anim = 'path'; break;
    }
    case 'circuitY': {
      E('cone', x0 + 2, cy); E('cone', cx, cy); E('cone', x1 - 3, y0 + 2); E('cone', x1 - 3, y1 - 2);
      for (let i = 0; i < 3; i++) add('A', x0 + 2 - i * 1.6, cy);
      add('A', x1 - 3, y0 + 2); add('A', x1 - 3, y1 - 2); add('A', x1 - 4.6, y0 + 2);
      path = [[x0 + 2, cy], [cx - 1, cy]]; anim = 'pathpass'; break;
    }
    case 'colors': case 'scatter': case 'pairs': {
      const cols = ['#ffd600', '#ff1744', '#2979ff', '#00c853'];
      if (ex.lay === 'colors') for (let i = 0; i < 12; i++) E('disc', x0 + 1 + R() * (w - 2), y0 + 1 + R() * (h - 2), 0, cols[i % 4]);
      if (ex.lay === 'scatter') { E('bib', x0 - 1.5, y0 + 1, 0, '#76ff03'); E('bib', x0 - 1.5, y0 + 3, 0, '#ff1744'); }
      for (let i = 0; i < nA; i++) add('A', x0 + 1.5 + R() * (w - 3), y0 + 1.5 + R() * (h - 3));
      anim = ex.lay === 'pairs' ? 'pass' : 'dribble'; break;
    }
    case 'handkerchief': {
      for (let i = 0; i < nA; i++) add('A', x0 + w * (i + .5) / nA, y1);
      for (let i = 0; i < nB; i++) add('B', x0 + w * (i + .5) / nB, y0);
      E('disc', cx, cy - 1, 0, '#ffffff'); anim = 'race'; break;
    }
    case 'corners': {
      [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].forEach(([x, y], j) => { E('cone', x, y); for (let i = 0; i < 2; i++) add('A', x + (x < cx ? -1 : 1) * (1 + i * 1.4), y + (y < cy ? -1 : 1) * .6); });
      path = [[x0 - 1, y0 - .6], [x1 - 1, y0 + .5]]; anim = 'path'; break;
    }
    case 'lines2': case 'passive': {
      const pairs = ex.lay === 'passive' ? Math.min(3, nA) : Math.ceil(nA / 2), ph = h / pairs;
      for (let i = 0; i < pairs; i++) {
        const y = y0 + ph * (i + .5); E('cone', x0 + 1, y - 1.5); E('cone', x1 - 1, y - 1.5);
        add('A', x0 + 2, y); if (ex.lay === 'passive') add('B', cx + 2, y); else add('A', x1 - 2, y);
      }
      anim = ex.lay === 'passive' ? 'dribble' : 'pass'; break;
    }
    case 'lines3': {
      const t = Math.ceil(nA / 3), ph = h / t;
      for (let i = 0; i < t; i++) { const y = y0 + ph * (i + .5); add('A', x0 + 2, y); add('A', cx, y); add('A', x1 - 2, y); E('disc', cx - 1.5, y - 1.5); E('disc', cx + 1.5, y - 1.5); }
      break;
    }
    case 'diamond': {
      const pts = [[x0 + 1, cy], [cx, y0 + 1], [x1 - 1, cy], [cx, y1 - 1]];
      pts.forEach(([x, y], i) => { E('cone', x, y); add('A', x + (x < cx ? -1.2 : x > cx ? 1.2 : 0), y + (y < cy ? -1.2 : y > cy ? 1.2 : 0)); add('A', x + (x < cx ? -2.6 : x > cx ? 2.6 : 0), y + (y < cy ? -2.6 : y > cy ? 2.6 : 0)); });
      E('cone', cx, cy, 0, '#ffd600'); break;
    }
    case 'talk': {
      add('C', cx, y0 + 1.5); for (let i = 0; i < nA; i++) { const a = Math.PI * (.15 + .7 * i / (nA - 1)); add('A', cx + Math.cos(a) * 6.5, y0 + 1.5 + Math.sin(a) * 6.5); }
      anim = 'none'; break;
    }
    case 'calm': {
      for (let i = 0; i < nA; i++) { const a = i / nA * Math.PI * 2; add('A', cx + Math.cos(a) * 4, cy + Math.sin(a) * 4); }
      add('C', cx, cy); anim = 'none'; break;
    }
  }
  return { pl, eq, anim, path, box: [x0, y0, x1, y1], dirX };
}

function exProject(ex) {
  if (ex.proj) { const p = normalize(clone(ex.proj)); p.id = uid(); delete p.libUser; p.created = p.updated = Date.now(); return p; }
  const p = normalize(newProject(ex.title, 'f11'));
  const L = exLayout(ex), [x0, y0, x1, y1] = L.box;
  const big = (x1 - x0) * (y1 - y0) > 1400;
  p.field.marks = big ? 'lines' : 'none';
  const zmat = ex.lay === 'talk' || ex.lay === 'calm' ? 'linea' : (big ? 'conos' : 'platillos');
  p.zones = [{ id: uid(), name: 'Espacio de juego', shape: 'rect', pts: [[x0, y0], [x1, y1]], material: zmat, color: ZONE_DEFAULT_COLOR[zmat], spacing: big ? 8 : 4, dims: true, dim: true, main: true }];
  p.pitch = 'zone';
  p.cat = ex.phase === 'info' || ex.phase === 'vuelta' ? PHASE[ex.phase][1] : (STRATEGIES[ex.strategy] || 'Biblioteca');
  p.notes = ex.desc;
  const pos = {}, num = { A: 0, B: 0, C: 0 }, ids = { A: [], B: [], C: [] }, hasGK = { A: L.pl.some(q => q.t === 'A' && q.gk), B: L.pl.some(q => q.t === 'B' && q.gk) };
  L.pl.forEach(q => {
    const o = { id: uid(), type: 'player', team: q.t, gk: q.gk, num: q.gk ? 1 : ++num[q.t] + (hasGK[q.t] ? 1 : 0), name: '' };
    if (ex.lay === 'talk' && q.t === 'C') o.name = 'Entrenador';
    p.objs.push(o); pos[o.id] = [q.x, q.y]; if (!q.gk) ids[q.t].push(o.id);
  });
  L.eq.forEach(e => { const o = { id: uid(), type: e.type, rot: e.rot || 0 }; if (e.c) o.c = e.c; p.objs.push(o); pos[o.id] = [e.x, e.y]; });
  // balón y animación
  const A = ids.A, B = ids.B, mkd = (t, a, b) => ({ t, pts: [a.slice(), b.slice()], c: DRAW_DEFAULT_COLOR[t] });
  const clampP = ([x, y]) => [Math.min(x1 - .8, Math.max(x0 + .8, x)), Math.min(y1 - .8, Math.max(y0 + .8, y))];
  const frames = [];
  if (L.anim !== 'none' && A.length) {
    const ball = { id: uid(), type: 'ball' }; p.objs.push(ball);
    const h0 = pos[A[0]]; pos[ball.id] = [h0[0] + .9, h0[1] + .3];
    let cur = clone(pos);
    const push = draws => frames.push({ pos: clone(cur), draws });
    if ((L.anim === 'path' || L.anim === 'pathpass') && L.path) {
      cur[A[0]] = L.path[0].slice(); cur[ball.id] = [L.path[0][0] + .9, L.path[0][1]];
      for (let i = 1; i < L.path.length; i++) {
        push([mkd(L.anim === 'path' ? 'zig' : 'zig', L.path[i - 1], L.path[i])]);
        cur[A[0]] = L.path[i].slice(); cur[ball.id] = [L.path[i][0] + .9, L.path[i][1]];
      }
      if (L.anim === 'pathpass' && A[3]) { const t = cur[A[3]]; push([mkd('dash', cur[ball.id], t), mkd('arrow', cur[A[0]], [cur[A[0]][0] + 4, cur[A[0]][1] - 3])]); cur[ball.id] = [t[0] - .9, t[1]]; cur[A[0]] = [cur[A[0]][0] + 4, cur[A[0]][1] - 3]; }
      push([]);
    } else if (L.anim === 'race' && A.length && B.length) {
      const b = Object.keys(cur).find(k => p.objs.find(o => o.id === k && o.type === 'disc'));
      const mid = b ? cur[b] : [(x0 + x1) / 2, (y0 + y1) / 2];
      const a = A[Math.floor(A.length / 2)], d = B[Math.floor(B.length / 2)];
      cur[ball.id] = [mid[0], mid[1] + 1];
      push([mkd('arrow', cur[a], [mid[0], mid[1] + 2]), mkd('arrow', cur[d], [mid[0] + .5, mid[1] - .5])]);
      cur[a] = [mid[0], mid[1] + 2]; cur[d] = [mid[0] + .6, mid[1] - .4];
      push([mkd('zig', cur[a], [cur[a][0] - 3, y1 - .5])]); cur[a] = [cur[a][0] - 3, y1 - .5]; cur[ball.id] = [cur[a][0] + .9, cur[a][1] - .6];
      push([]);
    } else {
      const hold = A[0], recv = A.length > 1 ? A[1] : null, run = A.length > 2 ? A[2] : null;
      const near = (pt) => B.slice().sort((u, v) => Math.hypot(cur[u][0] - pt[0], cur[u][1] - pt[1]) - Math.hypot(cur[v][0] - pt[0], cur[v][1] - pt[1]))[0];
      if (L.anim === 'dribble' || !recv) {
        const s = cur[hold], dest = clampP([s[0] + Math.min(10, (x1 - x0) * .45), s[1] + ((y0 + y1) / 2 - s[1]) * .3 + 1.5]);
        const nb = near(dest);
        push([mkd('zig', s, dest), ...(nb ? [mkd('arrow', cur[nb], [(cur[nb][0] + dest[0]) / 2, (cur[nb][1] + dest[1]) / 2])] : [])]);
        if (nb) cur[nb] = [(cur[nb][0] + dest[0]) / 2, (cur[nb][1] + dest[1]) / 2];
        cur[hold] = dest; cur[ball.id] = [dest[0] + .9, dest[1]];
        push([]);
      } else {
        const r0 = cur[recv]; const nb = near(r0);
        const runTo = run ? clampP([cur[run][0] + 4, cur[run][1] + (cur[run][1] < (y0 + y1) / 2 ? 3 : -3)]) : null;
        push([mkd('dash', cur[ball.id], r0), ...(runTo ? [mkd('arrow', cur[run], runTo)] : [])]);
        cur[ball.id] = [r0[0] + .9, r0[1]]; if (run) cur[run] = runTo;
        if (nb) cur[nb] = [cur[nb][0] + (r0[0] - cur[nb][0]) * .5, cur[nb][1] + (r0[1] - cur[nb][1]) * .5];
        if (runTo) {
          push([mkd('dash', cur[ball.id], runTo)]); cur[ball.id] = [runTo[0] + .9, runTo[1]];
          if (nb) cur[nb] = [cur[nb][0] + (runTo[0] - cur[nb][0]) * .4, cur[nb][1] + (runTo[1] - cur[nb][1]) * .4];
        } else {
          const dest = clampP([r0[0] + 5, r0[1] + 2]); push([mkd('zig', r0, dest)]); cur[recv] = dest; cur[ball.id] = [dest[0] + .9, dest[1]];
        }
        push([]);
      }
    }
  }
  p.frames = frames.length ? frames : [{ pos: clone(pos), draws: [] }];
  const mat = materialText(materialOf(p));
  Object.assign(p.task, {
    phase: ex.phase, content: ex.content || '', consigna: ex.consigna || '', strategy: ex.strategy || '', style: ex.style || '', stage: ex.stage || '',
    scoreType: ex.scoreType || '', scoring: ex.scoring || '', desc: ex.desc, rules: ex.rules || '', gradDown: ex.gDown || '', gradUp: ex.gUp || '',
    feedback: ex.feedback || '', objective: ex.consigna ? `${contentLabel(ex.content)}: ${ex.consigna}` : ex.name,
    duration: ex.dur || 10, series: ex.series || 1, work: ex.work || '', rest: ex.rest || '', intensity: ex.int || 'media', players: ex.players || '', variants: ex.variants || '',
    spaceNote: `${ex.sp[0]} × ${ex.sp[1]} m`, lib: ex.id,
  });
  p.notes = ex.desc + (mat ? `\nMaterial: ${mat}` : '');
  return p;
}

/* ---------- Interfaz ---------- */
let exState = { phase: '', cat: '', stage: '', content: '', ci: '', q: '', src: '', own: false, page: 1, pick: null };
/* Favoritos y ejercicios propios (tareas guardadas como plantilla) */
let EX_USER = [];
const exFavs = () => new Set((prefs.favEx || []).map(exNormId));
function exToggleFav(id) { const f = exFavs(); f.has(id) ? f.delete(id) : f.add(id); prefs.favEx = [...f]; savePrefs(); }
async function exLoadUser() { EX_USER = (await DB.all('projects')).filter(p => p.libUser).map(p => normalize(p)); }
function exUserEntries() {
  return EX_USER.map(p => { const t = p.task, ci = t.content ? consignasOf(t.content).findIndex(k => k.t === t.consigna) : -1;
    return { id: 'user|' + p.id, phase: t.phase || 'p1', strategy: t.strategy || '', content: t.content || '', ci: ci >= 0 ? ci : -1, cat: CONTENT[t.content] ? CONTENT[t.content].cat : '', stage: t.stage || '', user: true }; });
}
const EX_PAGE = 24;
const exPhaseChip = ph => `<span class="phchip ph-${ph}">${esc(PHASE[ph] ? PHASE[ph][1] : ph)}</span>`;

function exFiltered() {
  const s = exState, q = s.q.trim().toLowerCase(), favs = exFavs();
  return [...exUserEntries(), ...exIndex()].filter(e => {
    if (s.src === 'fav' && !favs.has(e.id)) return false;
    if (s.src === 'mine' && !e.user) return false;
    if (s.phase && e.phase !== s.phase) return false;
    if (s.stage && e.stage && e.stage !== s.stage) return false;
    if (!e.user && (e.phase === 'info' || e.phase === 'vuelta')) return (!s.cat && !q && (s.stage ? true : e.stage === 'SUMA1')) || (q && (e.phase === 'info' ? EX_INFO : EX_CALM)[+e.id.split('|')[1]][0].toLowerCase().includes(q));
    if (s.cat && e.cat !== s.cat) return false;
    if (s.own && !e.user && !e.own) return false;
    if (s.content && e.content !== s.content) return false;
    if (s.ci !== '' && e.ci !== +s.ci) return false;
    if (q) { const x = exGet(e.id); if (!(x.title + ' ' + x.consigna + ' ' + (STRATEGIES[x.strategy] || '')).toLowerCase().includes(q)) return false; }
    return true;
  });
}
function exFillFilters() {
  const s = exState;
  $('#exPhase').innerHTML = opt('', 'Todas las partes de la sesión', s.phase) + PHASES.map(([k, n]) => opt(k, n, s.phase)).join('');
  $('#exCat').innerHTML = opt('', 'Todos los bloques', s.cat) + Object.entries(CATS).map(([k, c]) => opt(k, `${c.block} · ${c.name}`, s.cat)).join('');
  $('#exStage').innerHTML = stageOpts(s.stage, 'Todas las sub-etapas');
  const cs = CONTENTS.filter(c => (!s.cat || c.cat === s.cat) && (!s.stage || exStageOk(c, s.stage)));
  if (s.content && !cs.find(c => c.id === s.content)) s.content = '';
  $('#exContent').innerHTML = opt('', `Todos los contenidos (${cs.length})`, s.content) + cs.map(c => opt(c.id, c.name + (c.stage ? (s.stage && c.stage !== s.stage ? ` · de ${STAGE[c.stage]}` : ` · ${STAGE[c.stage]}`) : ''), s.content)).join('');
  const ks = s.content ? consignasOf(s.content) : [];
  $('#exCons').disabled = !ks.length;
  $('#exCons').innerHTML = opt('', ks.length ? `Todas las consignas (${ks.length})` : 'Elige un contenido', String(s.ci)) + ks.map((k, i) => opt(String(i), `${k.level}: ${exShort(k.t, 90)}`, String(s.ci))).join('');
}
/* Explorador jerárquico: sub-etapa › parte de la sesión › contenido › consigna */
function renderExTree(list) {
  const s = exState, T = $('#exTree'); if (!T) return;
  const all = exIndex(), cnt = f => all.reduce((a, e) => a + (f(e) ? 1 : 0), 0);
  const chip = (lbl, n, on, fn, cls = '') => { const b = el('button', 'chip ' + cls + (on ? ' active' : ''), `${lbl}${n != null ? `<b>${n}</b>` : ''}`); b.onclick = fn; return b; };
  T.innerHTML = '';
  const crumbs = [s.stage ? STAGE[s.stage] : 'Todas las sub-etapas', s.phase ? PHASE[s.phase][1] : 'Todas las partes', s.content ? contentLabel(s.content) : '', s.content && s.ci !== '' ? exShort((consignasOf(s.content)[+s.ci] || {}).t || '', 60) : ''].filter(Boolean);
  T.appendChild(el('div', 'excrumb', crumbs.map(esc).join(' <span>›</span> ')));
  // 1. sub-etapa
  const r1 = el('div', 'exrow'); r1.appendChild(el('span', 'exlbl', '1 · Sub-etapa'));
  r1.appendChild(chip('Todas', null, !s.stage, () => { s.stage = ''; s.page = 1; renderExLib(); }));
  STAGES.forEach(([k, n]) => r1.appendChild(chip(n, cnt(e => e.stage === k && (!s.phase || e.phase === s.phase)), s.stage === k, () => { s.stage = k; s.page = 1; if (s.content && !exStageOk(CONTENT[s.content], k)) { s.content = ''; s.ci = ''; } renderExLib(); }, 'st-chip st-' + k)));
  T.appendChild(r1);
  // 2. parte de la sesión
  const r2 = el('div', 'exrow'); r2.appendChild(el('span', 'exlbl', '2 · Parte de la sesión'));
  r2.appendChild(chip('Todas', null, !s.phase, () => { s.phase = ''; s.page = 1; renderExLib(); }));
  PHASES.forEach(([k, n]) => r2.appendChild(chip(n.replace('Vuelta a la calma y reflexión', 'Vuelta a la calma'), cnt(e => e.phase === k && (!s.stage || e.stage === s.stage) && (!s.content || e.content === s.content || !e.content)), s.phase === k, () => { s.phase = k; s.page = 1; renderExLib(); })));
  T.appendChild(r2);
  if (s.phase === 'info' || s.phase === 'vuelta') return;
  // 3. contenido
  if (!s.content) {
    const r3 = el('div', 'exblocks'); r3.appendChild(el('span', 'exlbl', '3 · Contenido'));
    const cats = Object.keys(CATS).filter(k => !s.cat || k === s.cat);
    cats.forEach(k => {
      const cs = CONTENTS.filter(c => c.cat === k && (!s.stage || exStageOk(c, s.stage)));
      const items = cs.map(c => [c, cnt(e => e.content === c.id && (!s.stage || e.stage === s.stage) && (!s.phase || e.phase === s.phase))]).filter(([, n]) => n);
      if (!items.length) return;
      const col = el('div', 'exblock', `<h4>${esc(CATS[k].block)} · ${esc(CATS[k].name)}</h4>`);
      items.forEach(([c, n]) => { const b = el('button', 'citem' + (s.stage && c.stage && c.stage !== s.stage ? ' prior' : ''), `${esc(c.name)}<small>${c.stage && s.stage && c.stage !== s.stage ? 'de ' + esc(STAGE[c.stage]) + ' · ' : ''}${consignasOf(c.id).length} consignas · ${n} ej.</small>`); b.onclick = () => { s.content = c.id; s.ci = ''; s.page = 1; renderExLib(); }; col.appendChild(b); });
      r3.appendChild(col);
    });
    T.appendChild(r3);
  } else {
    // 4. consigna
    const r4 = el('div', 'exblocks'); r4.appendChild(el('span', 'exlbl', '4 · Consigna'));
    const col = el('div', 'exblock wide');
    const back = el('button', 'citem', '← Todos los contenidos'); back.onclick = () => { s.content = ''; s.ci = ''; s.page = 1; renderExLib(); }; col.appendChild(back);
    consignasOf(s.content).forEach((k, i) => { const n = cnt(e => e.content === s.content && e.ci === i && (!s.stage || e.stage === s.stage) && (!s.phase || e.phase === s.phase)); const b = el('button', 'citem' + (String(i) === String(s.ci) ? ' on' : ''), `<span class="lvl">${esc(k.level)}</span> ${esc(k.t)}<small>${n} ejercicios</small>`); b.onclick = () => { s.ci = String(s.ci) === String(i) ? '' : String(i); s.page = 1; renderExLib(); }; col.appendChild(b); });
    r4.appendChild(col); T.appendChild(r4);
  }
}
function renderExLib() {
  exFillFilters();
  const list = exFiltered(), g = $('#exGrid'); g.innerHTML = '';
  renderExTree(list);
  const ctx = exState.content ? { content: exState.content, consigna: exState.ci !== '' ? (consignasOf(exState.content)[+exState.ci] || {}).t : '' } : null;
  $('#exCount').textContent = `${list.length} ejercicio${list.length === 1 ? '' : 's'}`;
  if (!list.length) { g.innerHTML = '<div class="empty">Ningún ejercicio coincide con los filtros.</div>'; return; }
  let lastGroup = null;
  list.slice(0, exState.page * EX_PAGE).forEach(e => {
    const ex = exGet(e.id, (e.phase === 'info' || e.phase === 'vuelta') ? ctx : null); if (!ex) return;
    const group = (ex.stage && !exState.stage ? STAGE[ex.stage] + ' · ' : '') + (ex.content ? `${contentLabel(ex.content)} · ${exShort(ex.consigna, 80)}` : PHASE[ex.phase][1]);
    if (group !== lastGroup && exState.content) { lastGroup = group; const h = el('div', 'grouphead', esc(group)); g.appendChild(h); }
    const card = el('div', 'card excard');
    const p = exProject(ex), cv = thumbCanvas(p); cv.title = 'Ver animación'; cv.onclick = () => miniPlay(cv, p); card.appendChild(cv);
    const meta = el('div', 'meta', `<div class="exchips">${ex.user ? '<span class="tag">📚 Mío</span>' : ''}${exPhaseChip(ex.phase)}${ex.strategy ? `<span class="tag">${esc(STRATEGIES[ex.strategy])}</span>` : ''}${ex.stage ? stageChip(ex.stage) : ''}</div>
      <div class="t">${esc(ex.name)}</div><div class="s">${esc(ex.content ? contentLabel(ex.content) : 'Para cualquier contenido')} · ${ex.dur} min · ${esc(ex.players)}</div>
      ${ex.consigna ? `<div class="d">«${esc(exShort(ex.consigna, 120))}»</div>` : `<div class="d">${esc(exShort(ex.desc, 120))}</div>`}`);
    card.appendChild(meta);
    const acts = el('div', 'acts');
    const b = (t, ttl, fn, cls) => { const x = el('button', cls || '', t); x.title = ttl; x.onclick = fn; acts.appendChild(x); };
    if (exState.pick) b('＋ Añadir', 'Añadir a la sesión', () => exAddToSession(ex, exState.pick), 'primary');
    else b('Usar', 'Abrir en la pizarra con su ficha', () => exUse(ex), 'primary');
    b('Ficha', 'Ver la ficha completa', () => exView(ex));
    if (!exState.pick) b('＋Sesión', 'Añadir a una sesión', () => exPickSession(ex));
    b('PDF', 'Descargar la ficha en PDF', () => printHTML(taskPrintHTML(exProject(ex), null, true), { title: ex.title }));
    const fav = exFavs().has(ex.id); b(fav ? '★' : '☆', fav ? 'Quitar de favoritos' : 'Añadir a favoritos', () => { exToggleFav(ex.id); renderExLib(); }, 'favbtn' + (fav ? ' on' : ''));
    if (ex.user) b('✕', 'Quitar de mi biblioteca (la tarea sigue en Mis tácticas)', async () => { const p = await DB.get('projects', ex.proj.id); if (p) { delete p.libUser; await DB.put('projects', p); } await exLoadUser(); renderExLib(); }, 'danger');
    card.appendChild(acts); g.appendChild(card);
  });
  if (list.length > exState.page * EX_PAGE) {
    const more = el('button', 'sadd exmore', `Ver más (${list.length - exState.page * EX_PAGE} restantes)`);
    more.onclick = () => { exState.page++; renderExLib(); }; g.appendChild(more);
  }
}
function exView(ex) {
  const p = exProject(ex);
  $('#exvTitle').textContent = ex.name;
  $('#exvBody').innerHTML = `<div class="prt paper">${taskPrintHTML(p, null, true)}</div>`;
  $('#exvUse').hidden = !!exState.pick; $('#exvAdd').textContent = exState.pick ? '＋ Añadir a la sesión' : '＋ Añadir a una sesión';
  $('#exvUse').onclick = () => { $('#dlgExView').close(); exUse(ex); };
  $('#exvAdd').onclick = () => { $('#dlgExView').close(); exState.pick ? exAddToSession(ex, exState.pick) : exPickSession(ex); };
  $('#exvPdf').onclick = () => printHTML(taskPrintHTML(exProject(ex), null, true), { title: ex.title });
  $('#dlgExView').showModal();
}
async function exUse(ex) {
  await saveNow(); const p = exProject(ex); await DB.put('projects', p);
  $('#dlgLibrary').close(); if (typeof hideHome === 'function' && !$('#home').hidden) hideHome();
  loadProject(p); toast('Ejercicio en la pizarra con su ficha (📝). Puedes modificarlo libremente.', 4000);
}
async function exAddToSession(ex, pick) {
  const s = pick.ses, p = exProject(ex); await DB.put('projects', p); sesProjects[p.id] = p;
  const bk = pick.block || ex.phase; s.items.push({ pid: p.id, block: bk, dur: ex.dur || 10 });
  const ph = s.phases[bk]; if (ph && !ph.content && ex.content) { ph.content = ex.content; ph.consigna = ph.consigna || ex.consigna; ph.strategy = ph.strategy || ex.strategy; }
  s.updated = Date.now(); await DB.put('sessions', s);
  exState.pick = null; $('#dlgLibrary').close();
  if (curSes && curSes.id === s.id) { renderSessionBlocks(); if (!$('#dlgSession').open) $('#dlgSession').showModal(); }
  toast(`Añadido a «${PHASE[bk][1]}» de ${s.name}`);
}
async function exPickSession(ex) {
  const all = (await DB.all('sessions')).map(normSession).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  await loadProjectsMap();
  const items = [{ id: '__new', label: '＋ Nueva sesión (hoy)', sub: 'Crea una sesión con este ejercicio' }, ...all.map(s => ({ id: s.id, label: s.name, sub: `${fmtDate(s.date)}${s.md && s.md !== 'Libre' ? ' · ' + s.md : ''} · ${sessionTotal(s)} min` }))];
  pickFrom(`Añadir «${ex.name}» a…`, items, async id => {
    let s = id === '__new' ? newSession(isoDate(new Date())) : all.find(x => x.id === id);
    if (id === '__new') { s.stage = ex.stage || s.stage; await DB.put('sessions', s); }
    await exAddToSession(ex, { ses: s, block: ex.phase });
  });
}
/* Abrir la biblioteca: opts {phase, content, consigna, pick:{ses, block}} */
async function openExLib(opts = {}) {
  await exLoadUser(); $('#exSrc').value = exState.src || '';
  const ks = opts.content ? consignasOf(opts.content) : [], ci = opts.consigna ? ks.findIndex(k => k.t === opts.consigna) : -1;
  const defStage = opts.stage !== undefined ? opts.stage : (opts.content ? (CONTENT[opts.content]?.stage || exState.stage) : exState.stage);
  exState = { ...exState, phase: opts.phase ?? exState.phase, cat: opts.content ? CONTENT[opts.content]?.cat || '' : (opts.cat ?? exState.cat), stage: opts.content && defStage && !exStageOk(CONTENT[opts.content], defStage) ? CONTENT[opts.content].stage : defStage, content: opts.content ?? exState.content, ci: ci >= 0 ? String(ci) : (opts.content !== undefined ? '' : exState.ci), q: '', page: 1, pick: opts.pick || null };
  $('#exSearch').value = '';
  $('#exPickBar').hidden = !exState.pick;
  if (exState.pick) $('#exPickTxt').textContent = `Elige un ejercicio para «${PHASE[exState.pick.block][1]}» de ${exState.pick.ses.name}`;
  if (!$('#dlgLibrary').open) $('#dlgLibrary').showModal();
  showLibTab('exlib'); renderExLib();
}
$('#exPhase').onchange = e => { exState.phase = e.target.value; exState.page = 1; renderExLib(); };
$('#exCat').onchange = e => { exState.cat = e.target.value; exState.content = ''; exState.ci = ''; exState.page = 1; renderExLib(); };
$('#exStage').onchange = e => { exState.stage = e.target.value; exState.page = 1; renderExLib(); };
$('#exContent').onchange = e => { exState.content = e.target.value; exState.ci = ''; exState.page = 1; renderExLib(); };
$('#exCons').onchange = e => { exState.ci = e.target.value; exState.page = 1; renderExLib(); };
$('#exSearch').oninput = e => { exState.q = e.target.value; exState.page = 1; clearTimeout(exState._t); exState._t = setTimeout(renderExLib, 250); };
$('#exSrc').onchange = e => { exState.src = e.target.value; exState.page = 1; renderExLib(); };
$('#exOwn').onchange = e => { exState.own = e.target.checked; exState.page = 1; renderExLib(); };
$('#exReset').onclick = () => { exState = { ...exState, phase: '', cat: '', stage: '', content: '', ci: '', q: '', src: '', own: false, page: 1 }; $('#exOwn').checked = false; $('#exSrc').value = ''; $('#exSearch').value = ''; renderExLib(); };
$('#exPickCancel').onclick = () => { exState.pick = null; $('#exPickBar').hidden = true; renderExLib(); };
$('#exPdfAll').onclick = () => {
  const list = exFiltered();
  if (!exState.content || exState.ci === '') { if (list.length > 30) { toast('Elige un contenido y una consigna para descargar sus 10 ejercicios en PDF', 4000); return; } }
  const ctx = exState.content ? { content: exState.content, consigna: exState.ci !== '' ? consignasOf(exState.content)[+exState.ci].t : '' } : null;
  const exs = list.slice(0, 30).map(e => exGet(e.id, (e.phase === 'info' || e.phase === 'vuelta') ? ctx : null)).filter(Boolean);
  const k = ctx && ctx.consigna;
  const h = `<header class="pt-head"><div><h1>${esc(ctx ? contentLabel(ctx.content) : 'Biblioteca de ejercicios')}</h1><p>${exState.stage ? esc(STAGE[exState.stage]) + ' · ' : ''}${k ? '«' + esc(k) + '»' : esc(exs.length + ' ejercicios')}</p></div><div class="pt-meta"><b>${exs.length} ejercicios</b></div></header>` +
    PHASES.map(([ph, n]) => { const xs = exs.filter(x => x.phase === ph); return xs.length ? `<h2>${esc(n)} <small>${xs.length}</small></h2>` + xs.map(x => taskPrintHTML(exProject(x), null)).join('') : ''; }).join('');
  printHTML(h, { title: ctx ? contentLabel(ctx.content) + ' - ejercicios' : 'Biblioteca de ejercicios' });
};

// Guardar la tarea abierta como plantilla en «Mis ejercicios»
$('#tkLib').onclick = async () => {
  await saveNow(); const p = await DB.get('projects', P.id); if (!p) return;
  p.libUser = !p.libUser; await DB.put('projects', p); P.libUser = p.libUser;
  toast(p.libUser ? 'Guardada en tu biblioteca (📚 Biblioteca › Mis ejercicios)' : 'Quitada de tu biblioteca');
  $('#tkLib').textContent = p.libUser ? '📚 En mi biblioteca ✓' : '📚 A mi biblioteca';
};
$('#btnTask').addEventListener('click', () => setTimeout(() => { $('#tkLib').textContent = P && P.libUser ? '📚 En mi biblioteca ✓' : '📚 A mi biblioteca'; }, 0));
