from pathlib import Path
from django.contrib import admin
from django.urls import path, re_path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve

dist_dir = settings.BASE_DIR / 'frontend' / 'dist'

urlpatterns = [
    path('admin/', admin.site.urls),
    # Servir assets estáticos generados por Vite (React)
    re_path(r'^assets/(?P<path>.*)$', serve, {'document_root': dist_dir / 'assets'}),
    re_path(r'^images/(?P<path>.*)$', serve, {'document_root': dist_dir / 'images'}),
    re_path(r'^(?P<path>favicon\.svg|icons\.svg)$', serve, {'document_root': dist_dir}),
    path('', include('core.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATICFILES_DIRS[0] if settings.STATICFILES_DIRS else settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
