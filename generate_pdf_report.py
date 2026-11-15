import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """Canvas que agrega números de página dinámicos 'Página X de Y' y encabezado/pie institucional."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))

        # Encabezado en todas las páginas excepto la primera
        if self._pageNumber > 1:
            self.drawString(54, 750, "EDUSMART — INFORME TÉCNICO DE ARQUITECTURA E INTELIGENCIA ARTIFICIAL")
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.75)
            self.line(54, 742, letter[0] - 54, 742)

        # Pie de página institucional
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.75)
        self.line(54, 45, letter[0] - 54, 45)
        self.drawString(54, 32, "Confidencial y de Uso Oficial · EduSmart Educación Regular")
        page_str = f"Página {self._pageNumber} de {page_count}"
        self.drawRightString(letter[0] - 54, 32, page_str)
        self.restoreState()


def build_pdf(filename="INFORME_SISTEMA_E_IA_EDUSMART.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Estilos tipográficos personalizados
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=4
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#4F46E5'),
        spaceAfter=12
    )
    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=colors.HexColor('#1E3A8A'),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )
    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )
    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155'),
        spaceAfter=6
    )
    bullet_style = ParagraphStyle(
        'BulletCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.8,
        leading=12.5,
        textColor=colors.HexColor('#334155'),
        leftIndent=14,
        firstLineIndent=-10,
        spaceAfter=3
    )
    meta_style = ParagraphStyle(
        'MetaText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#475569')
    )
    code_style = ParagraphStyle(
        'CodeStyle',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor('#1E293B')
    )
    table_cell = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#334155')
    )
    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#FFFFFF')
    )

    story = []

    # =========================================================================
    # ENCABEZADO Y PORTADA INSTITUCIONAL
    # =========================================================================
    story.append(Paragraph("EDUSMART — SISTEMA DE GESTIÓN ACADÉMICA", subtitle_style))
    story.append(Paragraph("Informe Técnico de Arquitectura del Sistema e Integración de Inteligencia Artificial", title_style))
    story.append(Spacer(1, 4))

    # Caja de Metadatos
    meta_data = [
        [
            Paragraph("<b>Proyecto:</b> EduSmart Ecosistema Educativo", meta_style),
            Paragraph("<b>Fecha:</b> Noviembre 2026", meta_style),
        ],
        [
            Paragraph("<b>Nivel Educativo:</b> Educación Regular (Secundaria y Bachillerato)", meta_style),
            Paragraph("<b>Clasificación:</b> Documento Técnico Oficial", meta_style),
        ],
        [
            Paragraph("<b>Stack:</b> Django 4.2 · React 18 · MySQL/SQLite · MongoDB", meta_style),
            Paragraph("<b>Módulo IA:</b> Google Gemini Flash + Motor Escolar", meta_style),
        ]
    ]
    t_meta = Table(meta_data, colWidths=[310, 194])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#F8FAFC')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E2E8F0')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#F1F5F9')),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#4F46E5'), spaceAfter=10))

    # =========================================================================
    # 1. RESUMEN EJECUTIVO
    # =========================================================================
    story.append(Paragraph("1. RESUMEN EJECUTIVO", h1_style))
    story.append(Paragraph(
        "<b>EduSmart</b> es un ecosistema tecnológico diseñado para transformar la educación escolar mediante la convergencia entre la gestión docente y la <b>Inteligencia Artificial generativa y pedagógica</b>. Resuelve un problema central en las unidades educativas: la dispersión de información y la falta de preparación práctica continua entre el dictado de una clase y el examen formal.",
        body_style
    ))
    story.append(Paragraph(
        "A través de este sistema, <b>cada vez que un profesor de colegio marca un tema como completado</b> en su programa de aula, la plataforma genera de manera instantánea y automatizada un <b>simulador interactivo de examen escolar</b>. Este simulador evalúa las competencias del tema mediante preguntas de opción múltiple con cronómetro, califica al estudiante sobre 100 puntos y le proporciona retroalimentación diagnóstica con <b>explicaciones paso a paso de resolución</b>.",
        body_style
    ))

    # =========================================================================
    # 2. STACK TECNOLÓGICO Y LENGUAJES DE PROGRAMACIÓN
    # =========================================================================
    story.append(Paragraph("2. STACK TECNOLÓGICO Y LENGUAJES DE PROGRAMACIÓN", h1_style))
    story.append(Paragraph(
        "El sistema adopta una arquitectura desacoplada cliente-servidor basada en estándares web abiertos, seguridad transaccional y alto rendimiento:",
        body_style
    ))

    tech_table_data = [
        [
            Paragraph("Capa / Subsistema", table_header),
            Paragraph("Tecnología / Lenguaje", table_header),
            Paragraph("Versión", table_header),
            Paragraph("Propósito y Rol en EduSmart", table_header)
        ],
        [
            Paragraph("<b>Backend Core</b>", table_cell),
            Paragraph("Python / Django", table_cell),
            Paragraph("3.9+ / 4.2 LTS", table_cell),
            Paragraph("Lógica de negocio, autenticación de roles (Docente/Estudiante), ORM y seguridad.", table_cell)
        ],
        [
            Paragraph("<b>API RESTful</b>", table_cell),
            Paragraph("Django REST Framework", table_cell),
            Paragraph("3.16.1", table_cell),
            Paragraph("Serialización de datos JSON, endpoints autenticados y sanitización de respuestas.", table_cell)
        ],
        [
            Paragraph("<b>Frontend SPA</b>", table_cell),
            Paragraph("JavaScript (ES6+) / React", table_cell),
            Paragraph("React 18.2", table_cell),
            Paragraph("Interfaz interactiva modular: simuladores con cronómetro, dashboard y rúbricas.", table_cell)
        ],
        [
            Paragraph("<b>Build Tool</b>", table_cell),
            Paragraph("Vite", table_cell),
            Paragraph("8.3", table_cell),
            Paragraph("Compilación en 1.3s, Hot Module Replacement y optimización de chunks estáticos.", table_cell)
        ],
        [
            Paragraph("<b>Base Relacional</b>", table_cell),
            Paragraph("MySQL 8 / SQLite3", table_cell),
            Paragraph("8.0 / 3.x", table_cell),
            Paragraph("Integridad ACID estricta en 3NF: usuarios, materias, notas y simuladores.", table_cell)
        ],
        [
            Paragraph("<b>Base NoSQL</b>", table_cell),
            Paragraph("MongoDB Server", table_cell),
            Paragraph("4.18+", table_cell),
            Paragraph("Eventos de alta concurrencia, bitácoras inmutables de auditoría y notificaciones.", table_cell)
        ],
        [
            Paragraph("<b>Motor de IA</b>", table_cell),
            Paragraph("Google Gemini Flash + Algoritmo Escolar", table_cell),
            Paragraph("1.5 / 2.0", table_cell),
            Paragraph("Generación de ejercicios didácticos escolares, diagnóstico y explicaciones paso a paso.", table_cell)
        ],
    ]

    t_tech = Table(tech_table_data, colWidths=[80, 110, 64, 250])
    t_tech.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E3A8A')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor('#FFFFFF'), colors.HexColor('#F8FAFC')]),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_tech)
    story.append(Spacer(1, 8))

    # =========================================================================
    # 3. IMPLEMENTACIÓN DEL MÓDULO DE INTELIGENCIA ARTIFICIAL
    # =========================================================================
    story.append(Paragraph("3. IMPLEMENTACIÓN DEL MÓDULO DE INTELIGENCIA ARTIFICIAL", h1_style))
    story.append(Paragraph(
        "El módulo de IA se construyó bajo dos premisas fundamentales: <b>calibración pedagógica estricta a nivel escolar</b> y <b>disponibilidad permanente (tolerancia a fallos de red o de cuotas)</b>.",
        body_style
    ))

    story.append(Paragraph("A. Integración con Google Gemini (1.5 / 2.0 Flash)", h2_style))
    story.append(Paragraph(
        "La conexión se efectúa mediante una llamada REST HTTPS directa a la API de Google Gemini en el servicio <code>core/ai_practice_service.py</code>. Se emplea <i>Prompt Engineering</i> con directivas escolares estrictas: el modelo tiene prohibido usar terminología universitaria y se le exige devolver un esquema JSON con 4 opciones (A, B, C, D), la alternativa correcta y la justificación pedagógica.",
        body_style
    ))

    story.append(Paragraph("B. Motor Pedagógico Contextual de Respaldo (Zero-Downtime)", h2_style))
    story.append(Paragraph(
        "Si la unidad educativa no cuenta con acceso a internet en un momento dado o no ha registrado su clave de API de Gemini, el sistema activa de inmediato su <b>motor pedagógico escolar nativo</b> en Python. Este motor clasifica las materias y genera reactivos escolares de alta calidad:",
        body_style
    ))

    story.append(Paragraph("• <b>Matemáticas:</b> Ecuaciones lineales de 1er grado, despeje de incógnitas, regla de tres directa, simplificación de términos semejantes y jerarquía de operaciones (PEMDAS).", bullet_style))
    story.append(Paragraph("• <b>Lenguaje y Literatura:</b> Acentuación y tildación en agudas, graves y esdrújulas; identificación de Sujeto y Predicado; figuras retóricas escolares (Símil) y tipos de texto.", bullet_style))
    story.append(Paragraph("• <b>Física:</b> Movimiento Rectilíneo Uniforme (d = v · t), Segunda Ley de Newton (F = m · a), caída libre y aceleración de la gravedad (g = 9.8 m/s²).", bullet_style))
    story.append(Paragraph("• <b>Química:</b> Estructura del átomo (protones, neutrones, electrones), Tabla Periódica (Grupos y Períodos), conservación de la masa (Lavoisier) y pH neutro (7).", bullet_style))
    story.append(Paragraph("• <b>Biología:</b> Respiración celular en la mitocondria (ATP), fotosíntesis (CO₂ a O₂), glóbulos rojos (hemoglobina) y diferencias entre células eucariotas y procariotas.", bullet_style))
    story.append(Paragraph("• <b>Ciencias Sociales / Historia:</b> Zonas geográficas de Bolivia (Altiplano, Valles, Llanos), causas de la independencia nacional, la Constitución como ley suprema y democracia.", bullet_style))
    story.append(Spacer(1, 4))

    story.append(Paragraph("C. Evaluador Didáctico y Retroalimentación Formativa", h2_style))
    story.append(Paragraph(
        "El evaluador califica al instante en escala de 0 a 100 puntos (aprobación escolar: 51 pts). Entrega un diagnóstico cualitativo y muestra la caja <b>'¿Cómo se resuelve y por qué?'</b> en cada ejercicio para que el error se convierta en una oportunidad de refuerzo.",
        body_style
    ))

    # =========================================================================
    # 4. MODELO DE DATOS Y ENDPOINTS DE LA IA
    # =========================================================================
    story.append(Paragraph("4. MODELO DE DATOS Y ENDPOINTS DE LA IA", h1_style))
    story.append(Paragraph(
        "En la base de datos se agregaron dos entidades relacionales normalizadas:",
        body_style
    ))

    models_data = [
        [
            Paragraph("Modelo", table_header),
            Paragraph("Campos Clave", table_header),
            Paragraph("Relaciones y Propósito", table_header)
        ],
        [
            Paragraph("<b>PracticaTema</b>", table_cell),
            Paragraph("titulo, dificultad, tiempo_limite, preguntas (JSON), motor_ia, recompensa_xp, recompensa_coins, activo", table_cell),
            Paragraph("Vinculado 1:N con <code>TemaAvance</code> y <code>Materia</code>. Almacena la batería de ejercicios escolares generados.", table_cell)
        ],
        [
            Paragraph("<b>IntentoPracticaEstudiante</b>", table_cell),
            Paragraph("puntaje_obtenido, total_preguntas, respuestas_correctas, respuestas_alumno (JSON), revision_detallada (JSON), retroalimentacion_ia, aprobado, tiempo_empleado", table_cell),
            Paragraph("Vinculado a <code>PracticaTema</code> y <code>Estudiante</code>. Registra el desempeño histórico, nota y retroalimentación.", table_cell)
        ]
    ]
    t_models = Table(models_data, colWidths=[90, 194, 220])
    t_models.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1E3A8A')),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E2E8F0')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.HexColor('#FFFFFF'), colors.HexColor('#F8FAFC')]),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_models)
    story.append(Spacer(1, 6))

    story.append(Paragraph("<b>Seguridad en la API:</b> Al solicitar el simulador (<code>GET /api/v2/practicas/&lt;id&gt;/</code>), el backend sanitiza el JSON en memoria eliminando las respuestas correctas para que el estudiante no pueda ver las soluciones inspeccionando el tráfico web.", body_style))

    # =========================================================================
    # 5. FLUJO DE FUNCIONAMIENTO COMPLETO (END-TO-END)
    # =========================================================================
    story.append(Paragraph("5. FLUJO DE FUNCIONAMIENTO COMPLETO (END-TO-END)", h1_style))

    flow_steps = [
        ("Paso 1: Avance de Tema en Aula", "El profesor dicta su clase y accede a 'Gestor de Avance de Temas' en EduSmart. Marca el tema correspondiente como 'COMPLETADO'."),
        ("Paso 2: Disparo Automático con IA", "El backend detecta el cambio de estado y genera en segundo plano la batería de 5 ejercicios didácticos escolares, notificando a los estudiantes inscritos."),
        ("Paso 3: Entrenamiento del Alumno", "El estudiante ingresa a la sección 'Simuladores IA' desde su menú. Elige el tema completado e inicia el simulador con cronómetro."),
        ("Paso 4: Evaluación y Gamificación", "Al terminar, recibe su nota sobre 100 pts, la explicación analítica paso a paso y la acreditación de +40 XP y +20 EduCoins en su perfil si aprobó."),
        ("Paso 5: Monitoreo Preventivo Docente", "El docente puede revisar en tiempo real el porcentaje de alumnos que han practicado y el promedio obtenido, detectando quiénes requieren refuerzo antes del examen formal.")
    ]

    for title_step, desc_step in flow_steps:
        story.append(Paragraph(f"• <b>{title_step}:</b> {desc_step}", bullet_style))

    story.append(Spacer(1, 8))

    # =========================================================================
    # 6. CONCLUSIÓN
    # =========================================================================
    story.append(Paragraph("6. CONCLUSIÓN", h1_style))
    story.append(Paragraph(
        "EduSmart articula la rigurosidad de un sistema de gestión escolar institucional con el poder formativo de la Inteligencia Artificial. Al calibrar los reactivos a la realidad curricular de colegios de secundaria y dotar al sistema de tolerancia total a fallos, se entrega una herramienta moderna, segura, pedagógicamente sólida y lista para su despliegue en producción.",
        body_style
    ))

    # Generar el documento PDF
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF generado con éxito: {filename}")

if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else 'INFORME_SISTEMA_E_IA_EDUSMART.pdf'
    build_pdf(target)

