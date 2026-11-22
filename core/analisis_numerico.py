"""
Módulo de Métodos de Análisis Numérico para EduSmart.
=====================================================
Implementa algoritmos numéricos aplicados a la gestión académica real:
- Procesamiento de calificaciones y cálculo de notas objetivo.
- Regresión lineal (mínimos cuadrados) y proyección de tendencias.
- Interpolación de Lagrange para reconstrucción de curvas de rendimiento.
- Extrapolación acotada para estimación de calificaciones futuras.
- Eliminación de Gauss con pivoteo parcial para calibración de ponderaciones multicompetencia.
- Integración numérica (Trapecio y Simpson 1/3) para el Índice de Rendimiento y Esfuerzo Continuo (IREC).
- Método de Newton-Raphson para resolución del modelo logístico de aprendizaje y puntos de nivelación.

Todas las funciones son puras, controlan excepciones y retornan diccionarios estructurados.
No modifican directamente las calificaciones oficiales de la base de datos.
"""

import math
from typing import List, Dict, Any, Optional, Tuple


# ==============================================================================
# A. CÁLCULO DE CALIFICACIONES Y DETERMINACIÓN DE NOTA OBJETIVO
# ==============================================================================

def calcular_promedio_simple(notas: List[float]) -> Dict[str, Any]:
    """
    Calcula el promedio aritmético simple de una lista de calificaciones.
    Valida límites [0, 100].
    """
    if not notas:
        return {'valido': False, 'promedio': 0.0, 'total_notas': 0, 'mensaje': 'Lista de calificaciones vacía.'}

    for n in notas:
        if not isinstance(n, (int, float)) or n < 0 or n > 100:
            return {'valido': False, 'promedio': 0.0, 'mensaje': f'Calificación inválida: {n}. Debe estar entre 0 y 100.'}

    promedio = sum(notas) / len(notas)
    return {
        'valido': True,
        'promedio': round(promedio, 2),
        'total_notas': len(notas),
        'nota_minima': min(notas),
        'nota_maxima': max(notas),
        'mensaje': 'Promedio simple calculado exitosamente.'
    }


def calcular_promedio_ponderado(evaluaciones: List[Dict[str, float]]) -> Dict[str, Any]:
    """
    Calcula la nota final mediante promedio ponderado:
    Nota Final = Sumatoria(Nota_i * (Ponderacion_i / 100))
    
    Cada elemento de evaluaciones debe tener:
      - 'nota': float entre 0 y 100
      - 'peso': float (porcentaje, ej: 30 para 30%)
    
    Verifica que la suma de ponderaciones sea 100% (con tolerancia 0.01).
    """
    if not evaluaciones:
        return {'valido': False, 'nota_ponderada': 0.0, 'mensaje': 'Sin evaluaciones para ponderar.'}

    suma_pesos = sum(e.get('peso', 0.0) for e in evaluaciones)
    if abs(suma_pesos - 100.0) > 0.1:
        return {
            'valido': False,
            'nota_ponderada': 0.0,
            'suma_pesos': round(suma_pesos, 2),
            'mensaje': f'Las ponderaciones suman {round(suma_pesos, 2)}%, deben sumar exactamente 100%.'
        }

    acumulado = 0.0
    desglose = []
    for e in evaluaciones:
        nota = float(e.get('nota', 0.0))
        peso = float(e.get('peso', 0.0))
        if nota < 0 or nota > 100:
            return {'valido': False, 'nota_ponderada': 0.0, 'mensaje': f'Nota fuera de rango [0, 100]: {nota}'}
        aporte = nota * (peso / 100.0)
        acumulado += aporte
        desglose.append({
            'nombre': e.get('nombre', 'Evaluación'),
            'nota': round(nota, 2),
            'peso': round(peso, 2),
            'aporte': round(aporte, 2)
        })

    return {
        'valido': True,
        'nota_ponderada': round(acumulado, 2),
        'suma_pesos': round(suma_pesos, 2),
        'desglose': desglose,
        'mensaje': 'Promedio ponderado calculado con éxito.'
    }


def calcular_nota_necesaria(
    evaluaciones_completadas: List[Dict[str, float]],
    peso_pendiente: float,
    nota_objetivo: float = 51.0
) -> Dict[str, Any]:
    """
    Determina la nota exacta que un estudiante necesita obtener en una evaluación
    pendiente con ponderación 'peso_pendiente' para alcanzar la 'nota_objetivo'.

    Fórmula:
      Puntaje_acumulado = Sumatoria(Nota_i * Peso_i / 100)
      Puntos_faltantes = Nota_objetivo - Puntaje_acumulado
      Nota_necesaria = (Puntos_faltantes / peso_pendiente) * 100
    """
    if peso_pendiente <= 0 or peso_pendiente > 100:
        return {'valido': False, 'mensaje': 'El peso de la evaluación pendiente debe estar entre 1% y 100%.'}

    if nota_objetivo < 0 or nota_objetivo > 100:
        return {'valido': False, 'mensaje': 'La nota objetivo debe estar entre 0 y 100.'}

    acumulado = 0.0
    peso_total_completado = 0.0
    for e in evaluaciones_completadas:
        nota = float(e.get('nota', 0.0))
        peso = float(e.get('peso', 0.0))
        acumulado += nota * (peso / 100.0)
        peso_total_completado += peso

    if peso_total_completado + peso_pendiente > 100.1:
        return {'valido': False, 'mensaje': f'El total de pesos excede 100% ({peso_total_completado + peso_pendiente}%).'}

    puntos_faltantes = nota_objetivo - acumulado
    if puntos_faltantes <= 0:
        return {
            'valido': True,
            'acumulado_actual': round(acumulado, 2),
            'nota_necesaria': 0.0,
            'es_alcanzable': True,
            'ya_aprobado': True,
            'mensaje': f'El estudiante ya superó el objetivo de {nota_objetivo} pts con su puntaje acumulado ({round(acumulado, 2)} pts).'
        }

    nota_requerida = (puntos_faltantes / peso_pendiente) * 100.0
    es_alcanzable = nota_requerida <= 100.0

    return {
        'valido': True,
        'acumulado_actual': round(acumulado, 2),
        'puntos_faltantes': round(puntos_faltantes, 2),
        'peso_pendiente': round(peso_pendiente, 2),
        'nota_necesaria': round(nota_requerida, 2),
        'es_alcanzable': es_alcanzable,
        'ya_aprobado': False,
        'mensaje': (
            f'Se requiere una calificación de {round(nota_requerida, 1)}/100 en la evaluación pendiente.'
            if es_alcanzable
            else f'Matemáticamente no es posible alcanzar {nota_objetivo} pts en este periodo (requeriría {round(nota_requerida, 1)} pts).'
        )
    }


# ==============================================================================
# B. REGRESIÓN LINEAL POR MÍNIMOS CUADRADOS (TENDENCIA DEL RENDIMIENTO)
# ==============================================================================

def calcular_regresion_lineal(puntos: List[Tuple[float, float]]) -> Dict[str, Any]:
    """
    Aplica el método de Mínimos Cuadrados para ajustar las calificaciones a una recta:
      y = a + b*x
    Donde:
      x = número ordinal de evaluación o semana temporal
      y = calificación obtenida [0, 100]
      b (pendiente) = [n*Sum(xy) - Sum(x)*Sum(y)] / [n*Sum(x^2) - (Sum(x))^2]
      a (intercepto) = media_y - b * media_x
      r (coeficiente de correlación de Pearson)
      r2 (coeficiente de determinación)
    """
    if len(puntos) < 2:
        return {
            'valido': False,
            'mensaje': 'Se requieren al menos 2 evaluaciones para calcular una regresión lineal de tendencia.'
        }

    n = len(puntos)
    sum_x = sum(p[0] for p in puntos)
    sum_y = sum(p[1] for p in puntos)
    sum_xy = sum(p[0] * p[1] for p in puntos)
    sum_x2 = sum(p[0] ** 2 for p in puntos)
    sum_y2 = sum(p[1] ** 2 for p in puntos)

    denominador = (n * sum_x2 - (sum_x ** 2))
    if abs(denominador) < 1e-12:
        return {'valido': False, 'mensaje': 'Denominador singular: las evaluaciones tienen la misma coordenada temporal.'}

    b = (n * sum_xy - sum_x * sum_y) / denominador
    a = (sum_y - b * sum_x) / n

    # Coeficiente de correlación de Pearson
    denominador_r = math.sqrt(max(0.0, (n * sum_x2 - sum_x ** 2) * (n * sum_y2 - sum_y ** 2)))
    r = (n * sum_xy - sum_x * sum_y) / denominador_r if denominador_r > 1e-12 else 0.0
    r2 = r ** 2

    # Determinación de diagnóstico de tendencia
    if b > 1.5:
        tendencia = 'Ascendente Marcada'
        diagnostico = 'El estudiante muestra una mejora progresiva constante y acelerada.'
    elif b > 0.2:
        tendencia = 'Ascendente Leve'
        diagnostico = 'El estudiante muestra una ligera tendencia a la mejora de su desempeño.'
    elif b < -1.5:
        tendencia = 'Descendente Marcada'
        diagnostico = 'Alerta temprana: El rendimiento del estudiante está decayendo significativamente.'
    elif b < -0.2:
        tendencia = 'Descendente Leve'
        diagnostico = 'Atención: Se observa una ligera disminución en las calificaciones recientes.'
    else:
        tendencia = 'Estable / Constante'
        diagnostico = 'El rendimiento del estudiante se mantiene consistente a lo largo del tiempo.'

    # Proyección para la próxima evaluación (x = n + 1)
    proximo_x = max(p[0] for p in puntos) + 1
    proyeccion_cruda = a + b * proximo_x
    proyeccion_acotada = max(0.0, min(100.0, proyeccion_cruda))

    signo = '+' if b >= 0 else '-'
    ecuacion = f"y = {round(a, 2)} {signo} {abs(round(b, 2))}x"

    return {
        'valido': True,
        'pendiente_b': round(b, 4),
        'intercepto_a': round(a, 4),
        'ecuacion_recta': ecuacion,
        'coeficiente_correlacion_r': round(r, 4),
        'coeficiente_determinacion_r2': round(r2, 4),
        'tendencia': tendencia,
        'diagnostico': diagnostico,
        'proxima_evaluacion_x': proximo_x,
        'proyeccion_estimada': round(proyeccion_acotada, 2),
        'proyeccion_cruda': round(proyeccion_cruda, 2),
        'mensaje': 'Regresión lineal calculada exitosamente.'
    }


# ==============================================================================
# C. INTERPOLACIÓN POLINOMIAL DE LAGRANGE (ESTIMACIÓN INTERMEDIA)
# ==============================================================================

def calcular_interpolacion_lagrange(
    puntos: List[Tuple[float, float]],
    x_evaluar: float
) -> Dict[str, Any]:
    """
    Construye el Polinomio Interpolador de Lagrange de grado n-1:
      P(x) = Sumatoria_{i=0}^{n-1} [ y_i * L_i(x) ]
    Donde los polinomios base son:
      L_i(x) = Productoria_{j != i} [ (x - x_j) / (x_i - x_j) ]

    Utilizado para estimar el desempeño de un estudiante en un punto o semana
    intermedia 'x_evaluar' donde no hubo una evaluación formalizada.
    """
    if len(puntos) < 2:
        return {'valido': False, 'mensaje': 'Se requieren al menos 2 puntos conocidos para interpolar.'}

    # Verificar que no hayan abscisas repetidas
    xs = [p[0] for p in puntos]
    if len(set(xs)) != len(xs):
        return {'valido': False, 'mensaje': 'Existen evaluaciones con la misma coordenada x (abscisas duplicadas).'}

    n = len(puntos)
    y_estimado = 0.0
    terminos_li = []

    for i in range(n):
        xi, yi = puntos[i]
        li = 1.0
        for j in range(n):
            if i != j:
                xj = puntos[j][0]
                li *= (x_evaluar - xj) / (xi - xj)

        aporte_i = yi * li
        y_estimado += aporte_i
        terminos_li.append({
            'nodo_i': i,
            'xi': xi,
            'yi': yi,
            'li_evaluado': round(li, 4),
            'aporte': round(aporte_i, 4)
        })

    # La estimación se acota de forma razonable al espectro académico [0, 100]
    valor_acotado = max(0.0, min(100.0, y_estimado))

    return {
        'valido': True,
        'x_evaluado': x_evaluar,
        'grado_polinomio': n - 1,
        'valor_interpolado': round(valor_acotado, 2),
        'valor_polinomio_puro': round(y_estimado, 4),
        'terminos_base': terminos_li,
        'es_estimacion_no_oficial': True,
        'mensaje': f'Rendimiento interpolado estimado en x={x_evaluar}: {round(valor_acotado, 2)} pts.'
    }


# ==============================================================================
# D. EXTRAPOLACIÓN ACADÉMICA ACOTADA
# ==============================================================================

def calcular_extrapolacion_rendimiento(
    historial_notas: List[float],
    pasos_futuros: int = 1
) -> Dict[str, Any]:
    """
    Estima el rendimiento en periodos futuros (pasos_futuros)
    mediante extrapolación numérica de la dinámica observada,
    garantizando la restricción física de calificaciones académicas [0, 100].
    """
    if len(historial_notas) < 2:
        return {'valido': False, 'mensaje': 'Se requieren al menos 2 notas para extrapolar.'}

    puntos = [(float(i + 1), float(nota)) for i, nota in enumerate(historial_notas)]
    reg = calcular_regresion_lineal(puntos)
    if not reg['valido']:
        return reg

    n_actual = len(historial_notas)
    proyecciones = []
    a = reg['intercepto_a']
    b = reg['pendiente_b']

    for step in range(1, pasos_futuros + 1):
        x_futuro = n_actual + step
        y_calc = a + b * x_futuro
        y_acotado = max(0.0, min(100.0, y_calc))
        proyecciones.append({
            'periodo_evaluacion': x_futuro,
            'calificacion_proyectada': round(y_acotado, 2),
            'calificacion_teorica': round(y_calc, 2),
            'limite_alcanzado': y_calc < 0 or y_calc > 100
        })

    return {
        'valido': True,
        'tendencia_actual': reg['tendencia'],
        'pendiente': reg['pendiente_b'],
        'proyecciones': proyecciones,
        'es_proyeccion': True,
        'mensaje': 'Extrapolación generada con éxito con límites protegidos [0, 100].'
    }


# ==============================================================================
# E. MÉTODO DE ELIMINACIÓN DE GAUSS CON PIVOTEO PARCIAL
# (Calibración de Ponderaciones Multicompetencia / Dimensiones de Evaluación)
# ==============================================================================

def resolver_gauss_pivoteo(
    matriz_A: List[List[float]],
    vector_b: List[float]
) -> Dict[str, Any]:
    """
    Resuelve el sistema lineal de n ecuaciones con n incógnitas:
      A * x = b
    empleando Eliminación Gaussiana con Pivoteo Parcial.

    Aplicación pedagógica real en EduSmart:
      Calibración de Ponderaciones de Dimensiones Curriculares (ej. Saber, Hacer, Ser)
      a partir de matrices de desempeño en evaluaciones compuestas.
    """
    n = len(matriz_A)
    if n == 0 or len(vector_b) != n or any(len(fila) != n for fila in matriz_A):
        return {'valido': False, 'mensaje': 'Dimensiones de matriz y vector incompatibles.'}

    # Construir matriz aumentada [A | b]
    A_aug = [row[:] + [vector_b[i]] for i, row in enumerate(matriz_A)]
    pasos_escalonamiento = []

    # 1. Eliminación hacia adelante con pivoteo parcial
    for col in range(n):
        # Pivoteo parcial: encontrar el elemento de mayor magnitud en la columna actual
        max_row = col
        max_val = abs(A_aug[col][col])
        for row in range(col + 1, n):
            if abs(A_aug[row][col]) > max_val:
                max_val = abs(A_aug[row][col])
                max_row = row

        if max_val < 1e-12:
            return {
                'valido': False,
                'mensaje': f'El sistema no tiene solución única (matriz singular en columna {col + 1}).'
            }

        # Intercambio de filas si es necesario
        if max_row != col:
            A_aug[col], A_aug[max_row] = A_aug[max_row], A_aug[col]

        # Eliminación de filas inferiores
        for row in range(col + 1, n):
            factor = A_aug[row][col] / A_aug[col][col]
            for c in range(col, n + 1):
                A_aug[row][c] -= factor * A_aug[col][c]

        pasos_escalonamiento.append({
            'etapa': col + 1,
            'pivote': round(A_aug[col][col], 4),
            'matriz_actual': [[round(val, 4) for val in r] for r in A_aug]
        })

    # 2. Sustitución regresiva
    x = [0.0] * n
    for i in range(n - 1, -1, -1):
        suma_conocidos = sum(A_aug[i][j] * x[j] for j in range(i + 1, n))
        x[i] = (A_aug[i][n] - suma_conocidos) / A_aug[i][i]

    return {
        'valido': True,
        'solucion': [round(val, 4) for val in x],
        'pasos': pasos_escalonamiento,
        'mensaje': 'Sistema resuelto con éxito mediante Eliminación de Gauss.'
    }


def calibrar_ponderaciones_competencias(
    evaluaciones_multicompetencia: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Aplica el método de Gauss para deducir las ponderaciones exactas de 3 dimensiones:
      w1 = Saber (Conocimiento Teórico)
      w2 = Hacer (Habilidades Prácticas / Laboratorios)
      w3 = Ser / Decidir (Responsabilidad, Asistencia, Ética)

    A partir de 3 evaluaciones donde se conocen los puntajes parciales en cada dimensión
    y la nota total otorgada:
      s11*w1 + s12*w2 + s13*w3 = Nota1
      s21*w1 + s22*w2 + s23*w3 = Nota2
      s31*w1 + s32*w2 + s33*w3 = Nota3
    """
    if len(evaluaciones_multicompetencia) != 3:
        return {'valido': False, 'mensaje': 'Se requieren exactamente 3 registros para calibrar las 3 dimensiones (Saber, Hacer, Decidir).'}

    A = []
    b = []
    for reg in evaluaciones_multicompetencia:
        A.append([
            float(reg.get('saber', 0.0)),
            float(reg.get('hacer', 0.0)),
            float(reg.get('decidir', 0.0))
        ])
        b.append(float(reg.get('nota_final', 0.0)))

    res = resolver_gauss_pivoteo(A, b)
    if not res['valido']:
        return res

    sol = res['solucion']
    return {
        'valido': True,
        'pesos_calibrados': {
            'peso_saber': round(sol[0] * 100, 2),
            'peso_hacer': round(sol[1] * 100, 2),
            'peso_decidir': round(sol[2] * 100, 2)
        },
        'ponderaciones_decimales': {
            'w1_saber': sol[0],
            'w2_hacer': sol[1],
            'w3_decidir': sol[2]
        },
        'mensaje': 'Ponderaciones multicompetencia calibradas analíticamente con Gauss.'
    }


# ==============================================================================
# F. MÉTODOS DE INTEGRACIÓN NUMÉRICA (TRAPECIO Y SIMPSON 1/3)
# (Índice de Rendimiento y Esfuerzo Continuo - IREC / Área Bajo la Curva)
# ==============================================================================

def calcular_irec_trapecio(calificaciones_temporales: List[Tuple[float, float]]) -> Dict[str, Any]:
    """
    Calcula el Índice de Rendimiento y Esfuerzo Continuo (IREC) mediante
    la Regla del Trapecio Compuesta:
      Integral = (h / 2) * [ f(x_0) + 2 * Sum_{i=1}^{n-1} f(x_i) + f(x_n) ]
    donde x representa el tiempo (semanas) y f(x) la calificación en esa semana.

    Retorna:
      - area_acumulada: Área total de rendimiento académico.
      - rendimiento_medio_continuo: Promedio continuo normalizado (Area / Tiempo_total).
    """
    if len(calificaciones_temporales) < 2:
        return {'valido': False, 'mensaje': 'Se requieren al menos 2 puntos temporales para integrar.'}

    # Ordenar por tiempo
    puntos = sorted(calificaciones_temporales, key=lambda p: p[0])
    n = len(puntos) - 1
    area = 0.0

    desglose_tramos = []
    for i in range(n):
        x0, y0 = puntos[i]
        x1, y1 = puntos[i + 1]
        dx = x1 - x0
        if dx <= 0:
            return {'valido': False, 'mensaje': 'El tiempo debe ser estrictamente creciente.'}
        tramo_area = (y0 + y1) * dx / 2.0
        area += tramo_area
        desglose_tramos.append({
            'tramo': i + 1,
            'de_t': x0,
            'a_t': x1,
            'ancho_semanas': round(dx, 2),
            'area_tramo': round(tramo_area, 2)
        })

    tiempo_total = puntos[-1][0] - puntos[0][0]
    promedio_continuo = area / tiempo_total if tiempo_total > 0 else 0.0

    return {
        'valido': True,
        'metodo': 'Trapecio Compuesto',
        'area_total_acumulada': round(area, 2),
        'tiempo_total_semanas': round(tiempo_total, 2),
        'rendimiento_medio_continuo': round(promedio_continuo, 2),
        'desglose_tramos': desglose_tramos,
        'interpretacion': (
            'Alta constancia y solidez en el tiempo.'
            if promedio_continuo >= 80
            else 'Rendimiento continuo regular, requiere refuerzo de hábitos de estudio.'
            if promedio_continuo >= 51
            else 'Rendimiento continuo deficiente o intermitente.'
        ),
        'mensaje': 'Área bajo la curva (IREC) calculada con Trapecio Compuesto.'
    }


def calcular_irec_simpson(calificaciones_equiespaciadas: List[float], h: float = 1.0) -> Dict[str, Any]:
    """
    Aplica la Regla de Simpson 1/3 Compuesta:
      Integral = (h / 3) * [ y_0 + 4*Sum_{impar} y_i + 2*Sum_{par} y_j + y_n ]
    Requiere un número par de subintervalos (es decir, un número impar de puntos: n >= 3).
    """
    n_puntos = len(calificaciones_equiespaciadas)
    subintervalos = n_puntos - 1

    if subintervalos < 2 or subintervalos % 2 != 0:
        return {
            'valido': False,
            'mensaje': f'Simpson 1/3 requiere un número par de subintervalos (puntos impares >= 3). Se recibieron {n_puntos} puntos.'
        }

    y = calificaciones_equiespaciadas
    suma_impares = sum(y[i] for i in range(1, subintervalos, 2))
    suma_pares = sum(y[i] for i in range(2, subintervalos, 2))

    area = (h / 3.0) * (y[0] + 4.0 * suma_impares + 2.0 * suma_pares + y[-1])
    tiempo_total = subintervalos * h
    promedio_continuo = area / tiempo_total if tiempo_total > 0 else 0.0

    return {
        'valido': True,
        'metodo': 'Simpson 1/3 Compuesto',
        'area_total_acumulada': round(area, 2),
        'subintervalos': subintervalos,
        'tamano_paso_h': h,
        'tiempo_total_semanas': round(tiempo_total, 2),
        'rendimiento_medio_continuo': round(promedio_continuo, 2),
        'mensaje': 'Área bajo la curva (IREC) calculada con Simpson 1/3.'
    }


# ==============================================================================
# G. MÉTODO DE NEWTON-RAPHSON (PUNTO CRÍTICO DE NIVELACIÓN LOGÍSTICA)
# ==============================================================================

def calcular_nivelacion_newton_raphson(
    t0_inicial: float,
    rendimiento_inicial: float,
    tasa_aprendizaje: float,
    nota_objetivo: float = 51.0,
    tol: float = 1e-4,
    max_iter: int = 50
) -> Dict[str, Any]:
    """
    Determina la semana exacta 't*' en que un estudiante alcanzará la nota de nivelación
    resolviendo la ecuación no lineal del Modelo Logístico de Aprendizaje:
      R(t) = L / [ 1 + e^{ -k*(t - t0) } ]
    Queremos resolver f(t) = R(t) - nota_objetivo = 0.

    Derivada analítica f'(t):
      R'(t) = k * R(t) * [ 1 - R(t) / L ]

    Algoritmo de Newton-Raphson:
      t_{i+1} = t_i - [ f(t_i) / f'(t_i) ]
    """
    L = 100.0  # Asíntota máxima de calificación académica
    k = max(0.01, tasa_aprendizaje)

    if rendimiento_inicial >= nota_objetivo:
        return {
            'valido': True,
            'semana_nivelacion': 0.0,
            'iteraciones': 0,
            'ya_aprobado': True,
            'mensaje': f'El estudiante ya posee un rendimiento de {rendimiento_inicial} pts, superior al objetivo de {nota_objetivo} pts.'
        }

    # Valor inicial para la búsqueda
    t_actual = t0_inicial + 2.0
    historial_iteraciones = []

    convergido = False
    for i in range(1, max_iter + 1):
        exponente = max(-50.0, min(50.0, -k * (t_actual - t0_inicial)))
        denominador = 1.0 + math.exp(exponente)
        R = L / denominador
        f_val = R - nota_objetivo
        f_prime = k * R * (1.0 - (R / L))

        if abs(f_prime) < 1e-12:
            return {'valido': False, 'mensaje': 'Derivada nula durante la iteración de Newton-Raphson.'}

        t_siguiente = t_actual - (f_val / f_prime)
        error = abs(t_siguiente - t_actual)

        historial_iteraciones.append({
            'iteracion': i,
            't_i': round(t_actual, 4),
            'R_ti': round(R, 2),
            'f_val': round(f_val, 4),
            'f_prime': round(f_prime, 4),
            't_siguiente': round(t_siguiente, 4),
            'error': round(error, 6)
        })

        if error < tol or abs(f_val) < tol:
            convergido = True
            t_actual = t_siguiente
            break

        t_actual = t_siguiente

    if not convergido:
        return {'valido': False, 'mensaje': f'Newton-Raphson no convergió en {max_iter} iteraciones.'}

    return {
        'valido': True,
        'semana_nivelacion': round(t_actual, 2),
        'total_iteraciones': len(historial_iteraciones),
        'historial_iteraciones': historial_iteraciones,
        'nota_objetivo': nota_objetivo,
        'rendimiento_estimado_alcanzado': round(L / (1.0 + math.exp(max(-50.0, min(50.0, -k * (t_actual - t0_inicial))))), 2),
        'mensaje': f'El estudiante alcanzará la nota de {nota_objetivo} pts en la semana {round(t_actual, 1)}.'
    }
