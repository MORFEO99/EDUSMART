"""
Servicio pedagógico y computacional de Métodos Numéricos para EduSmart.
Implementa los 5 métodos oficiales documentados en el informe académico:
  1. Raíces de Ecuaciones: Bisección y Newton-Raphson
  2. Sistemas de Ecuaciones Lineales: Eliminación de Gauss con pivoteo
  3. Interpolación y Ajuste: Polinomio de Lagrange y Extrapolación Lineal
  4. Integración Numérica: Regla del Trapecio Compuesta y Regla de Simpson 1/3
  5. Ecuaciones Diferenciales Ordinarias (EDO): Método de Euler
"""
import math
import numpy as np

# Espacio seguro para evaluar funciones matemáticas en Python
SAFE_MATH = {
    'sin': math.sin, 'cos': math.cos, 'tan': math.tan,
    'exp': math.exp, 'log': math.log, 'log10': math.log10,
    'sqrt': math.sqrt, 'abs': abs, 'pi': math.pi, 'e': math.e,
    'asin': math.asin, 'acos': math.acos, 'atan': math.atan
}

def _eval_func(expr_str: str, x_val: float) -> float:
    """Evalúa de forma segura una función f(x)."""
    clean_expr = expr_str.replace('^', '**')
    scope = dict(SAFE_MATH)
    scope['x'] = float(x_val)
    return float(eval(clean_expr, {"__builtins__": {}}, scope))

def _eval_fxy(expr_str: str, x_val: float, y_val: float) -> float:
    """Evalúa f(x, y) de forma segura para EDOs."""
    clean_expr = expr_str.replace('^', '**')
    scope = dict(SAFE_MATH)
    scope['x'] = float(x_val)
    scope['y'] = float(y_val)
    return float(eval(clean_expr, {"__builtins__": {}}, scope))


# ─────────────────────────────────────────────────────────────────────────────
# 1. MÉTODO DE BISECCIÓN Y NEWTON-RAPHSON
# ─────────────────────────────────────────────────────────────────────────────
def resolver_biseccion(expr: str, a: float, b: float, max_iter: int = 6, tol: float = 1e-4) -> dict:
    a = float(a)
    b = float(b)
    fa = _eval_func(expr, a)
    fb = _eval_func(expr, b)

    if fa * fb > 0:
        return {
            'error': f'No hay cambio de signo en el intervalo [{a}, {b}]. f({a})={fa:.4f}, f({b})={fb:.4f}. Elija otro intervalo.'
        }

    filas = []
    c = a
    for k in range(1, max_iter + 1):
        c_prev = c
        c = (a + b) / 2.0
        fc = _eval_func(expr, c)
        emax = (b - a) / (2.0 ** k)

        filas.append({
            'iter': k,
            'a': round(a, 6),
            'b': round(b, 6),
            'c': round(c, 6),
            'fa': round(fa, 6),
            'fb': round(fb, 6),
            'fc': round(fc, 6),
            'emax': round(emax, 6)
        })

        if abs(fc) < 1e-12 or emax <= tol:
            break

        if fa * fc < 0:
            b = c
            fb = fc
        else:
            a = c
            fa = fc

    return {
        'metodo': 'Bisección',
        'ecuacion': expr,
        'raiz_aproximada': round(c, 6),
        'cota_error': round((b - a) / (2.0 ** len(filas)), 6),
        'total_iteraciones': len(filas),
        'pasos': filas
    }


def resolver_newton_raphson(expr: str, x0: float, max_iter: int = 5, h: float = 1e-5) -> dict:
    x_curr = float(x0)
    filas = []

    for k in range(1, max_iter + 1):
        fx = _eval_func(expr, x_curr)
        # Derivada numérica por diferencias centrales
        fpx = (_eval_func(expr, x_curr + h) - _eval_func(expr, x_curr - h)) / (2.0 * h)

        if abs(fpx) < 1e-12:
            return {'error': f'Derivada cercana a cero en iteración {k}. El método se indetermina.'}

        x_next = x_curr - (fx / fpx)
        err = abs(x_next - x_curr)

        filas.append({
            'iter': k,
            'x_n': round(x_curr, 6),
            'fx_n': round(fx, 6),
            'fpx_n': round(fpx, 6),
            'x_next': round(x_next, 6),
            'error': round(err, 6)
        })

        x_curr = x_next
        if err < 1e-7:
            break

    return {
        'metodo': 'Newton-Raphson',
        'ecuacion': expr,
        'raiz_aproximada': round(x_curr, 6),
        'total_iteraciones': len(filas),
        'pasos': filas
    }


# ─────────────────────────────────────────────────────────────────────────────
# 2. ELIMINACIÓN DE GAUSS (3x3 o NxN)
# ─────────────────────────────────────────────────────────────────────────────
def resolver_eliminacion_gauss(A_list: list, b_list: list) -> dict:
    A = np.array(A_list, dtype=float)
    b = np.array(b_list, dtype=float).reshape(-1, 1)
    n = len(b)

    M = np.hstack([A, b])
    pasos_escalonado = []

    # Guardar estado inicial
    pasos_escalonado.append({
        'paso': 0,
        'operacion': 'Matriz aumentada inicial [A | b]',
        'matriz': [[round(val, 4) for val in row] for row in M.tolist()]
    })

    # Escalonamiento hacia adelante
    for j in range(n - 1):
        pivot = M[j, j]
        if abs(pivot) < 1e-12:
            # Pivoteo simple
            for r in range(j + 1, n):
                if abs(M[r, j]) > abs(pivot):
                    M[[j, r]] = M[[r, j]]
                    pasos_escalonado.append({
                        'paso': j + 1,
                        'operacion': f'Intercambio F_{j+1} <-> F_{r+1}',
                        'matriz': [[round(val, 4) for val in row] for row in M.tolist()]
                    })
                    pivot = M[j, j]
                    break

        for i in range(j + 1, n):
            factor = M[i, j] / M[j, j]
            M[i, j:] -= factor * M[j, j:]
            M[i, j] = 0.0  # Limpieza visual
            pasos_escalonado.append({
                'paso': len(pasos_escalonado),
                'operacion': f'F_{i+1} <- F_{i+1} - ({round(factor, 4)}) * F_{j+1}',
                'matriz': [[round(val, 4) for val in row] for row in M.tolist()]
            })

    # Sustitución regresiva
    x = [0.0] * n
    pasos_regresiva = []
    for i in range(n - 1, -1, -1):
        suma = sum(M[i, c] * x[c] for c in range(i + 1, n))
        x[i] = (M[i, -1] - suma) / M[i, i]
        pasos_regresiva.append({
            'variable': f'x_{i+1}',
            'formula': f'({round(M[i, -1], 4)} - {round(suma, 4)}) / {round(M[i, i], 4)}',
            'valor': round(x[i], 4)
        })

    pasos_regresiva.reverse()
    return {
        'metodo': 'Eliminación de Gauss',
        'dimension': n,
        'solucion': [round(v, 4) for v in x],
        'pasos_escalonado': pasos_escalonado,
        'pasos_regresiva': pasos_regresiva
    }


# ─────────────────────────────────────────────────────────────────────────────
# 3. INTERPOLACIÓN DE LAGRANGE
# ─────────────────────────────────────────────────────────────────────────────
def resolver_lagrange(puntos: list, x_eval: float = None) -> dict:
    n = len(puntos)
    xs = [p[0] for p in puntos]
    ys = [p[1] for p in puntos]

    pasos_bases = []
    resultado_eval = None

    for i in range(n):
        num_terms = [f"(x - {xs[j]})" for j in range(n) if j != i]
        den_vals = [(xs[i] - xs[j]) for j in range(n) if j != i]
        den_prod = 1.0
        for d in den_vals:
            den_prod *= d

        pasos_bases.append({
            'i': i,
            'punto': f"({xs[i]}, {ys[i]})",
            'numerador': " * ".join(num_terms),
            'denominador': round(den_prod, 4),
            'formula_base': f"L_{i}(x) = ({' * '.join(num_terms)}) / {round(den_prod, 4)}"
        })

    if x_eval is not None:
        eval_total = 0.0
        valores_li = []
        for i in range(n):
            li = 1.0
            for j in range(n):
                if j != i:
                    li *= (x_eval - xs[j]) / (xs[i] - xs[j])
            valores_li.append(round(li, 6))
            eval_total += ys[i] * li
        resultado_eval = round(eval_total, 6)

    return {
        'metodo': 'Interpolación de Lagrange',
        'grado': n - 1,
        'puntos': puntos,
        'bases': pasos_bases,
        'x_eval': x_eval,
        'resultado_eval': resultado_eval
    }


# ─────────────────────────────────────────────────────────────────────────────
# 4. INTEGRACIÓN NUMÉRICA (TRAPECIO Y SIMPSON 1/3)
# ─────────────────────────────────────────────────────────────────────────────
def resolver_integracion(expr: str, a: float, b: float, n: int = 4) -> dict:
    a = float(a)
    b = float(b)
    n = int(n)
    h = (b - a) / n

    xs = [a + i * h for i in range(n + 1)]
    ys = [_eval_func(expr, x) for x in xs]

    # Regla del Trapecio Compuesta: I = (h/2) * [y0 + 2*sum(y_intermedios) + yn]
    suma_intermedios_trap = sum(ys[1:-1])
    integral_trapecio = (h / 2.0) * (ys[0] + 2.0 * suma_intermedios_trap + ys[-1])

    # Regla de Simpson 1/3 Compuesta: (h/3) * [y0 + 4*impares + 2*pares + yn]
    integral_simpson = None
    if n % 2 == 0:
        suma_impares = sum(ys[i] for i in range(1, n, 2))
        suma_pares = sum(ys[i] for i in range(2, n - 1, 2))
        integral_simpson = (h / 3.0) * (ys[0] + 4.0 * suma_impares + 2.0 * suma_pares + ys[-1])

    nodos = []
    for i in range(n + 1):
        nodos.append({
            'i': i,
            'x_i': round(xs[i], 4),
            'f_xi': round(ys[i], 6)
        })

    return {
        'metodo': 'Integración Numérica',
        'funcion': expr,
        'limite_a': a,
        'limite_b': b,
        'subintervalos_n': n,
        'paso_h': round(h, 4),
        'nodos': nodos,
        'resultado_trapecio': round(integral_trapecio, 6),
        'resultado_simpson_1_3': round(integral_simpson, 6) if integral_simpson is not None else None
    }


# ─────────────────────────────────────────────────────────────────────────────
# 5. ECUACIONES DIFERENCIALES: MÉTODO DE EULER
# ─────────────────────────────────────────────────────────────────────────────
def resolver_euler(expr_fxy: str, x0: float, y0: float, h: float, x_final: float, expr_exacta: str = None) -> dict:
    x = float(x0)
    y = float(y0)
    h = float(h)
    x_final = float(x_final)

    pasos = []
    n = 0

    while x <= x_final + 1e-9:
        fxy = _eval_fxy(expr_fxy, x, y)
        y_exact = _eval_func(expr_exacta, x) if expr_exacta else None
        err = abs(y_exact - y) if y_exact is not None else None

        pasos.append({
            'n': n,
            'x_n': round(x, 4),
            'y_n': round(y, 6),
            'f_xy': round(fxy, 6),
            'y_exacta': round(y_exact, 6) if y_exact is not None else None,
            'error_absoluto': round(err, 6) if err is not None else None
        })

        y = y + h * fxy
        x = x + h
        n += 1

    return {
        'metodo': 'Método de Euler (EDO)',
        'edo': f"y' = {expr_fxy}",
        'x0': x0,
        'y0': y0,
        'paso_h': h,
        'x_final': x_final,
        'pasos': pasos
    }
