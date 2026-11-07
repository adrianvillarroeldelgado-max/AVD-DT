'use strict';
/*
  Catálogo metodológico basado en el material de la Licencia B CIEF (metodología MBP / Coaches' Voice School):
  «Los contenidos y las consignas de entrenamiento del bloque complementario y del bloque básico».
  - Sub-etapas de comprensión del juego: Egocéntrica I y II, Sumativa I y II.
  - Bloque complementario: habilidades perceptivas y habilidades de gestión de los espacios.
  - Bloque básico: fundamentos básicos individuales (FBI, con y sin balón) y colectivos (FBC).
  Las sugerencias de HMB/HME no forman parte del documento: son orientativas.
*/
const STAGES = [['EGO1', 'Egocéntrica I'], ['EGO2', 'Egocéntrica II'], ['SUMA1', 'Sumativa I'], ['SUMA2', 'Sumativa II']];
const STAGE = Object.fromEntries(STAGES);
const STAGE_IDX = Object.fromEntries(STAGES.map(([k], i) => [k, i]));
const CATS = {
  hmb: { name: 'HMB / HME', long: 'Habilidades motrices básicas / específicas', block: 'Complementario', phase: 'act' },
  percep: { name: 'Habilidades perceptivas', long: 'Habilidades perceptivas', block: 'Complementario', phase: 'act' },
  espacio: { name: 'Gestión del espacio', long: 'Habilidades de gestión de los espacios', block: 'Complementario', phase: 'act' },
  fbi_con: { name: 'FBI con balón', long: 'Fundamento básico individual con balón', block: 'Básico', phase: 'main' },
  fbi_sin: { name: 'FBI sin balón', long: 'Fundamento básico individual sin balón', block: 'Básico', phase: 'main' },
  fbc: { name: 'FBC', long: 'Fundamento básico colectivo', block: 'Básico', phase: 'main' },
};
const ROLES = { ACB: 'Atacante con balón', ASB: 'Atacante sin balón', DEF: 'Defensor' };

const C = (id, name, cat, stage, def, simple, adv, extra) => ({ id, name, cat, stage, def, simple: simple || [], adv: adv || [], ...(extra || {}) });
const CONTENTS = [
  /* ---------- Bloque complementario: habilidades perceptivas (todas las sub-etapas) ---------- */
  C('percep_centro', 'Percepción del centro de juego', 'percep', null, '', [], [], { roles: {
    ACB: ['Mirar la posición de los pies y la orientación corporal del defensor directo', 'Mirar dónde están las coberturas directas del defensor directo', 'Mirar la posición o trayectoria de los compañeros en apoyo'],
    ASB: ['Mirar si el posesor no puede progresar o está en peligro de perder el balón para apoyarlo', 'Mirar si el posesor precisa de un movimiento lejano al centro de juego para obtener espacio de progresión', 'Mirar si tengo un adversario que disuada mi recepción'],
    DEF: ['Mirar el balón constantemente', 'Mirar el mejor espacio hacia donde orientar el juego del posesor', 'Mirar si tengo coberturas y qué espacios están cerrando'] } }),
  C('percep_cercano', 'Percepción del espacio cercano', 'percep', null, '', [], [], { roles: {
    ACB: ['Mirar el mejor espacio por donde progresar, individual o colectivamente', 'Mirar dónde están colocados los adversarios cercanos', 'Mirar la posición o trayectoria de los compañeros cercanos'],
    ASB: ['Mirar si el espacio cercano está libre y, si está ocupado, buscar un espacio cercano libre de compañeros', 'Mirar si entre el jugador con balón y yo hay adversarios, buscando siempre una línea de pase abierta', 'Mirar si tengo un adversario cercano que me defienda antes de recibir'],
    DEF: ['Mirar al jugador que debo marcar y el balón de forma simultánea', 'Mirar si el jugador con balón está defendido', 'Mirar si a mi lado hay compañeros defendiendo'] } }),
  C('percep_lejano', 'Percepción del espacio lejano', 'percep', null, '', [], [], { roles: {
    ACB: ['Buscar al compañero con más ventaja para el equipo y más riesgo para el adversario', 'Mirar dónde se están generando espacios favorables de juego', 'Buscar los desequilibrios espaciales'],
    ASB: ['Mirar si estoy bien colocado en relación a la distribución del equipo', 'Mirar si mi equipo tiene las líneas equilibradas', 'Mirar si el equipo adversario tiene desequilibrios espaciales que puedo aprovechar', 'Mirar mi posición en relación a la línea a la que pertenezco'],
    DEF: ['Mirar al jugador que debo defender con prioridad', 'Mirar por dónde puede progresar el ataque rival'] } }),
  C('orientacion', 'Orientación corporal', 'percep', null, '', [], [], { roles: {
    ACB: ['Orientar el cuerpo para tener el máximo campo visual posible en relación a la zona activa de juego', 'Orientar el cuerpo para poder observar toda la amplitud y profundidad del campo'],
    ASB: ['Orientar el cuerpo en relación a la pelota y la portería adversaria'],
    DEF: ['Orientar el cuerpo en relación a la pelota, la portería y el jugador a marcar'] } }),
  C('girar_cabeza', 'Girar la cabeza', 'percep', null, '', [], [], { roles: {
    ACB: ['Girar la cabeza lateralmente para buscar compañeros con ventaja para recibir el balón', 'Girar la cabeza hacia atrás para controlar a los posibles defensores que se acercan a nuestra posición'],
    ASB: ['Girar la cabeza antes de recibir el balón para recoger el máximo de información posible (compañeros, adversarios y espacios)'],
    DEF: ['Girar la cabeza para buscar compañeros ayudando en la defensa', 'Girar la cabeza para defender a un atacante que se encuentra en una posición más retrasada'] } }),

  /* ---------- Bloque complementario: gestión de los espacios ---------- */
  C('descentralizacion', 'Descentralización de los espacios de juego', 'espacio', 'EGO1', '', [
    'En ataque, dejar espacio de juego al posesor', 'En ataque, estar siempre en disposición de actuar sobre el balón (respetando la consigna anterior)',
    'En defensa, dejar espacio al defensor del posesor del balón', 'En defensa, estar siempre en disposición de actuar sobre el balón (respetando la consigna anterior)']),
  C('distribucion_basica', 'Distribución básica en el espacio', 'espacio', 'EGO2', '', [
    'En ataque, mantener los espacios de derecha, izquierda, delante y detrás ocupados', 'En ataque, no estar dos jugadores en una misma zona (derecha, izquierda, delante y detrás)',
    'En defensa, mantener los espacios de derecha, izquierda, delante y detrás ocupados', 'En defensa, no estar dos jugadores en una misma zona (derecha, izquierda, delante y detrás)']),
  C('distribucion_racional', 'Distribución racional en el espacio', 'espacio', 'SUMA1', '', [
    'En ataque, jugar en y desde la zona', 'En ataque, ocupar más de un jugador una misma zona para generar ventaja numérica',
    'En defensa, jugar en y desde la zona', 'En defensa, ocupar más de un jugador una misma zona para generar ventaja numérica']),
  C('reestructuracion', 'Reestructuración de los espacios de juego', 'espacio', 'SUMA2', '', [
    'En ataque, intercambiar posiciones manteniendo el equilibrio del equipo', 'En defensa, intercambiar posiciones manteniendo el equilibrio del equipo',
    'Cambiar la formación del equipo en función de la fase del juego', 'Anticipar la preparación de la siguiente fase del juego']),

  /* ---------- HMB / HME (sugerencias orientativas, no incluidas en el documento) ---------- */
  C('hmb_desplazamientos', 'Desplazamientos (HMB)', 'hmb', null, 'Sugerencia orientativa', ['Variar direcciones, sentidos y ritmos', 'Combinar carrera frontal, lateral y hacia atrás']),
  C('hmb_saltos', 'Saltos y equilibrio (HMB)', 'hmb', null, 'Sugerencia orientativa', ['Batir con una y dos piernas', 'Amortiguar la caída manteniendo el equilibrio']),
  C('hmb_giros', 'Giros (HMB)', 'hmb', null, 'Sugerencia orientativa', ['Girar sobre el eje vertical en ambos sentidos', 'Encadenar giro y desplazamiento']),
  C('hmb_lanzamientos', 'Lanzamientos y recepciones (HMB)', 'hmb', null, 'Sugerencia orientativa', ['Coordinar brazos y piernas en el lanzamiento', 'Recibir amortiguando']),
  C('hme_coordinacion', 'Coordinación con balón (HME)', 'hmb', null, 'Sugerencia orientativa', ['Coordinación óculo-pédica con ambos perfiles', 'Agilidad y cambios de dirección con balón']),
  C('hme_reaccion', 'Velocidad de reacción (HME)', 'hmb', null, 'Sugerencia orientativa', ['Reaccionar a estímulos visuales y auditivos', 'Salidas desde diferentes posiciones']),

  /* ---------- Bloque básico · Egocéntrica I ---------- */
  C('conduccion', 'Conducción de balón', 'fbi_con', 'EGO1', 'Habilidad que permite llevar el balón con los pies por el suelo sin perder su control.', [
    'Utilizar el exterior del pie para avanzar más rápido y el interior para tener más control', 'Llevar el balón más cerca o más lejos del pie en función de la distancia con el adversario directo',
    'Cambiar la dirección del balón para dificultar la acción del defensor cruzándonos en su carrera', 'Conducir con la cabeza alta'], [
    'Conducir con la pierna alejada del rival más próximo', 'Conducir hacia los espacios libres', 'Dirigir la conducción hacia un adversario para fijarlo y liberar a un compañero']),
  C('regate', 'Regate', 'fbi_con', 'EGO1', 'Habilidad que permite desbordar a un adversario manteniendo el control del balón.', [
    'Realizar movimientos falsos para engañar al defensor', 'Cambiar la dirección del balón durante el regate', 'Cambiar la velocidad de lenta a rápida o de rápida a lenta', 'Regatear hacia el espacio libre'], [
    'Utilizar diferentes tipos de finta de forma encadenada', 'Dar continuidad después del regate', 'Utilizar el regate para desequilibrar si existen problemas en la progresión del equipo']),
  C('proteccion', 'Protección de balón', 'fbi_con', 'EGO1', 'Habilidad que permite evitar que el adversario llegue al balón.', [
    'Poner el cuerpo entre el balón y el adversario variando posiciones y ángulos en relación a este', 'Fijar el brazo en el tronco del rival, si puede ser de forma extendida y tensa',
    'Centro de gravedad bajo manteniendo el equilibrio', 'Utilizar la pierna más alejada del defensor'], [
    'Utilizar la planta del pie para detener el balón con mayor seguridad, así como fintar con el mismo', 'Fintar con el cuerpo sin dejar de proteger el balón para salir individualmente de la presión', 'Buscar opciones de asociación mientras se está protegiendo el balón']),
  C('giros', 'Giros con balón', 'fbi_con', 'EGO1', 'Habilidad que permite la realización de rotaciones con balón a través del eje vertical.', [
    'Realizar el mínimo de contactos con el balón, frecuentes y rápidos', 'Utilizar los brazos para mantener el equilibrio a la vez que protegernos de la acción del defensor',
    'Utilizar el interior del pie para girar hacia dentro y el exterior para girar hacia fuera', 'Combinar el uso del interior y el exterior del pie de forma rápida y controlada'], [
    'Girar hacia el espacio libre', 'Servirse de movimientos previos hacia el lado contrario', 'Levantar la cabeza en la fase final del giro para observar la situación de juego']),
  C('rechace', 'Rechace', 'fbi_con', 'EGO1', 'Habilidad que permite alejar el balón de la zona de peligro.', [
    'Rechazar solo cuando sea estrictamente necesario', 'Direccionar el rechace hacia los carriles laterales', 'Rechazar lo más lejos posible', 'Evitar conceder segundas opciones o córner a los adversarios en el rechace'], [
    'Orientar el cuerpo correctamente para rechazar sin peligro', 'Abandonar la zona de peligro mientras el balón está en fase de vuelo', 'Orientar el rechace hacia la posición de nuestros atacantes']),
  C('control_simple', 'Control simple', 'fbi_con', 'EGO1', 'Habilidad que permite hacerse con el balón. (Sus consignas avanzadas corresponden al control orientado.)', [
    'Priorizar quedarse con el balón a golpearlo de primeras', 'No esperar el balón, atacándolo', 'Utilizar la pierna más alejada de la procedencia del balón', 'Orientar y bajar el centro de gravedad amortiguando el balón en el momento del contacto']),
  C('apoyo', 'Apoyo', 'fbi_sin', 'EGO1', 'Habilidad que consiste en dar luz al pase.', [
    'No esconderse detrás del defensor', 'No acercarse demasiado al posesor', 'Buscar posiciones diagonales respecto al posesor', 'Apoyar con el cuerpo lateralizado'], [
    'Girar la cabeza para observar la distancia que nos separa del defensor', 'Si el defensor no sigue el apoyo, priorizar las acciones de progresión', 'Si el defensor sigue el apoyo, jugar de frente a uno o dos toques']),
  C('acoso', 'Acoso', 'fbi_sin', 'EGO1', 'Habilidad que tiene como objetivo impedir la acción del posesor del balón.', [
    'Llegar rápido al acoso', 'No ser desbordado entrando de golpe', 'Mantener una distancia adecuada para evitar el juego cómodo del posesor y a la vez un fácil desborde', 'Colocar el cuerpo lateralmente, nunca frontal al posesor'], [
    'Mantener el centro de gravedad bajo y los pies reactivos para fintar al posesor', 'Orientar al posesor hacia los carriles laterales', 'Si el posesor se gira de espaldas al juego, reducir al máximo la distancia del acoso']),
  C('entrada', 'Entrada', 'fbi_sin', 'EGO1', 'Habilidad que permite la recuperación de la posesión del balón.', [
    'Utilizar la pierna más cercana al balón sin cruzarlas (excepto en carreras en paralelo)', 'Entrar justo después de que el jugador entre en contacto con el balón', 'No ir al suelo si no es estrictamente necesario', 'No hacer falta al entrar'], [
    'Fintar la entrada al posesor', 'Si existe la posibilidad, entrar justo cuando el posesor controla el balón', 'Si el posesor pierde ligeramente el control del balón, entrar inmediatamente']),
  C('marcaje', 'Marcaje', 'fbi_sin', 'EGO1', 'Habilidad que permite controlar la evolución de uno o diversos contrarios sin balón.', [
    'Identificar al jugador a marcar', 'Colocarse entre el jugador a marcar y la portería', 'Observar en todo momento y de forma simultánea al jugador y el balón', 'Colocarse a más o menos distancia en función de la posición del posesor'], [
    'Mantener el equilibrio del equipo durante el marcaje', 'Marcar zonal excepto en zonas peligrosas (área), donde se marcará en individual', 'Utilizar vigilancias ofensivas (marcaje mientras mi equipo tiene la posesión avanzada del balón)']),
  C('amplitud', 'Amplitud', 'fbc', 'EGO1', 'Organización del equipo en el espacio que le permite utilizar los espacios de juego de forma horizontal.', [
    'Abrir los espacios de juego a lo ancho cuando el equipo está en fase ofensiva (OF)', 'Cerrar los espacios de juego a lo ancho cuando el equipo está en fase defensiva (DEF)',
    'Mantener una correcta amplitud de nuestra línea en función de los jugadores que la componen (OF)', 'Reducir la amplitud en las zonas próximas al área contraria (OF)'], [
    'Generar amplitud con la intención de jugar por dentro, en pase o conducción (OF)', 'Evitar el juego del equipo contrario por dentro de nuestros intervalos intralineales (DEF)',
    'Si el contrario rompe una línea del equipo, reducir al máximo la amplitud de la siguiente línea forzando su juego hacia fuera (DEF)']),
  C('profundidad', 'Profundidad', 'fbc', 'EGO1', 'Organización del equipo en el espacio que le permite utilizar los espacios de juego de forma vertical.', [
    'Abrir los espacios de juego a lo largo cuando el equipo está en fase ofensiva (OF)', 'Cerrar los espacios de juego a lo largo cuando el equipo está en fase defensiva (DEF)',
    'Mantener una correcta profundidad intralineal, dentro de la misma línea (DEF/OF)', 'Mantener una correcta profundidad interlineal, entre líneas (DEF/OF)'], [
    'Generar profundidad con la intención de jugar en el espacio interlineal rival, en pase o conducción (OF)', 'Evitar el juego del equipo contrario por dentro de nuestros intervalos interlineales (DEF)',
    'Atención a los espacios traseros al reducir la profundidad del equipo, anticipando balones aéreos largos (DEF)']),

  /* ---------- Bloque básico · Egocéntrica II ---------- */
  C('pase', 'Pase', 'fbi_con', 'EGO2', 'Habilidad que permite la transmisión del balón a un compañero.', [
    'Utilizar el interior del pie en pases de corta y media distancia, y el empeine en pases largos', 'Pasar fuerte y tenso', 'Dar el pase facilitando la posterior acción del compañero', 'Priorizar los pases hacia los espacios con ventaja'], [
    'Priorizar el pase a la conducción en zonas de gran densidad', 'Alternar pases cortos y largos', 'Priorizar los pases en progresión diagonales a los verticales y evitar los horizontales (solo para encadenar un cambio de orientación)']),
  C('control_orientado', 'Control orientado', 'fbi_con', 'EGO2', 'Habilidad que permite hacerse con el balón dando continuidad a la acción.', [
    'No detener el balón, utilizando un solo contacto', 'Cambiar la velocidad después del contacto con el balón', 'Escoger entre el control de seguridad y el de progresión', 'Controlar hacia el espacio libre, girando la cabeza previamente para buscarlo'], [
    'Utilizar el interior del pie para controlar hacia dentro manteniendo el cuerpo entre el balón y el adversario directo', 'Utilizar el exterior del pie para controlar hacia fuera con gran rapidez', 'Utilizar otros recursos, como el tacón, para salir hacia direcciones inesperadas para el defensor directo']),
  C('cobertura_defensiva', 'Cobertura defensiva', 'fbi_sin', 'EGO2', 'Habilidad que permite estar en disposición de ayudar a un compañero que puede ser desbordado por un adversario.', [
    'Priorizar la defensa del espacio sobre la recuperación del balón', 'Cubrir siempre en dirección a la portería', 'Utilizar una distancia que permita llegar a la ayuda del compañero', 'Cubrir la posición del compañero que nos ha ayudado al ser desbordados'], [
    'Cerca de nuestra portería, priorizar las ayudas mientras se mantienen los marcajes personales', 'Identificar en qué momento hay que salir a la cobertura (timing)', 'No salir en cobertura en caso de desequilibrio numérico o espacial en la zona']),
  C('lineas_pase', 'Líneas de pase', 'fbc', 'EGO2', 'Organización del equipo que consiste en abrir espacios libres de defensores entre el pasador y los receptores para una correcta transmisión del balón.', [
    'Abrir líneas de pase constantemente (no esconderse detrás del defensor)', 'Buscar posiciones en diagonal respecto al posesor y los demás compañeros', 'Ofrecer líneas de pase en corto y en largo para progresar en el juego', 'Ofrecer líneas de pase en emergencia para conservar la posesión del balón'], [
    'Ofrecer líneas de pase en horizontal únicamente para ejecutar un cambio de orientación', 'Abrir líneas de pase para otros jugadores de la 1.ª línea', 'Abrir líneas de pase para otros jugadores de la 2.ª línea']),

  /* ---------- Bloque básico · Sumativa I ---------- */
  C('tiro', 'Tiro', 'fbi_con', 'SUMA1', 'Habilidad que permite dirigir el balón hacia la portería contraria con los pies con la intención de hacer gol.', [
    'Utilizar el interior del pie para dar precisión (tiros cercanos) y el empeine para dar potencia (tiros lejanos)', 'Adecuar la posición del cuerpo en función de la dirección que queramos dar al tiro', 'Priorizar el tiro a ras de suelo', 'Utilizar un tiro lento o rápido en función de la distancia con el defensor más próximo'], [
    'Priorizar la fijación del tiro a la potencia', 'Dar continuidad después del tiro a portería (buscar el rechace)', 'Tirar siempre que no exista una mejor posición de tiro para otro compañero']),
  C('pared', 'Pared', 'fbi_con', 'SUMA1', 'Habilidad que permite la superación de uno o más adversarios mediante la transmisión rápida del balón entre dos compañeros.', [
    'Pasar al compañero mientras encadenamos un movimiento para recibir el balón nuevamente', 'Cambiar el ritmo acelerando después de pasar el balón', 'Devolver el balón al compañero utilizando un solo contacto (preferentemente)', 'Devolver el balón al compañero facilitándole siempre la posterior progresión'], [
    'Direccionar la pared hacia el espacio libre', 'Filtrar la devolución por debajo si hay intervalo intralineal o por arriba si no hay espacio abierto', 'Después de la devolución, moverse nuevamente para dar opción a una segunda pared']),
  C('desmarque', 'Desmarque', 'fbi_sin', 'SUMA1', 'Habilidad que permite evitar el marcaje del adversario con la finalidad de recibir el balón con ventaja.', [
    'Conseguir que el defensor pierda de vista a nosotros o al balón', 'Realizar un movimiento previo hacia los espacios contrarios a donde se va a realizar el desmarque', 'Utilizar fintas de más de 3 apoyos', 'Combinar velocidades moderadas y altas'], [
    'Desmarcarse utilizando trayectorias diagonales', 'Dirigir los movimientos hacia portería sin entrar en fuera de juego (timing correcto)', 'Buscar rápidamente la espalda de los defensores cuando quedan atraídos por el balón']),
  C('cobertura_ofensiva', 'Cobertura ofensiva', 'fbi_sin', 'SUMA1', 'Habilidad que permite estar en disposición de recuperar el balón o frenar la progresión del rival en caso de pérdida.', [
    'Interpretar el timing y el tipo de acción individual que realizará el posesor', 'No pegarse al posesor en la ayuda', 'Priorizar la ayuda hacia los espacios interiores', 'Anticipar el movimiento de ayuda a la pérdida de balón'], [
    'Seguir la trayectoria de la acción individual del posesor, manteniendo siempre la distancia', 'En caso de recuperar el balón, jugar con seguridad a uno o dos toques', 'Frenar la progresión del rival para dar tiempo a las ayudas, o hacer una falta táctica si no llegan']),
  C('temporizacion', 'Temporización', 'fbi_sin', 'SUMA1', 'Habilidad que permite ajustar (retardar) una acción a la situación de juego, defensiva u ofensiva.', [
    'Priorizar la defensa del espacio a la recuperación del balón con un movimiento hacia atrás (DEF)', 'Mantener el centro de gravedad bajo y una gran frecuencia de pasos (DEF)', 'Añadir pasos, nunca cruzar la carrera (DEF)', 'Ralentizar la acción para dar tiempo a la ayuda de los compañeros (OF)'], [
    'Reorganizarse cuando llega la ayuda de los compañeros (DEF)', 'Reducir la velocidad del juego para ajustarla al timing requerido (OF)', 'Frenar la progresión del equipo para permitir su reorganización (OF)']),
  C('reequilibrio', 'Reequilibrio defensivo', 'fbi_sin', 'SUMA1', 'Habilidad que consiste en ajustar los desequilibrios defensivos durante la fase defensiva del juego.', [
    'Restablecer la posición por detrás del balón si este nos supera', 'Recuperar rápidamente nuestra posición si salimos de ella por cualquier circunstancia del juego', 'Permutar con un compañero que ha salido a nuestra ayuda una vez hemos sido superados', 'Cerrar los espacios próximos a portería con un movimiento hacia ella si somos superados y no recibimos ayuda'], [
    'Priorizar el reequilibrio de los espacios próximos al carril central, sobre todo cerca de nuestra portería', 'Bascular en conjunto para equilibrar la línea cuando un compañero sale temporalmente de ella', 'Reorganizar la línea cuando un compañero sale permanentemente de ella (durante una fase del juego)']),
  C('triangulo_disuasion', 'Triángulo defensivo: disuasión', 'fbi_sin', 'SUMA1', 'Defender al atacante sin balón cercano al centro de juego, formando un triángulo entre el defensor, el posesor y el atacante a marcar.', [
    'Disuadir la recepción del atacante sin balón cercano al posesor', 'Ajustar la distancia de marcaje según la distancia a la que se encuentre el balón', 'Orientar el cuerpo lateralmente para observar el marcaje y el balón al mismo tiempo', 'Encadenar los cambios de posición del triángulo defensivo'], [
    'Evitar que el atacante sin balón nos gane la espalda para recibir', 'Realizar fintas de acoso y disuasión para confundir al posesor', 'Establecer una posición de equilibrio dentro del sistema al realizar el triángulo defensivo']),
  C('superioridad', 'Superioridad numérica', 'fbc', 'SUMA1', 'Organización del equipo en el espacio que le permite obtener ventajas en número de jugadores respecto al contrario.', [
    'Solucionar situaciones de 2 contra 1 pasando o progresando (OF)', 'Solucionar situaciones de 1 contra 2 fintando la disuasión y el acoso mientras se temporiza a la espera de ayudas (DEF)',
    'Solucionar un 3 contra 2 convirtiéndolo en un 2 contra 1 (OF)', 'Solucionar un 2 contra 3 con posiciones intermedias sin ser fijados y cerrando el carril central (DEF)'], [
    'Fijar a un contrario con la conducción para crear un espacio a su espalda donde un compañero reciba con ventaja (OF)', 'Fijar a un contrario en el carril lateral para aprovechar el doblamiento del compañero, 2 contra 1 (OF)',
    'Retroceder temporizando en embudo ante inferioridad numérica, formando un triángulo invertido hasta la frontal del área (DEF)']),
  C('cambios_orientacion', 'Cambios de orientación', 'fbc', 'SUMA1', 'Llevar el balón desde un espacio con gran densidad de jugadores (un carril lateral) hasta otro espacio libre (el carril lateral opuesto).', [
    'Densificar un espacio jugando en corto para atraer a más adversarios hacia el centro de juego', 'Salir de la presión contraria encontrando un espacio por donde realizar el cambio de orientación',
    'Cambiar la orientación del juego de forma directa con un desplazamiento del balón en largo', 'Ocupar los espacios libres en amplitud para recibir el cambio de orientación'], [
    'Cambiar el balón de carril después de 4 o más contactos (individuales o colectivos)', 'Realizar un cambio de orientación indirecto pivotando previamente con un jugador del carril central',
    'Abortar el cambio de juego redirigiendo la acción hacia el carril central si el rival bascula de forma anticipada']),
  C('presion', 'Presión', 'fbc', 'SUMA1', 'Avanzar la posición del equipo de forma coordinada con la finalidad de recuperar la posesión del balón.', [
    'Iniciar la presión cuando el balón entra en un carril lateral o hay un mal control del adversario', 'Cerrar el centro de juego acosando fuertemente al posesor',
    'Disuadir al resto de jugadores cercanos al centro de juego que pueden recibir de forma directa', 'Asegurar los 3 primeros pases posteriores a la recuperación del balón'], [
    'Defender individualmente a los jugadores lejanos al centro de juego por si hay un envío en largo del posesor presionado', 'Abrir los pases hacia el carril lateral y en vertical para recuperar el balón más fácilmente',
    'Abrir los pases al carril central cuando hay superioridad en esa zona y rivales recibiendo de espaldas']),
  C('bloque', 'Jugar en bloque', 'fbc', 'SUMA1', 'Organización del equipo, ofensiva y defensiva, que permite a sus líneas estar siempre equilibradas y a sus jugadores ayudarse constantemente.', [
    'Movimientos de basculación del equipo en vertical (DEF)', 'Movimientos de basculación del equipo en horizontal (DEF)', 'Acompañar al ataque después de un juego directo desde la línea defensiva (OF)', 'Viajar con el balón avanzando todo el equipo de forma progresiva y organizada (OF)'], [
    'Establecer posiciones diagonales con las líneas posterior y anterior formando rombos y triángulos (OF)', 'Establecer posiciones diagonales con los compañeros cerrando las líneas de pase existentes (DEF)',
    'Preparar la transición ofensiva-defensiva compactando al equipo en la zona donde se prevé la pérdida']),

  /* ---------- Bloque básico · Sumativa II ---------- */
  C('centro', 'Centro', 'fbi_con', 'SUMA2', 'Habilidad que permite dirigir el balón desde una zona lateral a un compañero en el carril central con disposición de rematar.', [
    'Levantar la cabeza buscando al jugador mejor posicionado para recibir el centro', 'Encadenar la carrera y el golpeo en la acción de centro', 'Evitar la temporización para impedir la colocación de la defensa', 'Ajustar el centro a la trayectoria del compañero, siempre por delante de su posición'], [
    'Centrar fuera de la zona de influencia del portero', 'Superar la posición de los primeros defensores, por arriba o por abajo', 'Utilizar efectos para alejar o acercar el balón a la portería durante su recorrido']),
  C('cabeceo', 'Cabeceo', 'fbi_con', 'SUMA2', 'Habilidad que permite enviar el balón con la cabeza hacia la portería o hacia un compañero, o defender un espacio.', [
    'Utilizar una finta previa al cabeceo para ganar unos metros al defensor directo', 'Atacar el balón con determinación, no esperarlo', 'Ajustar el timing del cabeceo con la llegada del balón', 'Utilizar la frente como superficie de contacto girando el cuello hacia donde se quiera dirigir el balón'], [
    'Utilizar el cuerpo y los brazos para ganar la posición si se está defendido fuertemente', 'Abrir los brazos y balancear el cuerpo en el aire para cabecear con más eficacia', 'Priorizar la dirección del cabeceo hacia el suelo']),
  C('doblamiento', 'Doblamiento', 'fbi_sin', 'SUMA2', 'Habilidad que permite superar la posición en profundidad de un compañero, con o sin la posesión del balón.', [
    'Doblar en los cambios de orientación para aprovechar la ventaja espacial', 'Doblar cuando se crea un espacio en nuestro carril gracias a un movimiento de arrastre', 'Iniciar la acción justo cuando el posesor se dirige a fijar al defensor', 'Ajustar el timing de la superación con el pase del posesor'], [
    'Doblar al posesor por fuera para generar superioridad numérica en ataque', 'Doblar al posesor por dentro para crearle un espacio de progresión', 'Doblar con el balón si el espacio de progresión permite superar una línea contraria']),
  C('creacion_ocupacion', 'Creación y ocupación de espacios', 'fbi_sin', 'SUMA2', 'Dejar un espacio libre de adversarios para seguidamente utilizarlo.', [
    'Arrastrar a un contrario fuera de su posición para generar un espacio libre (creación)', 'Abrir una línea de pase hacia otro compañero si el defensor no nos deja recibir (creación)',
    'Moverse al espacio libre con un timing correcto, sin llegar temprano ni tarde (ocupación)', 'Combinar posicionamiento a velocidad moderada con movimientos rápidos para ocupar el espacio libre (ocupación)'], [
    'Moverse en dirección contraria a la del posesor para ofrecerle más espacio (creación)', 'Aprovechar los espacios útiles, no los grandes (ocupación)', 'Coordinar a la vez movimientos de creación y de ocupación']),
  C('desdoblamiento', 'Desdoblamiento', 'fbi_sin', 'SUMA2', 'Habilidad que consiste en ajustar los desequilibrios del sistema durante la fase ofensiva.', [
    'Mantener la posición como jugador doblado para restablecer parcialmente el equilibrio defensivo', 'Permutar la posición con el jugador que nos dobla para restablecer totalmente el equilibrio',
    'Ajustar parcialmente el equilibrio del espacio cercano a una acción de doblamiento (cuando no somos doblados)', 'Recuperar la posición inicial de forma progresiva a medida que el compañero vuelve a la suya'], [
    'Ajustar el equilibrio del espacio trasero cuando un central de mi línea se incorpora al ataque', 'Bascular en conjunto cuando un lateral de la línea se incorpora a la línea posterior', 'Priorizar la protección de los espacios centrales']),
  C('triangulo_interceptacion', 'Triángulo defensivo: interceptación', 'fbi_sin', 'SUMA2', 'Defender al atacante sin balón lejano al centro de juego, formando un triángulo entre el defensor, el posesor y el atacante a marcar.', [
    'Ajustar la distancia de marcaje según la distancia a la que se encuentre el balón', 'Orientar el cuerpo lateralmente para observar el marcaje y el balón al mismo tiempo',
    'Interceptar la recepción del atacante sin balón si se puede actuar sobre el balón de forma segura', 'Encadenar los cambios de posición del triángulo defensivo'], [
    'Mantener siempre la bisectriz con la portería', 'Establecer una posición de equilibrio dentro del sistema', 'Desplazarse rápidamente para reducir las opciones del receptor si el balón supera nuestra posición']),
  C('contraataque', 'Contraataque', 'fbc', 'SUMA2', 'Organización ofensiva en rápida progresión hacia los espacios libres justo después de la recuperación del balón.', [
    'El primer pase después de la recuperación debe ser seguro pero en progresión, en corto o en largo', 'Dirigir todas las acciones, con y sin balón, hacia delante, nunca hacia atrás o en horizontal',
    'Priorizar el pase y los movimientos sin balón a las conducciones largas, salvo para fijar a un adversario', 'Llevar el balón al centro del ataque para jugar la secuencia dentro-fuera-dentro'], [
    'No terminar el contraataque con los balones orientados hacia los carriles laterales', 'Al entrar en el área rival, finalizar lo más rápido posible', 'Todo el equipo acompaña la acción para no quedar roto si se pierde la opción de contraataque']),
  C('segunda_jugada', 'Segunda jugada', 'fbc', 'SUMA2', 'Organización cercana al balón para hacerse con la posesión después de una primera disputa con el rival.', [
    'Tras un balón aéreo, formar un triángulo de 3 jugadores alrededor de la disputa: derecha, izquierda y detrás (OF)', 'En disputa aérea ofensiva, tener un jugador que ataque la profundidad por si el balón es prolongado (OF)',
    'Retrasar la posición de los compañeros próximos al jugador que disputa el balón aéreo (DEF)', 'No dejar botar los balones aéreos en nuestra zona, sin invadir la zona de otros compañeros (DEF)'], [
    'Con ventaja en la disputa aérea, dirigir el balón directamente a un compañero (OF/DEF)', 'Tras ganar el balón, acercarse al posesor para darle salida hacia una zona menos densificada (OF)', 'Que la disputa aérea la haga una línea que no sea la más atrasada (DEF)']),
  C('defensa_posicional', 'Defensa posicional', 'fbc', 'SUMA2', 'Defender los espacios de forma mixta dificultando la progresión del contrario con el balón controlado hacia nuestra portería.', [
    'Distribución racional de los espacios combinando la defensa zonal con la presión individual', 'Defensa mixta en bloque alto', 'Defensa mixta en bloque medio', 'Mantener siempre al posesor presionado para dificultar su juego'], [
    'Defensa mixta en bloque bajo', 'Posiciones escaladas de las líneas (excepto la defensiva) para defender los espacios', 'Cambios de jugadores entre líneas para equilibrar de forma dinámica la defensa de los espacios']),
  C('circulacion', 'Estrategias de circulación del balón', 'fbc', 'SUMA2', 'Continuar con la posesión controlada del balón ante una presión alta del rival (E1: apoyo al presionado · E2: abrir espacio de progresión).', [
    'E1 · Ayudar rápidamente con un apoyo al compañero fuertemente presionado', 'E1 · El apoyo debe ser lo más rápido posible y en cualquier dirección',
    'E1 · Si no nos sigue ningún defensor, girarse y jugar en progresión', 'E1 · Si nos sigue un defensor, jugar al primer toque hacia la zona libre que deja la basculación rival'], [
    'E2 · Ante presión a la línea defensiva y media, abrir un espacio para la progresión del balón', 'E2 · Arrastrar a un medio rival para abrir un espacio entre su línea defensiva y su línea de delanteros',
    'E2 · Atacar el espacio creado desde la línea más avanzada justo cuando el balón sale de la línea defensiva', 'E2 · Tras el arrastre del medio, apoyar por detrás el juego de la línea más avanzada']),
];
const CONTENT = Object.fromEntries(CONTENTS.map(c => [c.id, c]));

/* Consignas de un contenido en orden de progresión */
function consignasOf(id) {
  const c = CONTENT[id]; if (!c) return [];
  if (c.roles) return Object.entries(c.roles).flatMap(([r, l]) => l.map(t => ({ t, level: ROLES[r] })));
  return [...c.simple.map(t => ({ t, level: 'Simple' })), ...c.adv.map(t => ({ t, level: 'Avanzada' }))];
}
function contentLabel(id) { const c = CONTENT[id]; return c ? c.name : (id || ''); }
function contentsFor(cat, stage, all) {
  return CONTENTS.filter(c => (!cat || c.cat === cat) && (all || !stage || !c.stage || STAGE_IDX[c.stage] <= STAGE_IDX[stage]))
    .sort((a, b) => ((b.stage === stage) - (a.stage === stage)) || ((STAGE_IDX[a.stage] ?? -1) - (STAGE_IDX[b.stage] ?? -1)));
}

/* ---------- Estrategias didácticas y fases de la sesión ---------- */
const STRATEGIES = {
  circuito: 'Circuito', coordinativo: 'Juego coordinativo', analitico: 'Ejercicio analítico',
  rondo: 'Rondo', duelos: 'Duelos', posesion: 'Juego de posesión',
  posicion: 'Juego de posición', invasion: 'Juego de invasión discontinua', real: 'Juego real condicionado',
};
const PHASES = [
  ['info', 'Información', [], 'Presentar el contenido, la consigna y los objetivos de la sesión'],
  ['act', 'Activación', ['circuito', 'coordinativo', 'analitico'], 'HMB/HME, habilidades perceptivas o de gestión del espacio'],
  ['p1', 'Principal 1', ['rondo', 'duelos', 'posesion'], 'Contenido y consigna asignados'],
  ['p2', 'Principal 2', ['posicion', 'invasion'], 'Mismo contenido y consigna, mayor contexto de juego'],
  ['p3', 'Principal 3', ['real'], 'Aplicación en juego real condicionado'],
  ['vuelta', 'Vuelta a la calma y reflexión', [], 'Preguntas sobre lo aprendido y cierre'],
];
const PHASE = Object.fromEntries(PHASES.map(p => [p[0], p]));
const OLD_PHASE = { calentamiento: 'act', principal: 'p1', vuelta: 'vuelta' };
const normPhase = ph => PHASE[ph] ? ph : (OLD_PHASE[ph] || 'p1');
const SCORING = {
  porteria: { name: 'Puntuar en la portería', allowed: ['invasion', 'real'] },
  llegar: { name: 'Llegar a un espacio', allowed: ['invasion', 'posesion'] },
  pasar: { name: 'Pasar por un espacio', allowed: ['posesion'] },
  otro: { name: 'Otra forma', allowed: null },
};
const STYLES = { mando: 'Mando directo', descubrimiento: 'Descubrimiento guiado', mixto: 'Mixto' };

/* ---------- Test ludológico: descriptores por sub-etapa ---------- */
const LUDO_IND = {
  AB: { name: 'Atacante con balón', d: {
    EGO1: 'Progresa constantemente de forma individual con conducción y regate. Juega en emergencia protegiendo el balón, girando sobre él o rechazándolo. Puede circular en corto de forma involuntaria o en máxima emergencia (se la quita de encima).',
    EGO2: 'Incorpora el pase en corto cuando no tiene opciones de conducir o progresar hacia delante. De espaldas a la portería rival puede usar el pase para deshacerse del balón.',
    SUMA1: 'Combina correctamente pase y regate según la situación (buena elección). Usa intencionadamente el pase atrás en emergencia (reinicia el juego). Ya usa el pase en largo en situaciones evidentes en el mismo carril.',
    SUMA2: 'Progresa colectivamente en corto y en largo con el pase de forma acertada. Usa pases largos para cambiar la orientación del juego. Se sirve del regate para desequilibrar cuando no hay otra posibilidad de progresión.' } },
  ASB: { name: 'Atacante sin balón', d: {
    EGO1: 'Si está cerca del balón se pega al posesor para hacerse con el balón mediante el control simple. Si está lejos no participa del juego (queda aislado).',
    EGO2: 'Se muestra en disposición de actuar sobre el balón con cierta distancia. Incorpora el control orientado (ya no para por completo el balón). Busca la recepción con el apoyo evidente.',
    SUMA1: 'Busca la recepción con apoyos en espacios favorables o en emergencias del posesor. Ya usa el desmarque ante ventaja espacial evidente. No realiza coberturas ofensivas evidentes.',
    SUMA2: 'Realiza desmarques complejos (incluso creándose el espacio previamente). Utiliza coberturas ofensivas. Usa el doblamiento para apoyar al posesor y generar superioridades.' } },
  DAB: { name: 'Defensor del atacante con balón', d: {
    EGO1: 'Quiere recuperar inmediatamente con la entrada, entrando de golpe al posesor y siendo desbordado fácilmente o haciendo falta.',
    EGO2: 'Reduce mejor la distancia con el posesor en el acoso, aunque es superado mediante pase. Duda entre entrar o acosar. No temporiza.',
    SUMA1: 'Selecciona bien cuándo entrar para recuperar y cuándo acosar para evitar la progresión. Temporiza ante inferioridad numérica pero tiene problemas para orientar al posesor. En desventaja espacial no temporiza, acosa intensamente.',
    SUMA2: 'Temporiza adecuadamente ante inferioridad numérica en todas las zonas (aún no en desventaja espacial). Restablece los desequilibrios manteniendo equilibrada la zona próxima a su portería. Acosa intensamente en la zona de riesgo. Presiona tras pérdida.' } },
  DASB: { name: 'Defensor del atacante sin balón', d: {
    EGO1: 'Si está cerca del balón va directamente a por él (haya o no compañero defensor). Si está lejos no participa del juego (queda aislado).',
    EGO2: 'Cerca del balón tiene problemas para defender a su marca y queda absorbido por el balón. Lejos del balón ya identifica a su oponente y lo marca (sin control constante). Hace la cobertura defensiva cuando está cerca del balón.',
    SUMA1: 'Hace coberturas defensivas eficaces controlando la distancia a la propia portería. Lejos del centro de juego busca evitar la recepción del oponente (disuasión), ajustando su distancia en todo momento (marcaje).',
    SUMA2: 'Cerca del balón usa el triángulo defensivo para evitar la recepción de su marca y además hacer cobertura (ambas a la vez). Lejos del balón también usa el triángulo defensivo para interceptar el envío a su oponente.' } },
};
const LUDO_TEAM = {
  OF: { name: 'Fase ofensiva', d: {
    EGO1: 'El equipo no abre los espacios ni a lo ancho ni a lo largo. Está muy próximo al balón, pierde su organización y deja jugadores sin participar.',
    EGO2: 'El equipo abre los espacios a lo ancho y a lo largo, pero aún no circula el balón con fluidez. Se organiza sin estar próximo al balón, pero aún deja jugadores sin participar.',
    SUMA1: 'Abre los espacios y circula con fluidez, pero no usa cambios de orientación para buscar espacios libres y ventajas numéricas. Se organiza ocupando todas las posiciones y participan todos.',
    SUMA2: 'Usa los cambios de orientación para buscar espacios libres y ventajas numéricas. Intercambia posiciones con movimientos de reorganización, excepto en las transiciones.' } },
  DEF: { name: 'Fase defensiva', d: {
    EGO1: 'El equipo no cierra los espacios ni a lo ancho ni a lo largo; solo se acumula alrededor del centro de juego.',
    EGO2: 'Cierra los espacios a lo ancho pero no a lo largo. No intenta recuperar el balón de forma colectiva, sino individual.',
    SUMA1: 'Cierra bien los espacios de juego, pero sigue intentando recuperar el balón de forma individual.',
    SUMA2: 'Mantiene un bloque compacto para intentar recuperar el balón de forma colectiva.' } },
};
/* Sub-etapa predominante de una lista (empate → la más primaria) */
function predominant(list) {
  const v = list.filter(Boolean); if (!v.length) return null;
  const cnt = {}; v.forEach(s => cnt[s] = (cnt[s] || 0) + 1);
  return Object.keys(cnt).sort((a, b) => (cnt[b] - cnt[a]) || (STAGE_IDX[a] - STAGE_IDX[b]))[0];
}
/* Regla del documento para el resultado final del equipo (ofensiva + defensiva) */
function ludoFinal(a, b) {
  if (!a || !b) return { stage: a || b || null, note: a || b ? 'Falta evaluar una fase' : '' };
  if (a === b) return { stage: a, note: 'Coinciden ambas fases' };
  if (Math.abs(STAGE_IDX[a] - STAGE_IDX[b]) === 1) { const s = STAGE_IDX[a] < STAGE_IDX[b] ? a : b; return { stage: s, note: 'Fases correlativas: define la más primaria' }; }
  return { stage: null, note: 'Fases no correlativas: repetir el test desde el inicio', repeat: true };
}
/* Resultado individual sugerido: la sub-etapa predominante entre los 4 roles (el entrenador puede corregirlo) */
function ludoIndResult(ev) { return predominant(['AB', 'ASB', 'DAB', 'DASB'].map(k => ev[k])); }

/* ---------- Microciclo de alto rendimiento (perspectiva Coaches' Voice) ---------- */
const MD_GUIDE = {
  'MD-5': 'Recuperación o compensatorio para quien no jugó. Volumen bajo.',
  'MD-4': 'Día de tensión: espacios reducidos, mucha densidad, acciones de fuerza (aceleraciones, frenadas, duelos).',
  'MD-3': 'Día de duración: espacios amplios, juego real o casi real, mayor volumen de carrera.',
  'MD-2': 'Día de velocidad: tareas cortas con descansos completos, contenidos tácticos del rival.',
  'MD-1': 'Activación y estrategia: baja carga, velocidad de reacción, balón parado y repaso del plan de partido.',
  'MD': 'Partido.', 'MD+1': 'Recuperación activa de los titulares y compensatorio para los no titulares.',
  'MD+2': 'Descanso o compensatorio.', 'Pretemporada': 'Desarrollo progresivo de la carga.', 'Libre': '',
};
const RPE_BY_INT = { baja: 3, media: 5, alta: 7, maxima: 9 };
