"""
Pruebas unitarias para el módulo core/analisis_numerico.py
Verifica precisión numérica, casos borde, tolerancias y manejo de errores.
"""

from django.test import TestCase
from core.analisis_numerico import (
    calcular_promedio_simple,
    calcular_promedio_ponderado,
    calcular_nota_necesaria,
    calcular_regresion_lineal,
    calcular_interpolacion_lagrange,
    calcular_extrapolacion_rendimiento,
    resolver_gauss_pivoteo,
    calibrar_ponderaciones_competencias,
    calcular_irec_trapecio,
    calcular_irec_simpson,
    calcular_nivelacion_newton_raphson
)


class AnalisisNumericoTestCase(TestCase):

    # ─────────────────────────────────────────────────────────────
    # A. Pruebas de Calificaciones y Promedios
    # ─────────────────────────────────────────────────────────────
    def test_promedio_simple_valido(self):
        notas = [80.0, 90.0, 70.0]
        res = calcular_promedio_simple(notas)
        self.assertTrue(res['valido'])
        self.assertEqual(res['promedio'], 80.0)
        self.assertEqual(res['total_notas'], 3)

    def test_promedio_simple_vacio_y_fuera_de_rango(self):
        self.assertFalse(calcular_promedio_simple([])['valido'])
        self.assertFalse(calcular_promedio_simple([85.0, 105.0])['valido'])
        self.assertFalse(calcular_promedio_simple([-5.0, 70.0])['valido'])

    def test_promedio_ponderado_valido(self):
        evaluaciones = [
            {'nombre': 'Parcial 1', 'nota': 80.0, 'peso': 30.0},
            {'nombre': 'Parcial 2', 'nota': 90.0, 'peso': 30.0},
            {'nombre': 'Final', 'nota': 70.0, 'peso': 40.0},
        ]
        res = calcular_promedio_ponderado(evaluaciones)
        self.assertTrue(res['valido'])
        # 80*0.3 + 90*0.3 + 70*0.4 = 24 + 27 + 28 = 79.0
        self.assertEqual(res['nota_ponderada'], 79.0)

    def test_promedio_ponderado_suma_pesos_invalida(self):
        evaluaciones = [
            {'nota': 80.0, 'peso': 50.0},
            {'nota': 90.0, 'peso': 30.0},  # total 80%, no 100%
        ]
        res = calcular_promedio_ponderado(evaluaciones)
        self.assertFalse(res['valido'])
        self.assertIn('deben sumar exactamente 100%', res['mensaje'])

    def test_calcular_nota_necesaria(self):
        # Alumno tiene Tarea 1 (80 pts con 40% = 32 acumulados).
        # Le falta Tarea 2 (60%). Quiere alcanzar 70 pts de nota final.
        # Faltan 38 pts. Nota requerida = 38 / 0.6 = 63.33 pts.
        completadas = [{'nota': 80.0, 'peso': 40.0}]
        res = calcular_nota_necesaria(completadas, peso_pendiente=60.0, nota_objetivo=70.0)
        self.assertTrue(res['valido'])
        self.assertTrue(res['es_alcanzable'])
        self.assertAlmostEqual(res['nota_necesaria'], 63.33, places=2)

    def test_calcular_nota_necesaria_inalcanzable(self):
        # Alumno tiene 10 pts en el 80% (acumula 8 pts). Quiere 70 pts con el 20% restante.
        # Faltan 62 pts. Nota requerida = 62 / 0.2 = 310 pts (> 100 inalcanzable).
        completadas = [{'nota': 10.0, 'peso': 80.0}]
        res = calcular_nota_necesaria(completadas, peso_pendiente=20.0, nota_objetivo=70.0)
        self.assertTrue(res['valido'])
        self.assertFalse(res['es_alcanzable'])

    # ─────────────────────────────────────────────────────────────
    # B. Pruebas de Regresión Lineal por Mínimos Cuadrados
    # ─────────────────────────────────────────────────────────────
    def test_regresion_lineal_ascendente(self):
        # Puntos: (1, 60), (2, 70), (3, 80), (4, 90) -> y = 50 + 10x
        puntos = [(1.0, 60.0), (2.0, 70.0), (3.0, 80.0), (4.0, 90.0)]
        res = calcular_regresion_lineal(puntos)
        self.assertTrue(res['valido'])
        self.assertAlmostEqual(res['pendiente_b'], 10.0, places=2)
        self.assertAlmostEqual(res['intercepto_a'], 50.0, places=2)
        self.assertEqual(res['tendencia'], 'Ascendente Marcada')
        # Proyección en x=5: 50 + 10*5 = 100
        self.assertEqual(res['proyeccion_estimada'], 100.0)

    def test_regresion_lineal_datos_insuficientes(self):
        res = calcular_regresion_lineal([(1.0, 80.0)])
        self.assertFalse(res['valido'])

    # ─────────────────────────────────────────────────────────────
    # C. Pruebas de Interpolación de Lagrange
    # ─────────────────────────────────────────────────────────────
    def test_interpolacion_lagrange(self):
        # Puntos: (1, 60), (3, 80). En x=2 debe dar 70 (lineal).
        puntos = [(1.0, 60.0), (3.0, 80.0)]
        res = calcular_interpolacion_lagrange(puntos, x_evaluar=2.0)
        self.assertTrue(res['valido'])
        self.assertAlmostEqual(res['valor_interpolado'], 70.0, places=2)

    def test_interpolacion_lagrange_abscisas_duplicadas(self):
        puntos = [(1.0, 60.0), (1.0, 80.0)]
        res = calcular_interpolacion_lagrange(puntos, x_evaluar=2.0)
        self.assertFalse(res['valido'])

    # ─────────────────────────────────────────────────────────────
    # D. Pruebas de Extrapolación Acotada
    # ─────────────────────────────────────────────────────────────
    def test_extrapolacion_acotada(self):
        # Si las notas crecen 80, 90, 98, el siguiente no debe superar 100
        res = calcular_extrapolacion_rendimiento([80.0, 90.0, 98.0], pasos_futuros=2)
        self.assertTrue(res['valido'])
        self.assertEqual(len(res['proyecciones']), 2)
        for p in res['proyecciones']:
            self.assertLessEqual(p['calificacion_proyectada'], 100.0)
            self.assertGreaterEqual(p['calificacion_proyectada'], 0.0)

    # ─────────────────────────────────────────────────────────────
    # E. Pruebas de Gauss con Pivoteo Parcial (Sistemas de Ecuaciones)
    # ─────────────────────────────────────────────────────────────
    def test_resolver_gauss_3x3(self):
        # 2x + y - z = 8
        # -3x - y + 2z = -11
        # -2x + y + 2z = -3
        # Solución esperada: x=2, y=3, z=-1
        A = [
            [2.0, 1.0, -1.0],
            [-3.0, -1.0, 2.0],
            [-2.0, 1.0, 2.0]
        ]
        b = [8.0, -11.0, -3.0]
        res = resolver_gauss_pivoteo(A, b)
        self.assertTrue(res['valido'])
        self.assertAlmostEqual(res['solucion'][0], 2.0, places=2)
        self.assertAlmostEqual(res['solucion'][1], 3.0, places=2)
        self.assertAlmostEqual(res['solucion'][2], -1.0, places=2)

    def test_calibrar_ponderaciones_competencias(self):
        # 3 registros multicompetencia donde Saber=30%, Hacer=50%, Decidir=20%
        # Evaluación 1: Saber=100, Hacer=80, Decidir=90 -> Nota = 30 + 40 + 18 = 88
        # Evaluación 2: Saber=70, Hacer=90, Decidir=80 -> Nota = 21 + 45 + 16 = 82
        # Evaluación 3: Saber=90, Hacer=70, Decidir=100 -> Nota = 27 + 35 + 20 = 82
        registros = [
            {'saber': 100.0, 'hacer': 80.0, 'decidir': 90.0, 'nota_final': 88.0},
            {'saber': 70.0, 'hacer': 90.0, 'decidir': 80.0, 'nota_final': 82.0},
            {'saber': 90.0, 'hacer': 70.0, 'decidir': 100.0, 'nota_final': 82.0},
        ]
        res = calibrar_ponderaciones_competencias(registros)
        self.assertTrue(res['valido'])
        self.assertAlmostEqual(res['pesos_calibrados']['peso_saber'], 30.0, places=1)
        self.assertAlmostEqual(res['pesos_calibrados']['peso_hacer'], 50.0, places=1)
        self.assertAlmostEqual(res['pesos_calibrados']['peso_decidir'], 20.0, places=1)

    # ─────────────────────────────────────────────────────────────
    # F. Pruebas de Integración Numérica (Trapecio y Simpson 1/3)
    # ─────────────────────────────────────────────────────────────
    def test_irec_trapecio(self):
        # Puntos: semana 1 (70 pts), semana 2 (80 pts), semana 3 (90 pts)
        # Área tramo 1-2 = (70+80)*1/2 = 75
        # Área tramo 2-3 = (80+90)*1/2 = 85
        # Área total = 160. Tiempo = 2 semanas. Promedio continuo = 80.0
        puntos = [(1.0, 70.0), (2.0, 80.0), (3.0, 90.0)]
        res = calcular_irec_trapecio(puntos)
        self.assertTrue(res['valido'])
        self.assertEqual(res['area_total_acumulada'], 160.0)
        self.assertEqual(res['rendimiento_medio_continuo'], 80.0)

    def test_irec_simpson(self):
        # 3 puntos equiespaciados con h=1: y = [70.0, 80.0, 90.0]
        # Área Simpson = (1/3) * [70 + 4*(80) + 90] = (1/3) * [70 + 320 + 90] = 480 / 3 = 160.0
        res = calcular_irec_simpson([70.0, 80.0, 90.0], h=1.0)
        self.assertTrue(res['valido'])
        self.assertEqual(res['area_total_acumulada'], 160.0)
        self.assertEqual(res['rendimiento_medio_continuo'], 80.0)

    # ─────────────────────────────────────────────────────────────
    # G. Pruebas de Newton-Raphson (Nivelación Logística)
    # ─────────────────────────────────────────────────────────────
    def test_newton_raphson_nivelacion(self):
        # t0=1, rendimiento inicial 30 pts, meta 51 pts, tasa=0.3
        res = calcular_nivelacion_newton_raphson(
            t0_inicial=1.0,
            rendimiento_inicial=30.0,
            tasa_aprendizaje=0.3,
            nota_objetivo=51.0
        )
        self.assertTrue(res['valido'])
        self.assertGreater(res['semana_nivelacion'], 1.0)
        self.assertAlmostEqual(res['rendimiento_estimado_alcanzado'], 51.0, places=1)

    # ─────────────────────────────────────────────────────────────
    # H. Pruebas de Endpoints API de Análisis Numérico
    # ─────────────────────────────────────────────────────────────
    def test_api_simular_meta(self):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.create_user(username='test_math_user', password='password123')
        self.client.force_login(user)

        payload = {
            'evaluaciones_completadas': [{'nota': 80.0, 'peso': 40.0}],
            'peso_pendiente': 60.0,
            'nota_objetivo': 70.0
        }
        response = self.client.post('/api/v2/analisis-numerico/simular-meta/', payload, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['valido'])
        self.assertAlmostEqual(data['nota_necesaria'], 63.33, places=2)

    def test_api_calibrar_pesos_gauss(self):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.create_user(username='test_math_teacher', password='password123')
        self.client.force_login(user)

        payload = {
            'evaluaciones': [
                {'saber': 100.0, 'hacer': 80.0, 'decidir': 90.0, 'nota_final': 88.0},
                {'saber': 70.0, 'hacer': 90.0, 'decidir': 80.0, 'nota_final': 82.0},
                {'saber': 90.0, 'hacer': 70.0, 'decidir': 100.0, 'nota_final': 82.0},
            ]
        }
        response = self.client.post('/api/v2/analisis-numerico/calibrar-pesos/', payload, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['valido'])
        self.assertAlmostEqual(data['pesos_calibrados']['peso_saber'], 30.0, places=1)
