/*
 * ============================================================
 * PROYECTA - VERSIÓN DE DEMOSTRACIÓN (sin servidor)
 * ============================================================
 * Reproduce el funcionamiento de la plataforma en el navegador.
 * Los datos viven en la memoria de la pestaña (sessionStorage):
 * se borran al cerrarla o al tocar «Reiniciar demo».
 */

const CLAVE = 'proyecta-demo-v1';

const S = {
    d: null,          // datos de la demo
    yo: null,         // { tipo: 'docente' } o { tipo: 'estudiante', id }
    ruta: 'inicio',
    p: {},            // parámetros de la pantalla
    aviso: null       // mensaje después de una acción
};

/* ============================================================
   GUARDADO EN LA PESTAÑA
   ============================================================ */

function cargar() {
    try {
        const guardado = JSON.parse(sessionStorage.getItem(CLAVE) || 'null');
        if (guardado && guardado.d) {
            Object.assign(S, guardado);
            S.aviso = null;
            return;
        }
    } catch (e) { /* sin almacenamiento: se usa la memoria */ }
    S.d = datosIniciales();
}

function guardar() {
    try {
        sessionStorage.setItem(CLAVE, JSON.stringify({ d: S.d, yo: S.yo, ruta: S.ruta, p: S.p }));
    } catch (e) { /* la demo sigue funcionando sin guardar */ }
}

function reiniciar() {
    if (!confirm('¿Volver a los datos iniciales de la demo? Se pierden los cambios que hiciste.')) return;
    try { sessionStorage.removeItem(CLAVE); } catch (e) { }
    S.d = datosIniciales();
    S.yo = null;
    S.ruta = 'inicio';
    S.p = {};
    S.aviso = null;
    render();
}

/* ============================================================
   UTILIDADES
   ============================================================ */

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fc = f => f ? f.slice(8, 10) + '/' + f.slice(5, 7) : '';
const fl = f => f ? fc(f) + '/' + f.slice(0, 4) : '';
const horasTxt = h => (Math.round(h * 10) / 10).toString().replace('.', ',') + ' h';
const nuevoId = () => ++S.d.sig;

const est = id => S.d.estudiantes.find(e => e.id === +id);
const nombre = id => { const e = est(id); return e ? e.nombre + ' ' + e.apellido : '—'; };
const equipo = id => S.d.equipos.find(e => e.id === +id);
const hito = id => S.d.hitos.find(h => h.id === +id);
const act = id => S.d.actividades.find(a => a.id === +id);
const tarea = id => S.d.tareas.find(t => t.id === +id);
const rol = id => S.d.roles.find(r => r.id === +id);
const integrantes = eq => S.d.estudiantes.filter(e => e.equipo === +eq);
const esLider = id => !!rol(est(id)?.rol)?.lider;
const liderDe = eq => integrantes(eq).find(e => esLider(e.id));
const tareasDe = actId => S.d.tareas.filter(t => t.actividad === +actId);
const actividadesDe = (eq, h) => S.d.actividades.filter(a => a.equipo === +eq && (h == null || a.hito === +h)).sort((a, b) => a.orden - b.orden);
const avanceDe = actId => S.d.avances.find(a => a.actividad === +actId);
const comentariosTarea = id => S.d.comentarios.filter(c => c.tarea === +id);
const comentariosAvance = id => S.d.comentarios.filter(c => c.avance === +id);
const equipoDeTarea = t => act(t.actividad).equipo;

function autorComentario(c) {
    return c.docente ? S.d.docente.nombre + ' ' + S.d.docente.apellido : nombre(c.autor);
}

function vencida(t) {
    return t.limite && t.limite < S.d.hoy && ['PENDIENTE', 'EN_PROGRESO'].includes(t.estado);
}

function hitoActual(eq) {
    const enCurso = S.d.hitos.find(h => S.d.recorrido[eq + '-' + h.id] === 'EN_PROGRESO');
    return enCurso || S.d.hitos.find(h => S.d.recorrido[eq + '-' + h.id] === 'PENDIENTE') || S.d.hitos[S.d.hitos.length - 1];
}

function actividadCerrada(a) {
    const av = avanceDe(a.id);
    return !!av && ['ENVIADO', 'REVISADO'].includes(av.estado);
}

function sinAvance(eq) {
    return S.d.actividades.filter(a => (eq == null || a.equipo === +eq) && a.estado === 'FINALIZADA' && !avanceDe(a.id));
}

// La actividad se termina sola cuando la docente aprueba todas sus tareas
function actualizarActividad(id) {
    const a = act(id);
    if (!a) return;
    const ts = tareasDe(id);
    if (ts.length && ts.every(t => t.estado === 'COMPLETADA')) {
        if (a.estado !== 'FINALIZADA') { a.estado = 'FINALIZADA'; a.cierre = S.d.hoy; }
    } else {
        a.estado = ts.some(t => t.estado !== 'PENDIENTE') ? 'EN_PROGRESO' : 'PENDIENTE';
        a.cierre = null;
    }
    const k = a.equipo + '-' + a.hito;
    if (a.estado !== 'PENDIENTE' && S.d.recorrido[k] === 'PENDIENTE') S.d.recorrido[k] = 'EN_PROGRESO';
}

// Horas de práctica: asistencia + horas reconocidas
function horas(idEst) {
    let asis = 0, presentes = 0, tardes = 0, ausentes = 0, justificados = 0;
    Object.entries(S.d.asistencia).forEach(([k, r]) => {
        if (+k.split('|')[0] !== +idEst) return;
        asis += r.horas;
        if (r.estado === 'PRESENTE') presentes++;
        if (r.estado === 'PARCIAL') tardes++;
        if (r.estado === 'AUSENTE') ausentes++;
        if (r.estado === 'JUSTIFICADO') justificados++;
    });
    const rec = S.d.reconocidas.filter(r => r.est === +idEst).reduce((s, r) => s + r.horas, 0);
    const total = asis + rec;
    const req = S.d.curso.horasRequeridas;
    return { asis, rec, total, req, faltan: Math.max(0, req - total), pct: Math.min(100, Math.round(total / req * 100)), presentes, tardes, ausentes, justificados };
}

// Situación final: se aprueba con 7 y las horas; en la intensificación, con 4 y las horas
function situacion(n, horasTotal) {
    const req = S.d.curso.horasRequeridas;
    const val = p => (n[p] === '' || n[p] == null) ? null : +n[p];
    const final = val('FINAL'), dic = val('INT_DIC'), feb = val('INT_FEB');
    const faltan = Math.max(0, req - horasTotal);
    const horasOk = faltan <= 0;
    const verde = 'bg-success-subtle text-success-emphasis', rojo = 'bg-danger-subtle text-danger-emphasis';
    if (final === null) return ['Sin nota final', 'bg-light text-muted border'];
    if (final >= 7 && horasOk) return ['Aprobada', verde];
    if (horasOk && (dic ?? 0) >= 4) return ['Aprobada en diciembre', verde];
    if (horasOk && (feb ?? 0) >= 4) return ['Aprobada en febrero', verde];
    const notaOk = final >= 7 || (dic ?? 0) >= 4 || (feb ?? 0) >= 4;
    const motivo = !notaOk && !horasOk ? 'nota y horas' : (!horasOk ? 'faltan ' + horasTxt(faltan) : 'nota');
    return ['Intensifica · ' + motivo, rojo];
}

function notasDe(idEst) {
    const n = {};
    ['C1', 'C2', 'FINAL', 'INT_DIC', 'INT_FEB'].forEach(p => {
        const r = S.d.notas[idEst + '|' + p];
        n[p] = r ? r.nota ?? '' : '';
        n['obs_' + p] = r ? r.obs || '' : '';
    });
    return n;
}

function avisar(texto, tipo = 'success') {
    S.aviso = { texto, tipo };
}

function ir(ruta, p = {}) {
    S.ruta = ruta;
    S.p = p;
    render();
    window.scrollTo(0, 0);
}

/* ============================================================
   COMPONENTES COMUNES
   ============================================================ */

const ESTADO_TAREA = {
    PENDIENTE: ['bg-secondary-subtle text-secondary-emphasis', 'bi-circle', 'Pendiente'],
    EN_PROGRESO: ['bg-warning-subtle text-warning-emphasis', 'bi-hourglass-split', 'En progreso'],
    REVISION_LIDER: ['bg-info-subtle text-info-emphasis', 'bi-person-check', 'La revisa el team leader'],
    REVISION_DOCENTE: ['bg-primary-subtle text-primary-emphasis', 'bi-mortarboard', 'La revisa la docente'],
    COMPLETADA: ['bg-success-subtle text-success-emphasis', 'bi-check-circle-fill', 'Aprobada']
};

const ESTADO_ACT = {
    PENDIENTE: ['bg-secondary-subtle text-secondary-emphasis', 'Sin empezar'],
    EN_PROGRESO: ['bg-warning-subtle text-warning-emphasis', 'En curso'],
    FINALIZADA: ['bg-success-subtle text-success-emphasis', 'Terminada']
};

const ESTADO_AVANCE = {
    ENVIADO: ['bg-primary', 'bi-send-check', 'Esperando a la docente'],
    DEVUELTO: ['bg-danger', 'bi-arrow-counterclockwise', 'Para corregir'],
    REVISADO: ['bg-success', 'bi-patch-check', 'Aprobado por la docente']
};

const ESTADO_HITO = {
    PENDIENTE: ['bg-light text-muted border', 'Pendiente'],
    EN_PROGRESO: ['bg-warning-subtle text-warning-emphasis', 'En progreso'],
    FINALIZADO: ['bg-success-subtle text-success-emphasis', 'Finalizado']
};

const badge = ([clase, icono, texto]) => `<span class="badge ${clase}"><i class="bi ${icono}"></i> ${texto}</span>`;

function barra(pct, etiqueta, clase = '') {
    return `<div class="progress" style="height:6px" role="progressbar" aria-label="${esc(etiqueta)}" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-bar ${clase}" style="width:${pct}%"></div></div>`;
}

function vacio(icono, titulo, texto) {
    return `<div class="empty-state"><i class="bi ${icono}"></i><h3 class="h6">${titulo}</h3><p class="text-muted mb-0">${texto}</p></div>`;
}

function encabezado(titulo, sub = '', extra = '') {
    return `<div class="page-header mb-4"><div>${sub ? `<p class="text-muted mb-1">${sub}</p>` : ''}<h1 class="fw-bold">${titulo}</h1></div>${extra}</div>`;
}

function enlace(url, texto = 'Ver el trabajo') {
    return url ? `<a href="${esc(url)}" class="small" target="_blank" rel="noopener" data-enlace-demo><i class="bi bi-link-45deg"></i> ${texto}</a>` : '';
}

/* ============================================================
   PANTALLA DE INGRESO
   ============================================================ */

function pantallaIngreso() {
    const t = liderDe(1), v = est(2);
    return `
    <main class="ingreso">
      <div class="ingreso-caja">
        <div class="text-center mb-4">
          <img src="img/logo.png" alt="" style="height:64px">
          <h1 class="fw-bold mt-3 mb-1">Proyecta</h1>
          <p class="text-muted mb-0">Plataforma para organizar, documentar y acompañar proyectos colaborativos<br>en Prácticas Profesionalizantes.</p>
        </div>

        <h2 class="h5 text-center mb-3">¿Con qué usuario querés recorrer la demo?</h2>

        <div class="row g-3 mb-4">
          <div class="col-md-4">
            <button class="tarjeta-rol" data-entrar="docente">
              <div class="icono-rol"><i class="bi bi-mortarboard"></i></div>
              <h3 class="h6 mb-1">Docente</h3>
              <p class="small text-muted mb-0">Revisa tareas y avances, responde pedidos de ayuda, toma asistencia y carga notas.</p>
            </button>
          </div>
          <div class="col-md-4">
            <button class="tarjeta-rol" data-entrar="${t.id}">
              <div class="icono-rol"><i class="bi bi-person-badge"></i></div>
              <h3 class="h6 mb-1">Team leader · ${esc(t.nombre)}</h3>
              <p class="small text-muted mb-0">Crea actividades, reparte tareas, las revisa antes de enviarlas a la docente y sube los avances.</p>
            </button>
          </div>
          <div class="col-md-4">
            <button class="tarjeta-rol" data-entrar="${v.id}">
              <div class="icono-rol"><i class="bi bi-person"></i></div>
              <h3 class="h6 mb-1">Integrante · ${esc(v.nombre)}</h3>
              <p class="small text-muted mb-0">Ve sus tareas, se crea las suyas, las entrega con el enlace a su trabajo y pide ayuda.</p>
            </button>
          </div>
        </div>

        <div class="info-card mb-3">
          <h2 class="h6 mb-2"><i class="bi bi-signpost-split"></i> Recorrido sugerido</h2>
          <ol class="small mb-0 ps-3">
            <li>Entrá como <strong>${esc(v.nombre)}</strong>: en <em>Tareas del equipo</em>, terminá una tarea pegando el enlace a tu trabajo.</li>
            <li>Cambiá a <strong>${esc(t.nombre)}</strong> (team leader): revisala y enviala a la docente, o devolvela con un comentario.</li>
            <li>Cambiá a <strong>Docente</strong>: en <em>Inicio</em>, aprobá la tarea. Si era la última de la actividad, la actividad queda terminada.</li>
            <li>Volvé a <strong>${esc(t.nombre)}</strong>: subí el avance de la actividad terminada. Como docente, aprobalo.</li>
          </ol>
        </div>

        <div class="d-flex justify-content-center align-items-center gap-2 flex-wrap small">
          <label for="otro" class="text-muted">O entrá como otro estudiante:</label>
          <select id="otro" class="form-select form-select-sm" style="width:auto">
            ${S.d.estudiantes.map(e => `<option value="${e.id}">${esc(e.nombre + ' ' + e.apellido)} · ${esc(equipo(e.equipo).nombre)} · ${esc(rol(e.rol).nombre)}</option>`).join('')}
          </select>
          <button class="btn btn-sm btn-outline-primary" data-entrar-otro>Entrar</button>
        </div>
      </div>
    </main>`;
}

/* ============================================================
   ESTRUCTURA: MENÚ LATERAL Y BARRA SUPERIOR
   ============================================================ */

function estructura(contenido) {
    const docente = S.yo.tipo === 'docente';
    const menu = docente
        ? [['inicio', 'bi-grid-fill', 'Inicio'], ['proyecto', 'bi-kanban-fill', 'Proyectos'], ['cursos', 'bi-mortarboard-fill', 'Cursos y estudiantes'],
           ['asistencia', 'bi-calendar-check', 'Asistencia y horas'], ['evaluaciones', 'bi-clipboard-data-fill', 'Evaluaciones']]
        : [['inicio', 'bi-grid-fill', 'Mi proyecto'], ['tareas', 'bi-list-check', 'Tareas del equipo'], ['avances', 'bi-journal-check', 'Avances'],
           ['ayuda', 'bi-life-preserver', 'Pedir ayuda'], ['horas', 'bi-clock-history', 'Mis horas']];
    const activa = S.ruta === 'equipo' ? 'proyecto' : S.ruta;

    let nom, ape;
    if (docente) { nom = S.d.docente.nombre; ape = S.d.docente.apellido; }
    else { const e = est(S.yo.id); nom = e.nombre; ape = e.apellido; }

    const pendientes = S.d.ayudas.filter(a => a.estado === 'PENDIENTE').length
        + S.d.avances.filter(a => a.estado === 'ENVIADO').length
        + S.d.tareas.filter(t => t.estado === 'REVISION_DOCENTE').length;

    let aviso = '';
    if (S.aviso) {
        aviso = `<div class="alert alert-${S.aviso.tipo} d-flex gap-2 align-items-start" role="status">
            <i class="bi ${S.aviso.tipo === 'success' ? 'bi-check-circle' : 'bi-exclamation-circle'}"></i><span>${esc(S.aviso.texto)}</span></div>`;
        S.aviso = null;
    }

    return `
    <div class="wrapper">
      <aside class="sidebar">
        <div class="logo"><img src="img/logo.png" alt="Proyecta"><h4>Proyecta</h4></div>
        <nav>
          ${menu.map(([r, i, t]) => `<button data-ir="${r}" class="${r === activa ? 'active' : ''}"><i class="bi ${i}"></i> ${t}</button>`).join('')}
        </nav>
      </aside>

      <main class="content">
        <header class="topbar">
          <span class="fecha-demo"><i class="bi bi-calendar3"></i> Hoy: ${fl(S.d.hoy)} <span class="d-none d-md-inline">(fecha simulada de la demo)</span></span>
          <div class="user">
            ${docente
              ? `<button class="notification btn btn-link text-reset p-0 position-relative" data-ir="inicio" aria-label="${pendientes} pendientes de revisar" title="Pendientes de revisar">
                   <i class="bi bi-bell fs-5"></i>${pendientes ? `<span class="badge rounded-pill bg-danger">${pendientes}</span>` : ''}</button>`
              : `<button class="btn btn-sm btn-outline-danger me-2" data-ir="ayuda"><i class="bi bi-life-preserver"></i> Pedir ayuda</button>`}
            <div class="avatar">${esc(nom[0] + ape[0])}</div>
            <span>${esc(nom)}</span>
            <button class="btn btn-sm btn-outline-secondary ms-2" data-salir title="Cambiar de usuario"><i class="bi bi-arrow-left-right"></i> <span class="d-none d-lg-inline">Cambiar de usuario</span></button>
          </div>
        </header>
        ${aviso}
        ${contenido}
      </main>
    </div>`;
}

/* ============================================================
   DOCENTE · INICIO
   ============================================================ */

function docenteInicio() {
    const ayudas = S.d.ayudas.filter(a => a.estado === 'PENDIENTE');
    const paraAprobar = S.d.tareas.filter(t => t.estado === 'REVISION_DOCENTE');
    const avances = S.d.avances.filter(a => a.estado === 'ENVIADO');
    const vencidas = S.d.tareas.filter(vencida);
    const sinAv = sinAvance();

    const tarjetas = [
        ['bi-life-preserver text-danger', ayudas.length, 'Pedidos de ayuda', '#ayudas'],
        ['bi-check2-square text-primary', paraAprobar.length, 'Tareas para aprobar', '#tareas'],
        ['bi-journal-check text-primary', avances.length, 'Avances para revisar', '#avances'],
        ['bi-alarm text-warning', vencidas.length, 'Tareas vencidas', '#equipos']
    ];

    let html = encabezado(`¡Hola, ${esc(S.d.docente.nombre)}!`, '', '') +
        `<p class="text-muted" style="margin-top:-1rem">Esto es lo que necesita tu atención hoy.</p>
        <section class="row g-3 mb-4">${tarjetas.map(([i, n, t, h]) => `
          <div class="col-6 col-lg-3"><a href="${h}" class="info-card d-block text-reset text-decoration-none h-100">
            <i class="bi ${i} fs-4"></i><h3 class="mt-2 mb-0">${n}</h3><h6 class="mb-0">${t}</h6></a></div>`).join('')}
        </section>`;

    // Pedidos de ayuda
    html += `<section class="mb-4" id="ayudas"><h2 class="h5"><i class="bi bi-life-preserver"></i> Pedidos de ayuda</h2>`;
    html += ayudas.length ? ayudas.map(a => `
        <div class="info-card mb-2 border-start border-4 border-danger">
          <div class="d-flex justify-content-between flex-wrap gap-2 small text-muted mb-1">
            <span><strong class="text-body">${esc(nombre(a.est))}</strong> · ${esc(equipo(a.equipo).nombre)}${a.tarea ? ' · ' + esc(tarea(a.tarea)?.titulo) : ''}</span><span>${fc(a.fecha)}</span>
          </div>
          <p class="mb-2">${esc(a.mensaje)}</p>
          <form data-form="responder-ayuda" data-id="${a.id}" class="d-flex gap-2 flex-wrap">
            <label class="visually-hidden" for="resp-${a.id}">Respuesta</label>
            <input id="resp-${a.id}" name="respuesta" class="form-control form-control-sm" style="flex:1 1 260px" required placeholder="Escribí tu respuesta">
            <button class="btn btn-sm btn-primary"><i class="bi bi-reply"></i> Responder</button>
          </form>
        </div>`).join('') : `<p class="small text-muted">No hay pedidos de ayuda pendientes.</p>`;
    html += `</section>`;

    // Tareas para aprobar
    html += `<section class="mb-4" id="tareas"><h2 class="h5"><i class="bi bi-check2-square"></i> Tareas para aprobar</h2>
        <p class="small text-muted">Ya las revisó el team leader de cada equipo.</p>`;
    html += paraAprobar.length ? `<div class="row g-3">` + paraAprobar.map(t => {
        const a = act(t.actividad);
        return `<div class="col-lg-6"><div class="info-card h-100">
          <div class="small text-muted">${esc(equipo(a.equipo).nombre)} · <i class="bi bi-folder2"></i> ${esc(a.titulo)}</div>
          <h3 class="h6 my-1">${esc(t.titulo)}</h3>
          <div class="small mb-2"><i class="bi bi-person"></i> ${esc(nombre(t.resp))} ${t.limite ? `· <i class="bi bi-calendar"></i> ${fc(t.limite)}` : ''}</div>
          <div class="mb-2">${enlace(t.enlace)}</div>
          <form data-form="docente-tarea" data-id="${t.id}">
            <label class="form-label small" for="dt-${t.id}">Comentario <span class="text-muted">(obligatorio para devolver)</span></label>
            <textarea id="dt-${t.id}" name="comentario" rows="2" class="form-control form-control-sm mb-2"></textarea>
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-success" name="decision" value="aprobar"><i class="bi bi-check-lg"></i> Aprobar</button>
              <button class="btn btn-sm btn-outline-danger" name="decision" value="corregir"><i class="bi bi-arrow-counterclockwise"></i> Pedir corrección</button>
            </div>
          </form>
        </div></div>`;
    }).join('') + `</div>` : `<p class="small text-muted">No hay tareas esperando tu aprobación.</p>`;
    html += `</section>`;

    // Avances
    html += `<section class="mb-4" id="avances"><h2 class="h5"><i class="bi bi-journal-check"></i> Avances para revisar</h2>`;
    html += avances.length ? avances.map(av => {
        const a = act(av.actividad);
        return `<div class="info-card mb-2">
          <div class="small text-muted">${esc(equipo(av.equipo).nombre)} · ${esc(hito(a.hito).nombre)} · subido por el team leader · ${fc(av.fecha)}</div>
          <h3 class="h6 my-1"><i class="bi bi-folder2-open text-primary"></i> ${esc(a.titulo)}</h3>
          <p class="mb-2" style="white-space:pre-line">${esc(av.descripcion)}</p>
          <div class="mb-2">${enlace(av.enlace, 'Ver la documentación')}</div>
          <details class="small mb-2"><summary class="text-muted">Tareas de la actividad (${tareasDe(a.id).length})</summary>
            <ul class="mt-2 mb-0">${tareasDe(a.id).map(t => `<li>${esc(t.titulo)} · <span class="text-muted">${esc(nombre(t.resp))}</span> ${enlace(t.enlace, 'enlace')}</li>`).join('')}</ul>
          </details>
          <form data-form="docente-avance" data-id="${av.id}">
            <label class="form-label small" for="da-${av.id}">Devolución <span class="text-muted">(obligatoria para pedir corrección)</span></label>
            <textarea id="da-${av.id}" name="comentario" rows="2" class="form-control form-control-sm mb-2"></textarea>
            <div class="d-flex gap-2">
              <button class="btn btn-sm btn-success" name="decision" value="aprobar"><i class="bi bi-check-lg"></i> Aprobar</button>
              <button class="btn btn-sm btn-outline-danger" name="decision" value="corregir"><i class="bi bi-arrow-counterclockwise"></i> Pedir corrección</button>
            </div>
          </form>
        </div>`;
    }).join('') : `<p class="small text-muted">No hay avances esperando revisión.</p>`;
    html += `</section>`;

    // Actividades terminadas sin avance
    if (sinAv.length) {
        html += `<section class="mb-4"><h2 class="h5"><i class="bi bi-journal-arrow-up"></i> Actividades terminadas sin avance</h2>
          <p class="small text-muted">Aprobaste todas sus tareas, pero el equipo todavía no subió el avance. Ellos ya ven el recordatorio.</p>
          <div class="table-responsive info-card p-0"><table class="table align-middle mb-0">
            <thead><tr><th>Equipo</th><th>Hito</th><th>Actividad</th><th>Terminada</th></tr></thead>
            <tbody>${sinAv.map(a => `<tr><td class="fw-semibold">${esc(equipo(a.equipo).nombre)}</td><td class="small">${esc(hito(a.hito).nombre)}</td><td>${esc(a.titulo)}</td><td class="small text-muted">${fc(a.cierre)}</td></tr>`).join('')}</tbody>
          </table></div></section>`;
    }

    // Estado de los equipos
    html += `<section class="mb-4" id="equipos"><h2 class="h5"><i class="bi bi-people"></i> Estado de los equipos</h2>
      <div class="table-responsive info-card p-0"><table class="table align-middle mb-0">
        <thead><tr><th>Equipo</th><th>Hito en curso</th><th>Actividades</th><th>Tareas aprobadas</th><th>Alertas</th></tr></thead><tbody>
        ${S.d.equipos.map(eq => {
            const acts = actividadesDe(eq.id);
            const term = acts.filter(a => a.estado === 'FINALIZADA').length;
            const ts = S.d.tareas.filter(t => equipoDeTarea(t) === eq.id);
            const ok = ts.filter(t => t.estado === 'COMPLETADA').length;
            const alertas = [];
            const v = ts.filter(vencida).length;
            if (v) alertas.push(['bg-danger', 'bi-alarm', v + (v === 1 ? ' tarea vencida' : ' tareas vencidas')]);
            const sa = sinAvance(eq.id).length;
            if (sa) alertas.push(['bg-warning text-dark', 'bi-journal-arrow-up', sa + (sa === 1 ? ' actividad sin avance' : ' actividades sin avance')]);
            if (!liderDe(eq.id)) alertas.push(['bg-secondary', 'bi-person-exclamation', 'Sin team leader']);
            return `<tr>
              <td><button class="btn btn-link p-0 fw-semibold" data-ir="equipo" data-id="${eq.id}">${esc(eq.nombre)}</button></td>
              <td class="small">${esc(hitoActual(eq.id).orden + '. ' + hitoActual(eq.id).nombre)}</td>
              <td class="small" style="min-width:140px">${term} de ${acts.length} terminadas ${barra(acts.length ? Math.round(term / acts.length * 100) : 0, 'Actividades terminadas de ' + eq.nombre)}</td>
              <td class="small">${ok} de ${ts.length}</td>
              <td>${alertas.length ? alertas.map(([c, i, t]) => `<span class="badge ${c} me-1"><i class="bi ${i}"></i> ${t}</span>`).join('') : '<span class="small text-muted">Sin alertas</span>'}</td>
            </tr>`;
        }).join('')}
      </tbody></table></div></section>`;

    return html;
}

/* ============================================================
   DOCENTE · PROYECTO Y EQUIPO
   ============================================================ */

function docenteProyecto() {
    const p = S.d.proyecto;
    let html = encabezado(esc(p.nombre), 'Proyectos', `<a href="${esc(p.enlace)}" target="_blank" rel="noopener" data-enlace-demo class="btn btn-outline-primary"><i class="bi bi-folder2-open"></i> Documentación</a>`);

    html += `<section class="row g-3 mb-4">
      <div class="col-lg-8"><div class="info-card h-100">
        <p class="mb-2">${esc(p.descripcion)}</p>
        <p class="small mb-1"><strong>Objetivo general:</strong> ${esc(p.objetivo)}</p>
        <p class="small mb-0"><strong>Alcance:</strong> ${esc(p.alcance)}</p>
      </div></div>
      <div class="col-lg-4"><div class="info-card h-100 small">
        <div class="mb-1"><strong>Tipo:</strong> ${esc(p.tipo)}</div>
        <div class="mb-1"><strong>Destinatario:</strong> ${esc(p.destinatario)}</div>
        <div class="mb-1"><strong>Curso:</strong> ${esc(S.d.curso.nombre)} · ${esc(S.d.curso.orientacion)}</div>
        <div><strong>Fechas:</strong> ${fl(p.inicio)} al ${fl(p.fin)}</div>
      </div></div>
    </section>`;

    html += `<h2 class="h5"><i class="bi bi-people"></i> Equipos</h2><div class="row g-3 mb-4">` +
        S.d.equipos.map(eq => {
            const acts = actividadesDe(eq.id), term = acts.filter(a => a.estado === 'FINALIZADA').length;
            return `<div class="col-md-6"><button class="tarjeta-rol" data-ir="equipo" data-id="${eq.id}">
              <div class="d-flex justify-content-between"><h3 class="h6 mb-1">${esc(eq.nombre)}</h3><span class="small text-muted">${integrantes(eq.id).length} integrantes</span></div>
              <p class="small text-muted mb-2">${esc(eq.objetivo)}</p>
              <div class="small mb-1">Hito en curso: <strong>${esc(hitoActual(eq.id).nombre)}</strong> · ${term} de ${acts.length} actividades terminadas</div>
              ${barra(acts.length ? Math.round(term / acts.length * 100) : 0, 'Avance de ' + eq.nombre)}
            </button></div>`;
        }).join('') + `</div>`;

    html += `<h2 class="h5"><i class="bi bi-flag"></i> Cronograma: hitos</h2><div class="d-flex flex-column gap-2 mb-4">` +
        S.d.hitos.map(h => `<div class="hito-card d-flex gap-3">
            <div class="hito-number">${h.orden}</div>
            <div class="flex-grow-1">
              <div class="d-flex justify-content-between flex-wrap gap-2"><h3 class="h6 mb-1">${esc(h.nombre)}</h3><span class="small text-muted"><i class="bi bi-calendar-range"></i> ${fc(h.inicio)} al ${fc(h.limite)}</span></div>
              <p class="small text-muted mb-2">${esc(h.descripcion)}</p>
              <div class="d-flex gap-2 flex-wrap">${S.d.equipos.map(eq => { const [c, t] = ESTADO_HITO[S.d.recorrido[eq.id + '-' + h.id]]; return `<span class="badge ${c}">${esc(eq.nombre)}: ${t}</span>`; }).join('')}</div>
            </div></div>`).join('') + `</div>`;

    html += `<h2 class="h5"><i class="bi bi-calendar-event"></i> Fechas importantes</h2><div class="info-card"><ul class="list-unstyled mb-0">` +
        S.d.fechas.map(f => `<li class="d-flex justify-content-between py-1 border-bottom"><span>${esc(f.titulo)} <span class="badge bg-light text-muted border">${esc(f.tipo)}</span></span><strong>${fl(f.fecha)}</strong></li>`).join('') + `</ul></div>`;
    return html;
}

function docenteEquipo() {
    const eq = equipo(S.p.id || 1);
    let html = `<p class="small mb-2"><button class="btn btn-link p-0" data-ir="proyecto"><i class="bi bi-arrow-left"></i> ${esc(S.d.proyecto.nombre)}</button></p>`;
    html += encabezado(esc(eq.nombre), 'Equipo');
    html += `<div class="info-card mb-4"><strong>Objetivo del equipo:</strong> ${esc(eq.objetivo)}</div>`;

    html += `<h2 class="h5"><i class="bi bi-people"></i> Integrantes</h2>
      <p class="small text-muted">Podés asignar o cambiar el rol de cada integrante. Si designás un nuevo team leader, el anterior deja de serlo.</p>
      <div class="row g-3 mb-4">` + integrantes(eq.id).map(e => `
        <div class="col-md-6 col-xl-3"><div class="team-member-card">
          <div class="avatar">${esc(e.nombre[0] + e.apellido[0])}</div>
          <div class="flex-grow-1">
            <div class="fw-semibold">${esc(e.nombre + ' ' + e.apellido)}</div>
            <label class="visually-hidden" for="rol-${e.id}">Rol de ${esc(e.nombre)}</label>
            <select id="rol-${e.id}" class="form-select form-select-sm mt-1" data-cambiar-rol="${e.id}">
              ${S.d.roles.map(r => `<option value="${r.id}" ${r.id === e.rol ? 'selected' : ''}>${esc(r.nombre)}</option>`).join('')}
            </select>
          </div>
        </div></div>`).join('') + `</div>`;

    html += `<h2 class="h5"><i class="bi bi-flag"></i> Recorrido por los hitos</h2><div class="d-flex flex-column gap-2 mb-4">` +
        S.d.hitos.map(h => {
            const est_ = S.d.recorrido[eq.id + '-' + h.id], [c, t] = ESTADO_HITO[est_];
            const acts = actividadesDe(eq.id, h.id);
            return `<div class="hito-card">
              <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div class="d-flex gap-2 align-items-center"><div class="hito-number">${h.orden}</div><strong>${esc(h.nombre)}</strong> <span class="badge ${c}">${t}</span></div>
                ${est_ === 'FINALIZADO'
                  ? `<button class="btn btn-sm btn-outline-secondary" data-hito-estado="${eq.id}-${h.id}-EN_PROGRESO"><i class="bi bi-arrow-counterclockwise"></i> Reabrir</button>`
                  : `<button class="btn btn-sm btn-outline-success" data-hito-estado="${eq.id}-${h.id}-FINALIZADO"><i class="bi bi-check2"></i> Finalizar hito</button>`}
              </div>
              ${acts.length ? `<ul class="small mt-2 mb-0">${acts.map(a => {
                  const ts = tareasDe(a.id), ok = ts.filter(t => t.estado === 'COMPLETADA').length, [ca, ta] = ESTADO_ACT[a.estado];
                  return `<li>${esc(a.titulo)} <span class="badge ${ca}">${ta}</span> <span class="text-muted">· ${ok} de ${ts.length} tareas aprobadas</span></li>`;
              }).join('')}</ul>` : `<p class="small text-muted mt-2 mb-0">Sin actividades todavía.</p>`}
            </div>`;
        }).join('') + `</div>`;
    return html;
}

/* ============================================================
   DOCENTE · CURSOS
   ============================================================ */

function docenteCursos() {
    const c = S.d.curso;
    let html = encabezado('Cursos y estudiantes');
    html += `<div class="info-card mb-4">
      <div class="d-flex justify-content-between flex-wrap gap-2">
        <div><h2 class="h5 mb-1">${esc(c.nombre)} · ${esc(c.orientacion)}</h2><div class="small text-muted">${esc(c.materia)} · ${esc(c.institucion)}</div></div>
        <div class="small text-end"><div><i class="bi bi-clock"></i> Lunes 3 h y jueves 3 h</div><div>Horas a cumplir: <strong>${c.horasRequeridas} h</strong></div></div>
      </div></div>
      <p class="small text-muted">En la plataforma, el docente carga los estudiantes de a uno o pegando la lista; Proyecta genera sus usuarios y contraseñas, que se entregan impresos.</p>
      <div class="table-responsive info-card p-0"><table class="table align-middle mb-0">
        <thead><tr><th>Estudiante</th><th>Usuario</th><th>Equipo</th><th>Rol</th></tr></thead><tbody>
        ${S.d.estudiantes.map(e => `<tr><td class="fw-semibold">${esc(e.apellido + ', ' + e.nombre)}</td><td><code>${esc(e.usuario)}</code></td><td>${esc(equipo(e.equipo).nombre)}</td><td>${esc(rol(e.rol).nombre)}</td></tr>`).join('')}
      </tbody></table></div>`;
    return html;
}

/* ============================================================
   DOCENTE · ASISTENCIA Y HORAS
   ============================================================ */

function ultimoDiaDeClase() {
    const f = new Date(S.d.hoy + 'T12:00:00');
    while (![1, 4].includes(f.getDay())) f.setDate(f.getDate() - 1);
    return f.toISOString().slice(0, 10);
}

function docenteAsistencia() {
    const fecha = S.p.fecha || ultimoDiaDeClase();
    const dia = new Date(fecha + 'T12:00:00').getDay();
    const jornada = S.d.curso.horario[dia] || 0;
    const estados = [['PRESENTE', 'Presente', 'success'], ['PARCIAL', 'Tarde', 'warning'], ['AUSENTE', 'Ausente', 'danger'], ['JUSTIFICADO', 'Justificado', 'info']];

    let html = encabezado('Asistencia y horas', esc(S.d.curso.nombre + ' · ' + S.d.curso.orientacion));

    html += `<div class="info-card mb-4">
      <form data-form="elegir-fecha" class="d-flex gap-2 align-items-end flex-wrap mb-3">
        <div><label class="form-label small" for="fecha-as">Jornada</label><input type="date" id="fecha-as" name="fecha" class="form-control form-control-sm" value="${fecha}" max="${S.d.hoy}"></div>
        <button class="btn btn-sm btn-outline-primary">Ver</button>
        <span class="small text-muted ms-2">${jornada ? `Jornada de ${jornada} h` : 'Ese día no hay clase según el horario del curso.'}</span>
      </form>`;

    if (jornada) {
        html += `<form data-form="guardar-asistencia" data-fecha="${fecha}" data-jornada="${jornada}">
          <div class="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
            <h2 class="h6 mb-0">Asistencia del ${fl(fecha)}</h2>
            <button type="button" class="btn btn-sm btn-outline-success" data-todos-presentes><i class="bi bi-check2-all"></i> Todos presentes</button>
          </div>
          <div class="table-responsive"><table class="table align-middle mb-2"><thead><tr><th>Estudiante</th><th>Estado</th><th>Horas</th><th>Observación</th></tr></thead><tbody>
          ${S.d.estudiantes.map(e => {
              const r = S.d.asistencia[e.id + '|' + fecha] || {};
              return `<tr><td class="fw-semibold">${esc(e.apellido + ', ' + e.nombre)}</td>
                <td><div class="btn-group btn-group-sm" role="group" aria-label="Asistencia de ${esc(e.nombre)}">
                  ${estados.map(([v, t, c]) => `<input type="radio" class="btn-check" name="estado-${e.id}" id="as-${e.id}-${v}" value="${v}" ${r.estado === v ? 'checked' : ''} data-estado-asis="${e.id}">
                    <label class="btn btn-outline-${c}" for="as-${e.id}-${v}">${t}</label>`).join('')}
                </div></td>
                <td><input type="number" step="0.5" min="0" max="${jornada}" name="horas-${e.id}" class="form-control form-control-sm" style="width:5rem" value="${r.horas ?? ''}" aria-label="Horas de ${esc(e.nombre)}"></td>
                <td><input name="obs-${e.id}" class="form-control form-control-sm" value="${esc(r.obs || '')}" placeholder="Opcional" aria-label="Observación de ${esc(e.nombre)}"></td></tr>`;
          }).join('')}
          </tbody></table></div>
          <p class="small text-muted">Presente suma la jornada completa; tarde, las horas cumplidas; justificado, las que decidas computar; ausente no suma.</p>
          <button class="btn btn-primary"><i class="bi bi-check-circle"></i> Guardar asistencia</button>
        </form>`;
    }
    html += `</div>`;

    // Resumen de horas
    html += `<h2 class="h5"><i class="bi bi-clock-history"></i> Horas de práctica</h2>
      <div class="table-responsive info-card p-0 mb-4"><table class="table align-middle mb-0">
        <thead><tr><th>Estudiante</th><th>Por asistencia</th><th>Reconocidas</th><th>Total</th><th style="min-width:160px">Avance</th><th>Faltan</th></tr></thead><tbody>
        ${S.d.estudiantes.map(e => { const h = horas(e.id); return `<tr>
          <td class="fw-semibold">${esc(e.apellido + ', ' + e.nombre)}</td><td>${horasTxt(h.asis)}</td><td>${h.rec ? horasTxt(h.rec) : '—'}</td>
          <td><strong>${horasTxt(h.total)}</strong></td><td>${barra(h.pct, 'Horas de ' + e.nombre, h.pct >= 100 ? 'bg-success' : '')}<span class="small text-muted">${h.pct}%</span></td>
          <td>${h.faltan ? horasTxt(h.faltan) : '<span class="badge bg-success">Completas</span>'}</td></tr>`; }).join('')}
      </tbody></table></div>`;

    // Horas reconocidas
    html += `<div class="info-card"><h2 class="h6"><i class="bi bi-award"></i> Reconocer horas</h2>
      <p class="small text-muted">Para horas acreditadas por otras vías, como cursos, certificaciones o salidas. Se asignan a varios estudiantes a la vez.</p>
      <form data-form="reconocer">
        <div class="d-flex flex-wrap gap-3 mb-3">${S.d.estudiantes.map(e => `<div class="form-check"><input class="form-check-input" type="checkbox" name="est" value="${e.id}" id="rec-${e.id}"><label class="form-check-label small" for="rec-${e.id}">${esc(e.nombre + ' ' + e.apellido)}</label></div>`).join('')}</div>
        <div class="row g-2 align-items-end">
          <div class="col-sm-2"><label class="form-label small" for="rec-h">Horas</label><input id="rec-h" type="number" min="0.5" step="0.5" name="horas" class="form-control form-control-sm" required></div>
          <div class="col-sm-7"><label class="form-label small" for="rec-m">Motivo</label><input id="rec-m" name="motivo" class="form-control form-control-sm" required placeholder="Ej. Curso de seguridad informática"></div>
          <div class="col-sm-3"><button class="btn btn-sm btn-primary w-100">Reconocer</button></div>
        </div>
      </form></div>`;
    return html;
}

/* ============================================================
   DOCENTE · EVALUACIONES
   ============================================================ */

function docenteEvaluaciones() {
    const req = S.d.curso.horasRequeridas;
    const filas = S.d.estudiantes.map(e => {
        const ts = S.d.tareas.filter(t => t.resp === e.id);
        const acts = actividadesDe(e.equipo);
        return { e, n: notasDe(e.id), h: horas(e.id), asig: ts.length, ok: ts.filter(t => t.estado === 'COMPLETADA').length,
                 pctEq: acts.length ? Math.round(acts.filter(a => a.estado === 'FINALIZADA').length / acts.length * 100) : 0 };
    });
    const sits = filas.map(f => situacion(f.n, f.h.total)[0]);

    let html = encabezado('Evaluaciones', esc(S.d.curso.nombre + ' · ' + S.d.curso.orientacion));
    html += `<p class="text-muted" style="margin-top:-1rem">Se aprueba con 7 y las ${req} h cumplidas; en la intensificación, con 4 (y las horas completas).</p>
      <section class="row g-3 mb-4">${[
        ['bi-people text-primary', filas.length, 'Estudiantes'],
        ['bi-clipboard-check text-primary', sits.filter(s => s !== 'Sin nota final').length, 'Con nota final'],
        ['bi-patch-check text-success', sits.filter(s => s.startsWith('Aprobada')).length, 'Aprobados'],
        ['bi-arrow-repeat text-danger', sits.filter(s => s.startsWith('Intensifica')).length, 'Intensifican']
      ].map(([i, n, t]) => `<div class="col-6 col-lg-3"><div class="info-card h-100"><i class="bi ${i} fs-4"></i><h3 class="mt-2 mb-0">${n}</h3><h6 class="mb-0">${t}</h6></div></div>`).join('')}</section>
      <form data-form="guardar-notas">
      <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
        <p class="small text-muted mb-0">La nota final se sugiere con el promedio de los dos cuatrimestres; confirmala escribiéndola.</p>
        <button type="button" class="btn btn-sm btn-outline-primary" data-usar-sugeridas><i class="bi bi-magic"></i> Completar finales vacías con la sugerida</button>
      </div>
      <div class="table-responsive info-card p-0"><table class="table align-middle mb-0 tabla-notas">
        <thead><tr><th>Estudiante</th><th>Tareas</th><th>Avance del equipo</th><th>Horas</th><th class="text-center">1.º C</th><th class="text-center">2.º C</th><th class="text-center">Final</th><th class="text-center">Int. dic</th><th class="text-center">Int. feb</th><th>Situación</th></tr></thead><tbody>
        ${filas.map(({ e, n, h, asig, ok, pctEq }) => {
            const [st, sc] = situacion(n, h.total);
            const sug = n.C1 !== '' && n.C2 !== '' ? Math.round((+n.C1 + +n.C2) / 2) : '';
            const campo = (p, extra = '') => `<input type="number" min="1" max="10" step="1" class="form-control form-control-sm text-center campo-nota" style="width:4.2rem" name="${p}-${e.id}" value="${n[p]}" data-periodo="${p}" aria-label="${p} de ${esc(e.nombre)}" ${extra}>`;
            return `<tr class="fila-nota" data-horas="${h.total}">
              <td style="min-width:170px"><div class="fw-semibold">${esc(e.apellido + ', ' + e.nombre)}</div><div class="small text-muted">${esc(equipo(e.equipo).nombre)} · ${esc(rol(e.rol).nombre)}</div></td>
              <td class="small text-nowrap"><strong>${ok}</strong> de ${asig}<div class="text-muted">aprobadas</div></td>
              <td class="small" style="min-width:120px">${pctEq}% ${barra(pctEq, 'Avance del equipo de ' + e.nombre)}</td>
              <td class="small text-nowrap"><strong>${horasTxt(h.total)}</strong><div class="text-muted">de ${req} h (${h.pct}%)</div></td>
              <td class="text-center">${campo('C1')}</td><td class="text-center">${campo('C2')}</td>
              <td class="text-center">${campo('FINAL', `placeholder="${sug}"`)}</td>
              <td class="text-center">${campo('INT_DIC')}</td><td class="text-center">${campo('INT_FEB')}</td>
              <td><span class="badge ${sc} situacion">${st}</span></td></tr>`;
        }).join('')}
      </tbody></table></div>
      <div class="barra-guardar"><button class="btn btn-primary"><i class="bi bi-check-circle"></i> Guardar notas</button></div>
      </form>`;
    return html;
}

/* ============================================================
   ESTUDIANTE · MI PROYECTO
   ============================================================ */

function avisoSinAvance(eq, yoLider) {
    const sa = sinAvance(eq);
    if (!sa.length) return '';
    const lider = liderDe(eq);
    return `<div class="alert alert-warning d-flex gap-3 align-items-start">
      <i class="bi bi-journal-arrow-up fs-4"></i>
      <div class="flex-grow-1"><strong>${sa.length === 1 ? '¡Terminaron una actividad! Falta subir su avance.' : `¡Terminaron ${sa.length} actividades! Falta subir sus avances.`}</strong>
        <div class="small mb-2">${esc(sa.map(a => a.titulo).join(', '))}: la docente aprobó todas las tareas.
          ${yoLider ? 'Actualizá la documentación y subí el avance con el enlace al Drive.' : `Ayudá a ${esc(lider ? lider.nombre : 'tu team leader')} a actualizar la documentación para que suba el avance.`}</div>
        ${yoLider ? sa.map(a => `<button class="btn btn-sm btn-warning me-1" data-ir="avances" data-actividad="${a.id}"><i class="bi bi-plus-lg"></i> ${esc(a.titulo)}</button>`).join('') : ''}
      </div></div>`;
}

function estudianteInicio() {
    const yo = est(S.yo.id), eq = equipo(yo.equipo), soyLider = esLider(yo.id);
    const misTareas = S.d.tareas.filter(t => t.resp === yo.id && t.estado !== 'COMPLETADA');
    const devueltas = misTareas.filter(t => t.devuelta);

    let html = encabezado(`¡Hola, ${esc(yo.nombre)}!`, esc(S.d.proyecto.nombre));
    html += avisoSinAvance(eq.id, soyLider);
    if (devueltas.length) {
        html += `<div class="alert alert-danger"><i class="bi bi-arrow-counterclockwise"></i> Tenés ${devueltas.length === 1 ? 'una tarea' : devueltas.length + ' tareas'} para corregir: <strong>${esc(devueltas.map(t => t.titulo).join(', '))}</strong>. <button class="btn btn-link btn-sm p-0 align-baseline" data-ir="tareas">Ver en el tablero</button></div>`;
    }

    html += `<div class="row g-4">
      <div class="col-lg-8">
        <div class="info-card mb-4">
          <div class="d-flex justify-content-between flex-wrap gap-2"><h2 class="h5 mb-1">${esc(eq.nombre)}</h2>
            <span class="badge bg-primary-subtle text-primary-emphasis align-self-start">${esc(rol(yo.rol).nombre)}</span></div>
          <p class="small text-muted mb-3">${esc(eq.objetivo)}</p>
          <div class="d-flex flex-wrap gap-3">${integrantes(eq.id).map(e => `<div class="d-flex gap-2 align-items-center small"><div class="avatar" style="width:32px;height:32px;font-size:.8rem">${esc(e.nombre[0] + e.apellido[0])}</div><div>${esc(e.nombre)}${e.id === yo.id ? ' (vos)' : ''}<div class="text-muted">${esc(rol(e.rol).nombre)}</div></div></div>`).join('')}</div>
        </div>

        <h2 class="h5"><i class="bi bi-list-check"></i> Mis tareas pendientes</h2>
        ${misTareas.length ? `<div class="d-flex flex-column gap-2 mb-4">${misTareas.map(t => {
            const a = act(t.actividad);
            return `<div class="info-card py-2 d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div><div class="fw-semibold">${esc(t.titulo)}</div><div class="small text-muted"><i class="bi bi-folder2"></i> ${esc(a.titulo)} ${t.limite ? `· <span class="${vencida(t) ? 'text-danger fw-semibold' : ''}">${vencida(t) ? 'venció ' : 'hasta '}${fc(t.limite)}</span>` : ''}</div></div>
              ${badge(ESTADO_TAREA[t.estado])}</div>`;
        }).join('')}</div>` : `<p class="small text-muted mb-4">No tenés tareas pendientes. ¡Bien!</p>`}

        <h2 class="h5"><i class="bi bi-flag"></i> Hitos del proyecto</h2>
        <div class="d-flex flex-column gap-2">${S.d.hitos.map(h => {
            const [c, t] = ESTADO_HITO[S.d.recorrido[eq.id + '-' + h.id]];
            return `<div class="hito-card d-flex gap-3 align-items-start"><div class="hito-number">${h.orden}</div><div class="flex-grow-1">
              <div class="d-flex justify-content-between flex-wrap gap-2"><strong>${esc(h.nombre)}</strong><span class="badge ${c}">${t}</span></div>
              <div class="small text-muted"><i class="bi bi-calendar-range"></i> ${fc(h.inicio)} al ${fc(h.limite)}</div></div></div>`;
        }).join('')}</div>
      </div>

      <div class="col-lg-4">
        <div class="info-card mb-4">
          <h2 class="h6"><i class="bi bi-person-gear"></i> Mi rol en el equipo</h2>
          <label class="form-label small" for="mi-rol">Elegí tu rol</label>
          <select id="mi-rol" class="form-select form-select-sm" data-cambiar-rol="${yo.id}" data-propio>
            ${S.d.roles.map(r => `<option value="${r.id}" ${r.id === yo.rol ? 'selected' : ''} ${r.lider && !soyLider && liderDe(eq.id) ? 'disabled' : ''}>${esc(r.nombre)}${r.lider && !soyLider && liderDe(eq.id) ? ' (ya lo tiene ' + esc(liderDe(eq.id).nombre) + ')' : ''}</option>`).join('')}
          </select>
        </div>
        <div class="info-card mb-4">
          <h2 class="h6"><i class="bi bi-calendar-event"></i> Fechas importantes</h2>
          <ul class="list-unstyled small mb-0">${S.d.fechas.map(f => `<li class="d-flex justify-content-between py-1 border-bottom"><span>${esc(f.titulo)}</span><strong>${fc(f.fecha)}</strong></li>`).join('')}</ul>
        </div>
        <div class="info-card">
          <h2 class="h6"><i class="bi bi-clock-history"></i> Mis horas</h2>
          ${(() => { const h = horas(yo.id); return `<div class="d-flex justify-content-between small mb-1"><span>${horasTxt(h.total)} de ${h.req} h</span><span>${h.pct}%</span></div>${barra(h.pct, 'Mis horas')}<button class="btn btn-link btn-sm p-0 mt-2" data-ir="horas">Ver detalle</button>`; })()}
        </div>
      </div>
    </div>`;
    return html;
}

/* ============================================================
   ESTUDIANTE · TAREAS DEL EQUIPO
   ============================================================ */

function puedeEditar(t, yoId, soyLider) {
    if (soyLider) return t.estado !== 'COMPLETADA';
    return t.creada === yoId && t.estado === 'PENDIENTE';
}

function tarjetaTarea(t, ctx) {
    const esMia = t.resp === ctx.yo;
    const puedeMover = esMia || ctx.lider;
    const coms = comentariosTarea(t.id);
    const ult = coms[coms.length - 1];
    const mostrarBadge = ctx.vista === 'actividad' || ['REVISION_LIDER', 'REVISION_DOCENTE'].includes(t.estado);

    let botones = '';
    if (puedeMover && t.estado === 'PENDIENTE') botones += `<button class="btn btn-sm btn-primary" data-accion="empezar" data-id="${t.id}">Empezar <i class="bi bi-arrow-right"></i></button>`;
    if (puedeMover && t.estado === 'EN_PROGRESO') botones += `<button class="btn btn-sm btn-outline-secondary" data-accion="volver" data-id="${t.id}" aria-label="Volver a pendiente"><i class="bi bi-arrow-left"></i></button>`;
    if (ctx.lider && t.estado === 'REVISION_LIDER') botones += `<button class="btn btn-sm btn-primary" data-accion="enviar-docente" data-id="${t.id}"><i class="bi bi-send-check"></i> Enviar a la docente</button>`;
    if (puedeEditar(t, ctx.yo, ctx.lider)) {
        botones += `<button class="btn btn-sm btn-outline-primary ms-auto" data-accion="editar" data-id="${t.id}" aria-label="Editar"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-outline-danger" data-accion="eliminar" data-id="${t.id}" aria-label="Eliminar"><i class="bi bi-trash"></i></button>`;
    }

    return `<article class="card ${ctx.vista === 'actividad' ? 'h-100' : 'mb-2'} ${esMia ? 'border-primary' : ''}" id="tarea-${t.id}">
      <div class="card-body p-3">
        ${ctx.vista === 'estado' ? `<div class="small text-muted mb-1"><i class="bi bi-folder2"></i> ${esc(act(t.actividad).titulo)}</div>` : ''}
        <h3 class="h6 mb-1">${esc(t.titulo)}</h3>
        ${mostrarBadge ? `<div class="mb-2">${badge(ESTADO_TAREA[t.estado])}</div>` : ''}
        ${t.devuelta && t.estado !== 'COMPLETADA' ? `<div class="alert alert-danger py-1 px-2 small mb-2"><strong><i class="bi bi-arrow-counterclockwise"></i> Para corregir</strong>${ult ? `<div>${esc(autorComentario(ult))}: ${esc(ult.texto)}</div>` : ''}</div>`
          : (t.estado === 'COMPLETADA' && ult ? `<div class="small bg-success-subtle rounded-2 px-2 py-1 mb-2">${esc(autorComentario(ult))}: ${esc(ult.texto)}</div>` : '')}
        ${t.descripcion ? `<p class="small text-muted mb-2">${esc(t.descripcion)}</p>` : ''}
        ${t.enlace ? `<div class="mb-2">${enlace(t.enlace)}</div>` : ''}
        <div class="d-flex flex-wrap gap-2 small mb-2">
          <span class="${esMia ? 'fw-semibold text-primary' : ''}"><i class="bi bi-person"></i> ${esc(nombre(t.resp))}${esMia ? ' (vos)' : ''}</span>
          ${t.limite ? `<span class="${vencida(t) ? 'text-danger fw-semibold' : 'text-muted'}"><i class="bi bi-calendar"></i> ${vencida(t) ? 'Venció ' : ''}${fc(t.limite)}</span>` : ''}
        </div>
        <div class="d-flex gap-1 flex-wrap align-items-start">${botones}</div>
        ${puedeMover && t.estado === 'EN_PROGRESO' ? `<details class="mt-2" ${S.p.abrir === t.id ? 'open' : ''}><summary class="btn btn-sm btn-primary">Terminé <i class="bi bi-arrow-right"></i></summary>
          <form data-form="termine" data-id="${t.id}" class="mt-2">
            <label class="form-label small" for="enl-${t.id}">Enlace a tu trabajo</label>
            <input type="url" id="enl-${t.id}" name="enlace" required class="form-control form-control-sm mb-2" value="${esc(t.enlace)}" placeholder="https://drive.google.com/... o https://github.com/...">
            <button class="btn btn-sm btn-primary"><i class="bi bi-send"></i> ${esMia && ctx.lider ? 'Enviar a la docente' : 'Enviar a revisión'}</button>
          </form></details>` : ''}
        ${ctx.lider && t.estado === 'REVISION_LIDER' ? `<details class="mt-2"><summary class="small text-danger">Devolver para corregir</summary>
          <form data-form="devolver-lider" data-id="${t.id}" class="mt-2">
            <label class="form-label small" for="dev-${t.id}">¿Qué hay que corregir?</label>
            <textarea id="dev-${t.id}" name="comentario" rows="2" required class="form-control form-control-sm mb-2"></textarea>
            <button class="btn btn-sm btn-outline-danger">Devolver</button>
          </form></details>` : ''}
      </div></article>`;
}

function estudianteTareas() {
    const yo = est(S.yo.id), eq = equipo(yo.equipo), soyLider = esLider(yo.id), lider = liderDe(eq.id);
    const hitoId = +(S.p.hito || hitoActual(eq.id).id);
    const h = hito(hitoId);
    const vista = S.p.vista || 'actividad';
    const acts = actividadesDe(eq.id, hitoId);
    const tareas = S.d.tareas.filter(t => acts.some(a => a.id === t.actividad));
    const ctx = { yo: yo.id, lider: soyLider, vista };

    let html = encabezado('Tareas del equipo', esc(S.d.proyecto.nombre + ' · ' + eq.nombre));
    html += `<p class="text-muted" style="margin-top:-1rem">${soyLider
        ? 'Sos el team leader: armá las actividades de cada hito y repartí las tareas. Tus compañeros también pueden sumarse tareas.'
        : `${esc(lider ? lider.nombre : 'El team leader')} (team leader) arma las actividades. Adentro de cada una podés crearte tus tareas; cuando termines una, mandala con el enlace a tu trabajo.`}</p>`;

    const sa = sinAvance(eq.id);
    if (sa.length) html += `<div class="alert alert-warning d-flex flex-wrap align-items-center gap-2"><i class="bi bi-journal-arrow-up"></i>
        <span><strong>${sa.length === 1 ? '1 actividad terminada' : sa.length + ' actividades terminadas'}</strong> todavía sin avance: ${esc(sa.map(a => a.titulo).join(', '))}.</span>
        ${soyLider ? `<button class="btn btn-sm btn-warning ms-auto" data-ir="avances">Subir el avance</button>` : `<span class="small ms-auto">El avance lo sube ${esc(lider ? lider.nombre : 'el team leader')}.</span>`}</div>`;

    // Hitos
    html += `<nav class="mb-3" aria-label="Hitos del proyecto"><ul class="nav nav-pills flex-wrap gap-2">
      ${S.d.hitos.map(x => { const e_ = S.d.recorrido[eq.id + '-' + x.id]; return `<li class="nav-item"><button class="nav-link ${x.id === hitoId ? 'active' : 'border'}" data-ir="tareas" data-hito="${x.id}" data-vista="${vista}">${x.orden}. ${esc(x.nombre)} ${e_ === 'FINALIZADO' ? '<i class="bi bi-check-circle-fill"></i>' : e_ === 'EN_PROGRESO' ? '<i class="bi bi-hourglass-split"></i>' : ''}</button></li>`; }).join('')}
    </ul>
    <div class="info-card mt-3 border-start border-4 border-primary">
      <div class="d-flex justify-content-between flex-wrap gap-2"><h2 class="h6 mb-1"><i class="bi bi-flag"></i> ${h.orden}. ${esc(h.nombre)}: qué hay que hacer</h2><span class="small text-muted"><i class="bi bi-calendar-range"></i> Del ${fc(h.inicio)} al ${fc(h.limite)}</span></div>
      <p class="mb-0" style="white-space:pre-line">${esc(h.descripcion)}</p>
    </div></nav>`;

    // Vista
    html += `<div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
      <div class="btn-group" role="group" aria-label="Cómo ver las tareas">
        <button class="btn btn-sm ${vista === 'actividad' ? 'btn-primary' : 'btn-outline-primary'}" data-ir="tareas" data-hito="${hitoId}" data-vista="actividad"><i class="bi bi-folder2-open"></i> Por actividad</button>
        <button class="btn btn-sm ${vista === 'estado' ? 'btn-primary' : 'btn-outline-primary'}" data-ir="tareas" data-hito="${hitoId}" data-vista="estado"><i class="bi bi-kanban"></i> Por estado</button>
      </div>
      <span class="small text-muted">${acts.length} ${acts.length === 1 ? 'actividad' : 'actividades'} · ${tareas.length} ${tareas.length === 1 ? 'tarea' : 'tareas'}</span>
    </div>`;

    html += `<div class="row g-4"><div class="col-xl-8">`;

    if (vista === 'actividad') {
        if (!acts.length) html += vacio('bi-folder-plus', 'Este hito todavía no tiene actividades', soyLider ? 'Creá la primera actividad con el formulario «Nueva actividad» y después cargale sus tareas.' : 'Cuando el team leader cree las actividades, vas a poder cargar tus tareas adentro.');
        const orden = { EN_PROGRESO: 1, PENDIENTE: 2, REVISION_LIDER: 3, REVISION_DOCENTE: 4, COMPLETADA: 5 };
        acts.forEach(a => {
            const ts = tareasDe(a.id).sort((x, y) => (+(!x.devuelta || x.estado === 'COMPLETADA') - +(!y.devuelta || y.estado === 'COMPLETADA')) || orden[x.estado] - orden[y.estado]);
            const okN = ts.filter(t => t.estado === 'COMPLETADA').length, pct = ts.length ? Math.round(okN / ts.length * 100) : 0;
            const [ca, ta] = ESTADO_ACT[a.estado];
            const av = avanceDe(a.id), cerrada = actividadCerrada(a);
            const venc = a.entrega && a.entrega < S.d.hoy && a.estado !== 'FINALIZADA';
            html += `<section class="activity-card mb-4" id="actividad-${a.id}">
              <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
                <div><h2 class="h5 mb-1"><i class="bi bi-folder2-open text-primary"></i> ${esc(a.titulo)}</h2>
                  <div class="d-flex flex-wrap gap-2 small"><span class="badge ${ca}">${ta}</span>${a.entrega ? `<span class="${venc ? 'text-danger fw-semibold' : 'text-muted'}"><i class="bi bi-calendar-check"></i> ${venc ? 'Venció la entrega: ' : 'Entrega: '}${fc(a.entrega)}</span>` : ''}</div></div>
                <div class="d-flex gap-1">
                  ${!cerrada ? `<button class="btn btn-sm btn-primary" data-accion="agregar-tarea" data-id="${a.id}"><i class="bi bi-plus-lg"></i> Agregar tarea</button>` : ''}
                  ${soyLider ? `<button class="btn btn-sm btn-outline-primary" data-accion="editar-actividad" data-id="${a.id}" aria-label="Editar actividad"><i class="bi bi-pencil"></i></button>` : ''}
                  ${soyLider && !ts.length ? `<button class="btn btn-sm btn-outline-danger" data-accion="eliminar-actividad" data-id="${a.id}" aria-label="Eliminar actividad"><i class="bi bi-trash"></i></button>` : ''}
                </div>
              </div>
              ${a.descripcion ? `<p class="small text-muted mb-2">${esc(a.descripcion)}</p>` : ''}
              ${a.estado === 'FINALIZADA' && !av ? `<div class="alert alert-warning d-flex flex-wrap align-items-center gap-2 py-2 mb-3"><i class="bi bi-trophy fs-5"></i>
                  <span class="small" style="flex:1 1 260px"><strong>¡Actividad completa!</strong> La docente aprobó todas las tareas. ${soyLider ? 'Actualizá la documentación y subí el avance con el enlace al Drive.' : `Ahora ${esc(lider ? lider.nombre : 'el team leader')} sube el avance con la documentación actualizada.`}</span>
                  ${soyLider ? `<button class="btn btn-sm btn-warning ms-auto" data-ir="avances" data-actividad="${a.id}"><i class="bi bi-journal-arrow-up"></i> Subir el avance</button>` : ''}</div>`
                : (av ? `<button class="badge border-0 ${av.estado === 'REVISADO' ? 'bg-success-subtle text-success-emphasis' : av.estado === 'DEVUELTO' ? 'bg-danger-subtle text-danger-emphasis' : 'bg-primary-subtle text-primary-emphasis'} mb-3" data-ir="avances"><i class="bi bi-journal-text"></i> ${av.estado === 'REVISADO' ? 'Avance aprobado · actividad cerrada' : av.estado === 'DEVUELTO' ? 'Avance para corregir' : 'Avance enviado: lo revisa la docente'}</button>` : '')}
              ${ts.length ? `<div class="d-flex align-items-center gap-2 small mb-3"><div class="flex-grow-1">${barra(pct, 'Tareas aprobadas de ' + a.titulo)}</div><span class="text-muted text-nowrap">${okN} de ${ts.length} aprobadas</span></div>
                <div class="row g-2">${ts.map(t => `<div class="col-md-6 col-xxl-4">${tarjetaTarea(t, ctx)}</div>`).join('')}</div>`
                : `<p class="small text-muted mb-0 bg-light rounded-2 p-2">Todavía no tiene tareas. Usá «Agregar tarea» para cargar la primera.</p>`}
            </section>`;
        });
    } else {
        const cols = [['PENDIENTE', 'Pendiente', 'bi-circle text-secondary'], ['EN_PROGRESO', 'En progreso', 'bi-hourglass-split text-warning'], ['REVISION', 'En revisión', 'bi-eye text-primary'], ['COMPLETADA', 'Aprobada', 'bi-check-circle-fill text-success']];
        html += `<div class="row g-3">${cols.map(([k, t, i]) => {
            const lista = tareas.filter(x => k === 'REVISION' ? x.estado.startsWith('REVISION') : x.estado === k);
            return `<div class="col-md-6"><section class="h-100 p-3 rounded-3 bg-light"><h2 class="h6 mb-3"><i class="bi ${i}"></i> ${t} <span class="badge bg-white text-dark border">${lista.length}</span></h2>
              ${lista.length ? lista.map(x => tarjetaTarea(x, ctx)).join('') : '<p class="small text-muted mb-0">Nada por acá.</p>'}</section></div>`;
        }).join('')}</div>`;
    }

    // Distribución
    html += `<section class="info-card mt-4"><h2 class="h6 mb-3"><i class="bi bi-bar-chart"></i> ¿Cómo se reparte el trabajo en todo el proyecto?</h2><ul class="list-unstyled mb-0">
      ${integrantes(eq.id).map(e => { const ts = S.d.tareas.filter(t => t.resp === e.id), ok = ts.filter(t => t.estado === 'COMPLETADA').length, pct = ts.length ? Math.round(ok / ts.length * 100) : 0;
        return `<li class="mb-2"><div class="d-flex justify-content-between small"><span>${esc(e.nombre + ' ' + e.apellido)} <span class="text-muted">· ${esc(rol(e.rol).nombre)}</span></span><span>${ok} de ${ts.length} tareas aprobadas</span></div>${barra(pct, 'Tareas de ' + e.nombre)}</li>`; }).join('')}
    </ul></section>`;

    html += `</div><div class="col-xl-4">`;

    // Formulario de actividad (team leader)
    if (soyLider) {
        const ea = S.p.editarAct ? act(S.p.editarAct) : null;
        html += `<div class="info-card mb-4" id="form-actividad">
          <h2 class="h6 mb-1"><i class="bi bi-folder-plus"></i> ${ea ? 'Editar actividad' : 'Nueva actividad'}</h2>
          <p class="small text-muted">${ea ? 'Cambiá el nombre, la descripción o la fecha de entrega.' : `Una actividad agrupa varias tareas. Se crea en el hito «${esc(h.nombre)}».`}</p>
          <form data-form="guardar-actividad" data-id="${ea ? ea.id : ''}" data-hito="${hitoId}">
            <div class="mb-2"><label class="form-label small" for="act-t">Nombre de la actividad</label><input id="act-t" name="titulo" required maxlength="150" class="form-control" value="${esc(ea?.titulo)}" placeholder="Ej. Diseño de interfaz"></div>
            <div class="mb-2"><label class="form-label small" for="act-f">Fecha de entrega (opcional)</label><input id="act-f" type="date" name="entrega" class="form-control" value="${esc(ea?.entrega)}"></div>
            <div class="mb-3"><label class="form-label small" for="act-d">Descripción (opcional)</label><textarea id="act-d" name="descripcion" rows="2" class="form-control">${esc(ea?.descripcion)}</textarea></div>
            <div class="d-flex gap-2">${ea ? `<button type="button" class="btn btn-outline-secondary" data-accion="cancelar">Cancelar</button>` : ''}<button class="btn btn-outline-primary flex-grow-1"><i class="bi bi-check-circle"></i> ${ea ? 'Guardar cambios' : 'Crear actividad'}</button></div>
          </form></div>`;
    }

    // Formulario de tarea (cualquier integrante)
    const abiertas = S.d.actividades.filter(a => a.equipo === eq.id && !actividadCerrada(a));
    const et = S.p.editar ? tarea(S.p.editar) : null;
    const actSel = et ? et.actividad : (S.p.actividad || '');
    html += `<div class="info-card" id="form-tarea"><h2 class="h6 mb-3"><i class="bi bi-list-check"></i> ${et ? 'Editar tarea' : 'Nueva tarea'}</h2>`;
    if (!abiertas.length) {
        html += `<p class="small text-muted mb-0">${soyLider ? 'Primero creá una actividad: las tareas van adentro de una actividad.' : 'Todavía no hay actividades abiertas.'}</p>`;
    } else {
        html += `<form data-form="guardar-tarea" data-id="${et ? et.id : ''}">
          <div class="mb-2"><label class="form-label small" for="t-act">Actividad</label>
            <select id="t-act" name="actividad" required class="form-select"><option value="">Elegí la actividad</option>
              ${S.d.hitos.map(x => { const as = abiertas.filter(a => a.hito === x.id); return as.length ? `<optgroup label="${x.orden}. ${esc(x.nombre)}">${as.map(a => `<option value="${a.id}" ${+actSel === a.id ? 'selected' : ''}>${esc(a.titulo)}</option>`).join('')}</optgroup>` : ''; }).join('')}
            </select></div>
          <div class="mb-2"><label class="form-label small" for="t-tit">¿Qué hay que hacer?</label><input id="t-tit" name="titulo" required maxlength="150" class="form-control" value="${esc(et?.titulo)}" placeholder="Ej. Diseñar la pantalla de login"></div>
          ${soyLider ? `<div class="mb-2"><label class="form-label small" for="t-resp">Responsable</label><select id="t-resp" name="resp" required class="form-select"><option value="">Elegí a alguien del equipo</option>
              ${integrantes(eq.id).map(e => `<option value="${e.id}" ${et?.resp === e.id ? 'selected' : ''}>${esc(e.nombre + ' ' + e.apellido)} — ${esc(rol(e.rol).nombre)}</option>`).join('')}</select></div>`
            : `<p class="small mb-2"><i class="bi bi-person"></i> Responsable: <strong>vos</strong>. Si hace falta que la haga otra persona, pedíselo al team leader.</p>`}
          <div class="mb-2"><label class="form-label small" for="t-lim">Fecha límite</label><input id="t-lim" type="date" name="limite" class="form-control" value="${esc(et?.limite)}"></div>
          <div class="mb-3"><label class="form-label small" for="t-desc">Detalle (opcional)</label><textarea id="t-desc" name="descripcion" rows="2" class="form-control">${esc(et?.descripcion)}</textarea></div>
          <div class="d-flex gap-2">${et ? `<button type="button" class="btn btn-outline-secondary" data-accion="cancelar">Cancelar</button>` : ''}<button class="btn btn-primary flex-grow-1"><i class="bi bi-check-circle"></i> ${et ? 'Guardar cambios' : 'Crear tarea'}</button></div>
        </form>`;
    }
    html += `</div></div></div>`;
    return html;
}

/* ============================================================
   ESTUDIANTE · AVANCES
   ============================================================ */

function estudianteAvances() {
    const yo = est(S.yo.id), eq = equipo(yo.equipo), soyLider = esLider(yo.id), lider = liderDe(eq.id);
    const lista = S.d.avances.filter(a => a.equipo === eq.id).sort((a, b) => ({ DEVUELTO: 0, ENVIADO: 1, REVISADO: 2 }[a.estado] - { DEVUELTO: 0, ENVIADO: 1, REVISADO: 2 }[b.estado]));
    const sa = sinAvance(eq.id);

    let html = encabezado('Avances', esc(S.d.proyecto.nombre + ' · ' + eq.nombre));
    html += `<p class="text-muted" style="margin-top:-1rem">Cada actividad terminada lleva su avance: la documentación actualizada con todo lo que hicieron. ${soyLider ? 'Lo subís vos, como team leader.' : `Lo sube ${esc(lider ? lider.nombre : 'el team leader')}.`}</p>`;

    if (sa.length) {
        html += `<div class="alert alert-warning"><div class="fw-semibold mb-1"><i class="bi bi-journal-arrow-up"></i> ${sa.length === 1 ? 'Hay una actividad terminada que todavía no tiene su avance' : `Hay ${sa.length} actividades terminadas que todavía no tienen su avance`}</div>
          ${soyLider ? `<p class="small mb-2">La docente aprobó todas sus tareas. Actualizá la documentación y subí el enlace al Drive.</p>${sa.map(a => `<button class="btn btn-sm btn-warning me-1" data-ir="avances" data-actividad="${a.id}"><i class="bi bi-plus-lg"></i> ${esc(a.titulo)}</button>`).join('')}`
            : `<p class="small mb-0">${esc(sa.map(a => a.titulo).join(', '))}. Ayudá a ${esc(lider ? lider.nombre : 'tu team leader')} a actualizar la documentación para que suba el avance.</p>`}</div>`;
    }

    html += `<div class="row g-4"><div class="col-xl-8">`;
    html += lista.length ? lista.map(av => {
        const a = act(av.actividad), [c, i, t] = ESTADO_AVANCE[av.estado];
        return `<article class="info-card mb-3 ${av.estado === 'DEVUELTO' ? 'border border-danger' : ''}">
          <div class="d-flex justify-content-between align-items-start gap-3 mb-2"><div><h2 class="h6 mb-1"><i class="bi bi-folder2-open text-primary"></i> ${esc(a.titulo)}</h2>
            <div class="small text-muted">${esc(hito(a.hito).nombre)} · subido por ${esc(nombre(av.autor))} · ${fc(av.fecha)}</div></div>
            <span class="badge ${c} text-nowrap"><i class="bi ${i}"></i> ${t}</span></div>
          <p class="mb-2" style="white-space:pre-line">${esc(av.descripcion)}</p>
          ${enlace(av.enlace, 'Ver la documentación')}
          <details class="small mt-2"><summary class="text-muted">Tareas de la actividad (${tareasDe(a.id).length})</summary>
            <ul class="mt-2 mb-0">${tareasDe(a.id).map(x => `<li>${esc(x.titulo)} · <span class="text-muted">${esc(nombre(x.resp))}</span> ${enlace(x.enlace, 'enlace')}</li>`).join('')}</ul></details>
          ${comentariosAvance(av.id).map(cm => `<div class="mt-3 p-2 rounded-2 bg-success-subtle"><div class="small fw-semibold"><i class="bi bi-mortarboard"></i> ${esc(autorComentario(cm))} <span class="text-muted fw-normal">· ${fc(cm.fecha)}</span></div><div class="small">${esc(cm.texto)}</div></div>`).join('')}
          ${soyLider && ['ENVIADO', 'DEVUELTO'].includes(av.estado) ? `<div class="mt-3"><button class="btn btn-sm ${av.estado === 'DEVUELTO' ? 'btn-danger' : 'btn-outline-primary'}" data-ir="avances" data-corregir="${av.id}"><i class="bi bi-pencil"></i> ${av.estado === 'DEVUELTO' ? 'Corregir y reenviar' : 'Editar'}</button></div>` : ''}
        </article>`;
    }).join('') : vacio('bi-journal-text', 'Todavía no hay avances', 'Cuando la docente apruebe todas las tareas de una actividad, se sube su avance.');
    html += `</div><div class="col-xl-4"><div class="info-card" id="form-avance">`;

    if (!soyLider) {
        html += `<h2 class="h6 mb-2"><i class="bi bi-info-circle"></i> ¿Cómo funciona?</h2><ol class="small mb-0 ps-3">
          <li>Cada uno termina sus tareas y las manda con el enlace a su trabajo.</li><li>El team leader las revisa y las manda a la docente.</li>
          <li>Cuando la docente aprueba todas las tareas de una actividad, se actualiza la documentación.</li>
          <li>${esc(lider ? lider.nombre : 'El team leader')} sube el avance con el enlace al Drive.</li></ol>`;
    } else {
        const corr = S.p.corregir ? S.d.avances.find(a => a.id === +S.p.corregir) : null;
        const opciones = corr ? [act(corr.actividad)] : sa;
        const sel = corr ? corr.actividad : (S.p.actividad || (sa.length === 1 ? sa[0].id : ''));
        html += `<h2 class="h6 mb-3">${corr ? 'Corregir avance' : 'Subir un avance'}</h2>`;
        if (!opciones.length) {
            html += `<p class="small text-muted mb-0">No hay actividades terminadas sin avance. Cuando la docente apruebe todas las tareas de una actividad, vas a poder subir su avance acá.</p>`;
        } else {
            html += `<form data-form="guardar-avance" data-id="${corr ? corr.id : ''}">
              <div class="mb-2"><label class="form-label small" for="av-act">Actividad terminada</label>
                <select id="av-act" name="actividad" required class="form-select" ${corr ? 'disabled' : ''}><option value="">Elegí la actividad</option>
                ${opciones.map(a => `<option value="${a.id}" ${+sel === a.id ? 'selected' : ''}>${esc(a.titulo)} (${esc(hito(a.hito).nombre)})</option>`).join('')}</select>
                ${corr ? `<input type="hidden" name="actividad" value="${corr.actividad}">` : ''}</div>
              ${sel ? `<div class="small bg-light rounded-2 p-2 mb-2"><div class="fw-semibold mb-1">Lo que hicieron en esta actividad:</div><ul class="mb-0">${tareasDe(sel).map(x => `<li>${esc(x.titulo)} · <span class="text-muted">${esc(nombre(x.resp))}</span> ${enlace(x.enlace, 'enlace')}</li>`).join('')}</ul></div>` : ''}
              <div class="mb-2"><label class="form-label small" for="av-d">¿Qué actualizaron en la documentación?</label><textarea id="av-d" name="descripcion" rows="4" required class="form-control" placeholder="Ej. Agregamos el modelo relacional, el diccionario de datos y las capturas de las pantallas.">${esc(corr?.descripcion)}</textarea></div>
              <div class="mb-3"><label class="form-label small" for="av-e">Enlace al Drive con la documentación</label><input id="av-e" type="url" name="enlace" required class="form-control" value="${esc(corr?.enlace)}" placeholder="https://drive.google.com/..."></div>
              <div class="d-flex gap-2">${corr ? `<button type="button" class="btn btn-outline-secondary" data-ir="avances">Cancelar</button>` : ''}<button class="btn btn-primary flex-grow-1"><i class="bi bi-send-check"></i> ${corr ? 'Guardar y reenviar' : 'Enviar a la docente'}</button></div>
            </form>`;
        }
    }
    html += `</div></div></div>`;
    return html;
}

/* ============================================================
   ESTUDIANTE · AYUDA Y HORAS
   ============================================================ */

function estudianteAyuda() {
    const yo = est(S.yo.id), eq = equipo(yo.equipo);
    const pedidos = S.d.ayudas.filter(a => a.equipo === eq.id).sort((a, b) => b.id - a.id);
    const tareas = S.d.tareas.filter(t => equipoDeTarea(t) === eq.id && t.estado !== 'COMPLETADA');
    let html = encabezado('Pedir ayuda', esc(eq.nombre));
    html += `<div class="row g-4"><div class="col-lg-5"><div class="info-card">
      <h2 class="h6 mb-2"><i class="bi bi-life-preserver"></i> ¿En qué te podemos ayudar?</h2>
      <p class="small text-muted">Tu pedido le llega a la docente y aparece en su panel de inicio.</p>
      <form data-form="pedir-ayuda">
        <div class="mb-2"><label class="form-label small" for="ay-t">Tarea (opcional)</label><select id="ay-t" name="tarea" class="form-select"><option value="">Ninguna en particular</option>${tareas.map(t => `<option value="${t.id}">${esc(t.titulo)}</option>`).join('')}</select></div>
        <div class="mb-3"><label class="form-label small" for="ay-m">Contá qué necesitás</label><textarea id="ay-m" name="mensaje" rows="4" required class="form-control"></textarea></div>
        <button class="btn btn-danger w-100"><i class="bi bi-send"></i> Enviar pedido</button>
      </form></div></div>
      <div class="col-lg-7"><h2 class="h6">Pedidos del equipo</h2>
      ${pedidos.length ? pedidos.map(a => `<div class="info-card mb-2"><div class="d-flex justify-content-between small text-muted mb-1"><span>${esc(nombre(a.est))}${a.tarea ? ' · ' + esc(tarea(a.tarea)?.titulo) : ''}</span><span>${fc(a.fecha)}</span></div>
          <p class="mb-2">${esc(a.mensaje)}</p>
          ${a.estado === 'ATENDIDA' ? `<div class="small bg-success-subtle rounded-2 p-2"><strong><i class="bi bi-mortarboard"></i> Respuesta:</strong> ${esc(a.respuesta)}</div>` : `<span class="badge bg-warning text-dark">Esperando respuesta</span>`}</div>`).join('')
        : '<p class="small text-muted">Tu equipo todavía no pidió ayuda.</p>'}
      </div></div>`;
    return html;
}

function estudianteHoras() {
    const yo = est(S.yo.id), h = horas(yo.id);
    const registros = Object.entries(S.d.asistencia).filter(([k]) => +k.split('|')[0] === yo.id).map(([k, r]) => ({ fecha: k.split('|')[1], ...r })).sort((a, b) => b.fecha.localeCompare(a.fecha));
    const etiqueta = { PRESENTE: ['bg-success', 'Presente'], PARCIAL: ['bg-warning text-dark', 'Tarde'], AUSENTE: ['bg-danger', 'Ausente'], JUSTIFICADO: ['bg-info text-dark', 'Justificado'] };
    let html = encabezado('Mis horas', esc(S.d.curso.nombre + ' · ' + S.d.curso.materia));
    html += `<section class="row g-3 mb-4">${[
        ['bi-clock-history text-primary', horasTxt(h.total), 'Horas cumplidas'],
        ['bi-hourglass-split text-warning', h.faltan ? horasTxt(h.faltan) : '¡Ninguna!', 'Horas que faltan'],
        ['bi-calendar-check text-success', h.presentes, 'Presentes'],
        ['bi-award text-primary', h.rec ? horasTxt(h.rec) : '—', 'Horas reconocidas']
      ].map(([i, n, t]) => `<div class="col-6 col-lg-3"><div class="info-card h-100"><i class="bi ${i} fs-4"></i><h3 class="mt-2 mb-0">${n}</h3><h6 class="mb-0">${t}</h6></div></div>`).join('')}</section>
      <div class="info-card mb-4"><div class="d-flex justify-content-between small mb-1"><span>${horasTxt(h.total)} de ${h.req} h</span><span>${h.pct}%</span></div>${barra(h.pct, 'Avance de mis horas')}
        <p class="small text-muted mt-2 mb-0">Para aprobar Prácticas tenés que completar las ${h.req} horas, además de la nota.</p></div>`;
    const recs = S.d.reconocidas.filter(r => r.est === yo.id);
    if (recs.length) html += `<h2 class="h6">Horas reconocidas</h2><ul class="small mb-4">${recs.map(r => `<li>${horasTxt(r.horas)} · ${esc(r.motivo)} (${fl(r.fecha)})</li>`).join('')}</ul>`;
    html += `<h2 class="h6">Asistencia</h2><div class="table-responsive info-card p-0"><table class="table table-sm align-middle mb-0"><thead><tr><th>Fecha</th><th>Estado</th><th>Horas</th><th>Observación</th></tr></thead><tbody>
      ${registros.slice(0, 20).map(r => `<tr><td>${fl(r.fecha)}</td><td><span class="badge ${etiqueta[r.estado][0]}">${etiqueta[r.estado][1]}</span></td><td>${horasTxt(r.horas)}</td><td class="small text-muted">${esc(r.obs || '')}</td></tr>`).join('')}
      </tbody></table></div><p class="small text-muted mt-2">Se muestran las últimas 20 jornadas.</p>`;
    return html;
}

/* ============================================================
   RENDER
   ============================================================ */

const PANTALLAS = {
    docente: { inicio: docenteInicio, proyecto: docenteProyecto, equipo: docenteEquipo, cursos: docenteCursos, asistencia: docenteAsistencia, evaluaciones: docenteEvaluaciones },
    estudiante: { inicio: estudianteInicio, tareas: estudianteTareas, avances: estudianteAvances, ayuda: estudianteAyuda, horas: estudianteHoras }
};

function render() {
    const app = document.getElementById('app');
    if (!S.yo) {
        app.innerHTML = pantallaIngreso();
        document.title = 'Proyecta | Demo';
    } else {
        const pantallas = PANTALLAS[S.yo.tipo];
        const fn = pantallas[S.ruta] || pantallas.inicio;
        app.innerHTML = estructura(fn());
        document.title = 'Proyecta | ' + (document.querySelector('.content h1')?.textContent || 'Demo');
    }
    guardar();
    if (S.p.ancla) {
        const el = document.getElementById(S.p.ancla);
        if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
    }
}

/* ============================================================
   ACCIONES
   ============================================================ */

function comentar(obj) {
    S.d.comentarios.push({ ...obj, fecha: S.d.hoy });
}

const ACCIONES = {
    empezar(id) {
        const t = tarea(id); t.estado = 'EN_PROGRESO'; actualizarActividad(t.actividad);
        avisar('La tarea pasó a «En progreso». Cuando la termines, tocá «Terminé» y pegá el enlace a tu trabajo.');
        return { abrir: +id };
    },
    volver(id) {
        const t = tarea(id); t.estado = 'PENDIENTE'; actualizarActividad(t.actividad);
        avisar('La tarea volvió a «Pendiente».');
    },
    'enviar-docente'(id) {
        const t = tarea(id); t.estado = 'REVISION_DOCENTE';
        avisar('La tarea se envió a la docente. Probá entrar como Docente para aprobarla.');
    },
    editar(id) { return { editar: +id, ancla: 'form-tarea' }; },
    eliminar(id) {
        const t = tarea(id);
        if (!confirm(`¿Eliminar la tarea «${t.titulo}»?`)) return null;
        S.d.tareas = S.d.tareas.filter(x => x.id !== t.id);
        actualizarActividad(t.actividad);
        avisar('La tarea se eliminó.');
    },
    'agregar-tarea'(id) { return { actividad: +id, ancla: 'form-tarea' }; },
    'editar-actividad'(id) { return { editarAct: +id, ancla: 'form-actividad' }; },
    'eliminar-actividad'(id) {
        const a = act(id);
        if (!confirm(`¿Eliminar la actividad «${a.titulo}»?`)) return null;
        S.d.actividades = S.d.actividades.filter(x => x.id !== a.id);
        avisar('La actividad se eliminó.');
    },
    cancelar() { return {}; }
};

const FORMULARIOS = {
    'responder-ayuda'(f, v) {
        const a = S.d.ayudas.find(x => x.id === +f.dataset.id);
        a.estado = 'ATENDIDA'; a.respuesta = v.respuesta.trim(); a.fechaAtencion = S.d.hoy;
        avisar('Respondiste el pedido de ayuda. El estudiante ya ve tu respuesta en «Pedir ayuda».');
    },
    'docente-tarea'(f, v, decision) {
        const t = tarea(f.dataset.id), texto = (v.comentario || '').trim();
        if (decision === 'corregir' && !texto) { avisar('Para pedir una corrección, escribí qué hay que corregir.', 'danger'); return; }
        if (decision === 'aprobar') {
            t.estado = 'COMPLETADA'; t.devuelta = false;
            if (texto) comentar({ tarea: t.id, docente: true, texto });
            actualizarActividad(t.actividad);
            const a = act(t.actividad);
            avisar(a.estado === 'FINALIZADA'
                ? `La tarea quedó aprobada. Con esta, la actividad «${a.titulo}» quedó completa: el equipo ya ve el aviso para subir el avance.`
                : 'La tarea quedó aprobada.');
        } else {
            t.estado = 'EN_PROGRESO'; t.devuelta = true;
            comentar({ tarea: t.id, docente: true, texto });
            actualizarActividad(t.actividad);
            avisar('La tarea volvió al equipo para corregir, con tu comentario.');
        }
    },
    'docente-avance'(f, v, decision) {
        const av = S.d.avances.find(a => a.id === +f.dataset.id), texto = (v.comentario || '').trim();
        if (decision === 'corregir' && !texto) { avisar('Para pedir una corrección, escribí la devolución.', 'danger'); return; }
        av.estado = decision === 'aprobar' ? 'REVISADO' : 'DEVUELTO';
        if (texto) comentar({ avance: av.id, docente: true, texto });
        avisar(decision === 'aprobar' ? 'El avance quedó aprobado y la actividad, cerrada.' : 'El avance volvió al team leader para corregir.');
    },
    termine(f, v) {
        const t = tarea(f.dataset.id);
        t.enlace = v.enlace.trim(); t.devuelta = false;
        t.estado = esLider(t.resp) ? 'REVISION_DOCENTE' : 'REVISION_LIDER';
        avisar(t.estado === 'REVISION_LIDER'
            ? `La tarea se envió a revisión. Ahora la revisa ${liderDe(est(t.resp).equipo)?.nombre || 'el team leader'}: probá cambiar a ese usuario.`
            : 'La tarea se envió directamente a la docente.');
    },
    'devolver-lider'(f, v) {
        const t = tarea(f.dataset.id);
        t.estado = 'EN_PROGRESO'; t.devuelta = true;
        comentar({ tarea: t.id, docente: false, autor: S.yo.id, texto: v.comentario.trim() });
        actualizarActividad(t.actividad);
        avisar('La tarea volvió al responsable con tu comentario.');
    },
    'guardar-actividad'(f, v) {
        const yo = est(S.yo.id);
        if (f.dataset.id) {
            const a = act(f.dataset.id);
            Object.assign(a, { titulo: v.titulo.trim(), entrega: v.entrega || null, descripcion: v.descripcion.trim() });
            avisar('La actividad se actualizó.');
        } else {
            const hitoId = +f.dataset.hito;
            if (actividadesDe(yo.equipo, hitoId).some(a => a.titulo.toLowerCase() === v.titulo.trim().toLowerCase())) { avisar('Ya hay una actividad con ese nombre en este hito.', 'danger'); return; }
            const id = nuevoId();
            S.d.actividades.push({ id, equipo: yo.equipo, hito: hitoId, orden: actividadesDe(yo.equipo, hitoId).length + 1, titulo: v.titulo.trim(), descripcion: v.descripcion.trim(), estado: 'PENDIENTE', entrega: v.entrega || null, cierre: null });
            avisar('La actividad se creó. Ahora agregale sus tareas.');
            return { hito: hitoId, actividad: id, ancla: 'actividad-' + id };
        }
    },
    'guardar-tarea'(f, v) {
        const yo = est(S.yo.id), lider = esLider(yo.id);
        const a = act(v.actividad);
        const datos = { actividad: a.id, titulo: v.titulo.trim(), descripcion: v.descripcion.trim(), limite: v.limite || null, resp: lider ? +v.resp : yo.id };
        let t;
        if (f.dataset.id) {
            t = tarea(f.dataset.id);
            const anterior = t.actividad;
            Object.assign(t, datos);
            actualizarActividad(anterior);
            avisar('La tarea se guardó.');
        } else {
            t = { id: nuevoId(), creada: yo.id, enlace: '', estado: 'PENDIENTE', devuelta: false, ...datos };
            S.d.tareas.push(t);
            avisar(lider ? `La tarea se creó y se asignó a ${nombre(t.resp)}.` : 'Te creaste la tarea. Mientras esté pendiente, la podés editar o borrar.');
        }
        actualizarActividad(a.id);
        return { hito: a.hito, ancla: 'tarea-' + t.id };
    },
    'guardar-avance'(f, v) {
        const yo = est(S.yo.id);
        if (f.dataset.id) {
            const av = S.d.avances.find(a => a.id === +f.dataset.id);
            Object.assign(av, { descripcion: v.descripcion.trim(), enlace: v.enlace.trim(), estado: 'ENVIADO', fecha: S.d.hoy });
            avisar('El avance corregido se volvió a enviar a la docente.');
        } else {
            S.d.avances.push({ id: nuevoId(), equipo: yo.equipo, actividad: +v.actividad, autor: yo.id, estado: 'ENVIADO', fecha: S.d.hoy, descripcion: v.descripcion.trim(), enlace: v.enlace.trim() });
            avisar('El avance se envió a la docente. Entrá como Docente para revisarlo.');
        }
        return {};
    },
    'pedir-ayuda'(f, v) {
        const yo = est(S.yo.id);
        S.d.ayudas.push({ id: nuevoId(), equipo: yo.equipo, est: yo.id, tarea: v.tarea ? +v.tarea : null, mensaje: v.mensaje.trim(), estado: 'PENDIENTE', fecha: S.d.hoy });
        avisar('Tu pedido le llegó a la docente. Lo ves en su panel de inicio si entrás como Docente.');
    },
    'elegir-fecha'(f, v) { return { fecha: v.fecha }; },
    'guardar-asistencia'(f) {
        const fd = new FormData(f), fecha = f.dataset.fecha, jornada = +f.dataset.jornada;
        let n = 0;
        S.d.estudiantes.forEach(e => {
            const estado = fd.get('estado-' + e.id);
            if (!estado) return;
            let h = fd.get('horas-' + e.id);
            h = estado === 'PRESENTE' ? jornada : estado === 'AUSENTE' ? 0 : Math.min(jornada, Math.max(0, +h || 0));
            S.d.asistencia[e.id + '|' + fecha] = { estado, horas: h, obs: (fd.get('obs-' + e.id) || '').trim() };
            n++;
        });
        avisar(`Se guardó la asistencia de ${n} estudiantes. Las horas ya se actualizaron.`);
        return { fecha };
    },
    reconocer(f, v, d, fd) {
        const ids = fd.getAll('est');
        if (!ids.length) { avisar('Elegí al menos un estudiante.', 'danger'); return S.p; }
        ids.forEach(id => S.d.reconocidas.push({ est: +id, horas: +v.horas, motivo: v.motivo.trim(), fecha: S.d.hoy }));
        avisar(`Se reconocieron ${horasTxt(+v.horas)} a ${ids.length} estudiante${ids.length > 1 ? 's' : ''}.`);
        return S.p;
    },
    'guardar-notas'(f) {
        const fd = new FormData(f);
        let error = false;
        S.d.estudiantes.forEach(e => ['C1', 'C2', 'FINAL', 'INT_DIC', 'INT_FEB'].forEach(p => {
            const val = (fd.get(p + '-' + e.id) || '').trim();
            if (val !== '' && !/^(10|[1-9])$/.test(val)) error = true;
        }));
        if (error) { avisar('Las notas tienen que ser números enteros del 1 al 10. No se guardó nada.', 'danger'); return; }
        S.d.estudiantes.forEach(e => ['C1', 'C2', 'FINAL', 'INT_DIC', 'INT_FEB'].forEach(p => {
            const val = (fd.get(p + '-' + e.id) || '').trim(), k = e.id + '|' + p;
            if (val === '') delete S.d.notas[k]; else S.d.notas[k] = { nota: +val, obs: S.d.notas[k]?.obs || '' };
        }));
        avisar('Las notas se guardaron.');
    }
};

/* ============================================================
   EVENTOS
   ============================================================ */

document.addEventListener('click', ev => {
    const el = ev.target.closest('[data-entrar],[data-entrar-otro],[data-salir],[data-ir],[data-accion],[data-hito-estado],[data-todos-presentes],[data-usar-sugeridas],[data-reiniciar],[data-enlace-demo]');
    if (!el) return;

    if (el.hasAttribute('data-enlace-demo')) {
        ev.preventDefault();
        alert('En la demo, los enlaces a Drive o GitHub son de ejemplo y no abren ningún archivo.');
        return;
    }
    if (el.hasAttribute('data-reiniciar')) return reiniciar();

    if (el.hasAttribute('data-entrar') || el.hasAttribute('data-entrar-otro')) {
        const v = el.hasAttribute('data-entrar') ? el.dataset.entrar : document.getElementById('otro').value;
        S.yo = v === 'docente' ? { tipo: 'docente' } : { tipo: 'estudiante', id: +v };
        return ir('inicio');
    }
    if (el.hasAttribute('data-salir')) { S.yo = null; S.aviso = null; return ir('inicio'); }

    if (el.hasAttribute('data-ir')) {
        ev.preventDefault();
        const p = {};
        ['id', 'hito', 'vista', 'actividad', 'corregir'].forEach(k => { if (el.dataset[k]) p[k] = el.dataset[k]; });
        if (el.dataset.ir === 'avances' && (p.actividad || p.corregir)) p.ancla = 'form-avance';
        return ir(el.dataset.ir, p);
    }

    if (el.hasAttribute('data-accion')) {
        const res = ACCIONES[el.dataset.accion](el.dataset.id);
        if (res === null) return;
        const p = { hito: S.p.hito, vista: S.p.vista, ...(res || {}) };
        S.p = p;
        render();
        if (!p.ancla) return;
        return;
    }

    if (el.hasAttribute('data-hito-estado')) {
        const [eq, h, estado] = el.dataset.hitoEstado.split('-');
        S.d.recorrido[eq + '-' + h] = estado === 'EN' ? 'EN_PROGRESO' : estado;
        avisar(estado === 'FINALIZADO' ? 'El hito quedó finalizado para el equipo.' : 'El hito se reabrió.');
        return render();
    }

    if (el.hasAttribute('data-todos-presentes')) {
        el.closest('form').querySelectorAll('input[value="PRESENTE"]').forEach(r => { r.checked = true; });
        return;
    }

    if (el.hasAttribute('data-usar-sugeridas')) {
        let n = 0;
        document.querySelectorAll('.fila-nota').forEach(fila => {
            const c = fila.querySelector('[data-periodo="FINAL"]');
            if (c.value === '' && c.placeholder !== '') { c.value = c.placeholder; n++; actualizarFila(fila); }
        });
        el.textContent = n ? `Se completaron ${n} finales: revisalas y guardá` : 'No hay finales para completar';
    }
});

document.addEventListener('submit', ev => {
    const f = ev.target.closest('[data-form]');
    if (!f) return;
    ev.preventDefault();
    const fd = new FormData(f);
    const v = Object.fromEntries(fd.entries());
    const decision = ev.submitter?.value;
    const res = FORMULARIOS[f.dataset.form](f, v, decision, fd);
    const conservar = { hito: S.p.hito, vista: S.p.vista, id: S.p.id, fecha: S.p.fecha };
    S.p = { ...conservar, ...(res || {}) };
    render();
    if (!S.p.ancla) window.scrollTo(0, 0);
});

// Cambio de rol (docente en la página del equipo o estudiante en su inicio)
document.addEventListener('change', ev => {
    const sel = ev.target.closest('[data-cambiar-rol]');
    if (sel) {
        const e = est(sel.dataset.cambiarRol), nuevo = +sel.value;
        if (rol(nuevo).lider) integrantes(e.equipo).forEach(x => { if (x.id !== e.id && rol(x.rol).lider) x.rol = 2; });
        e.rol = nuevo;
        avisar(rol(nuevo).lider ? `${e.nombre} ahora es team leader del equipo.` : `El rol de ${e.nombre} ahora es ${rol(nuevo).nombre}.`);
        return render();
    }
    const radio = ev.target.closest('[data-estado-asis]');
    if (radio) {
        const fila = radio.closest('tr'), h = fila.querySelector('input[type=number]');
        const jornada = +radio.closest('form').dataset.jornada;
        if (radio.value === 'PRESENTE') h.value = jornada;
        if (radio.value === 'AUSENTE') h.value = 0;
        if (['PARCIAL', 'JUSTIFICADO'].includes(radio.value) && (h.value === '' || +h.value === jornada || +h.value === 0)) h.value = radio.value === 'PARCIAL' ? jornada - 1 : jornada;
    }
});

// Planilla de notas: situación y sugerida en el momento
function actualizarFila(fila) {
    const n = {};
    fila.querySelectorAll('[data-periodo]').forEach(c => { n[c.dataset.periodo] = c.value.trim(); });
    const sug = n.C1 !== '' && n.C2 !== '' ? Math.round((+n.C1 + +n.C2) / 2) : '';
    fila.querySelector('[data-periodo="FINAL"]').placeholder = sug;
    const [t, c] = situacion(n, +fila.dataset.horas);
    const b = fila.querySelector('.situacion');
    b.textContent = t;
    b.className = 'badge situacion ' + c;
}

document.addEventListener('input', ev => {
    const c = ev.target.closest('.campo-nota');
    if (c) actualizarFila(c.closest('.fila-nota'));
});

/* ============================================================
   INICIO
   ============================================================ */

cargar();
render();
