-- Migración manual: agregar columna contact_email a la tabla barbers
-- Aplicar vía psql antes de desplegar la FASE 4 (emails).
-- contexto: docker-compose del backend (postgres:18, base 'barberia').

ALTER TABLE barbers ADD COLUMN contact_email varchar(150) NULL;

-- Verificación:
-- \d barbers
-- SELECT id, name, email, contact_email FROM barbers;

-- Rollback:
-- ALTER TABLE barbers DROP COLUMN contact_email;