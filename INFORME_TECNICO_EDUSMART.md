# INFORME TÉCNICO DE ARQUITECTURA Y MODELADO DE DATOS — EDUSMART

**Proyecto:** EduSmart — Plataforma Integral de Gestión Educativa, Evaluación y Analítica  
**Versión:** 2.0.0 (Release para Producción)  
**Autor:** Equipo de Arquitectura de Software e Ingeniería de Datos  
**Fecha:** Septiembre 2026  
**Clasificación:** Documento Técnico Oficial  

---

## 1. RESUMEN EJECUTIVO Y OBJETIVOS DEL SISTEMA

### 1.1. Propósito del Sistema
**EduSmart** es un ecosistema tecnológico diseñado para la gestión académica moderna en instituciones de educación básica, secundaria y superior. Su propósito central es conectar de manera fluida y en tiempo real a **Docentes**, **Estudiantes** y **Administradores**, optimizando la publicación de contenidos, entrega de tareas, evaluación continua mediante rúbricas, auditoría de calificaciones, seguimiento de desempeño y gamificación motivacional.

### 1.2. Problema que Resuelve
* **Dispersión de información:** Evita el uso fragmentado de herramientas externas (hojas de cálculo, correos, discos compartidos) centralizando materias, aulas virtuales y entregas en un solo flujo.
* **Falta de visibilidad en el rendimiento:** Ofrece una capa analítica en tiempo real para calcular promedios, porcentajes de cumplimiento y alertas de rezago académico.
* **Pérdida de trazabilidad de calificaciones:** Implementa auditoría inmutable de notas, registrando quién, cuándo y por qué se modificó una calificación.

---

## 2. ARQUITECTURA GENERAL DEL SISTEMA

El sistema adopta una arquitectura desacoplada basada en microservicios modulares y capas bien delimitadas:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CAPA DE PRESENTACIÓN                          │
│               React 19 + Vite + Lucide Icons + Canvas Confetti           │
│           (Single Page Application - SPA, Puerto 3000 / Proxy /api)     │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ JSON / HTTP REST
┌────────────────────────────────────▼────────────────────────────────────┐
│                        CAPA DE APLICACIÓN Y LÓGICA                      │
│                  Django 4.2 + Django REST Framework                     │
│    (Autenticación, Control de Roles, Gamificación, Servicios de Negocio) │
└──────────────────┬───────────────────────────────────┬──────────────────┘
                   │ ORM Transaccional (ACID)          │ Driver PyMongo / Eventos
┌──────────────────▼───────────────┐   ┌───────────────▼──────────────────┐
│   BASE DE DATOS RELACIONAL (SQL) │   │     BASE DE DATOS NOSQL (MONGO)  │
│        MySQL / SQLite            │   │              MongoDB             │
│  - Usuarios y Autenticación      │   │  - Bitácoras y Auditoría         │
│  - Cursos, Materias y Aulas      │   │  - Notificaciones en tiempo real │
│  - Tareas, Entregas y Notas      │   │  - Metadatos no estructurados    │
└──────────────────────────────────┘   └──────────────────────────────────┘
```

### 2.1. Tecnologías Principales
* **Frontend:** React 19, Vite 8, Lucide React, Canvas-Confetti, CSS3 con diseño responsivo.
* **Backend:** Python 3.10+, Django 4.2 LTS, Django REST Framework 3.16.
* **Persistencia Políglota (Polyglot Persistence):**
  * **Relacional (SQL):** MySQL 8 / SQLite para garantizar transacciones ACID e integridad referencial estricta.
  * **NoSQL (Documental):** MongoDB Server (`localhost:27017`) para eventos de alta concurrencia, bitácoras de auditoría de notas y notificaciones.

---

## 3. MODELO DE DATOS FÍSICO RELACIONAL

El modelo relacional fue rigurosamente normalizado en **Tercera Forma Normal (3NF)** para evitar redundancias, anomalías de inserción, actualización o borrado, garantizando que cada entidad represente un concepto atómico del dominio.

El diagrama gráfico físico oficial se encuentra disponible en alta definición (300 DPI) en el archivo:
[diagrama_relacional_profesional.png](file:///c:/Users/jesus/.gemini/antigravity-ide/scratch/edusmart/diagrama_relacional_profesional.png)

---

## 4. DICCIONARIO DE DATOS TÉCNICO

A continuación se detallan las **10 entidades normalizadas** que componen la base de datos relacional:

### 4.1. Módulo 1: Identidad, Roles y Autenticación

#### Tabla: `USUARIO`
Entidad padre que almacena las credenciales de acceso institucional y datos personales transversales.
| Campo | Tipo SQL | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id_usuario` | `INT` | **PK**, AUTO_INCREMENT | Identificador único del usuario |
| `nombres` | `VARCHAR(100)` | NOT NULL | Nombres del usuario |
| `apellidos` | `VARCHAR(100)` | NOT NULL | Apellidos del usuario |
| `correo` | `VARCHAR(150)` | UNIQUE, NOT NULL | Correo electrónico de inicio de sesión |
| `contraseña` | `VARCHAR(255)` | NOT NULL | Hash cifrado de la contraseña (PBKDF2/Argon2) |
| `rol` | `VARCHAR(20)` | NOT NULL | Rol en el sistema: `'DOCENTE'` o `'ESTUDIANTE'` |
| `estado` | `VARCHAR(20)` | DEFAULT `'ACTIVO'` | Estado de la cuenta: `'ACTIVO'`, `'INACTIVO'` |
| `fecha_creacion` | `DATETIME` | AUTO_NOW_ADD | Fecha y hora de registro del usuario |

#### Tabla: `PROFESOR`
Perfil extendido del usuario con rol docente (Herencia 1:1 con `USUARIO`).
| Campo | Tipo SQL | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id_profesor` | `INT` | **PK**, AUTO_INCREMENT | Identificador único del profesor |
| `id_usuario` | `INT` | **FK**, UNIQUE, NOT NULL | Clave foránea vinculada a `USUARIO(id_usuario)` |
| `especialidad` | `VARCHAR(150)` | NULL | Área de conocimiento (ej. Ciencias de la Computación) |
| `titulo_academico` | `VARCHAR(150)` | NOT NULL | Grado académico oficial |
| `estado` | `VARCHAR(20)` | DEFAULT `'ACTIVO'` | Estado laboral dentro del colegio |

#### Tabla: `ESTUDIANTE`
Perfil extendido del usuario con rol estudiante (Herencia 1:1 con `USUARIO`).
| Campo | Tipo SQL | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id_estudiante` | `INT` | **PK**, AUTO_INCREMENT | Identificador único del estudiante |
| `id_usuario` | `INT` | **FK**, UNIQUE, NOT NULL | Clave foránea vinculada a `USUARIO(id_usuario)` |
| `fecha_nacimiento` | `DATE` | NULL | Fecha de nacimiento para validaciones de nivel |
| `dato_contacto` | `VARCHAR(100)` | NULL | Teléfono o contacto del apoderado/estudiante |
| `carrera_o_area` | `VARCHAR(150)` | NULL | Programa formativo o nivel de escolaridad |
| `estado` | `VARCHAR(20)` | DEFAULT `'ACTIVO'` | Condición del alumno: `'ACTIVO'`, `'SUSPENDIDO'` |

---

### 4.2. Módulo 2: Estructura Curricular y Asignaciones

#### Tabla: `CURSO`
Representa el paralelo o grado académico al que pertenecen un grupo de materias y estudiantes.
| Campo | Tipo SQL | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id_curso` | `INT` | **PK**, AUTO_INCREMENT | Identificador único del curso |
| `nombre` | `VARCHAR(100)` | NOT NULL | Nombre descriptivo (ej. 3ro de Bachillerato) |
| `paralelo` | `VARCHAR(10)` | NOT NULL | Letra de sección (ej. 'A', 'B') |
| `gestion` | `VARCHAR(20)` | NOT NULL | Ciclo lectivo (ej. '2026-2027') |
| `estado` | `VARCHAR(20)` | DEFAULT `'ACTIVO'` | Estado del curso en el periodo actual |

#### Tabla: `MATERIA`
Asignatura específica perteneciente a un curso e impartida por un profesor.
| Campo | Tipo SQL | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id_materia` | `INT` | **PK**, AUTO_INCREMENT | Identificador de la asignatura |
| `id_profesor` | `INT` | **FK**, NOT NULL | Profesor a cargo (`PROFESOR.id_profesor`) |
| `id_curso` | `INT` | **FK**, NOT NULL | Curso al que pertenece (`CURSO.id_curso`) |
| `nombre` | `VARCHAR(150)` | NOT NULL | Nombre de la asignatura |
| `estado` | `VARCHAR(20)` | DEFAULT `'ACTIVO'` | Estado de la materia |

#### Tabla: `TAREA`
Actividad académica publicada por el docente dentro de un curso o aula virtual.
| Campo | Tipo SQL | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id_tarea` | `INT` | **PK**, AUTO_INCREMENT | Identificador de la tarea |
| `id_curso` | `INT` | **FK**, NOT NULL | Curso destinatario (`CURSO.id_curso`) |
| `titulo` | `VARCHAR(200)` | NOT NULL | Título de la actividad |
| `descripcion` | `TEXT` | NOT NULL | Indicaciones detalladas del trabajo |
| `fecha_publicacion` | `DATETIME` | NOT NULL | Momento en que la tarea pasa a ser visible |
| `fecha_entrega` | `DATETIME` | NOT NULL | Fecha y hora límite para recepción |
| `archivo` | `VARCHAR(255)` | NULL | Ruta a material adjunto o guía docente |
| `estado` | `VARCHAR(20)` | DEFAULT `'PUBLICADA'` | `'BORRADOR'`, `'PUBLICADA'`, `'FINALIZADA'` |

---

### 4.3. Módulo 3: Entregas, Evaluación y Retroalimentación

#### Tabla: `ENTREGA`
Registro del envío de la tarea realizado por el alumno.
| Campo | Tipo SQL | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id_entrega` | `INT` | **PK**, AUTO_INCREMENT | Identificador de la entrega |
| `id_tarea` | `INT` | **FK**, NOT NULL | Tarea correspondiente (`TAREA.id_tarea`) |
| `id_estudiante` | `INT` | **FK**, NOT NULL | Estudiante autor (`ESTUDIANTE.id_estudiante`) |
| `fecha_entrega` | `DATETIME` | NOT NULL | Momento en que el estudiante subió el archivo |
| `archivo` | `VARCHAR(255)` | NULL | Documento entregado por el alumno |
| `comentario` | `TEXT` | NULL | Observaciones del estudiante al momento del envío |
| `estado` | `VARCHAR(20)` | DEFAULT `'ENTREGADO'` | `'ASIGNADA'`, `'ENTREGADO'`, `'CALIFICADO'`, `'ATRASADO'` |

#### Tabla: `CALIFICACION`
Puntaje formal asignado a una entrega.
| Campo | Tipo SQL | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id_calificacion` | `INT` | **PK**, AUTO_INCREMENT | Identificador de la calificación |
| `id_entrega` | `INT` | **FK**, UNIQUE, NOT NULL | Entrega calificada (Relación 1:1 estricta) |
| `nota` | `FLOAT` | NOT NULL | Calificación numérica (escala 0 - 100) |
| `periodo` | `VARCHAR(50)` | NOT NULL | Lapso académico (ej. 'Primer Parcial') |
| `fecha_calificacion`| `DATETIME` | NOT NULL | Momento de asentamiento de la nota |

#### Tabla: `RETROALIMENTACION`
Comentarios cualitativos y formativos realizados por el docente a la entrega del estudiante.
| Campo | Tipo SQL | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id_retroalimentacion` | `INT` | **PK**, AUTO_INCREMENT | Identificador de la retroalimentación |
| `id_entrega` | `INT` | **FK**, NOT NULL | Entrega a la que se asocia (`ENTREGA.id_entrega`) |
| `id_profesor` | `INT` | **FK**, NOT NULL | Profesor emisor (`PROFESOR.id_profesor`) |
| `comentario` | `TEXT` | NOT NULL | Feedback pedagógico y recomendaciones |
| `fecha` | `DATETIME` | NOT NULL | Fecha y hora de emisión del comentario |

---

### 4.4. Módulo 4: Capa Analítica (Vista Derivada)

#### Tabla / Vista: `PROGRESO_ACADEMICO`
Estructura precalculada / materializada para consulta instantánea del cuadro de honor y métricas de desempeño.
| Campo | Tipo SQL | Restricciones | Descripción |
| :--- | :--- | :--- | :--- |
| `id_estudiante` | `INT` | **FK**, NOT NULL | Alumno objeto de la métrica |
| `id_materia` | `INT` | **FK**, NOT NULL | Materia analizada |
| `tareas_asignadas` | `INT` | DEFAULT 0 | Total de tareas creadas en el espacio |
| `tareas_entregadas` | `INT` | DEFAULT 0 | Tareas enviadas por el alumno |
| `tareas_pendientes` | `INT` | DEFAULT 0 | Tareas sin entrega activa |
| `promedio` | `FLOAT` | DEFAULT 0.0 | Promedio ponderado de notas obtenidas |
| `porcentaje_entregas` | `FLOAT` | DEFAULT 0.0 | Tasa de cumplimiento porcentual `(entregas / asignadas) * 100` |
| `ultima_calificacion` | `FLOAT` | DEFAULT 0.0 | Nota del último trabajo evaluado |

---

## 5. CATÁLOGO DE APIS REST PRINCIPALES

Todas las comunicaciones cliente-servidor se realizan mediante endpoints REST autenticados en `/api/`:

| Método | Endpoint | Rol Mínimo | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login/` | Público | Autenticación y generación de sesión |
| `GET` | `/api/auth/me/` | Autenticado | Perfil del usuario activo y permisos |
| `GET` | `/api/espacios/` | Docente / Estudiante | Listado de materias y aulas virtuales |
| `POST` | `/api/espacios/` | Docente | Creación de una nueva aula virtual |
| `GET` | `/api/espacios/<id>/tareas/` | Docente / Estudiante | Tareas vigentes y archivadas del espacio |
| `POST` | `/api/tareas/` | Docente | Publicación de una nueva tarea |
| `POST` | `/api/tareas/<id>/entregar/` | Estudiante | Carga de archivo y envío de tarea |
| `POST` | `/api/entregas/<id>/calificar/`| Docente | Registro de calificación y retroalimentación |
| `GET` | `/api/reportes/progreso/` | Docente | Métricas de rendimiento y promedios grupales |
| `GET` | `/api/gamification/leaderboard/`| Todos | Cuadro de honor y ranking de medallas/puntos |

---

## 6. PERSISTENCIA HÍBRIDA: INTEGRACIÓN CON MONGODB (NOSQL)

Para cumplir con el estándar de arquitectura políglota, las siguientes colecciones se gestionan en **MongoDB**:

1. **`notificaciones` (Colección Documental):**  
   Almacena eventos instantáneos para docentes y alumnos:
   ```json
   {
     "_id": ObjectId("651234abcd5678ef01"),
     "usuario_id": 4,
     "tipo": "CALIFICADA",
     "mensaje": "Tu tarea 'Proyecto Final' fue calificada con 95/100.",
     "leida": false,
     "fecha": ISODate("2026-09-29T08:30:00Z"),
     "metadata": { "tarea_id": 12, "nota": 95.0 }
   }
   ```
2. **`historial_auditoria_notas` (Colección Time-Series / Log Inmutable):**  
   Garantiza trazabilidad de cada cambio de nota:
   ```json
   {
     "_id": ObjectId("6599887766aabbcc01"),
     "calificacion_id": 28,
     "nota_anterior": 70.0,
     "nota_nueva": 85.0,
     "docente_id": 2,
     "motivo": "Revisión de corrección en ejercicio 4",
     "timestamp": ISODate("2026-09-29T09:15:00Z")
   }
   ```

---

## 7. GUÍA DE INSTALACIÓN Y EJECUCIÓN DEL ENTORNO

### 7.1. Requisitos Previos
* Python 3.10 o superior con entorno virtual activo.
* Node.js 18+ y npm.
* Servidor MySQL (puerto 3306) con base de datos `edusmart_db`.
* Servidor MongoDB (puerto 27017).

### 7.2. Comandos de Puesta en Marcha
```powershell
# 1. Iniciar el Backend (Django REST Framework)
cd c:\Users\jesus\.gemini\antigravity-ide\scratch\edusmart
.\venv\Scripts\python manage.py runserver 8000

# 2. Iniciar el Frontend (React + Vite)
cd c:\Users\jesus\.gemini\antigravity-ide\scratch\edusmart\frontend
npm run dev
```

* **Frontend:** [http://localhost:3000](http://localhost:3000)
* **Backend:** [http://localhost:8000](http://localhost:8000)
* **Diagrama Relacional:** [c:\Users\jesus\.gemini\antigravity-ide\scratch\edusmart\diagrama_relacional_profesional.png](file:///c:/Users/jesus/.gemini/antigravity-ide/scratch/edusmart/diagrama_relacional_profesional.png)

---

## 8. CONCLUSIÓN Y DICTAMEN DE INGENIERÍA
El sistema **EduSmart** cuenta con un modelo de datos robusto, consistente y libre de redundancias. La arquitectura híbrida propuesta (SQL para transacciones estrictas y MongoDB para logs y eventos) maximiza tanto la seguridad como la velocidad de consulta en entornos de alta concurrencia académica.
