'use strict';
/*
  Batería de ejercicios ORIGINALES de esta app.
  Coordenadas en metros: campo de 105 x 68. El equipo A ataca hacia la derecha (x = 105).
  objs:  [id, tipo, x, y, número]   tipo: A | B | GA | GB (porteros) | ball | cone | goal | pole
  steps: cada paso = { d: dibujos que se muestran ANTES del movimiento, m: {id:[x,y]} posiciones nuevas }
  dibujos: ['dash'|'arrow'|'zig'|'line'|'rect'|'circle', x1,y1, x2,y2]
    dash = pase, arrow = carrera sin balón, zig = conducción
  Para añadir tus propios ejercicios fijos, copia uno de estos bloques y cámbialo.
*/
const DRILLS = [
{
  title: 'Rondo 4 contra 2', cat: 'Posesión', pitch: 'half',
  desc: 'Cuadrado de 15x15 m. Cuatro jugadores en los lados mantienen el balón; dos defensores presionan. Máximo dos toques.',
  objs: [
    ['c1','cone',67.5,26.5],['c2','cone',82.5,26.5],['c3','cone',82.5,41.5],['c4','cone',67.5,41.5],
    ['a1','A',75,26.5,7],['a2','A',82.5,34,8],['a3','A',75,41.5,10],['a4','A',67.5,34,6],
    ['b1','B',73,33,4],['b2','B',77,35,5],['bal','ball',75,27.6],
  ],
  steps: [
    { d: [['dash',75,27.6,81.4,34],['arrow',73,33,78,31]], m: { bal:[81.4,34], b1:[78,31], b2:[76,36] } },
    { d: [['dash',81.4,34,75,40.4],['arrow',78,31,79,36]], m: { bal:[75,40.4], b1:[79,36], b2:[73,38] } },
    { d: [['dash',75,40.4,68.6,34],['arrow',73,38,70,35]], m: { bal:[68.6,34], b2:[70,35], b1:[75,36] } },
    { d: [['dash',68.6,34,75,27.6]], m: { bal:[75,27.6], b1:[75,31], b2:[71,32] } },
  ],
},
{
  title: 'Pared y finalización', cat: 'Ataque', pitch: 'half',
  desc: 'Pase al pivote, desmarque de ruptura a la espalda del defensor, devolución y remate. Trabajar ambos perfiles.',
  objs: [['a1','A',70,30,8],['a2','A',80,38,9],['b1','B',78,30,5],['gk','GB',104,34,1],['bal','ball',71,30]],
  steps: [
    { d: [['dash',71,30,79.2,37.4],['arrow',70,30,80,28]], m: { bal:[79.2,37.4], a1:[80,28], b1:[77,32] } },
    { d: [['dash',79.2,37.4,88,28.5],['arrow',80,28,87,28.5]], m: { bal:[88,28.5], a1:[87,28.5], b1:[80,31], a2:[81,37] } },
    { d: [['dash',88,28.5,105,31.5]], m: { bal:[104.6,31.6], gk:[104,32.6] } },
  ],
},
{
  title: 'Superioridad 2v1 por banda', cat: 'Ataque', pitch: 'half',
  desc: 'El extremo fija al lateral rival conduciendo hacia dentro, el lateral propio dobla por fuera y centra al punto de penalti.',
  objs: [['a1','A',80,8,7],['a2','A',70,12,2],['a3','A',90,34,9],['b1','B',88,10,3],['b2','B',96,32,4],['gk','GB',104,34,1],['bal','ball',80.8,8.6]],
  steps: [
    { d: [['zig',80.8,8.6,85,10],['arrow',70,12,92,5]], m: { a1:[84.5,10], bal:[85.3,10.3], a2:[92,5], b1:[87,9.5] } },
    { d: [['dash',85.3,10.3,92.6,5.6],['arrow',90,34,98,31]], m: { bal:[92.6,5.6], a3:[98,31], b1:[89,8], b2:[97,33] } },
    { d: [['dash',92.6,5.6,98,30.4]], m: { bal:[98,30.4] } },
    { d: [['dash',98,30.4,105,36.5]], m: { bal:[104.6,36.4], gk:[104,35] } },
  ],
},
{
  title: 'Salida de balón 4-3-3', cat: 'Construcción', pitch: 'full',
  desc: 'Salida corta ante presión 4-4-2: portero a central, central a lateral, apoyo del interior que baja y pase vertical al extremo.',
  objs: [
    ['gk','GA',3,34,1],['cb1','A',14,26,4],['cb2','A',14,42,5],['lb','A',20,8,3],['rb','A',20,60,2],
    ['dm','A',26,34,6],['cl','A',34,22,10],['cr','A',34,46,8],['wl','A',48,8,11],['wr','A',48,60,7],['st','A',50,34,9],
    ['b9','B',32,28,9],['b10','B',32,40,10],['b11','B',42,10,11],['b7','B',42,58,7],['b6','B',46,30,6],['b8','B',46,38,8],
    ['bal','ball',4.2,34],
  ],
  steps: [
    { d: [['dash',4.2,34,13.5,41.5]], m: { bal:[14,41.2], b10:[22,40] } },
    { d: [['dash',14,41.2,21,59.3],['arrow',34,46,30,50]], m: { bal:[21,59.3], b10:[17,46], b7:[32,57], cr:[30,50] } },
    { d: [['dash',21,59.3,29.6,50.4]], m: { bal:[29.6,50.4], b7:[25,56], b8:[38,44] } },
    { d: [['dash',29.6,50.4,54,58.5],['arrow',48,60,54,58]], m: { bal:[54,58.5], wr:[54,58] } },
  ],
},
{
  title: 'Presión alta tras saque del portero', cat: 'Defensa', pitch: 'full',
  desc: 'El delantero presiona con curva para orientar el juego hacia la banda; el extremo salta al lateral y roba. Finalización rápida.',
  objs: [
    ['gkb','GB',102,34,1],['bc1','B',91,24,4],['bc2','B',91,44,5],['bfl','B',85,6,2],['bfr','B',85,62,3],['bdm','B',80,34,6],
    ['st','A',75,34,9],['wl','A',72,12,11],['wr','A',72,56,7],['cm','A',66,34,8],['bal','ball',100.8,34],
  ],
  steps: [
    { d: [['dash',100.8,34,91.8,24.6],['arrow',75,34,87,28]], m: { bal:[90.8,24.6], st:[87,28], wl:[80,12], cm:[75,32] } },
    { d: [['dash',90.8,24.6,85,7.2],['arrow',80,12,84.2,9]], m: { bal:[85,7.2], wl:[84.2,9], st:[87,20], cm:[79,28], bdm:[82,30] } },
    { d: [['arrow',84.2,9,85.5,7.5]], m: { wl:[85.6,7.8], bal:[86.6,7.6], bfl:[84,6] } },
    { d: [['dash',86.6,7.6,92.5,27],['arrow',87,20,92,27]], m: { bal:[92.5,27], st:[92,27] } },
    { d: [['dash',92.5,27,105,32.5]], m: { bal:[104.6,32.5], gkb:[103.5,33.5] } },
  ],
},
{
  title: 'Contraataque 3 contra 2', cat: 'Transición', pitch: 'full',
  desc: 'Tras recuperar, el central conduce fijando, los dos extremos atacan los carriles y se finaliza en menos de 10 segundos.',
  objs: [['a1','A',40,34,10],['a2','A',38,12,11],['a3','A',36,56,7],['b1','B',70,28,4],['b2','B',70,40,5],['gk','GB',103,34,1],['bal','ball',41,34]],
  steps: [
    { d: [['zig',41,34,60,34],['arrow',38,12,62,14],['arrow',36,56,62,54]], m: { a1:[59,34], bal:[60,34], a2:[62,14], a3:[62,54], b1:[76,30], b2:[76,38] } },
    { d: [['zig',60,34,74,34],['arrow',62,14,84,22],['arrow',62,54,84,46]], m: { a1:[73,34], bal:[74,34], a2:[84,22], a3:[84,46], b1:[80,31], b2:[80,37] } },
    { d: [['dash',74,34,84,45.4]], m: { bal:[84.4,45.4], b2:[83,41] } },
    { d: [['dash',84.4,45.4,105,37]], m: { bal:[104.6,37], gk:[104,36] } },
  ],
},
{
  title: 'Cambio de orientación', cat: 'Ataque', pitch: 'full',
  desc: 'Atraer en un lado, apoyo del mediocentro y cambio largo al extremo libre del lado débil. Conducción, centro y remate.',
  objs: [
    ['a1','A',60,12,8],['a2','A',66,58,7],['a3','A',55,34,6],['a4','A',75,34,9],
    ['b1','B',64,16,7],['b2','B',68,22,8],['b3','B',66,30,6],['b4','B',72,14,2],['b5','B',80,44,3],['gk','GB',104,34,1],
    ['bal','ball',61,12.5],
  ],
  steps: [
    { d: [['dash',61,12.5,55.8,33.2]], m: { bal:[55.8,33.4], b2:[62,26], b3:[60,31] } },
    { d: [['dash',55.8,33.4,70,57],['arrow',66,58,70,57.5]], m: { bal:[70,57], a2:[70,57.5], b5:[78,50] } },
    { d: [['zig',70,57,84,52],['arrow',75,34,90,36]], m: { a2:[83,52.5], bal:[84,52], a4:[90,36], b5:[85,49] } },
    { d: [['dash',84,52,90.5,36.5]], m: { bal:[90.5,36.5] } },
    { d: [['dash',90.5,36.5,105,33]], m: { bal:[104.6,33], gk:[104,34.5] } },
  ],
},
{
  title: 'Córner ofensivo: bloqueo y primer palo', cat: 'Balón parado', pitch: 'half',
  desc: 'Tres atacantes arrancan desde el borde del área con carreras cruzadas; el balón va tenso al primer palo para el cabezazo.',
  objs: [
    ['k','A',105.6,68.6,7],['a2','A',88,30,4],['a3','A',88,36,9],['a4','A',90,42,5],['a5','A',86,24,10],
    ['b1','B',99,30,2],['b2','B',99,36,6],['b3','B',97,42,3],['gk','GB',104,34,1],['bal','ball',104.6,67.4],
  ],
  steps: [
    { d: [['arrow',88,30,99,38],['arrow',88,36,101,31],['arrow',90,42,98,45],['dash',104.6,67.4,99.6,38.2]],
      m: { a2:[99,38], a3:[101,31], a4:[98,45], bal:[99.6,38.6], b1:[100,33], b2:[98.6,36.6] } },
    { d: [['dash',99.6,38.6,105,31]], m: { bal:[104.6,31], gk:[104,35] } },
  ],
},
{
  title: 'Tiro libre frontal con amago', cat: 'Balón parado', pitch: 'half',
  desc: 'Un jugador pasa por encima del balón para mover la barrera y al portero; el lanzador golpea al palo del portero.',
  objs: [
    ['bal','ball',80,30],['w1','B',89.2,30.6,4],['w2','B',89,31.8,6],['w3','B',88.8,33,8],['w4','B',88.6,34.2,5],
    ['a1','A',78,29,10],['a2','A',78,31.6,7],['a3','A',95,40,9],['b5','B',95,41,3],['gk','GB',104,35,1],
  ],
  steps: [
    { d: [['arrow',78,31.6,83,30.4]], m: { a2:[83,30.4] } },
    { d: [['dash',80,30,105,31]], m: { bal:[104.6,31], gk:[104,32.5], a1:[80.5,30] } },
  ],
},
{
  title: 'Repliegue y basculación de la línea de 4', cat: 'Defensa', pitch: 'full',
  desc: 'Ante conducción rival la línea defensiva retrocede junta; cuando el balón va a banda, el lateral sale y la línea bascula.',
  objs: [
    ['d1','A',45,10,3],['d2','A',42,26,4],['d3','A',42,42,5],['d4','A',45,58,2],['m1','A',55,20,10],['m2','A',55,34,6],['m3','A',55,48,8],
    ['b1','B',60,34,10],['b2','B',62,12,11],['b3','B',62,56,7],['bal','ball',59,34],
  ],
  steps: [
    { d: [['arrow',45,10,30,12],['arrow',42,26,28,27],['arrow',42,42,28,41],['arrow',45,58,30,56],['zig',59,34,48,34]],
      m: { d1:[30,12], d2:[28,27], d3:[28,41], d4:[30,56], m1:[40,22], m2:[41,34], m3:[40,46], b1:[49,34], bal:[48,34], b2:[46,12], b3:[46,58] } },
    { d: [['dash',48,34,45.5,57.4]],
      m: { bal:[45.5,57.4], d4:[40,57], d3:[29,47], d2:[28,36], d1:[30,24], m3:[44,52], m2:[40,40], m1:[40,30] } },
  ],
},
{
  title: 'Circuito de conducción y tiro', cat: 'Calentamiento', pitch: 'half',
  desc: 'Slalom entre conos con ambos perfiles, salida en conducción y remate. Series de 6 repeticiones por pie.',
  objs: [
    ['c1','cone',65,24],['c2','cone',70,24],['c3','cone',75,24],['c4','cone',80,24],['c5','cone',85,24],
    ['a1','A',60,24,7],['gk','GB',104,34,1],['bal','ball',61,24],
  ],
  steps: [
    { d: [['zig',61,24,67.5,21]], m: { a1:[66.5,21], bal:[67.5,21] } },
    { d: [['zig',67.5,21,72.5,27]], m: { a1:[71.5,27], bal:[72.5,27] } },
    { d: [['zig',72.5,27,77.5,21]], m: { a1:[76.5,21], bal:[77.5,21] } },
    { d: [['zig',77.5,21,82.5,27]], m: { a1:[81.5,27], bal:[82.5,27] } },
    { d: [['zig',82.5,27,88,24]], m: { a1:[87,24], bal:[88,24] } },
    { d: [['dash',88,24,105,32]], m: { bal:[104.6,32], gk:[104,33] } },
  ],
},
];
