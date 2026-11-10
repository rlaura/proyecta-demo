/*
 * ============================================================
 * PROYECTA - DATOS DE DEMOSTRACIÓN
 * ============================================================
 * Todos los nombres y datos son ficticios.
 * La demo trabaja sobre una copia de estos datos en la memoria
 * del navegador: los cambios no se guardan en ningún servidor.
 */

const HOY_DEMO = '2026-10-28';

function datosIniciales() {

    const d = {
        hoy: HOY_DEMO,
        sig: 1000, // próximo id para lo que se cree en la demo

        docente: { nombre: 'Docente', apellido: 'Demo' },

        curso: {
            id: 1,
            nombre: '7.º 5.ª',
            materia: 'Prácticas Profesionalizantes',
            orientacion: 'Programación',
            institucion: 'Escuela de demostración',
            horasRequeridas: 200,
            horario: { 1: 3, 4: 3 } // lunes y jueves, 3 h
        },

        roles: [
            { id: 1, nombre: 'Team leader', lider: true },
            { id: 2, nombre: 'Analista', lider: false },
            { id: 3, nombre: 'Diseñador', lider: false },
            { id: 4, nombre: 'Programador', lider: false }
        ],

        estudiantes: [
            { id: 1, apellido: 'Acosta', nombre: 'Tomás', usuario: 'tomas.acosta', equipo: 1, rol: 1 },
            { id: 2, apellido: 'Romero', nombre: 'Valentina', usuario: 'valentina.romero', equipo: 1, rol: 2 },
            { id: 3, apellido: 'Sosa', nombre: 'Camila', usuario: 'camila.sosa', equipo: 1, rol: 3 },
            { id: 4, apellido: 'Benítez', nombre: 'Lucas', usuario: 'lucas.benitez', equipo: 1, rol: 4 },
            { id: 5, apellido: 'Ruiz', nombre: 'Martina', usuario: 'martina.ruiz', equipo: 2, rol: 1 },
            { id: 6, apellido: 'Medina', nombre: 'Joaquín', usuario: 'joaquin.medina', equipo: 2, rol: 2 },
            { id: 7, apellido: 'Vera', nombre: 'Sofía', usuario: 'sofia.vera', equipo: 2, rol: 3 },
            { id: 8, apellido: 'Castro', nombre: 'Bruno', usuario: 'bruno.castro', equipo: 2, rol: 4 }
        ],

        proyecto: {
            id: 1,
            nombre: 'Sistema de gestión de la biblioteca escolar',
            descripcion: 'Aplicación web para organizar el catálogo de la biblioteca de la escuela y registrar los préstamos. Cada equipo desarrolla un módulo del sistema.',
            objetivo: 'Diseñar y desarrollar una aplicación web que permita a la biblioteca registrar su catálogo, sus socios y los préstamos.',
            alcance: 'Catálogo de libros y ejemplares, registro de socios, préstamos y devoluciones, y consultas básicas.',
            tipo: 'Interno (proyecto de extensión)',
            destinatario: 'Biblioteca de la escuela',
            enlace: 'https://drive.google.com/drive/folders/ejemplo-proyecto-biblioteca',
            inicio: '2026-08-03',
            fin: '2026-11-27'
        },

        fechas: [
            { titulo: 'Entrega del modelo de datos', tipo: 'Entrega parcial', fecha: '2026-10-30' },
            { titulo: 'Cierre del 2.º cuatrimestre', tipo: 'Otro', fecha: '2026-11-20' },
            { titulo: 'Presentación final', tipo: 'Entrega final', fecha: '2026-11-27' }
        ],

        hitos: [
            { id: 1, orden: 1, nombre: 'Investigación', inicio: '2026-08-03', limite: '2026-08-28',
              descripcion: 'Conocer el problema: cómo funciona hoy la biblioteca, qué necesita y qué sistemas similares existen.' },
            { id: 2, orden: 2, nombre: 'Análisis', inicio: '2026-08-31', limite: '2026-09-25',
              descripcion: 'Definir los requerimientos del sistema y los casos de uso principales.' },
            { id: 3, orden: 3, nombre: 'Diseño', inicio: '2026-09-28', limite: '2026-10-30',
              descripcion: 'Diseñar la solución:\n- Modelo de datos\n- Mockups de las pantallas principales' },
            { id: 4, orden: 4, nombre: 'Desarrollo', inicio: '2026-11-02', limite: '2026-11-20',
              descripcion: 'Programar el módulo que le corresponde a cada equipo.' },
            { id: 5, orden: 5, nombre: 'Presentación', inicio: '2026-11-23', limite: '2026-11-27',
              descripcion: 'Preparar y presentar el sistema funcionando.' }
        ],

        equipos: [
            { id: 1, nombre: 'Byte Builders', objetivo: 'Diseñar e implementar el módulo de catálogo de libros y ejemplares.' },
            { id: 2, nombre: 'Code Masters', objetivo: 'Diseñar e implementar el módulo de socios y préstamos.' }
        ],

        // Estado de cada equipo en cada hito: "equipo-hito"
        recorrido: {
            '1-1': 'FINALIZADO', '1-2': 'FINALIZADO', '1-3': 'EN_PROGRESO', '1-4': 'PENDIENTE', '1-5': 'PENDIENTE',
            '2-1': 'FINALIZADO', '2-2': 'EN_PROGRESO', '2-3': 'PENDIENTE', '2-4': 'PENDIENTE', '2-5': 'PENDIENTE'
        },

        actividades: [
            { id: 1, equipo: 1, hito: 1, orden: 1, titulo: 'Relevamiento de la biblioteca', descripcion: 'Entender cómo se registran hoy los libros y los préstamos.', estado: 'FINALIZADA', entrega: '2026-08-24', cierre: '2026-08-24' },
            { id: 2, equipo: 1, hito: 2, orden: 1, titulo: 'Requerimientos del sistema', descripcion: 'Definir qué tiene que hacer el sistema.', estado: 'FINALIZADA', entrega: '2026-09-21', cierre: '2026-09-21' },
            { id: 3, equipo: 1, hito: 3, orden: 1, titulo: 'Modelo de datos', descripcion: 'Modelo relacional del catálogo y diccionario de datos.', estado: 'EN_PROGRESO', entrega: '2026-10-30', cierre: null },
            { id: 4, equipo: 1, hito: 3, orden: 2, titulo: 'Diseño de pantallas', descripcion: 'Mockups de las pantallas del catálogo.', estado: 'FINALIZADA', entrega: '2026-10-19', cierre: '2026-10-22' },
            { id: 5, equipo: 2, hito: 1, orden: 1, titulo: 'Relevamiento de préstamos', descripcion: 'Relevar cómo se presta y se devuelve hoy.', estado: 'FINALIZADA', entrega: '2026-08-24', cierre: '2026-08-26' },
            { id: 6, equipo: 2, hito: 2, orden: 1, titulo: 'Requerimientos de préstamos', descripcion: 'Requerimientos y casos de uso del módulo de préstamos.', estado: 'EN_PROGRESO', entrega: '2026-10-30', cierre: null }
        ],

        tareas: [
            { id: 1, actividad: 1, resp: 2, creada: 1, titulo: 'Entrevista a la bibliotecaria', descripcion: 'Preparar las preguntas, hacer la entrevista y registrar las respuestas.', enlace: 'https://drive.google.com/file/d/ejemplo-entrevista', estado: 'COMPLETADA', devuelta: false, limite: '2026-08-17' },
            { id: 2, actividad: 1, resp: 4, creada: 1, titulo: 'Registro del proceso de préstamo', descripcion: 'Describir paso a paso cómo se presta un libro hoy.', enlace: 'https://drive.google.com/file/d/ejemplo-proceso', estado: 'COMPLETADA', devuelta: false, limite: '2026-08-20' },
            { id: 3, actividad: 1, resp: 3, creada: 3, titulo: 'Análisis de sistemas similares', descripcion: 'Buscar dos sistemas de biblioteca y comparar sus funciones.', enlace: 'https://drive.google.com/file/d/ejemplo-comparacion', estado: 'COMPLETADA', devuelta: false, limite: '2026-08-20' },
            { id: 4, actividad: 2, resp: 2, creada: 1, titulo: 'Lista de requerimientos funcionales', descripcion: '', enlace: 'https://drive.google.com/file/d/ejemplo-requerimientos', estado: 'COMPLETADA', devuelta: false, limite: '2026-09-14' },
            { id: 5, actividad: 2, resp: 1, creada: 1, titulo: 'Casos de uso de préstamos', descripcion: 'Casos de uso del préstamo y la devolución.', enlace: 'https://drive.google.com/file/d/ejemplo-casos-uso', estado: 'COMPLETADA', devuelta: false, limite: '2026-09-17' },
            { id: 6, actividad: 2, resp: 4, creada: 4, titulo: 'Requerimientos no funcionales', descripcion: '', enlace: 'https://drive.google.com/file/d/ejemplo-no-funcionales', estado: 'COMPLETADA', devuelta: false, limite: '2026-09-17' },
            { id: 7, actividad: 3, resp: 2, creada: 1, titulo: 'Diagrama entidad-relación del catálogo', descripcion: 'Entidades libro, ejemplar, autor y editorial.', enlace: 'https://drive.google.com/file/d/ejemplo-der', estado: 'REVISION_DOCENTE', devuelta: false, limite: '2026-10-22' },
            { id: 8, actividad: 3, resp: 4, creada: 1, titulo: 'Diccionario de datos', descripcion: 'Tipos, longitudes y restricciones de cada campo.', enlace: 'https://drive.google.com/file/d/ejemplo-diccionario', estado: 'REVISION_LIDER', devuelta: false, limite: '2026-10-26' },
            { id: 9, actividad: 3, resp: 3, creada: 1, titulo: 'Normalización de tablas', descripcion: 'Llevar el modelo a tercera forma normal.', enlace: 'https://drive.google.com/file/d/ejemplo-normalizacion', estado: 'EN_PROGRESO', devuelta: true, limite: '2026-10-29' },
            { id: 10, actividad: 3, resp: 4, creada: 4, titulo: 'Script de creación de la base', descripcion: 'Script SQL con las tablas del catálogo.', enlace: '', estado: 'PENDIENTE', devuelta: false, limite: '2026-10-30' },
            { id: 11, actividad: 4, resp: 3, creada: 1, titulo: 'Mockup de búsqueda en el catálogo', descripcion: '', enlace: 'https://drive.google.com/file/d/ejemplo-mockup-busqueda', estado: 'COMPLETADA', devuelta: false, limite: '2026-10-15' },
            { id: 12, actividad: 4, resp: 3, creada: 3, titulo: 'Mockup de ficha del libro', descripcion: '', enlace: 'https://drive.google.com/file/d/ejemplo-mockup-ficha', estado: 'COMPLETADA', devuelta: false, limite: '2026-10-19' },
            { id: 13, actividad: 4, resp: 1, creada: 1, titulo: 'Guía de estilos', descripcion: 'Colores, tipografía y componentes comunes.', enlace: 'https://drive.google.com/file/d/ejemplo-guia-estilos', estado: 'COMPLETADA', devuelta: false, limite: '2026-10-19' },
            { id: 14, actividad: 5, resp: 6, creada: 5, titulo: 'Encuesta a socios de la biblioteca', descripcion: '', enlace: 'https://drive.google.com/file/d/ejemplo-encuesta', estado: 'COMPLETADA', devuelta: false, limite: '2026-08-20' },
            { id: 15, actividad: 5, resp: 8, creada: 5, titulo: 'Registro de devoluciones actuales', descripcion: '', enlace: 'https://drive.google.com/file/d/ejemplo-devoluciones', estado: 'COMPLETADA', devuelta: false, limite: '2026-08-20' },
            { id: 16, actividad: 6, resp: 6, creada: 5, titulo: 'Casos de uso del préstamo', descripcion: '', enlace: 'https://drive.google.com/file/d/ejemplo-cu-prestamo', estado: 'REVISION_DOCENTE', devuelta: false, limite: '2026-10-19' },
            { id: 17, actividad: 6, resp: 7, creada: 7, titulo: 'Prototipo de la pantalla de préstamo', descripcion: 'Boceto en papel pasado a Figma.', enlace: '', estado: 'EN_PROGRESO', devuelta: false, limite: '2026-10-29' },
            { id: 18, actividad: 6, resp: 8, creada: 5, titulo: 'Reglas de vencimiento y sanciones', descripcion: 'Definir plazos y qué pasa si no se devuelve a tiempo.', enlace: '', estado: 'PENDIENTE', devuelta: false, limite: '2026-10-20' }
        ],

        avances: [
            { id: 1, equipo: 1, actividad: 1, autor: 1, estado: 'REVISADO', fecha: '2026-08-24',
              descripcion: 'Sumamos a la documentación el informe del relevamiento: entrevista, proceso actual de préstamo y comparación con dos sistemas.',
              enlace: 'https://drive.google.com/drive/folders/ejemplo-byte-builders' },
            { id: 2, equipo: 1, actividad: 2, autor: 1, estado: 'REVISADO', fecha: '2026-09-21',
              descripcion: 'Agregamos la especificación de requerimientos y los casos de uso.',
              enlace: 'https://drive.google.com/drive/folders/ejemplo-byte-builders' },
            { id: 3, equipo: 2, actividad: 5, autor: 5, estado: 'ENVIADO', fecha: '2026-10-26',
              descripcion: 'Informe del relevamiento de préstamos con los resultados de la encuesta a socios.',
              enlace: 'https://drive.google.com/drive/folders/ejemplo-code-masters' }
        ],

        comentarios: [
            { avance: 1, docente: true, texto: 'Muy completo el relevamiento. Para el análisis, tengan en cuenta las devoluciones fuera de término.', fecha: '2026-08-27' },
            { avance: 2, docente: true, texto: 'Bien. Revisen que cada requerimiento tenga un caso de uso asociado.', fecha: '2026-09-24' },
            { tarea: 3, docente: true, texto: 'Buena comparación. Agreguen qué funciones nos sirven a nosotros.', fecha: '2026-08-20' },
            { tarea: 9, docente: false, autor: 1, texto: 'Falta separar la tabla de ejemplares de la de libros: un libro puede tener varios ejemplares.', fecha: '2026-10-26' },
            { tarea: 13, docente: true, texto: 'Muy clara la guía. Úsenla en todas las pantallas.', fecha: '2026-10-22' }
        ],

        ayudas: [
            { id: 1, equipo: 2, est: 7, tarea: 17, estado: 'PENDIENTE', fecha: '2026-10-26',
              mensaje: '¿El prototipo de la pantalla de préstamo lo tenemos que hacer en Figma o alcanza con papel?' },
            { id: 2, equipo: 1, est: 3, tarea: 9, estado: 'ATENDIDA', fecha: '2026-10-22',
              mensaje: 'No sabemos cómo normalizar la tabla de autores cuando un libro tiene varios.',
              respuesta: 'Necesitan una tabla intermedia libro_autor. Lo vemos en la próxima clase.' }
        ],

        reconocidas: [1, 2, 5, 7].map(est => ({
            est, horas: 40, motivo: 'Aprobación de los 5 cursos de formación', fecha: '2026-06-15'
        })),

        notas: {},
        asistencia: {}
    };

    // Notas del 1.er cuatrimestre
    const c1 = { 1: 9, 2: 8, 3: 7, 4: 6, 5: 9, 6: 7, 7: 8, 8: 5 };
    Object.entries(c1).forEach(([est, n]) => {
        d.notas[est + '|C1'] = { nota: n, obs: n < 7 ? 'Entregas fuera de término' : '' };
    });

    // Asistencia: lunes y jueves desde marzo, sin el receso de invierno
    let semilla = 7;
    const azar = () => { semilla = (semilla * 16807) % 2147483647; return (semilla - 1) / 2147483646; };
    const presentismo = { 1: .97, 2: .95, 3: .9, 4: .85, 5: .96, 6: .9, 7: .93, 8: .8 };

    for (let f = new Date('2026-03-09T12:00:00'); f <= new Date('2026-10-26T12:00:00'); f.setDate(f.getDate() + 1)) {
        const dia = f.getDay();
        const iso = f.toISOString().slice(0, 10);
        if ((dia !== 1 && dia !== 4) || (iso >= '2026-07-20' && iso <= '2026-07-31')) continue;
        d.estudiantes.forEach(e => {
            const r = azar(), p = presentismo[e.id];
            let reg;
            if (r < p) reg = { estado: 'PRESENTE', horas: 3 };
            else if (r < p + (1 - p) * .4) reg = { estado: 'PARCIAL', horas: 2, obs: 'Llegó tarde' };
            else if (r < p + (1 - p) * .6) reg = { estado: 'JUSTIFICADO', horas: 3, obs: 'Certificado médico' };
            else reg = { estado: 'AUSENTE', horas: 0 };
            d.asistencia[e.id + '|' + iso] = reg;
        });
    }

    return d;
}
