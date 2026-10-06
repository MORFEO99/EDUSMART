-- ============================================================
-- STORED PROCEDURES PARA EDUSMART - db_edusmart (MySQL/MariaDB)
-- Ejecutar en phpMyAdmin o HeidiSQL
-- ============================================================

-- ============================================================
-- PROCEDURE 1: sp_registrar_usuario
-- Registra un nuevo usuario (docente o estudiante) en el sistema
-- ============================================================
DROP PROCEDURE IF EXISTS sp_registrar_usuario;
DELIMITER $$
CREATE PROCEDURE sp_registrar_usuario(
    IN p_username VARCHAR(150),
    IN p_email VARCHAR(254),
    IN p_password VARCHAR(128),
    IN p_first_name VARCHAR(150),
    IN p_last_name VARCHAR(150),
    IN p_rol VARCHAR(20),
    IN p_telefono VARCHAR(30),
    OUT p_usuario_id BIGINT,
    OUT p_mensaje VARCHAR(200)
)
BEGIN
    DECLARE v_existe INT DEFAULT 0;

    -- Verificar si ya existe el usuario
    SELECT COUNT(*) INTO v_existe
    FROM usuarios
    WHERE email = p_email OR username = p_username;

    IF v_existe > 0 THEN
        SET p_usuario_id = 0;
        SET p_mensaje = 'ERROR: Ya existe un usuario con ese email o username.';
    ELSE
        -- Insertar usuario
        INSERT INTO usuarios (
            username, email, password, first_name, last_name,
            rol, estado, telefono, avatar_url, fecha_creacion,
            date_joined, is_superuser, is_staff, is_active,
            points, level, coins
        ) VALUES (
            p_username, p_email, p_password, p_first_name, p_last_name,
            p_rol, 'ACTIVO', p_telefono,
            CONCAT('https://api.dicebear.com/7.x/initials/svg?seed=', p_first_name, '+', p_last_name),
            NOW(), NOW(), 0, 0, 1,
            0, 1, 0
        );

        SET p_usuario_id = LAST_INSERT_ID();

        -- Crear perfil segun rol
        IF p_rol = 'DOCENTE' THEN
            INSERT INTO core_docente (usuario_id, especialidad, titulo_academico, biografia)
            VALUES (p_usuario_id, 'Ciencias de la Computacion', 'Profesor Titular', 'Docente del sistema EduSmart.');
        ELSEIF p_rol = 'ESTUDIANTE' THEN
            INSERT INTO core_estudiante (usuario_id, carrera_o_area, biografia)
            VALUES (p_usuario_id, 'Ingenieria de Sistemas', 'Estudiante del sistema EduSmart.');
        END IF;

        SET p_mensaje = CONCAT('Usuario registrado exitosamente con ID: ', p_usuario_id);
    END IF;
END$$
DELIMITER ;


-- ============================================================
-- PROCEDURE 2: sp_inscribir_estudiante_espacio
-- Inscribe un estudiante en un espacio academico mediante codigo
-- ============================================================
DROP PROCEDURE IF EXISTS sp_inscribir_estudiante_espacio;
DELIMITER $$
CREATE PROCEDURE sp_inscribir_estudiante_espacio(
    IN p_estudiante_id BIGINT,
    IN p_codigo_espacio VARCHAR(20),
    OUT p_resultado VARCHAR(200)
)
BEGIN
    DECLARE v_espacio_id BIGINT DEFAULT 0;
    DECLARE v_ya_inscrito INT DEFAULT 0;
    DECLARE v_espacio_nombre VARCHAR(150);
    DECLARE v_usuario_id BIGINT DEFAULT 0;

    -- Buscar espacio por codigo
    SELECT id, nombre INTO v_espacio_id, v_espacio_nombre
    FROM espacios
    WHERE codigo = UPPER(p_codigo_espacio)
    LIMIT 1;

    IF v_espacio_id = 0 THEN
        SET p_resultado = CONCAT('ERROR: No se encontro espacio con codigo "', p_codigo_espacio, '".');
    ELSE
        -- Verificar si ya esta inscrito
        SELECT COUNT(*) INTO v_ya_inscrito
        FROM miembros_espacio
        WHERE espacio_id = v_espacio_id AND estudiante_id = p_estudiante_id;

        IF v_ya_inscrito > 0 THEN
            SET p_resultado = CONCAT('Ya estas inscrito en el espacio "', v_espacio_nombre, '".');
        ELSE
            -- Inscribir
            INSERT INTO miembros_espacio (espacio_id, estudiante_id, fecha_union)
            VALUES (v_espacio_id, p_estudiante_id, NOW());

            -- Obtener usuario_id del estudiante
            SELECT usuario_id INTO v_usuario_id
            FROM core_estudiante WHERE id = p_estudiante_id;

            -- Crear notificacion
            INSERT INTO notificaciones (usuario_id, tipo, mensaje, fecha, leida, espacio_id)
            VALUES (v_usuario_id, 'INVITACION_ESPACIO',
                    CONCAT('Te has unido exitosamente al espacio "', v_espacio_nombre, '".'),
                    NOW(), 0, v_espacio_id);

            SET p_resultado = CONCAT('Inscripcion exitosa en "', v_espacio_nombre, '".');
        END IF;
    END IF;
END$$
DELIMITER ;


-- ============================================================
-- PROCEDURE 3: sp_calificar_entrega
-- Califica la entrega de un estudiante y genera retroalimentacion
-- ============================================================
DROP PROCEDURE IF EXISTS sp_calificar_entrega;
DELIMITER $$
CREATE PROCEDURE sp_calificar_entrega(
    IN p_entrega_id BIGINT,
    IN p_docente_id BIGINT,
    IN p_nota DOUBLE,
    IN p_retroalimentacion TEXT,
    OUT p_resultado VARCHAR(200)
)
BEGIN
    DECLARE v_calif_id BIGINT DEFAULT 0;
    DECLARE v_existe_calif INT DEFAULT 0;
    DECLARE v_tarea_titulo VARCHAR(200);
    DECLARE v_estudiante_usuario_id BIGINT;
    DECLARE v_espacio_id BIGINT;
    DECLARE v_tarea_id BIGINT;
    DECLARE v_nota_anterior DOUBLE DEFAULT 0;

    -- Verificar que la nota sea valida
    IF p_nota < 0 OR p_nota > 100 THEN
        SET p_resultado = 'ERROR: La nota debe estar entre 0 y 100.';
    ELSE
        -- Obtener datos de la entrega
        SELECT t.titulo, t.espacio_id, t.id, e2.usuario_id
        INTO v_tarea_titulo, v_espacio_id, v_tarea_id, v_estudiante_usuario_id
        FROM entregas e
        INNER JOIN tareas t ON e.tarea_id = t.id
        INNER JOIN core_estudiante e2_est ON e.estudiante_id = e2_est.id
        INNER JOIN usuarios e2 ON e2_est.usuario_id = e2.id
        WHERE e.id = p_entrega_id;

        -- Verificar si ya existe calificacion
        SELECT COUNT(*), COALESCE(MAX(id), 0) INTO v_existe_calif, v_calif_id
        FROM calificaciones WHERE entrega_id = p_entrega_id;

        IF v_existe_calif > 0 THEN
            -- Guardar nota anterior para historial
            SELECT nota INTO v_nota_anterior FROM calificaciones WHERE id = v_calif_id;

            -- Actualizar calificacion existente
            UPDATE calificaciones
            SET nota = p_nota, fecha_calificacion = NOW()
            WHERE id = v_calif_id;

            -- Registrar en historial
            INSERT INTO historial_calificaciones (calificacion_id, nota_anterior, nota_nueva, docente_id, fecha_cambio, motivo)
            VALUES (v_calif_id, v_nota_anterior, p_nota, p_docente_id, NOW(), 'Recalificacion via procedimiento');
        ELSE
            -- Crear nueva calificacion
            INSERT INTO calificaciones (entrega_id, nota, fecha_calificacion, docente_id)
            VALUES (p_entrega_id, p_nota, NOW(), p_docente_id);

            SET v_calif_id = LAST_INSERT_ID();
        END IF;

        -- Actualizar estado de la entrega
        UPDATE entregas SET estado = 'CALIFICADO' WHERE id = p_entrega_id;

        -- Crear retroalimentacion si se proporciono
        IF p_retroalimentacion IS NOT NULL AND LENGTH(TRIM(p_retroalimentacion)) > 0 THEN
            INSERT INTO retroalimentaciones (calificacion_id, comentario, fecha)
            VALUES (v_calif_id, p_retroalimentacion, NOW())
            ON DUPLICATE KEY UPDATE comentario = p_retroalimentacion, fecha = NOW();

            UPDATE entregas SET estado = 'RETROALIMENTADA' WHERE id = p_entrega_id;
        END IF;

        -- Notificar al estudiante
        INSERT INTO notificaciones (usuario_id, tipo, mensaje, fecha, leida, espacio_id, tarea_id)
        VALUES (v_estudiante_usuario_id, 'CALIFICADA',
                CONCAT('Tu tarea "', v_tarea_titulo, '" fue calificada con ', p_nota, '/100.'),
                NOW(), 0, v_espacio_id, v_tarea_id);

        SET p_resultado = CONCAT('Calificacion ', p_nota, '/100 registrada para "', v_tarea_titulo, '".');
    END IF;
END$$
DELIMITER ;


-- ============================================================
-- PROCEDURE 4: sp_recalcular_progreso_estudiante
-- Recalcula el progreso academico completo de un estudiante
-- ============================================================
DROP PROCEDURE IF EXISTS sp_recalcular_progreso_estudiante;
DELIMITER $$
CREATE PROCEDURE sp_recalcular_progreso_estudiante(
    IN p_estudiante_id BIGINT,
    OUT p_promedio DOUBLE,
    OUT p_porcentaje DOUBLE,
    OUT p_resultado VARCHAR(200)
)
BEGIN
    DECLARE v_total_tareas INT DEFAULT 0;
    DECLARE v_entregadas INT DEFAULT 0;
    DECLARE v_calificadas INT DEFAULT 0;
    DECLARE v_vencidas INT DEFAULT 0;
    DECLARE v_pendientes INT DEFAULT 0;
    DECLARE v_promedio_notas DOUBLE DEFAULT 0;
    DECLARE v_cumplimiento DOUBLE DEFAULT 0;
    DECLARE v_existe_progreso INT DEFAULT 0;

    -- Contar tareas totales de los espacios del estudiante
    SELECT COUNT(*) INTO v_total_tareas
    FROM tareas t
    WHERE t.estado = 'PUBLICADA'
    AND t.espacio_id IN (
        SELECT me.espacio_id FROM miembros_espacio me WHERE me.estudiante_id = p_estudiante_id
    );

    -- Contar entregas realizadas
    SELECT COUNT(*) INTO v_entregadas
    FROM entregas
    WHERE estudiante_id = p_estudiante_id
    AND estado IN ('ENTREGADO', 'CALIFICADO', 'RETROALIMENTADA', 'ATRASADO', 'REENTREGADA');

    -- Contar calificadas
    SELECT COUNT(*) INTO v_calificadas
    FROM entregas e
    INNER JOIN calificaciones c ON e.id = c.entrega_id
    WHERE e.estudiante_id = p_estudiante_id;

    -- Contar vencidas sin entrega
    SELECT COUNT(*) INTO v_vencidas
    FROM tareas t
    WHERE t.estado = 'PUBLICADA'
    AND t.fecha_limite < NOW()
    AND t.espacio_id IN (
        SELECT me.espacio_id FROM miembros_espacio me WHERE me.estudiante_id = p_estudiante_id
    )
    AND t.id NOT IN (
        SELECT tarea_id FROM entregas WHERE estudiante_id = p_estudiante_id
    );

    -- Calcular pendientes
    SET v_pendientes = GREATEST(0, v_total_tareas - v_entregadas);

    -- Calcular promedio de notas
    SELECT COALESCE(AVG(c.nota), 0) INTO v_promedio_notas
    FROM calificaciones c
    INNER JOIN entregas e ON c.entrega_id = e.id
    WHERE e.estudiante_id = p_estudiante_id;

    -- Calcular porcentaje de cumplimiento
    IF v_total_tareas > 0 THEN
        SET v_cumplimiento = ROUND((v_entregadas / v_total_tareas) * 100, 1);
    ELSE
        SET v_cumplimiento = 0;
    END IF;

    -- Insertar o actualizar progreso
    SELECT COUNT(*) INTO v_existe_progreso
    FROM progreso_academico WHERE estudiante_id = p_estudiante_id;

    IF v_existe_progreso > 0 THEN
        UPDATE progreso_academico SET
            promedio = ROUND(v_promedio_notas, 1),
            tareas_entregadas = v_entregadas,
            tareas_pendientes = v_pendientes,
            tareas_calificadas = v_calificadas,
            tareas_vencidas = v_vencidas,
            porcentaje_cumplimiento = v_cumplimiento
        WHERE estudiante_id = p_estudiante_id;
    ELSE
        INSERT INTO progreso_academico
            (estudiante_id, promedio, tareas_entregadas, tareas_pendientes, tareas_calificadas, tareas_vencidas, porcentaje_cumplimiento)
        VALUES
            (p_estudiante_id, ROUND(v_promedio_notas, 1), v_entregadas, v_pendientes, v_calificadas, v_vencidas, v_cumplimiento);
    END IF;

    SET p_promedio = ROUND(v_promedio_notas, 1);
    SET p_porcentaje = v_cumplimiento;
    SET p_resultado = CONCAT(
        'Progreso actualizado: Promedio=', ROUND(v_promedio_notas, 1),
        ', Entregadas=', v_entregadas, '/', v_total_tareas,
        ', Vencidas=', v_vencidas,
        ', Cumplimiento=', v_cumplimiento, '%'
    );
END$$
DELIMITER ;


-- ============================================================
-- PROCEDURE 5: sp_reporte_espacio
-- Genera un reporte completo de un espacio academico
-- ============================================================
DROP PROCEDURE IF EXISTS sp_reporte_espacio;
DELIMITER $$
CREATE PROCEDURE sp_reporte_espacio(
    IN p_espacio_id BIGINT
)
BEGIN
    DECLARE v_nombre_espacio VARCHAR(150);
    DECLARE v_total_estudiantes INT;
    DECLARE v_total_tareas INT;
    DECLARE v_promedio_general DOUBLE;
    DECLARE v_tasa_entrega DOUBLE;

    -- Info del espacio
    SELECT nombre INTO v_nombre_espacio FROM espacios WHERE id = p_espacio_id;

    -- Total estudiantes inscritos
    SELECT COUNT(*) INTO v_total_estudiantes
    FROM miembros_espacio WHERE espacio_id = p_espacio_id;

    -- Total tareas publicadas
    SELECT COUNT(*) INTO v_total_tareas
    FROM tareas WHERE espacio_id = p_espacio_id AND estado = 'PUBLICADA';

    -- Promedio general de calificaciones
    SELECT COALESCE(AVG(c.nota), 0) INTO v_promedio_general
    FROM calificaciones c
    INNER JOIN entregas e ON c.entrega_id = e.id
    INNER JOIN tareas t ON e.tarea_id = t.id
    WHERE t.espacio_id = p_espacio_id;

    -- Tasa de entrega
    IF v_total_estudiantes > 0 AND v_total_tareas > 0 THEN
        SET v_tasa_entrega = ROUND(
            (SELECT COUNT(*) FROM entregas e
             INNER JOIN tareas t ON e.tarea_id = t.id
             WHERE t.espacio_id = p_espacio_id) * 100.0
            / (v_total_estudiantes * v_total_tareas), 1);
    ELSE
        SET v_tasa_entrega = 0;
    END IF;

    -- RESULTADO 1: Resumen del espacio
    SELECT
        v_nombre_espacio AS espacio,
        v_total_estudiantes AS total_estudiantes,
        v_total_tareas AS total_tareas,
        ROUND(v_promedio_general, 1) AS promedio_general,
        v_tasa_entrega AS tasa_entrega_porcentaje;

    -- RESULTADO 2: Detalle por tarea
    SELECT
        t.id AS tarea_id,
        t.titulo,
        t.fecha_limite,
        t.puntaje_maximo,
        IF(t.fecha_limite < NOW(), 'VENCIDA', 'ACTIVA') AS estado_fecha,
        COUNT(e.id) AS total_entregas,
        COALESCE(ROUND(AVG(c.nota), 1), 0) AS promedio_nota,
        COUNT(c.id) AS total_calificadas
    FROM tareas t
    LEFT JOIN entregas e ON t.id = e.tarea_id
    LEFT JOIN calificaciones c ON e.id = c.entrega_id
    WHERE t.espacio_id = p_espacio_id AND t.estado = 'PUBLICADA'
    GROUP BY t.id, t.titulo, t.fecha_limite, t.puntaje_maximo
    ORDER BY t.fecha_limite DESC;

    -- RESULTADO 3: Rendimiento por estudiante
    SELECT
        u.id AS usuario_id,
        CONCAT(u.first_name, ' ', u.last_name) AS nombre_completo,
        u.email,
        COUNT(e.id) AS tareas_entregadas,
        COUNT(c.id) AS tareas_calificadas,
        COALESCE(ROUND(AVG(c.nota), 1), 0) AS promedio,
        u.points AS puntos_gamificacion
    FROM miembros_espacio me
    INNER JOIN core_estudiante est ON me.estudiante_id = est.id
    INNER JOIN usuarios u ON est.usuario_id = u.id
    LEFT JOIN entregas e ON e.estudiante_id = est.id
        AND e.tarea_id IN (SELECT id FROM tareas WHERE espacio_id = p_espacio_id)
    LEFT JOIN calificaciones c ON e.id = c.entrega_id
    WHERE me.espacio_id = p_espacio_id
    GROUP BY u.id, u.first_name, u.last_name, u.email, u.points
    ORDER BY promedio DESC;
END$$
DELIMITER ;


-- ============================================================
-- PROCEDURE 6: sp_publicar_tarea
-- Publica una nueva tarea y notifica a todos los estudiantes
-- Usa CURSOR para recorrer los estudiantes inscritos
-- ============================================================
DROP PROCEDURE IF EXISTS sp_publicar_tarea;
DELIMITER $$
CREATE PROCEDURE sp_publicar_tarea(
    IN p_espacio_id BIGINT,
    IN p_docente_id BIGINT,
    IN p_titulo VARCHAR(200),
    IN p_descripcion TEXT,
    IN p_indicaciones TEXT,
    IN p_puntaje_maximo INT,
    IN p_fecha_limite DATETIME,
    OUT p_tarea_id BIGINT,
    OUT p_resultado VARCHAR(200)
)
BEGIN
    DECLARE v_estudiante_usuario_id BIGINT;
    DECLARE v_espacio_nombre VARCHAR(150);
    DECLARE v_done INT DEFAULT 0;

    -- Cursor para notificar a cada estudiante del espacio
    DECLARE cur_estudiantes CURSOR FOR
        SELECT u.id
        FROM miembros_espacio me
        INNER JOIN core_estudiante est ON me.estudiante_id = est.id
        INNER JOIN usuarios u ON est.usuario_id = u.id
        WHERE me.espacio_id = p_espacio_id;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = 1;

    -- Obtener nombre del espacio
    SELECT nombre INTO v_espacio_nombre FROM espacios WHERE id = p_espacio_id;

    -- Crear la tarea
    INSERT INTO tareas (
        espacio_id, docente_id, titulo, descripcion, indicaciones,
        puntaje_maximo, fecha_publicacion, fecha_limite, estado
    ) VALUES (
        p_espacio_id, p_docente_id, p_titulo, p_descripcion,
        COALESCE(p_indicaciones, ''),
        COALESCE(p_puntaje_maximo, 100),
        NOW(), p_fecha_limite, 'PUBLICADA'
    );

    SET p_tarea_id = LAST_INSERT_ID();

    -- Recorrer con cursor y notificar a cada estudiante
    OPEN cur_estudiantes;
    loop_estudiantes: LOOP
        FETCH cur_estudiantes INTO v_estudiante_usuario_id;
        IF v_done THEN
            LEAVE loop_estudiantes;
        END IF;

        INSERT INTO notificaciones (usuario_id, tipo, mensaje, fecha, leida, espacio_id, tarea_id)
        VALUES (v_estudiante_usuario_id, 'NUEVA_TAREA',
                CONCAT('Nueva tarea publicada: "', p_titulo, '" en ', v_espacio_nombre,
                       '. Fecha limite: ', DATE_FORMAT(p_fecha_limite, '%d/%m/%Y'), '.'),
                NOW(), 0, p_espacio_id, p_tarea_id);
    END LOOP;
    CLOSE cur_estudiantes;

    SET p_resultado = CONCAT('Tarea "', p_titulo, '" publicada con ID: ', p_tarea_id);
END$$
DELIMITER ;


-- ============================================================
-- PROCEDURE 7: sp_otorgar_puntos_gamificacion
-- Otorga puntos, coins y sube de nivel al estudiante
-- ============================================================
DROP PROCEDURE IF EXISTS sp_otorgar_puntos_gamificacion;
DELIMITER $$
CREATE PROCEDURE sp_otorgar_puntos_gamificacion(
    IN p_usuario_id BIGINT,
    IN p_puntos INT,
    IN p_coins INT,
    IN p_razon VARCHAR(200),
    OUT p_nuevo_nivel INT,
    OUT p_resultado VARCHAR(200)
)
BEGIN
    DECLARE v_puntos_actuales INT DEFAULT 0;
    DECLARE v_coins_actuales INT DEFAULT 0;
    DECLARE v_nivel_actual INT DEFAULT 1;
    DECLARE v_nuevo_nivel INT DEFAULT 1;
    DECLARE v_subio_nivel TINYINT DEFAULT 0;

    -- Obtener stats actuales
    SELECT points, coins, level
    INTO v_puntos_actuales, v_coins_actuales, v_nivel_actual
    FROM usuarios WHERE id = p_usuario_id;

    -- Sumar puntos y coins
    SET v_puntos_actuales = v_puntos_actuales + p_puntos;
    SET v_coins_actuales = v_coins_actuales + p_coins;

    -- Calcular nuevo nivel (cada 100 puntos = 1 nivel)
    SET v_nuevo_nivel = GREATEST(1, FLOOR(v_puntos_actuales / 100) + 1);

    IF v_nuevo_nivel > v_nivel_actual THEN
        SET v_subio_nivel = 1;
    END IF;

    -- Actualizar usuario
    UPDATE usuarios
    SET points = v_puntos_actuales,
        coins = v_coins_actuales,
        level = v_nuevo_nivel
    WHERE id = p_usuario_id;

    -- Registrar transaccion de coins
    INSERT INTO coin_transactions (usuario_id, cantidad, razon, fecha)
    VALUES (p_usuario_id, p_coins, p_razon, NOW());

    -- Notificar si subio de nivel
    IF v_subio_nivel THEN
        INSERT INTO notificaciones (usuario_id, tipo, mensaje, fecha, leida)
        VALUES (p_usuario_id, 'AVISO_NUEVO',
                CONCAT('Felicidades! Has subido al Nivel ', v_nuevo_nivel, '. Sigue asi!'),
                NOW(), 0);
    END IF;

    SET p_nuevo_nivel = v_nuevo_nivel;
    SET p_resultado = CONCAT(
        'Otorgados +', p_puntos, ' puntos y +', p_coins, ' coins. ',
        'Total: ', v_puntos_actuales, ' pts, ', v_coins_actuales, ' coins, Nivel ', v_nuevo_nivel,
        IF(v_subio_nivel, ' (SUBIO DE NIVEL!)', '')
    );
END$$
DELIMITER ;


-- ============================================================
-- PROCEDURE 8: sp_dashboard_docente
-- Genera las estadisticas completas del dashboard de un docente
-- ============================================================
DROP PROCEDURE IF EXISTS sp_dashboard_docente;
DELIMITER $$
CREATE PROCEDURE sp_dashboard_docente(
    IN p_docente_id BIGINT
)
BEGIN
    -- RESULTADO 1: Estadisticas generales del docente
    SELECT
        (SELECT COUNT(*) FROM espacios WHERE docente_id = p_docente_id) AS total_espacios,
        (SELECT COUNT(*) FROM tareas WHERE docente_id = p_docente_id) AS total_tareas,
        (SELECT COUNT(*) FROM tareas WHERE docente_id = p_docente_id AND estado = 'PUBLICADA' AND fecha_limite >= NOW()) AS tareas_activas,
        (SELECT COUNT(DISTINCT me.estudiante_id)
         FROM miembros_espacio me
         INNER JOIN espacios e ON me.espacio_id = e.id
         WHERE e.docente_id = p_docente_id) AS total_estudiantes,
        (SELECT COUNT(*)
         FROM entregas en
         INNER JOIN tareas t ON en.tarea_id = t.id
         WHERE t.docente_id = p_docente_id AND en.estado = 'ENTREGADO') AS entregas_pendientes_revision,
        (SELECT COALESCE(ROUND(AVG(c.nota), 1), 0)
         FROM calificaciones c
         INNER JOIN entregas en ON c.entrega_id = en.id
         INNER JOIN tareas t ON en.tarea_id = t.id
         WHERE t.docente_id = p_docente_id) AS promedio_general;

    -- RESULTADO 2: Resumen por espacio
    SELECT
        e.id AS espacio_id,
        e.nombre AS espacio,
        e.codigo,
        (SELECT COUNT(*) FROM miembros_espacio WHERE espacio_id = e.id) AS estudiantes,
        (SELECT COUNT(*) FROM tareas WHERE espacio_id = e.id AND estado = 'PUBLICADA') AS tareas,
        (SELECT COUNT(*) FROM entregas en
         INNER JOIN tareas t ON en.tarea_id = t.id
         WHERE t.espacio_id = e.id AND en.estado = 'ENTREGADO') AS pendientes_revision
    FROM espacios e
    WHERE e.docente_id = p_docente_id
    ORDER BY e.nombre;

    -- RESULTADO 3: Ultimas entregas recibidas (top 10)
    SELECT
        CONCAT(u.first_name, ' ', u.last_name) AS estudiante,
        t.titulo AS tarea,
        e_esp.nombre AS espacio,
        en.fecha_entrega,
        en.estado
    FROM entregas en
    INNER JOIN tareas t ON en.tarea_id = t.id
    INNER JOIN espacios e_esp ON t.espacio_id = e_esp.id
    INNER JOIN core_estudiante est ON en.estudiante_id = est.id
    INNER JOIN usuarios u ON est.usuario_id = u.id
    WHERE t.docente_id = p_docente_id
    ORDER BY en.fecha_entrega DESC
    LIMIT 10;
END$$
DELIMITER ;
