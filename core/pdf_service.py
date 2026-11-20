import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas
from django.utils import timezone


class NumberedCanvas(canvas.Canvas):
    """Canvas que agrega números de página dinámicos y pie institucional."""
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

        # Encabezado (páginas > 1)
        if self._pageNumber > 1:
            self.drawString(54, 750, "EDUSMART — BOLETÍN ACADÉMICO OFICIAL")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(54, 742, letter[0] - 54, 742)

        # Pie de página institucional
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(54, 45, letter[0] - 54, 45)
        self.drawString(54, 32, "Documento Oficial de Seguimiento Académico · Generado por EduSmart Cloud")
        page_str = f"Página {self._pageNumber} de {page_count}"
        self.drawRightString(letter[0] - 54, 32, page_str)
        self.restoreState()


def generate_student_boletin_pdf(estudiante, curso=None):
    """
    Genera un boletín individual de calificaciones en PDF para un estudiante.
    Retorna un objeto BytesIO con el PDF binario.
    """
    from .models import EstudianteCurso, Espacio, Tarea, Entrega, Calificacion, Materia

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'BoletinTitle', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=18, leading=22, textColor=colors.HexColor('#1E3A8A')
    )
    subtitle_style = ParagraphStyle(
        'BoletinSubtitle', parent=styles['Normal'],
        fontName='Helvetica', fontSize=10, leading=14, textColor=colors.HexColor('#64748B')
    )
    table_header_style = ParagraphStyle(
        'TableHeader', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=colors.white, alignment=1
    )
    cell_style = ParagraphStyle(
        'CellRegular', parent=styles['Normal'],
        fontName='Helvetica', fontSize=8.5, leading=11, textColor=colors.HexColor('#0F172A')
    )
    cell_bold = ParagraphStyle(
        'CellBold', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=8.5, leading=11, textColor=colors.HexColor('#0F172A')
    )

    story = []

    # 1. ENCABEZADO INSTITUCIONAL
    story.append(Paragraph("EDUSMART — SISTEMA DE GESTIÓN ACADÉMICA", title_style))
    story.append(Paragraph("BOLETÍN OFICIAL DE RENDIMIENTO Y CALIFICACIONES", subtitle_style))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#1E3A8A'), spaceBefore=2, spaceAfter=14))

    # 2. DATOS DEL ESTUDIANTE Y CURSO
    user = estudiante.usuario
    if not curso:
        inscripcion = EstudianteCurso.objects.filter(estudiante=estudiante, estado='ACTIVO').first()
        curso = inscripcion.curso if inscripcion else None

    colegio_nombre = curso.colegio.nombre if curso else "Institución Educativa EduSmart"
    curso_nombre = curso.nombre_completo if curso else "Sin curso asignado"
    fecha_emision = timezone.now().strftime("%d/%m/%Y %H:%M")

    info_data = [
        [
            Paragraph(f"<b>Estudiante:</b> {user.nombre_completo}", cell_style),
            Paragraph(f"<b>Colegio:</b> {colegio_nombre}", cell_style),
        ],
        [
            Paragraph(f"<b>Correo:</b> {user.email}", cell_style),
            Paragraph(f"<b>Curso:</b> {curso_nombre}", cell_style),
        ],
        [
            Paragraph(f"<b>Matrícula / ID:</b> EST-{estudiante.id:04d}", cell_style),
            Paragraph(f"<b>Fecha de Emisión:</b> {fecha_emision}", cell_style),
        ],
    ]
    info_table = Table(info_data, colWidths=[250, 250])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 18))

    # 3. TABLA DE MATERIAS Y CALIFICACIONES
    table_rows = [
        [
            Paragraph("Asignatura / Materia", table_header_style),
            Paragraph("Docente", table_header_style),
            Paragraph("Tareas Entr.", table_header_style),
            Paragraph("Promedio", table_header_style),
            Paragraph("Estado", table_header_style),
        ]
    ]

    # Obtener espacios en los que está inscrito el estudiante
    espacios_ids = estudiante.get_espacios_ids()
    espacios = Espacio.objects.filter(id__in=espacios_ids)

    notas_totales = []

    for esp in espacios:
        doc_nombre = esp.docente.usuario.nombre_completo if esp.docente else "Docente asignado"
        tareas_esp = Tarea.objects.filter(espacio=esp, estado='PUBLICADA')
        total_t = tareas_esp.count()
        entregas = Entrega.objects.filter(estudiante=estudiante, tarea__in=tareas_esp)
        califs = Calificacion.objects.filter(entrega__in=entregas)

        if califs.exists():
            prom = round(califs.aggregate(models.Avg('nota'))['nota__avg'] or 0.0, 1)
            notas_totales.append(prom)
        else:
            prom = 0.0

        estado_texto = "Aprobado" if prom >= 51.0 else ("En Proceso" if total_t == 0 else "Requiere Apoyo")
        color_estado = "#059669" if prom >= 51.0 else "#DC2626"

        table_rows.append([
            Paragraph(esp.nombre, cell_bold),
            Paragraph(doc_nombre, cell_style),
            Paragraph(f"{entregas.count()} de {total_t}", cell_style),
            Paragraph(f"<b>{prom:.1f}</b> / 100", cell_style),
            Paragraph(f"<font color='{color_estado}'><b>{estado_texto}</b></font>", cell_style),
        ])

    promedio_general = round(sum(notas_totales) / len(notas_totales), 1) if notas_totales else 0.0

    grades_table = Table(table_rows, colWidths=[150, 140, 70, 70, 74])
    grades_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E3A8A')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(grades_table)
    story.append(Spacer(1, 14))

    # 4. RESUMEN GLOBAL Y FIRMAS
    summary_data = [
        [
            Paragraph(f"<b>Promedio General Acumulado:</b> {promedio_general:.1f} / 100", cell_bold),
            Paragraph(f"<b>Materias Evaluadas:</b> {len(notas_totales)}", cell_style)
        ]
    ]
    summary_table = Table(summary_data, colWidths=[300, 204])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#EFF6FF')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#BFDBFE')),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 35))

    # Firmas
    signatures_data = [
        [
            Paragraph("_______________________________<br/><b>Docente / Tutor de Curso</b>", cell_style),
            Paragraph("_______________________________<br/><b>Dirección Académica</b>", cell_style),
        ]
    ]
    sig_table = Table(signatures_data, colWidths=[250, 250])
    sig_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(KeepTogether(sig_table))

    doc.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer


def generate_course_gradebook_pdf(curso):
    """
    Genera el cuadro de honor y reporte de notas general de todo un curso.
    Retorna un objeto BytesIO con el PDF binario.
    """
    from .models import EstudianteCurso, Espacio, Tarea, Entrega, Calificacion

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=18, leading=22, textColor=colors.HexColor('#1E3A8A')
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle', parent=styles['Normal'],
        fontName='Helvetica', fontSize=10, leading=14, textColor=colors.HexColor('#64748B')
    )
    table_header_style = ParagraphStyle(
        'TableHeader', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=colors.white, alignment=1
    )
    cell_style = ParagraphStyle(
        'CellRegular', parent=styles['Normal'],
        fontName='Helvetica', fontSize=8, leading=10, textColor=colors.HexColor('#0F172A')
    )
    cell_bold = ParagraphStyle(
        'CellBold', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=colors.HexColor('#0F172A')
    )

    story = []
    story.append(Paragraph(f"EDUSMART — CUADRO DE CALIFICACIONES DE CURSO", title_style))
    story.append(Paragraph(f"Colegio: {curso.colegio.nombre} · Curso: {curso.nombre_completo} ({curso.anio_lectivo})", subtitle_style))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#1E3A8A'), spaceBefore=2, spaceAfter=14))

    table_rows = [
        [
            Paragraph("N°", table_header_style),
            Paragraph("Estudiante", table_header_style),
            Paragraph("Matrícula", table_header_style),
            Paragraph("Promedio", table_header_style),
            Paragraph("Estado", table_header_style),
        ]
    ]

    inscritos = EstudianteCurso.objects.filter(curso=curso, estado='ACTIVO').select_related('estudiante__usuario').order_by('estudiante__usuario__last_name')

    for i, insc in enumerate(inscritos, 1):
        est = insc.estudiante
        califs = Calificacion.objects.filter(entrega__estudiante=est)
        prom = round(califs.aggregate(models.Avg('nota'))['nota__avg'] or 0.0, 1) if califs.exists() else 0.0
        estado_col = "#059669" if prom >= 51.0 else "#DC2626"
        estado_nom = "Aprobado" if prom >= 51.0 else "Riesgo"

        table_rows.append([
            Paragraph(str(i), cell_style),
            Paragraph(est.usuario.nombre_completo, cell_bold),
            Paragraph(f"EST-{est.id:04d}", cell_style),
            Paragraph(f"<b>{prom:.1f}</b>", cell_style),
            Paragraph(f"<font color='{estado_col}'><b>{estado_nom}</b></font>", cell_style),
        ])

    grades_table = Table(table_rows, colWidths=[24, 230, 80, 80, 90])
    grades_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E3A8A')),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(grades_table)
    story.append(Spacer(1, 30))

    doc.build(story, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    return buffer
