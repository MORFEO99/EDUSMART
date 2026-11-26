import os
import json
import re
import requests
from django.conf import settings

def get_gemini_api_key():
    return getattr(settings, 'GEMINI_API_KEY', '') or os.environ.get('GEMINI_API_KEY', '')

def get_openai_api_key():
    return getattr(settings, 'OPENAI_API_KEY', '') or os.environ.get('OPENAI_API_KEY', '')


def extract_text_from_uploaded_file(uploaded_file, max_chars=5000):
    """
    Extrae texto limpio de un archivo Word (.docx) o PDF (.pdf) o texto plano
    para alimentar el generador de cuestionarios con IA.
    """
    if not uploaded_file:
        return ''
    name = (getattr(uploaded_file, 'name', '') or '').lower()
    extracted = []
    try:
        if hasattr(uploaded_file, 'seek'):
            uploaded_file.seek(0)
        if name.endswith('.pdf'):
            from pypdf import PdfReader
            reader = PdfReader(uploaded_file)
            for page in reader.pages[:15]:
                txt = page.extract_text() or ''
                if txt.strip():
                    extracted.append(txt.strip())
        elif name.endswith('.docx'):
            from docx import Document
            doc = Document(uploaded_file)
            for p in doc.paragraphs:
                if p.text.strip():
                    extracted.append(p.text.strip())
            for table in doc.tables:
                for row in table.rows:
                    row_txt = ' | '.join(c.text.strip() for c in row.cells if c.text.strip())
                    if row_txt:
                        extracted.append(row_txt)
        elif name.endswith('.txt') or name.endswith('.md'):
            raw = uploaded_file.read()
            if isinstance(raw, bytes):
                raw = raw.decode('utf-8', errors='ignore')
            extracted.append(raw)
        if hasattr(uploaded_file, 'seek'):
            uploaded_file.seek(0)
    except Exception as e:
        print(f"[Doc Extractor] Error leyendo '{name}': {e}")
    full_text = '\n'.join(extracted).strip()
    return full_text[:max_chars]


def generate_exam_practice(materia_nombre, tema_titulo, tema_descripcion='', nivel_educativo='', cantidad=5, dificultad='INTERMEDIO'):
    """
    Genera un simulador de examen / batería de ejercicios didácticos para estudiantes
    de NIVEL COLEGIO (Secundaria / Bachillerato Escolar) basado en el tema avanzado por el docente.
    
    Materias objetivo: Lenguaje, Matemáticas, Física, Química, Biología, Historia y Ciencias Sociales.
    """
    gemini_key = get_gemini_api_key()
    openai_key = get_openai_api_key()

    if gemini_key:
        try:
            result = _call_gemini_api(gemini_key, materia_nombre, tema_titulo, tema_descripcion, nivel_educativo, cantidad, dificultad)
            if result and len(result.get('preguntas', [])) > 0:
                result['motor_ia'] = 'Google Gemini 1.5/2.0 Flash (Nivel Colegio)'
                return result
        except Exception as e:
            print(f"[AI Service] Error llamando a Gemini API: {e}. Usando motor escolar de respaldo.")

    if openai_key:
        try:
            result = _call_openai_api(openai_key, materia_nombre, tema_titulo, tema_descripcion, cantidad, dificultad)
            if result and len(result.get('preguntas', [])) > 0:
                result['motor_ia'] = 'OpenAI GPT (Nivel Colegio)'
                return result
        except Exception as e:
            print(f"[AI Service] Error llamando a OpenAI API: {e}. Usando motor escolar de respaldo.")

    # Motor pedagógico escolar especializado
    fallback = _generate_school_level_practice(
        materia_nombre=materia_nombre,
        tema_titulo=tema_titulo,
        tema_descripcion=tema_descripcion,
        cantidad=cantidad,
        dificultad=dificultad
    )
    fallback['motor_ia'] = 'Motor Pedagógico EduSmart Escolar (Colegio)'
    return fallback


def _call_gemini_api(api_key, materia, tema, descripcion, nivel, cantidad, dificultad):
    """Llama a la API de Google Gemini calibrada estrictamente para NIVEL COLEGIO / SECUNDARIA."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    
    prompt = f"""
Actúa como un profesor de COLEGIO (Educación Secundaria / Bachillerato Escolar) en la materia escolar "{materia}".
IMPORTANTE: Este contenido es exclusivamente para ESTUDIANTES DE COLEGIO (Secundaria). NO utilices nivel ni conceptos universitarios.
El docente de colegio acaba de completar en el aula el siguiente tema escolar:
- TEMA: "{tema}"
- DETALLES: "{descripcion or 'Contenido curricular oficial de colegio'}"
- CURSO / NIVEL: "{nivel or 'Secundaria'}"
- DIFICULTAD ESCOLAR: {dificultad}

Diseña un simulador de examen escolar con exactamente {cantidad} ejercicios prácticos y didácticos.
Requisitos pedagógicos para colegio:
1. Enunciados comprensibles, claros y motivadores para adolescentes de colegio.
2. 4 opciones etiquetadas exactamente con letras A), B), C), D).
3. La letra de la opción correcta ("A", "B", "C" o "D").
4. Una explicación paso a paso comprensible para un estudiante de colegio, explicando la regla, fórmula o procedimiento para que aprenda si se equivoca.
5. Nivel de dificultad escolar ('FACIL', 'INTERMEDIO' o 'AVANZADO').

RESPONDE ÚNICAMENTE CON UN OBJETO JSON VÁLIDO SIN TEXTO NI MARKDOWN EXTRA.
Estructura JSON:
{{
  "titulo": "Simulador de Examen: {tema}",
  "descripcion": "Ejercicios de práctica escolar para preparar tu examen de {materia} sobre el tema '{tema}'.",
  "tiempo_limite_minutos": 15,
  "preguntas": [
    {{
      "id": 1,
      "pregunta": "¿Texto del ejercicio escolar?",
      "tipo": "OPCION_MULTIPLE",
      "opciones": [
        "A) Primera opcion",
        "B) Segunda opcion",
        "C) Tercera opcion",
        "D) Cuarta opcion"
      ],
      "respuesta_correcta": "A",
      "explicacion": "Explicación sencilla y paso a paso para el estudiante de colegio.",
      "dificultad": "{dificultad}",
      "puntos": 20
    }}
  ]
}}
"""

    headers = {'Content-Type': 'application/json'}
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.3, "responseMimeType": "application/json"}
    }

    resp = requests.post(url, headers=headers, json=payload, timeout=20)
    if resp.status_code != 200:
        raise Exception(f"HTTP {resp.status_code}: {resp.text}")

    data = resp.json()
    raw_text = data['candidates'][0]['content']['parts'][0]['text'].strip()
    cleaned = re.sub(r'^```json\s*', '', raw_text)
    cleaned = re.sub(r'\s*```$', '', cleaned)
    return json.loads(cleaned)


def _call_openai_api(api_key, materia, tema, descripcion, cantidad, dificultad):
    url = "https://api.openai.com/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    system_prompt = f"Eres un profesor de colegio de secundaria en la asignatura escolar de {materia}. Crea preguntas didácticas de examen escolar en formato JSON estricto."
    user_prompt = f"Genera {cantidad} ejercicios escolares tipo examen para estudiantes de secundaria sobre '{tema}'. Opciones A, B, C, D con explicación didáctica paso a paso."

    payload = {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.3
    }
    resp = requests.post(url, headers=headers, json=payload, timeout=20)
    if resp.status_code == 200:
        content = resp.json()['choices'][0]['message']['content']
        return json.loads(content)
    raise Exception(f"OpenAI error {resp.status_code}")


# ==============================================================================
# MOTOR PEDAGÓGICO DE NIVEL COLEGIO (Secundaria / Bachillerato)
# Materias: Matemáticas, Lenguaje, Física, Química, Biología, Historia/Sociales
# ==============================================================================
def _generate_school_level_practice(materia_nombre, tema_titulo, tema_descripcion, cantidad=5, dificultad='INTERMEDIO'):
    m = (materia_nombre or '').lower()
    t = (tema_titulo or 'Contenido de la Lección').strip()
    clean_t = t.replace('"', '').replace("'", "")

    preguntas = []

    # 1. MATEMÁTICAS ESCOLAR (Álgebra, Aritmética, Geometría, Ecuaciones, Regla de 3)
    if any(k in m for k in ['matemát', 'algebra', 'álgebra', 'aritmet', 'geometr', 'trigonomet']):
        preguntas = [
            {
                "id": 1,
                "pregunta": f"En el tema de \"{clean_t}\", al resolver una ecuación o expresión matemática, ¿cuál es la regla fundamental de los signos y despeje?",
                "tipo": "OPCION_MULTIPLE",
                "opciones": [
                    "A) Lo que está sumando en un miembro pasa al otro miembro a restar, y lo que está multiplicando pasa a dividir.",
                    "B) Todos los números negativos pasan al otro lado siempre multiplicando por cero.",
                    "C) Se pueden borrar los números a la izquierda si no tienen variable x.",
                    "D) El signo positivo siempre se convierte en multiplicación al pasar el signo igual."
                ],
                "respuesta_correcta": "A",
                "explicacion": "Principio de transposición de términos en álgebra de colegio: para despejar la incógnita 'x', aplicamos la operación inversa en ambos miembros de la ecuación.",
                "dificultad": "FACIL",
                "puntos": 20
            },
            {
                "id": 2,
                "pregunta": f"Problema práctico de \"{clean_t}\": Si un problema escolar nos pide hallar el valor desconocido y tenemos la relación proporcional directa (regla de tres), ¿cómo se calcula?",
                "tipo": "OPCION_MULTIPLE",
                "opciones": [
                    "A) Multiplicando en cruz los valores conocidos y dividiendo entre el término restante.",
                    "B) Sumando los tres números y restándoles diez.",
                    "C) Dividiendo únicamente los dos primeros números sin considerar la incógnita.",
                    "D) Elevando al cuadrado todos los números del problema."
                ],
                "respuesta_correcta": "A",
                "explicacion": "En proporcionalidad directa de colegio: si a/b = c/x, entonces x = (b · c) / a. Se multiplican los extremos conocidos en cruz y se divide entre el opuesto.",
                "dificultad": "INTERMEDIO",
                "puntos": 20
            },
            {
                "id": 3,
                "pregunta": f"En la simplificación de términos semejantes en \"{clean_t}\", ¿qué elementos se pueden sumar o restar entre sí?",
                "tipo": "OPCION_MULTIPLE",
                "opciones": [
                    "A) Únicamente los términos que tienen exactamente la misma parte literal y los mismos exponentes (ej: 3x² con 5x²).",
                    "B) Cualquier número con cualquier letra sin importar el exponente.",
                    "C) Solo los números que no tienen letras.",
                    "D) Las letras x con las letras y directamente sumando sus coeficientes."
                ],
                "respuesta_correcta": "A",
                "explicacion": "Regla de álgebra escolar: dos términos son semejantes solo si comparten las mismas variables con iguales exponentes. Por ejemplo: 3x² + 5x² = 8x².",
                "dificultad": "FACIL",
                "puntos": 20
            },
            {
                "id": 4,
                "pregunta": f"Si en una prueba de \"{clean_t}\" obtienes una solución y el profesor te pide comprobar tu resultado, ¿qué debes hacer?",
                "tipo": "OPCION_MULTIPLE",
                "opciones": [
                    "A) Reemplazar el valor hallado en la ecuación original y verificar que el lado izquierdo sea igual al lado derecho.",
                    "B) Volver a copiar el enunciado con letra más clara.",
                    "C) Cambiar el signo del resultado final para asegurarse.",
                    "D) Asumir que está bien si el número resultante es entero y positivo."
                ],
                "respuesta_correcta": "A",
                "explicacion": "La comprobación en matemáticas de colegio consiste en sustituir el valor de 'x' en la igualdad inicial. Si 2x + 4 = 10 y x = 3, verificamos: 2(3) + 4 = 10 (se cumple).",
                "dificultad": "FACIL",
                "puntos": 20
            },
            {
                "id": 5,
                "pregunta": f"Al aplicar la jerarquía de operaciones en un ejercicio de examen de \"{clean_t}\", ¿cuál es el orden correcto de resolución?",
                "tipo": "OPCION_MULTIPLE",
                "opciones": [
                    "A) 1° Paréntesis y corchetes, 2° Potencias y raíces, 3° Multiplicaciones y divisiones, 4° Sumas y restas.",
                    "B) Siempre de derecha a izquierda resolviendo primero las sumas.",
                    "C) Primero las restas, luego los paréntesis y al final las multiplicaciones.",
                    "D) En cualquier orden aleatorio, el resultado matemático nunca cambia."
                ],
                "respuesta_correcta": "A",
                "explicacion": "La jerarquía matemática escolar (PEMDAS): primero signos de agrupación (), luego potencias/raíces, después multiplicaciones/divisiones y finalmente sumas/restas.",
                "dificultad": "INTERMEDIO",
                "puntos": 20
            }
        ]

    # 2. LENGUAJE Y COMUNICACIÓN / LITERATURA ESCOLAR
    elif any(k in m for k in ['lengua', 'literatura', 'español', 'espanol', 'comunicac', 'redacc', 'gramát', 'gramat']):
        preguntas = [
            {
                "id": 1,
                "pregunta": f"En el tema escolar de \"{clean_t}\", ¿cuál es la regla de acentuación para las palabras agudas?",
                "tipo": "OPCION_MULTIPLE",
                "opciones": [
                    "A) Llevan tilde cuando terminan en las letras 'N', 'S' o en 'VOCAL' (ej: canción, compás, papá).",
                    "B) Llevan tilde siempre sin importar en qué letra terminen.",
                    "C) Solo llevan tilde cuando terminan en cualquier consonante menos N o S.",
                    "D) Nunca llevan tilde en ningún caso en el idioma español."
                ],
                "respuesta_correcta": "A",
                "explicacion": "Regla ortográfica de colegio: las palabras agudas tienen la sílaba tónica en la última posición y se tildan si terminan en N, S o vocal.",
                "dificultad": "FACIL",
                "puntos": 20
            },
            {
                "id": 2,
                "pregunta": f"En el análisis de oraciones sobre \"{clean_t}\", ¿cómo se identifica el Sujeto de una oración?",
                "tipo": "OPCION_MULTIPLE",
                "opciones": [
                    "A) Preguntándole al verbo principal: '¿Quién?' o '¿Quiénes?' realizan o experimentan la acción.",
                    "B) Es siempre la primera palabra que aparece en el renglón.",
                    "C) Buscando la palabra más larga del párrafo.",
                    "D) Mirando cuál palabra lleva punto final."
                ],
                "respuesta_correcta": "A",
                "explicacion": "En gramática escolar, para hallar el Sujeto preguntamos al verbo: ¿Quién canta? -> 'Los estudiantes' (Sujeto). Debe concordar en número y persona.",
                "dificultad": "FACIL",
                "puntos": 20
            },
            {
                "id": 3,
                "pregunta": f"Identifica la figura literaria trabajada en la lección de \"{clean_t}\" presente en: \"Sus ojos brillaban como dos luceros en la noche\".",
                "tipo": "OPCION_MULTIPLE",
                "opciones": [
                    "A) Símil o Comparación (utiliza el nexo explícito 'como').",
                    "B) Hipérbole (exageración desmedida).",
                    "C) Onomatopeya (imitación de un sonido animal).",
                    "D) Antítesis (contraposición de palabras opuestas)."
                ],
                "respuesta_correcta": "A",
                "explicacion": "El símil es una figura retórica escolar que compara dos elementos reales o imaginarios usando conectores comparativos directos como 'como', 'cual' o 'parece'.",
                "dificultad": "INTERMEDIO",
                "puntos": 20
            },
            {
                "id": 4,
                "pregunta": f"Respecto a los signos de puntuación en \"{clean_t}\", ¿cuándo es obligatorio el uso del punto y aparte?",
                "tipo": "OPCION_MULTIPLE",
                "opciones": [
                    "A) Al finalizar un párrafo para separar dos ideas o aspectos diferentes dentro del mismo tema general.",
                    "B) En medio de una oración entre el sujeto y el verbo.",
                    "C) Únicamente al final de todo el libro completo.",
                    "D) Cada vez que se escriba un nombre propio de persona."
                ],
                "respuesta_correcta": "A",
                "explicacion": "El punto y aparte separa párrafos distintos; permite ordenar el texto escolar pasando a desarrollar una nueva idea o enfoque.",
                "dificultad": "FACIL",
                "puntos": 20
            },
            {
                "id": 5,
                "pregunta": f"En un texto escolar relacionado con \"{clean_t}\", ¿cuál es la diferencia entre un texto narrativo y un texto informativo?",
                "tipo": "OPCION_MULTIPLE",
                "opciones": [
                    "A) El narrativo relata una secuencia de hechos reales o ficticios con personajes, mientras que el informativo transmite datos y hechos objetivos de forma clara.",
                    "B) El narrativo solo tiene rimas y versos musicales.",
                    "C) El informativo nunca puede ser leído en las escuelas.",
                    "D) Son exactamente iguales y no existe ninguna diferencia."
                ],
                "respuesta_correcta": "A",
                "explicacion": "Tipología textual en secundaria: los textos narrativos cuentan historias (cuento, fábula, novela) y los informativos explican la realidad (noticia, informe, artículo).",
                "dificultad": "INTERMEDIO",
                "puntos": 20
            }
        ]

    # 3. FÍSICA ESCOLAR (MRU, MRUV, Leyes de Newton, Caída Libre, Vectores)
    elif any(k in m for k in ['física', 'fisica']):
        preguntas = [
            {
                "id": 1,
                "pregunta": f"En el Movimiento Rectilíneo Uniforme (MRU) estudiado en \"{clean_t}\", ¿cuál es la fórmula fundamental que relaciona distancia, velocidad y tiempo?",
                "tipo": "OPCION_MULTIPLE",
                "opciones": [
                    "A) d = v · t  (Distancia = Velocidad × Tiempo, con velocidad constante).",
                    "B) d = v / t²  (Distancia = Velocidad dividida entre tiempo al cuadrado).",
                    "C) v = d · t  (Velocidad = Distancia multiplicada por tiempo).",
                    "D) t = v · d  (Tiempo = Velocidad multiplicada por distancia)."
                ],
                "respuesta_correcta": "A",
                "explicacion": "Fórmula dorada de física de colegio para el MRU: Distancia = Velocidad × Tiempo (el triángulo d-v-t). Si v es constante, en 2 segundos a 10 m/s recorre d = 10 × 2 = 20 m.",
                "dificultad": "FACIL",
                "puntos": 20
            },
            {
                "id": 2,
                "pregunta": f"Problema escolar de \"{clean_t}\": Un automóvil viaja a una velocidad constante de 20 m/s durante 5 segundos. ¿Qué distancia total recorre?",
                "tipo": "OPCION_MULTIPLE",
                "opciones": [
                    "A) 100 metros (calculado mediante d = 20 m/s × 5 s).",
                    "B) 25 metros (restando 20 menos 5).",
                    "C) 4 metros (dividiendo 20 entre 5).",
                    "D) 200 metros (multiplicando por diez arbitrariamente)."
                ],
                "respuesta_correcta": "A",
                "explicacion": "Cálculo directo: d = v · t -> d = (20 m/s) · (5 s) = 100 m. Los segundos se cancelan y el resultado queda en metros.",
                "dificultad": "FACIL",
                "puntos": 20
            },
            {
                "id": 3,
                "pregunta": f"De acuerdo con la Segunda Ley de Newton explicada en \"{clean_t}\", ¿cómo se calcula la Fuerza neta sobre un cuerpo de masa 'm' que acelera con 'a'?",
                "tipo": "OPCION_MULTIPLE",
                "opciones": [
                    "A) F = m · a  (La fuerza es igual al producto de la masa por la aceleración, medida en Newtons).",
                    "B) F = m / a  (La fuerza es la masa dividida entre la aceleración).",
                    "C) F = m + a  (La fuerza es simplemente la suma de la masa más la velocidad).",
                    "D) F = a / m  (La aceleración dividida por el peso)."
                ],
                "respuesta_correcta": "A",
                "explicacion": "Segunda Ley de Newton de colegio: F = m · a. La unidad de fuerza en el Sistema Internacional es el Newton (N = kg · m/s²).",
                "dificultad": "INTERMEDIO",
                "puntos": 20
            },
            {
                "id": 4,
                "pregunta": f"En el fenómeno de Caída Libre en la Tierra correspondiente a \"{clean_t}\", ¿qué valor aproximado tiene la aceleración de la gravedad (g)?",
                "tipo": "OPCION_MULTIPLE",
                "opciones": [
                    "A) g ≈ 9.8 m/s² (o redondeado a 10 m/s² en ejercicios escolares).",
                    "B) g ≈ 0 m/s² (los cuerpos no aceleran al caer en el vacío).",
                    "C) g ≈ 100 km/h constantes.",
                    "D) g ≈ 1.6 m/s² (que corresponde a la superficie de la Luna)."
                ],
                "respuesta_correcta": "A",
                "explicacion": "En física de secundaria, la aceleración de la gravedad terrestre es estándar g = 9.8 m/s² hacia el centro de la Tierra.",
                "dificultad": "FACIL",
                "puntos": 20
            },
            {
                "id": 5,
                "pregunta": f"¿Qué ocurre con la velocidad de un objeto según la Primera Ley de Newton (Inercia) en relación a \"{clean_t}\"?",
                "tipo": "OPCION_MULTIPLE",
                "opciones": [
                    "A) Todo cuerpo permanece en reposo o con movimiento rectilíneo uniforme a menos que una fuerza externa neta actúe sobre él.",
                    "B) Los cuerpos siempre se detienen solos de inmediato sin necesidad de fricción.",
                    "C) Los objetos más pesados siempre caen un millón de veces más rápido en el vacío.",
                    "D) Un cuerpo en movimiento cambia de dirección espontáneamente sin ninguna fuerza."
                ],
                "respuesta_correcta": "A",
                "explicacion": "Principio de Inercia de Newton: si la fuerza neta es cero, un cuerpo en reposo sigue quieto y un cuerpo en movimiento continúa a velocidad constante en línea recta.",
                "dificultad": "INTERMEDIO",
                "puntos": 20
            }
        ]

    # 4. QUÍMICA ESCOLAR (Tabla Periódica, Átomos, Enlaces, Reacciones, Nomenclatura)
    elif any(k in m for k in ['química', 'quimica']):
        preguntas = [
            {
                "id": 1,
                "pregunta": f"En el estudio escolar del átomo vinculado a \"{clean_t}\", ¿dónde se encuentran los protones y neutrones?",
                "tipo": "OPCION_MULTIPLE",
                "opciones": [
                    "A) En el núcleo atómico central, mientras los electrones giran en la corteza u orbitales externos.",
                    "B) Flotando fuera del átomo sin ninguna atracción eléctrica.",
                    "C) En los electrones que rodean al átomo.",
                    "D) En el aire que separa las moléculas únicamente."
                ],
                "respuesta_correcta": "A",
                "explicacion": "Estructura atómica básica de colegio: el núcleo concentra los protones (carga +) y neutrones (sin carga), y la corteza contiene los electrones (carga -).",
                "dificultad": "FACIL",
                "puntos": 20
            },
            {
                "id": 2,
                "pregunta": f"En la Tabla Periódica revisada en \"{clean_t}\", ¿cómo se clasifican los elementos en las columnas verticales?",
                "tipo": "OPCION_MULTIPLE",
                "opciones": [
                    "A) Grupos o Familias, los cuales comparten propiedades químicas similares y el mismo número de electrones de valencia.",
                    "B) Períodos de tiempo geológico.",
                    "C) Filas horizontales ordenadas por orden alfabético de sus nombres.",
                    "D) Elementos líquidos únicamente."
                ],
                "respuesta_correcta": "A",
                "explicacion": "En química escolar, las columnas verticales son Grupos o Familias (del 1 al 18), y las filas horizontales son los Períodos (del 1 al 7).",
                "dificultad": "FACIL",
                "puntos": 20
            },
            {
                "id": 3,
                "pregunta": f"De acuerdo con la Ley de Conservación de la Masa (Lavoisier) en \"{clean_t}\", ¿qué ocurre en una reacción química balanceada?",
                "tipo": "OPCION_MULTIPLE",
                "opciones": [
                    "A) La masa total de los reactivos es exactamente igual a la masa total de los productos; la materia no se crea ni se destruye, solo se transforma.",
                    "B) La mitad de los átomos desaparecen mágicamente en forma de humo.",
                    "C) Los productos siempre pesan el triple que los reactivos originales.",
                    "D) Se crean nuevos elementos químicos que no estaban presentes al inicio."
                ],
                "respuesta_correcta": "A",
                "explicacion": "Ley fundamental de Lavoisier enseñada en secundaria: 'En toda reacción química la materia no se crea ni se destruye, solo se transforma'. Por eso balanceamos ecuaciones.",
                "dificultad": "INTERMEDIO",
                "puntos": 20
            },
            {
                "id": 4,
                "pregunta": f"¿Qué tipo de enlace químico se forma según \"{clean_t}\" cuando dos no metales comparten uno o más pares de electrones (ej: H₂O)?",
                "tipo": "OPCION_MULTIPLE",
                "opciones": [
                    "A) Enlace Covalente.",
                    "B) Enlace Iónico (donde se transfieren electrones entre metal y no metal).",
                    "C) Enlace Metálico exclusivo de los clavos de hierro.",
                    "D) Fuerza de gravedad intermolecular."
                ],
                "respuesta_correcta": "A",
                "explicacion": "Enlace covalente en química de colegio: ocurre entre elementos no metálicos que comparten electrones para alcanzar el octeto de estabilidad.",
                "dificultad": "INTERMEDIO",
                "puntos": 20
            },
            {
                "id": 5,
                "pregunta": f"En la escala de pH estudiada en \"{clean_t}\", ¿qué valor indica que una sustancia es neutra como el agua pura a 25°C?",
                "tipo": "OPCION_MULTIPLE",
                "opciones": [
                    "A) pH = 7 (valores menores a 7 son ácidos, y mayores a 7 son básicos o alcalinos).",
                    "B) pH = 0 (ácido sulfúrico concentrado).",
                    "C) pH = 14 (soda cáustica pura).",
                    "D) pH = 100."
                ],
                "respuesta_correcta": "A",
                "explicacion": "Escala de pH escolar: de 0 a 14. El centro exacto (pH 7) es neutro; de 0 a 6.9 es ácido (como el limón) y de 7.1 a 14 es básico (como el jabón).",
                "dificultad": "FACIL",
                "puntos": 20
            }
        ]

    # 5. BIOLOGÍA / CIENCIAS NATURALES ESCOLAR
    elif any(k in m for k in ['biolog', 'natural', 'ciencias naturale', 'ecolog']):
        preguntas = [
            {
                "id": 1,
                "pregunta": f"En el tema de \"{clean_t}\", ¿cuál es el organelo celular encargado de la respiración celular y producción de energía (ATP)?",
                "tipo": "OPCION_MULTIPLE",
                "opciones": [
                    "A) La Mitocondria (conocida como la central energética de la célula).",
                    "B) El Aparato de Golgi que empaqueta proteínas.",
                    "C) La pared celular exclusiva de los animales.",
                    "D) Los ribosomas encargados de disolver agua."
                ],
                "respuesta_correcta": "A",
                "explicacion": "Organelos celulares de secundaria: la mitocondria realiza la respiración celular aerobia produciendo ATP (energía vital para la célula).",
                "dificultad": "FACIL",
                "puntos": 20
            },
            {
                "id": 2,
                "pregunta": f"En el proceso de la Fotosíntesis revisado en \"{clean_t}\", ¿qué gas absorben las plantas de la atmósfera y qué gas liberan para la vida?",
                "tipo": "OPCION_MULTIPLE",
                "opciones": [
                    "A) Absorben Dióxido de Carbono (CO₂) y liberan Oxígeno (O₂) gracias a la luz solar y la clorofila.",
                    "B) Absorben Oxígeno y liberan únicamente vapor de mercurio.",
                    "C) Absorben nitrógeno puro y liberan metano.",
                    "D) No intercambian ningún gas con el ambiente."
                ],
                "respuesta_correcta": "A",
                "explicacion": "Fotosíntesis escolar: las plantas con clorofila absorben agua del suelo, CO₂ del aire y luz solar para producir glucosa y liberar oxígeno vital.",
                "dificultad": "FACIL",
                "puntos": 20
            },
            {
                "id": 3,
                "pregunta": f"En el cuerpo humano y en relación a \"{clean_t}\", ¿cuál es la función principal de los glóbulos rojos (eritrocitos)?",
                "tipo": "OPCION_MULTIPLE",
                "opciones": [
                    "A) Transportar el oxígeno desde los pulmones a todas las células del cuerpo mediante la hemoglobina.",
                    "B) Combatir las infecciones bacterianas como soldados de defensa.",
                    "C) Formar costras y coágulos ante las heridas en la piel.",
                    "D) Digerir las grasas dentro del estómago."
                ],
                "respuesta_correcta": "A",
                "explicacion": "Componentes sanguíneos de colegio: glóbulos rojos (oxígeno con hemoglobina), glóbulos blancos (defensas inmunitarias) y plaquetas (coagulación).",
                "dificultad": "INTERMEDIO",
                "puntos": 20
            },
            {
                "id": 4,
                "pregunta": f"¿Qué diferencia esencial distingue a una célula eucariota de una célula procariota en \"{clean_t}\"?",
                "tipo": "OPCION_MULTIPLE",
                "opciones": [
                    "A) La célula eucariota posee un núcleo definido rodeado por membrana que protege el ADN; la procariota (bacterias) tiene el ADN disperso en el citoplasma.",
                    "B) Las procariotas son las células de los seres humanos.",
                    "C) Las eucariotas no tienen material genético ni citoplasma.",
                    "D) No existe ninguna diferencia comprobada."
                ],
                "respuesta_correcta": "A",
                "explicacion": "Contenido clave de biología en colegio: Eucariota = con núcleo verdadero (animales, plantas, hongos). Procariota = sin núcleo (bacterias y arqueas).",
                "dificultad": "INTERMEDIO",
                "puntos": 20
            },
            {
                "id": 5,
                "pregunta": f"En una cadena trófica o alimentaria del ecosistema en \"{clean_t}\", ¿quiénes ocupan el primer nivel trófico?",
                "tipo": "OPCION_MULTIPLE",
                "opciones": [
                    "A) Los Productores (organismos autótrofos como plantas y algas que fabrican su propio alimento).",
                    "B) Los Carnívoros finales como los leones y águilas.",
                    "C) Los Descomponedores exclusivamente.",
                    "D) Los herbívoros que no pueden realizar fotosíntesis."
                ],
                "respuesta_correcta": "A",
                "explicacion": "Niveles tróficos escolares: 1° Productores (plantas), 2° Consumidores primarios (herbívoros), 3° Consumidores secundarios (carnívoros) y Descomponedores (hongos/bacterias).",
                "dificultad": "FACIL",
                "puntos": 20
            }
        ]

    # 6. HISTORIA / CIENCIAS SOCIALES / GEOGRAFÍA ESCOLAR
    elif any(k in m for k in ['historia', 'social', 'geograf', 'cívic', 'civic', 'ciudadan']):
        preguntas = [
            {
                "id": 1,
                "pregunta": f"En el estudio histórico de \"{clean_t}\", ¿cuál fue la causa principal que motivó los movimientos libertarios de independencia en América Latina?",
                "tipo": "OPCION_MULTIPLE",
                "opciones": [
                    "A) El descontento criollo con el monopolio comercial español, la difusión de las ideas de la Ilustración y la invasión napoleónica a España en 1808.",
                    "B) La búsqueda de nuevos planetas en el espacio exterior.",
                    "C) El deseo de pagar impuestos más elevados a la corona europea.",
                    "D) Un conflicto exclusivamente deportivo entre continentes."
                ],
                "respuesta_correcta": "A",
                "explicacion": "Historia escolar: las revoluciones de independencia (1809-1825 en Charcas/Bolivia y América) fueron impulsadas por el descontento criollo frente a la dominación colonial española.",
                "dificultad": "INTERMEDIO",
                "puntos": 20
            },
            {
                "id": 2,
                "pregunta": f"En geografía de colegio sobre \"{clean_t}\", ¿cómo se divide geográficamente el relieve de Bolivia?",
                "tipo": "OPCION_MULTIPLE",
                "opciones": [
                    "A) Tres grandes zonas geográficas: Zona Andina o Altiplano, Zona Subandina o Valles, y Zona de los Llanos u Oriente.",
                    "B) Únicamente en islas marítimas y arrecifes de coral.",
                    "C) En un solo desierto plano sin montañas ni ríos.",
                    "D) En doce regiones polares cubiertas permanentemente de nieve."
                ],
                "respuesta_correcta": "A",
                "explicacion": "Geografía de Bolivia en colegio: Zona Andina (Altiplano: La Paz, Oruro, Potosí), Zona de los Valles (Cochabamba, Chuquisaca, Tarija) y Zona de los Llanos (Santa Cruz, Beni, Pando).",
                "dificultad": "FACIL",
                "puntos": 20
            },
            {
                "id": 3,
                "pregunta": f"Respecto a los derechos ciudadanos y la Constitución en \"{clean_t}\", ¿cuál es la ley suprema del Estado que rige a todos los ciudadanos?",
                "tipo": "OPCION_MULTIPLE",
                "opciones": [
                    "A) La Constitución Política del Estado.",
                    "B) El reglamento interno de un club deportivo de barrio.",
                    "C) La opinión expresada por un actor famoso en televisión.",
                    "D) Un contrato de compra y venta comercial ordinario."
                ],
                "respuesta_correcta": "A",
                "explicacion": "Cívica escolar: la Constitución Política del Estado es la ley de leyes (Carta Magna) que fundamenta la organización política, derechos y deberes ciudadanos.",
                "dificultad": "FACIL",
                "puntos": 20
            },
            {
                "id": 4,
                "pregunta": f"En el acontecimiento histórico de \"{clean_t}\", ¿qué valor tiene el cuidado de los monumentos y patrimonio histórico nacional?",
                "tipo": "OPCION_MULTIPLE",
                "opciones": [
                    "A) Preserva la memoria colectiva, identidad cultural y raíces de nuestra sociedad para las futuras generaciones.",
                    "B) Ninguno, es mejor destruirlos para edificar fábricas.",
                    "C) Solo tienen valor monetario para venderse a otros países.",
                    "D) No guardan ninguna relación con la historia patria."
                ],
                "respuesta_correcta": "A",
                "explicacion": "Patrimonio cultural en ciencias sociales de colegio: los sitios históricos y monumentos representan la memoria viva de nuestra historia comunitaria.",
                "dificultad": "FACIL",
                "puntos": 20
            },
            {
                "id": 5,
                "pregunta": f"¿Cuál es el valor cívico de la Democracia participativa aprendido en la unidad de \"{clean_t}\"?",
                "tipo": "OPCION_MULTIPLE",
                "opciones": [
                    "A) Garantizar la participación del pueblo mediante el voto libre, el respeto a los derechos humanos y la división de los poderes del Estado.",
                    "B) Que una sola persona tome todas las decisiones sin consultar a nadie.",
                    "C) La prohibición de que las personas expresen sus opiniones de forma pacífica.",
                    "D) Eliminar las elecciones y las leyes vigentes."
                ],
                "respuesta_correcta": "A",
                "explicacion": "Educación cívica escolar: la democracia garantiza la libertad ciudadana, el sufragio universal y la convivencia armónica en sociedad.",
                "dificultad": "INTERMEDIO",
                "puntos": 20
            }
        ]

    # 7. MATERIA ESCOLAR GENERAL
    else:
        preguntas = [
            {
                "id": 1,
                "pregunta": f"En el avance escolar del tema \"{clean_t}\" de {materia_nombre}, ¿cuál es el concepto central que debes dominar para tu examen?",
                "tipo": "OPCION_MULTIPLE",
                "opciones": [
                    "A) Comprender la definición básica, las reglas explicadas por el profesor y sus aplicaciones prácticas en las actividades del aula.",
                    "B) Memorizar palabras sin comprender qué significan en la vida real.",
                    "C) Suponer que el tema no entrará en la evaluación bimestral.",
                    "D) Copiar la tarea de otro compañero sin repasar."
                ],
                "respuesta_correcta": "A",
                "explicacion": f"Dominar los conceptos clave de \"{clean_t}\" es el primer paso para obtener la máxima nota en tu prueba escolar.",
                "dificultad": "FACIL",
                "puntos": 20
            },
            {
                "id": 2,
                "pregunta": f"¿Cómo se relaciona el tema escolar \"{clean_t}\" con lo aprendido en las clases anteriores?",
                "tipo": "OPCION_MULTIPLE",
                "opciones": [
                    "A) Complementa y amplía los conocimientos de la materia, conectando la teoría con ejercicios prácticos del libro.",
                    "B) Es un tema que elimina todo lo que se estudió en el trimestre anterior.",
                    "C) No tiene relación con ninguna materia del colegio.",
                    "D) Solo sirve para llenar espacio en el cuaderno."
                ],
                "respuesta_correcta": "A",
                "explicacion": "El aprendizaje escolar es continuo: cada lección explicada por el profesor sienta las bases para las siguientes unidades del año lectivo.",
                "dificultad": "FACIL",
                "puntos": 20
            },
            {
                "id": 3,
                "pregunta": f"Al resolver un ejercicio práctico sobre \"{clean_t}\" en el aula, ¿cuál es el procedimiento escolar recomendado?",
                "tipo": "OPCION_MULTIPLE",
                "opciones": [
                    "A) Leer atentamente la consigna, identificar los datos del enunciado, aplicar el método del profesor y revisar la respuesta final.",
                    "B) Responder al azar sin leer el problema completo.",
                    "C) Empezar a escribir de inmediato sin saber qué se está pidiendo.",
                    "D) Dejar la hoja en blanco ante la primera duda."
                ],
                "respuesta_correcta": "A",
                "explicacion": "Hábito de estudio escolar: leer con atención el enunciado y ordenar los datos antes de resolver asegura un examen exitoso.",
                "dificultad": "INTERMEDIO",
                "puntos": 20
            },
            {
                "id": 4,
                "pregunta": f"¿Cuál de las siguientes afirmaciones sobre \"{clean_t}\" es verdadera según las explicaciones docentes?",
                "tipo": "OPCION_MULTIPLE",
                "opciones": [
                    "A) Su estudio permite desarrollar el razonamiento analítico y habilidades útiles para la vida diaria y escolar.",
                    "B) Es un conocimiento secreto que solo los científicos pueden entender.",
                    "C) No tiene ninguna utilidad práctica para los estudiantes.",
                    "D) Será eliminado de todos los colegios del país."
                ],
                "respuesta_correcta": "A",
                "explicacion": "Todas las materias del currículo escolar buscan formar estudiantes con pensamiento crítico y capacidades prácticas.",
                "dificultad": "FACIL",
                "puntos": 20
            },
            {
                "id": 5,
                "pregunta": f"Para prepararte con éxito hacia la prueba del tema \"{clean_t}\", ¿cuál es la mejor estrategia de estudio escolar?",
                "tipo": "OPCION_MULTIPLE",
                "opciones": [
                    "A) Practicar con los simuladores interactivos, repasar los apuntes del cuaderno y aclarar dudas con el docente con anticipación.",
                    "B) Desvelarse la noche anterior estudiando sin descansar.",
                    "C) Confiar en la suerte sin haber leído el libro guía.",
                    "D) Estudiar solamente cinco minutos antes de la campana de entrada."
                ],
                "respuesta_correcta": "A",
                "explicacion": "La práctica continua con simuladores didácticos refuerza la memoria y te permite llegar con total tranquilidad al examen de colegio.",
                "dificultad": "FACIL",
                "puntos": 20
            }
        ]

    selected_preguntas = preguntas[:min(cantidad, len(preguntas))]
    pts_each = 100 // len(selected_preguntas) if selected_preguntas else 20
    for p in selected_preguntas:
        p['puntos'] = pts_each

    return {
        "titulo": f"Simulador de Examen: {clean_t}",
        "descripcion": f"Batería didáctica de ejercicios escolares para estudiantes de secundaria sobre \"{clean_t}\" en la materia de {materia_nombre}.",
        "tiempo_limite_minutos": max(10, len(selected_preguntas) * 3),
        "preguntas": selected_preguntas
    }


def evaluate_student_answers(preguntas, respuestas_estudiante, tiempo_empleado=0):
    total_preguntas = len(preguntas)
    aciertos = 0
    puntaje_total = 0.0
    revision = []

    for p in preguntas:
        pid = str(p.get('id'))
        resp_correcta = str(p.get('respuesta_correcta', '')).strip().upper()
        letra_correcta = resp_correcta[0] if resp_correcta else 'A'

        resp_alumno = str(respuestas_estudiante.get(pid, '')).strip().upper()
        letra_alumno = resp_alumno[0] if resp_alumno else ''

        es_correcta = (letra_alumno == letra_correcta) and (letra_alumno != '')
        pts_pregunta = p.get('puntos', 20)

        if es_correcta:
            aciertos += 1
            puntaje_total += pts_pregunta

        revision.append({
            'pregunta_id': p.get('id'),
            'pregunta': p.get('pregunta'),
            'respuesta_alumno': resp_alumno,
            'respuesta_correcta': resp_correcta,
            'letra_correcta': letra_correcta,
            'letra_alumno': letra_alumno,
            'es_correcta': es_correcta,
            'puntos_ganados': pts_pregunta if es_correcta else 0,
            'puntos_posibles': pts_pregunta,
            'explicacion': p.get('explicacion', ''),
            'opciones': p.get('opciones', []),
        })

    pct = round((aciertos / total_preguntas * 100), 1) if total_preguntas > 0 else 0.0
    aprobado = pct >= 51.0

    if pct >= 90:
        feedback = f"🌟 ¡Excelente Rendimiento Escolar! Obtuviste {aciertos} de {total_preguntas} aciertos ({pct}%). Demuestras que estudiaste muy bien la lección del profesor. Estás más que listo para sacar la máxima nota en tu examen de colegio."
    elif pct >= 70:
        feedback = f"👏 ¡Muy buen trabajo! Obtuviste {aciertos} de {total_preguntas} ({pct}%). Tienes un buen entendimiento del tema. Revisa abajo los ejercicios donde tuviste dudas para asegurar un 100% en la prueba."
    elif pct >= 51:
        feedback = f"⚠️ Aprobado raspando: {aciertos} de {total_preguntas} ({pct}%). Pasaste con el puntaje mínimo de colegio (51 pts), pero te sugerimos leer las explicaciones de abajo y hacer otro intento de práctica antes del examen formal."
    else:
        feedback = f"📚 ¡A reforzar la lección! Obtuviste {aciertos} de {total_preguntas} ({pct}%). No te preocupes, este simulador escolar está hecho exactamente para que aprendas de tus fallos antes del examen. Lee la solución paso a paso de cada ejercicio y vuelve a intentarlo."

    return {
        'puntaje': pct,
        'total_preguntas': total_preguntas,
        'respuestas_correctas': aciertos,
        'respuestas_incorrectas': total_preguntas - aciertos,
        'aprobado': aprobado,
        'retroalimentacion_ia': feedback,
        'revision': revision,
        'tiempo_empleado_segundos': tiempo_empleado
    }
