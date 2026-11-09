# Proyecta · Versión de demostración

**Proyecta** es una plataforma web para organizar, documentar y acompañar los proyectos colaborativos de Prácticas Profesionalizantes, desarrollada como Trabajo Final Integrador.

Esta es una **versión de demostración** que funciona entera en el navegador, sin servidor ni base de datos, para recorrer la plataforma desde un link.

- Todos los datos son **ficticios**: un proyecto de biblioteca escolar, dos equipos y ocho estudiantes.
- Se puede probar todo, pero **los cambios no se guardan**: se borran al cerrar la pestaña o al tocar «Reiniciar demo».
- La fecha está fija en el **28/10/2026** para que el recorrido sea siempre el mismo.

## Cómo recorrerla

Al entrar se elige con qué usuario recorrerla: **Docente**, **Team leader** (Tomás) o **Integrante** (Valentina), o cualquier otro estudiante.

Recorrido sugerido:

1. Como **Valentina**: en *Tareas del equipo*, terminar una tarea pegando el enlace al trabajo.
2. Como **Tomás**: revisarla y enviarla a la docente, o devolverla con un comentario.
3. Como **Docente**: en *Inicio*, aprobarla. Cuando se aprueban todas las tareas de una actividad, la actividad queda terminada.
4. Como **Tomás**: subir el avance de la actividad terminada. Como **Docente**, aprobarlo.

También se puede tomar asistencia, reconocer horas, cargar notas (la situación final tiene en cuenta la nota y las 200 horas), pedir ayuda y responderla, y cambiar roles.

## Estructura

```
index.html        Página de la demo
css/              Estilos de Proyecta (los mismos de la plataforma) y de la demo
js/datos.js       Datos ficticios iniciales
js/app.js         Pantallas y funcionamiento
vendor/           Bootstrap 5.3.7 y Bootstrap Icons 1.13.1
img/logo.png      Logo de Proyecta
```

La plataforma completa está desarrollada en PHP 8 y MySQL/MariaDB, con Bootstrap 5.
