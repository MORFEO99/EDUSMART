import io
import os
from datetime import datetime
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.graphics.shapes import Drawing, Circle, String, Rect, Group
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.barcode.code128 import Code128
from django.utils import timezone
from django.db import models


# ==============================================================================
# CONVERSIÓN DE CALIFICACIONES A LITERAL EN ESPAÑOL
# ==============================================================================
UNIDADES = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE']
DECENAS = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA']
ESPECIALES = {
    11: 'ONCE', 12: 'DOCE', 13: 'TRECE', 14: 'CATORCE', 15: 'QUINCE',
    16: 'DIECISÉIS', 17: 'DIECISIETE', 18: 'DIECIOCHO', 19: 'DIECINUEVE',
    21: 'VEINTIUNO', 22: 'VEINTIDÓS', 23: 'VEINTITRÉS', 24: 'VEINTICUATRO',
    25: 'VEINTICINCO', 26: 'VEINTISÉIS', 27: 'VEINTISIETE', 28: 'VEINTIOCHO', 29: 'VEINTINUEVE'
}

def numero_a_literal(n):
    """Convierte una calificación numérica (0-100) en su representación oficial en palabras."""
    if n is None or n == '' or n == '-':
        return '---'
    try:
        n = int(round(float(n)))
    except (ValueError, TypeError):
        return '---'
    if n == 100:
        return 'CIEN'
    if n == 0:
        return 'CERO'
    if n in ESPECIALES:
        return ESPECIALES[n]
    d = n // 10
    u = n % 10
    if d == 0:
        return UNIDADES[u]
    if u == 0:
        return DECENAS[d]
    u_str = 'UNO' if u == 1 else UNIDADES[u]
    return f"{DECENAS[d]} Y {u_str}"


def make_qr_drawing(text, size=46):
    """Genera un dibujo vectorial con el código QR institucional oficial."""
    d = Drawing(size, size)
    w = QrCodeWidget(text)
    b = w.getBounds()
    bw = b[2] - b[0]
    bh = b[3] - b[1]
    w.barWidth = size / bw if bw else 1
    w.barHeight = size / bh if bh else 1
    d.add(w)
    return d


def make_stamp_drawing(size=56):
    """Genera el sello oficial circular institucional."""
    d = Drawing(size, size)
    cx = size / 2.0
    cy = size / 2.0
    c1 = Circle(cx, cy, cx - 2)
    c1.strokeColor = colors.HexColor('#94A3B8')
    c1.strokeWidth = 1.0
    c1.fillColor = colors.HexColor('#F8FAFC')
    d.add(c1)

    c2 = Circle(cx, cy, cx - 5)
    c2.strokeColor = colors.HexColor('#CBD5E1')
    c2.strokeWidth = 0.5
    c2.fillColor = None
    d.add(c2)

    s1 = String(cx, cy + 3, "Unidad Educativa", textAnchor='middle', fontName='Helvetica', fontSize=5.5, fillColor=colors.HexColor('#64748B'))
    s2 = String(cx, cy - 6, "Sello", textAnchor='middle', fontName='Helvetica-Bold', fontSize=6.5, fillColor=colors.HexColor('#64748B'))
    d.add(s1)
    d.add(s2)
    return d


# Estructura oficial del Sistema Educativo Plurinacional (SEP - Bolivia)
AREAS_SEP_BOLIVIA = [
    # 1. COMUNIDAD Y SOCIEDAD (6 filas)
    {
        'campo': 'COMUNIDAD Y SOCIEDAD',
        'nombre': 'COMUNICACIÓN Y LENGUAJES: LENGUA CASTELLANA Y ORIGINARIA',
        'keys': ['lenguaje', 'lengua', 'comunicación', 'castellana', 'literatura']
    },
    {
        'campo': 'COMUNIDAD Y SOCIEDAD',
        'nombre': 'LENGUA EXTRANJERA',
        'keys': ['ingles', 'inglés', 'extranjera', 'idioma']
    },
    {
        'campo': 'COMUNIDAD Y SOCIEDAD',
        'nombre': 'CIENCIAS SOCIALES',
        'keys': ['sociales', 'historia', 'c. sociales']
    },
    {
        'campo': 'COMUNIDAD Y SOCIEDAD',
        'nombre': 'EDUCACIÓN FÍSICA Y DEPORTES',
        'keys': ['educación física', 'educacion fisica', 'física y deportes', 'deportes']
    },
    {
        'campo': 'COMUNIDAD Y SOCIEDAD',
        'nombre': 'EDUCACIÓN MUSICAL',
        'keys': ['música', 'musica', 'musical']
    },
    {
        'campo': 'COMUNIDAD Y SOCIEDAD',
        'nombre': 'ARTES PLÁSTICAS Y VISUALES',
        'keys': ['artes', 'artes plásticas', 'plásticas', 'dibujo']
    },
    # 2. CIENCIA TECNOLOGÍA Y PRODUCCIÓN (1 fila)
    {
        'campo': 'CIENCIA TECNOLOGÍA Y PRODUCCIÓN',
        'nombre': 'MATEMÁTICA',
        'keys': ['matematica', 'matemática', 'álgebra', 'geometría', 'base de datos', 'análisis y diseño', 'programación', 'sistemas']
    },
    # 3. VIDA TIERRA TERRITORIO (3 filas)
    {
        'campo': 'VIDA TIERRA TERRITORIO',
        'nombre': 'CIENCIAS NATURALES: BIOLOGÍA - GEOGRAFÍA',
        'keys': ['biologia', 'biología', 'ciencias naturales', 'naturales']
    },
    {
        'campo': 'VIDA TIERRA TERRITORIO',
        'nombre': 'CIENCIAS NATURALES: FÍSICA',
        'keys': ['ciencias naturales: física', 'ciencias naturales: fisica', 'física', 'fisica']
    },
    {
        'campo': 'VIDA TIERRA TERRITORIO',
        'nombre': 'CIENCIAS NATURALES: QUÍMICA',
        'keys': ['quimica', 'química']
    },
    # 4. COSMOS Y PENSAMIENTO (2 filas)
    {
        'campo': 'COSMOS Y PENSAMIENTO',
        'nombre': 'COSMOVISIONES, FILOSOFÍA Y SICOLOGÍA',
        'keys': ['cosmovisiones', 'filosofia', 'filosofía', 'psicologia', 'sicología']
    },
    {
        'campo': 'COSMOS Y PENSAMIENTO',
        'nombre': 'VALORES, ESPIRITUALIDAD Y RELIGIONES',
        'keys': ['valores', 'religión', 'religion', 'espiritualidad', 'religiones']
    },
]


def generate_student_boletin_pdf(estudiante, curso=None):
    """
    Genera la Libreta Escolar Electrónica oficial (Estado Plurinacional de Bolivia)
    idéntica al formato ministerial en A4 apaisado (Landscape).
    """
    from .models import EstudianteCurso, Espacio, Tarea, Entrega, Calificacion, Materia

    buffer = io.BytesIO()
    # A4 Landscape: 841.89 x 595.28 pt. Márgenes de 36 pt. Ancho útil: 770 pt.
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=36,
        rightMargin=36,
        topMargin=22,
        bottomMargin=20
    )

    styles = getSampleStyleSheet()

    # Estilos tipográficos
    style_title = ParagraphStyle('LT', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=12, leading=14, alignment=1)
    style_subtitle = ParagraphStyle('LST', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=9, leading=11, alignment=1)
    style_info_label = ParagraphStyle('IL', parent=styles['Normal'], fontName='Helvetica', fontSize=7, leading=9)
    style_info_val = ParagraphStyle('IV', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=7, leading=9)

    style_header_band = ParagraphStyle('HB', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=7.5, leading=9, alignment=1)
    style_th = ParagraphStyle('TH', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=6.5, leading=8, alignment=1)
    style_th_area = ParagraphStyle('THA', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=6.5, leading=8, alignment=0)
    style_campo = ParagraphStyle('TC', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=6.5, leading=8, alignment=1)
    style_area = ParagraphStyle('TA', parent=styles['Normal'], fontName='Helvetica', fontSize=6.5, leading=8, alignment=0)
    style_score = ParagraphStyle('TS', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=7, leading=8, alignment=1)
    style_score_reg = ParagraphStyle('TSR', parent=styles['Normal'], fontName='Helvetica', fontSize=7, leading=8, alignment=1)
    style_lit = ParagraphStyle('TL', parent=styles['Normal'], fontName='Helvetica', fontSize=6, leading=7.5, alignment=1)

    story = []

    # 1. DATOS DEL ESTUDIANTE, COLEGIO Y CURSO
    user = estudiante.usuario
    if not curso:
        inscripcion = EstudianteCurso.objects.filter(estudiante=estudiante, estado='ACTIVO').first()
        curso = inscripcion.curso if inscripcion else None
    else:
        inscripcion = EstudianteCurso.objects.filter(estudiante=estudiante, curso=curso).first()

    colegio = curso.colegio if curso else None
    colegio_nombre = (colegio.nombre.upper() if colegio else 'U.E. REPUBLICA DE FRANCIA B')
    # Si no tiene código SIE prefijado, incluir formato oficial
    if not any(c.isdigit() for c in colegio_nombre[:8]):
        colegio_str = f"80730153 - {colegio_nombre}"
    else:
        colegio_str = colegio_nombre

    departamento = (colegio.ciudad.upper() if (colegio and colegio.ciudad) else 'LA PAZ')
    distrito = "LA PAZ 3"
    dependencia = "FISCAL"
    turno = "TARDE"
    gestion = str(curso.anio_lectivo if (curso and curso.anio_lectivo) else 2026)

    # Nivel educativo
    nivel_curso = (curso.nivel or '').lower() if curso else ''
    grado_curso = (curso.grado or '').lower() if curso else ''
    if 'primaria' in nivel_curso or 'primaria' in grado_curso:
        nivel_titulo = "Educación Primaria Comunitaria Vocacional"
    else:
        nivel_titulo = "Educación Secundaria Comunitaria Productiva"

    # Datos del estudiante
    rude = inscripcion.codigo_ru if (inscripcion and inscripcion.codigo_ru) else f"80730226{estudiante.id:06d}5"
    # Formatear apellidos y nombres en mayúsculas
    full_name = user.nombre_completo.strip().upper()
    if user.last_name and user.first_name:
        apellidos_nombres = f"{user.last_name.upper()} {user.first_name.upper()}"
    else:
        apellidos_nombres = full_name

    grado_paralelo = f"{curso.grado.upper()} - {curso.paralelo.upper()}" if curso else "TERCERO - B"

    # 2. ENCABEZADO SUPERIOR (3 columnas: Escudo | Títulos y Datos de Escuela | Rango de Valoración y QR)
    # A) Escudo y Leyenda Nacional
    escudo_path = os.path.join(os.path.dirname(__file__), 'static', 'images', 'escudo_bolivia.png')
    escudo_elements = []
    if os.path.exists(escudo_path):
        escudo_elements.append(RLImage(escudo_path, width=42, height=39))
    escudo_elements.append(Paragraph("<b>Estado Plurinacional de Bolivia</b>", ParagraphStyle('EPB', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=5.5, leading=7, alignment=1)))
    escudo_elements.append(Paragraph("Ministerio de Educación", ParagraphStyle('ME', parent=styles['Normal'], fontName='Helvetica', fontSize=5.5, leading=7, alignment=1)))

    # B) Centro: Títulos y Datos Institucionales
    center_elements = [
        Paragraph("<b>Libreta Escolar Electrónica</b>", style_title),
        Paragraph(f"<b>{nivel_titulo}</b>", style_subtitle),
        Spacer(1, 4)
    ]
    meta_table_data = [
        [
            Paragraph(f"<b>Unidad Educativa:</b> {colegio_str}", style_info_label),
            Paragraph(f"<b>Departamento:</b> {departamento}", style_info_label),
        ],
        [
            Paragraph(f"<b>Distrito Educativo:</b> {distrito}", style_info_label),
            Paragraph(f"<b>Dependencia:</b> {dependencia}", style_info_label),
        ],
        [
            Paragraph(f"<b>Turno:</b> {turno}", style_info_label),
            Paragraph(f"<b>Gestión:</b> {gestion}", style_info_label),
        ],
    ]
    meta_table = Table(meta_table_data, colWidths=[290, 150])
    meta_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 0.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    center_elements.append(meta_table)

    # C) Derecha: Tabla Rango de Valoración + QR Code
    rango_data = [
        [Paragraph("<b>Rango de Valoración de las Dimensiones</b>", ParagraphStyle('RTH', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=4.8, leading=6, alignment=1)), "", ""],
        [Paragraph("En desarrollo", ParagraphStyle('RD1', parent=styles['Normal'], fontName='Helvetica', fontSize=4.5, leading=5.5)), Paragraph("<b>ED</b>", ParagraphStyle('RD2', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=4.5, leading=5.5, alignment=1)), Paragraph("Hasta 50", ParagraphStyle('RD3', parent=styles['Normal'], fontName='Helvetica', fontSize=4.5, leading=5.5, alignment=1))],
        [Paragraph("Desarrollo aceptable", ParagraphStyle('RD1', parent=styles['Normal'], fontName='Helvetica', fontSize=4.5, leading=5.5)), Paragraph("<b>DA</b>", ParagraphStyle('RD2', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=4.5, leading=5.5, alignment=1)), Paragraph("51 - 68", ParagraphStyle('RD3', parent=styles['Normal'], fontName='Helvetica', fontSize=4.5, leading=5.5, alignment=1))],
        [Paragraph("Desarrollo óptimo", ParagraphStyle('RD1', parent=styles['Normal'], fontName='Helvetica', fontSize=4.5, leading=5.5)), Paragraph("<b>DO</b>", ParagraphStyle('RD2', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=4.5, leading=5.5, alignment=1)), Paragraph("69 - 84", ParagraphStyle('RD3', parent=styles['Normal'], fontName='Helvetica', fontSize=4.5, leading=5.5, alignment=1))],
        [Paragraph("Desarrollo pleno", ParagraphStyle('RD1', parent=styles['Normal'], fontName='Helvetica', fontSize=4.5, leading=5.5)), Paragraph("<b>DP</b>", ParagraphStyle('RD2', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=4.5, leading=5.5, alignment=1)), Paragraph("85 - 100", ParagraphStyle('RD3', parent=styles['Normal'], fontName='Helvetica', fontSize=4.5, leading=5.5, alignment=1))],
    ]
    rango_table = Table(rango_data, colWidths=[68, 16, 26])
    rango_table.setStyle(TableStyle([
        ('SPAN', (0, 0), (2, 0)),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.black),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('TOPPADDING', (0, 0), (-1, -1), 0.8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0.8),
        ('LEFTPADDING', (0, 0), (-1, -1), 1.5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 1.5),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))

    qr_draw = make_qr_drawing(f"https://siged.minedu.gob.bo/verificar?rude={rude}&gestion={gestion}", size=42)
    qr_col = [
        qr_draw,
        Paragraph("<b>CASTELLANO</b>", ParagraphStyle('QRT', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=5, leading=6, alignment=1))
    ]

    header_block = Table([
        [escudo_elements, center_elements, rango_table, qr_col]
    ], colWidths=[120, 470, 114, 66])
    header_block.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (0, 0), (0, 0), 'CENTER'),
        ('ALIGN', (3, 0), (3, 0), 'CENTER'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    story.append(header_block)
    story.append(Spacer(1, 4))

    # 3. FILA DE INFORMACIÓN DEL ESTUDIANTE (Full width, con borde negro)
    student_bar = Table([
        [
            Paragraph(f"<b>Código Rude:</b>  {rude}", style_info_label),
            Paragraph(f"<b>Apellidos y Nombres:</b>  {apellidos_nombres}", style_info_label),
            Paragraph(f"<b>Año de Escolaridad:</b>  {grado_paralelo}", style_info_label),
        ]
    ], colWidths=[180, 420, 170])
    student_bar.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.75, colors.black),
        ('INNERGRID', (0, 0), (-1, -1), 0.75, colors.black),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(student_bar)
    story.append(Spacer(1, 2))

    # 4. FRANJA: EVALUACIÓN (Ser, Saber, Hacer y Decidir)
    eval_band = Table([
        [Paragraph("<b>Evaluación (Ser, Saber, Hacer y Decidir)</b>", style_header_band)]
    ], colWidths=[770])
    eval_band.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.75, colors.black),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(eval_band)

    # 5. RECOLECCIÓN DE CALIFICACIONES REALES DEL ESTUDIANTE
    califs_qs = Calificacion.objects.filter(entrega__estudiante=estudiante).select_related(
        'entrega__tarea', 'entrega__tarea__espacio', 'entrega__tarea__espacio__materia'
    )
    notas_por_materia = {}
    for c in califs_qs:
        esp = c.entrega.tarea.espacio
        if not esp:
            continue
        nom = ''
        if esp.materia and esp.materia.nombre:
            nom = esp.materia.nombre.lower()
        elif esp.nombre:
            nom = esp.nombre.lower()
        if nom:
            notas_por_materia.setdefault(nom, []).append(float(c.nota))

    # Promedios por materia registrada
    promedios_materias = {k: round(sum(v)/len(v)) for k, v in notas_por_materia.items()}

    def get_area_grade(area_dict):
        # Buscar coincidencia por keys
        for key in area_dict['keys']:
            for subj, avg in promedios_materias.items():
                if key in subj:
                    return avg
        return None

    # 6. CONSTRUCCIÓN DE LA TABLA PRINCIPAL DE EVALUACIÓN
    # Columnas:
    # 0: Campos (140)
    # 1: Áreas Curriculares (280)
    # 2: 1er. Trimestre (65)
    # 3: 2do. Trimestre (65)
    # 4: 3er. Trimestre (65)
    # 5: Promedio Anual - Numeral (75)
    # 6: Promedio Anual - Literal (80)
    # Total = 770 pt.

    table_data = [
        # Fila 0 de encabezado
        [
            Paragraph("<b>Campos de Saberes y Conocimientos</b>", style_th),
            Paragraph("<b>Áreas Curriculares</b>", style_th_area),
            Paragraph("<b>Valoración Cuantitativa</b>", style_th),
            "", "", "", ""
        ],
        # Fila 1 de encabezado
        [
            "", "",
            Paragraph("<b>1er. Trimestre</b>", style_th),
            Paragraph("<b>2do. Trimestre</b>", style_th),
            Paragraph("<b>3er. Trimestre</b>", style_th),
            Paragraph("<b>Promedio Anual<br/>Numeral</b>", style_th),
            Paragraph("<b>Promedio Anual<br/>Literal</b>", style_th)
        ]
    ]

    # Agregar las 12 filas de áreas curriculares
    for area in AREAS_SEP_BOLIVIA:
        grade = get_area_grade(area)
        if grade is not None:
            t1_val = str(int(round(grade)))
            t2_val = "-"
            t3_val = "-"
            num_val = "-"
            lit_val = "---"
        else:
            t1_val = "-"
            t2_val = "-"
            t3_val = "-"
            num_val = "-"
            lit_val = "---"

        row = [
            Paragraph(f"<b>{area['campo']}</b>", style_campo),
            Paragraph(area['nombre'], style_area),
            Paragraph(t1_val, style_score),
            Paragraph(t2_val, style_score_reg),
            Paragraph(t3_val, style_score_reg),
            Paragraph(num_val, style_score),
            Paragraph(lit_val, style_lit)
        ]
        table_data.append(row)

    main_table = Table(table_data, colWidths=[140, 280, 65, 65, 65, 75, 80])
    main_table.setStyle(TableStyle([
        # Spans de encabezado
        ('SPAN', (0, 0), (0, 1)),
        ('SPAN', (1, 0), (1, 1)),
        ('SPAN', (2, 0), (6, 0)),

        # Spans verticales de Campos de Saberes
        ('SPAN', (0, 2), (0, 7)),    # COMUNIDAD Y SOCIEDAD (6 filas)
        ('SPAN', (0, 8), (0, 8)),    # CIENCIA TECNOLOGÍA Y PRODUCCIÓN (1 fila)
        ('SPAN', (0, 9), (0, 11)),   # VIDA TIERRA TERRITORIO (3 filas)
        ('SPAN', (0, 12), (0, 13)),  # COSMOS Y PENSAMIENTO (2 filas)

        # Bordes
        ('BOX', (0, 0), (-1, -1), 0.75, colors.black),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.black),

        # Alineación y paddings compactos para encajar en 1 página
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 2.2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.2),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(main_table)

    # 7. INFORME DE PROMOCIÓN (Fila con borde)
    promocion_band = Table([
        [Paragraph("<b>Informe de Promoción:</b>", style_info_label)]
    ], colWidths=[770])
    promocion_band.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.75, colors.black),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(promocion_band)
    story.append(Spacer(1, 14))

    # 8. FIRMAS Y SELLOS OFICIALES
    sello_draw = make_stamp_drawing(size=52)
    sig_data = [
        [
            Paragraph("________________________________________<br/><b>Maestra/Maestro</b><br/>Firma", ParagraphStyle('SF1', parent=styles['Normal'], fontName='Helvetica', fontSize=6.5, leading=8.5, alignment=1)),
            sello_draw,
            Paragraph("________________________________________<br/><b>Directora/Director Unidad Educativa</b><br/>Firma", ParagraphStyle('SF2', parent=styles['Normal'], fontName='Helvetica', fontSize=6.5, leading=8.5, alignment=1)),
        ]
    ]
    sig_table = Table(sig_data, colWidths=[280, 210, 280])
    sig_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    story.append(sig_table)
    story.append(Spacer(1, 6))

    # 9. NOTA AL PIE Y CÓDIGO DE BARRAS INSTITUCIONAL
    barcode_flowable = Code128(rude.replace('-', ''), barHeight=13, barWidth=0.8, humanReadable=False)
    fecha_actual_str = timezone.now().strftime("%d/%m/%Y %H:%M:%S")

    footer_left = [
        Paragraph("<b>Nota:</b> Para trámites administrativos, la Directora o el Director Distrital de Educación y la Directora o el Director Departamental de Educación deberán firmar y sellar al reverso del presente documento.", ParagraphStyle('FN', parent=styles['Normal'], fontName='Helvetica', fontSize=5.5, leading=7)),
        Spacer(1, 2),
        barcode_flowable,
        Paragraph("Educación Regular", ParagraphStyle('ER', parent=styles['Normal'], fontName='Helvetica', fontSize=5.5, leading=7))
    ]
    footer_right = [
        Paragraph(f"<b>Fecha de Impresión:</b> {fecha_actual_str}", ParagraphStyle('FP', parent=styles['Normal'], fontName='Helvetica', fontSize=6, leading=8, alignment=2))
    ]

    footer_table = Table([
        [footer_left, footer_right]
    ], colWidths=[550, 220])
    footer_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'BOTTOM'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(footer_table)

    # Construir documento
    doc.build(story)
    buffer.seek(0)
    return buffer


def generate_course_gradebook_pdf(curso):
    """
    Genera el cuadro de calificaciones oficial (Centralizador de Calificaciones)
    en formato institucional del Ministerio de Educación / EduSmart.
    """
    from .models import EstudianteCurso, Espacio, Tarea, Entrega, Calificacion

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=36,
        rightMargin=36,
        topMargin=26,
        bottomMargin=24
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=13, leading=16, alignment=1
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle', parent=styles['Normal'],
        fontName='Helvetica', fontSize=8, leading=11, alignment=1
    )
    table_header_style = ParagraphStyle(
        'TableHeader', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=7, leading=9, alignment=1
    )
    cell_style = ParagraphStyle(
        'CellRegular', parent=styles['Normal'],
        fontName='Helvetica', fontSize=7, leading=9, alignment=1
    )
    cell_bold = ParagraphStyle(
        'CellBold', parent=styles['Normal'],
        fontName='Helvetica-Bold', fontSize=7, leading=9, alignment=0
    )

    story = []
    escudo_path = os.path.join(os.path.dirname(__file__), 'static', 'images', 'escudo_bolivia.png')
    escudo_img = RLImage(escudo_path, width=38, height=35) if os.path.exists(escudo_path) else Paragraph("", styles['Normal'])

    colegio_nom = curso.colegio.nombre.upper() if curso.colegio else "UNIDAD EDUCATIVA"
    paralelo_nom = getattr(curso, 'paralelo', '') or getattr(curso, 'seccion', '')

    header_table = Table([
        [
            escudo_img,
            [
                Paragraph("<b>ESTADO PLURINACIONAL DE BOLIVIA — MINISTERIO DE EDUCACIÓN</b>", subtitle_style),
                Paragraph("<b>CUADRO OFICIAL DE CALIFICACIONES DE CURSO</b>", title_style),
                Paragraph(f"<b>Unidad Educativa:</b> {colegio_nom}  ·  <b>Curso:</b> {curso.grado} \"{paralelo_nom}\"  ·  <b>Gestión:</b> {curso.anio_lectivo}", subtitle_style)
            ],
            make_qr_drawing(f"https://siged.minedu.gob.bo/curso?id={curso.id}", size=40)
        ]
    ], colWidths=[60, 650, 60])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (0, 0), 'CENTER'),
        ('ALIGN', (2, 0), (2, 0), 'CENTER'),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 8))

    table_rows = [
        [
            Paragraph("<b>N°</b>", table_header_style),
            Paragraph("<b>Código RUDE</b>", table_header_style),
            Paragraph("<b>Apellidos y Nombres</b>", table_header_style),
            Paragraph("<b>Tareas Entr.</b>", table_header_style),
            Paragraph("<b>1er. Trimestre</b>", table_header_style),
            Paragraph("<b>Promedio Numeral</b>", table_header_style),
            Paragraph("<b>Valoración Literal</b>", table_header_style),
            Paragraph("<b>Estado Académico</b>", table_header_style),
        ]
    ]

    inscritos = EstudianteCurso.objects.filter(curso=curso, estado='ACTIVO').select_related('estudiante__usuario').order_by('estudiante__usuario__last_name', 'estudiante__usuario__first_name')

    for i, insc in enumerate(inscritos, 1):
        est = insc.estudiante
        califs = Calificacion.objects.filter(entrega__estudiante=est)
        prom = round(califs.aggregate(models.Avg('nota'))['nota__avg'] or 0.0, 1) if califs.exists() else 0.0
        total_entregas = Entrega.objects.filter(estudiante=est).count()
        estado_nom = "Aprobado" if prom >= 51.0 else ("Sin notas" if prom == 0.0 else "Requiere Apoyo")
        rude_est = insc.codigo_ru or f"80730226{est.id:06d}5"
        prom_str = f"{prom:.1f}" if prom > 0 else "-"
        lit_str = numero_a_literal(prom) if prom > 0 else "---"

        table_rows.append([
            Paragraph(str(i), cell_style),
            Paragraph(rude_est, cell_style),
            Paragraph(est.usuario.nombre_completo.upper(), cell_bold),
            Paragraph(str(total_entregas), cell_style),
            Paragraph(prom_str, cell_style),
            Paragraph(f"<b>{prom_str}</b>", cell_style),
            Paragraph(lit_str, cell_style),
            Paragraph(f"<b>{estado_nom}</b>", cell_style),
        ])

    grades_table = Table(table_rows, colWidths=[25, 110, 240, 65, 75, 80, 105, 70])
    grades_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.75, colors.black),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(grades_table)
    story.append(Spacer(1, 16))

    # Firmas
    sello_draw = make_stamp_drawing(size=50)
    sig_table = Table([
        [
            Paragraph("________________________________________<br/><b>Maestra / Maestro de Curso</b>", cell_style),
            sello_draw,
            Paragraph("________________________________________<br/><b>Directora / Director Unidad Educativa</b>", cell_style),
        ]
    ], colWidths=[280, 210, 280])
    sig_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(sig_table)

    doc.build(story)
    buffer.seek(0)
    return buffer
