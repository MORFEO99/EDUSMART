import os
import django
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'edusmart_config.settings')
django.setup()

from core.models import Usuario, Estudiante

def create_students(count=16):
    created_count = 0
    for i in range(1, count + 1):
        username = f"estudiante_{i}_nuevo"
        email = f"estudiante_{i}@edusmart.com"
        
        # Check if user already exists
        if not Usuario.objects.filter(username=username).exists():
            # Create user
            user = Usuario.objects.create_user(
                username=username,
                email=email,
                password='password123',
                first_name=f'Estudiante Nombre {i}',
                last_name=f'Apellido {i}',
                rol='ESTUDIANTE'
            )
            
            # Create student profile
            Estudiante.objects.create(
                usuario=user,
                carrera_o_area='Ingeniería de Sistemas',
                biografia=f'Estudiante de prueba número {i}'
            )
            created_count += 1
            print(f"Creado estudiante: {username}")
        else:
            print(f"El estudiante {username} ya existe.")
            
    print(f"\n¡Se han creado {created_count} estudiantes exitosamente!")

if __name__ == '__main__':
    print("Iniciando creación de estudiantes...")
    try:
        create_students(20) # Añadiremos 20 para asegurarnos de que sean más de 15
    except Exception as e:
        print(f"Error al crear estudiantes: {e}")
        print("Asegúrate de que MySQL (XAMPP) y MongoDB estén en ejecución y de haber ejecutado las migraciones.")
