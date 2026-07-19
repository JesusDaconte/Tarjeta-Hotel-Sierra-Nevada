-- =====================================================================
--  Hotel Sierra Nevada - Esquema de base de datos para el dashboard
--  Importar desde phpMyAdmin / cPanel > MySQL
--  Motor: MySQL 5.7+ / MariaDB 10.2+
--  Juego de caracteres: utf8mb4
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- Tabla: settings (clave-valor multilingüe para textos sueltos y enlaces)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `settings`;
CREATE TABLE `settings` (
  `id` VARCHAR(80) NOT NULL PRIMARY KEY,
  `value_es` TEXT NULL,
  `value_en` TEXT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Tabla: policies (lista ordenada de políticas del hotel)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `policies`;
CREATE TABLE `policies` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `icon` VARCHAR(16) NOT NULL DEFAULT '✅',
  `title_es` VARCHAR(160) NOT NULL,
  `title_en` VARCHAR(160) NOT NULL,
  `text_es` TEXT NOT NULL,
  `text_en` TEXT NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Tabla: location_items (lista "Ubicación privilegiada")
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `location_items`;
CREATE TABLE `location_items` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `title_es` VARCHAR(160) NOT NULL,
  `title_en` VARCHAR(160) NOT NULL,
  `text_es` TEXT NOT NULL,
  `text_en` TEXT NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Tabla: admin (un único usuario administrador)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `admin`;
CREATE TABLE `admin` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(60) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `session_token` VARCHAR(64) NULL,
  `csrf_token` VARCHAR(64) NULL,
  `session_expires_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Tabla: login_attempts (rate-limit básico anti fuerza bruta)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `login_attempts`;
CREATE TABLE `login_attempts` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `ip` VARCHAR(45) NOT NULL,
  `attempted_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_ip_time` (`ip`, `attempted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
--  DATOS SEMILLA
-- =====================================================================

INSERT INTO `settings` (`id`, `value_es`, `value_en`) VALUES
-- Encabezado
('header_title',         'Bienvenidos a', 'Welcome to'),
('header_hotel_name',    'Hotel Sierra Nevada', 'Hotel Sierra Nevada'),
('header_subtitle',      'Centro histórico de Santa Marta, Colombia', 'Historic center of Santa Marta, Colombia'),
('header_intro',         'Esta es una guía práctica para que vuestra estancia sea más amena con información muy útil.', 'This is a practical guide to make your stay more enjoyable with very useful information.'),

-- Bloque Desayuno
('block_breakfast_title', 'Desayuno', 'Breakfast'),
('block_breakfast_text',  'Servido de 7:00 a 9:00 a. m. todos los días.', 'Served from 7:00 to 9:00 a.m. every day.'),

-- Bloque Check-out
('block_checkout_title', 'Check-out', 'Check-out'),
('block_checkout_text',  'Hasta las 12:00 del mediodía.', 'Until 12:00 noon.'),

-- Bloque Recepción
('block_reception_title', 'Recepción', 'Reception'),
('block_reception_text',  'Abierta las 24 horas, todos los días.', 'Open 24 hours, every day.'),

-- Bloque Wi-Fi
('wifi_title',           'Red Wi-Fi', 'Wi-Fi Network'),
('wifi_password_label',  'Contraseña:', 'Password:'),
('wifi_password',        'sierranevada3', 'sierranevada3'),
('wifi_hint',            'En cada piso, al terminar la escalera, encontrará un código QR para conectar a la red.', 'On each floor, at the end of the stairs, you''ll find a QR code to connect to the network.'),

-- Bloque "Ubicación privilegiada" (intro)
('location_intro_title', 'Ubicación privilegiada', 'Prime location'),
('location_intro_text',  'Nuestro hotel está en un lugar estupendo para moverse a pie. Muy cerca encontrará la bahía de Santa Marta con su marina y su puerto marítimo.', 'Our hotel is in a great location to get around on foot. The bay of Santa Marta with its marina and seaport is very close by.'),

-- Panel Políticas
('policies_title', 'Políticas del hotel', 'Hotel policies'),
('policies_lead',  'Estas políticas ayudan a garantizar una experiencia segura, respetuosa y en armonía con la naturaleza para todos los visitantes.', 'These policies help ensure a safe, respectful experience in harmony with nature for all visitors.'),
('policies_thanks', 'Muchas gracias por su comprensión.', 'Thank you very much for your understanding.'),

-- Panel Ubicación (mapa)
('map_title',      'Ubicación del hotel', 'Hotel location'),
('map_address',    'Calle 21 # 6-73, Santa Marta, Magdalena, Colombia', 'Calle 21 # 6-73, Santa Marta, Magdalena, Colombia'),
('map_iframe_src', 'https://www.google.com/maps?q=Calle+21+%23+6-73,+Santa+Marta,+Magdalena,+Colombia&output=embed', 'https://www.google.com/maps?q=Calle+21+%23+6-73,+Santa+Marta,+Magdalena,+Colombia&output=embed'),
('map_directions_url', 'https://www.google.com/maps/dir/?api=1&destination=11.240798,-74.209410', 'https://www.google.com/maps/dir/?api=1&destination=11.240798,-74.209410'),
('map_directions_btn', 'Cómo llegar', 'Get directions'),

-- Panel Tour
('tour_title',          'Tour a la Sierra Nevada', 'Tour to the Sierra Nevada'),
('tour_desc',           'El hotel ofrece un tour a la Sierra Nevada de Santa Marta: una experiencia de trekking, aventura, avistamiento de aves e interacción con nuestros hermanos indígenas Kogui.', 'The hotel offers a tour to the Sierra Nevada de Santa Marta: an experience of trekking, adventure, bird watching and interaction with our Kogui indigenous brothers.'),
('tour_reception',      'Para ampliar la información, acérquese a recepción del hotel.', 'For more information, visit the hotel reception.'),
('tour_info_label',     'Más información', 'More information'),
('tour_info_url',       'https://linktr.ee/Maruamake', 'https://linktr.ee/Maruamake'),
('tour_whatsapp_label', 'Consultar por WhatsApp', 'Ask by WhatsApp'),
('tour_whatsapp_url',   'https://wa.me/573127417352?text=Hola,%20me%20interesa%20el%20tour%20a%20la%20Sierra%20Nevada', 'https://wa.me/573127417352?text=Hola,%20me%20interesa%20el%20tour%20a%20la%20Sierra%20Nevada'),
('tour_image',          'uploads/tours/tour.jpeg', 'uploads/tours/tour.jpeg'),
('tour_tag_1', 'Trekking', 'Trekking'),
('tour_tag_2', 'Aventura', 'Adventure'),
('tour_tag_3', 'Avistamiento de aves', 'Bird watching'),
('tour_tag_4', 'Interacción indígena Kogui', 'Kogui indigenous interaction'),

-- Panel Contacto
('contact_title',         'Contacto', 'Contact'),
('contact_card_name',    'Hotel Sierra Nevada', 'Hotel Sierra Nevada'),
('contact_card_tagline', 'Su hogar en Santa Marta', 'Your home in Santa Marta'),
('contact_card_addr',     'Calle 21 # 6-73, Centro Histórico<br>Santa Marta, Magdalena, Colombia', 'Calle 21 # 6-73, Historic Center<br>Santa Marta, Magdalena, Colombia'),
('contact_whatsapp_label', 'Escribir por WhatsApp', 'WhatsApp us'),
('contact_whatsapp_url',   'https://wa.me/573127417352', 'https://wa.me/573127417352'),
('contact_phone_label',  '+57 312 741 7352', '+57 312 741 7352'),
('contact_phone_url',    'tel:+573127417352', 'tel:+573127417352'),
('contact_email_label',  'Enviar correo', 'Send email'),
('contact_email_url',    'mailto:htsierranevada@gmail.com', 'mailto:htsierranevada@gmail.com'),

-- Tabs (navegación inferior)
('tab_info',     'Info', 'Info'),
('tab_policies', 'Políticas', 'Policies'),
('tab_map',      'Ubicación', 'Map'),
('tab_tour',      'Tour', 'Tour'),
('tab_contact',  'Contacto', 'Contact'),

-- Footer / eslogan
('footer_slogan', '“Tu hogar en el corazón del Caribe colombiano”', '“Your home in the heart of the Colombian Caribbean”'),
('footer_loc',    'Santa Marta · Colombia', 'Santa Marta · Colombia');

-- ---------------------------------------------------------------------
-- Políticas semilla (en el mismo orden que el index actual)
-- ---------------------------------------------------------------------
INSERT INTO `policies` (`icon`, `title_es`, `title_en`, `text_es`, `text_en`, `sort_order`) VALUES
('🐾', 'Mascotas', 'Pets',
 'Se permiten únicamente bajo previa autorización. El propietario será responsable de su comportamiento y de cualquier daño ocasionado.',
 'Allowed only with prior authorization. The owner is responsible for their behavior and any damage caused.',
 1),
('🚭', 'Prohibido fumar', 'No smoking',
 'No está permitido fumar dentro de las habitaciones ni en espacios cerrados.',
 'Smoking is not allowed inside rooms or in enclosed spaces.',
 2),
('🌿', 'Cuidado del entorno', 'Care of the environment',
 'Está prohibido arrojar basura, extraer plantas, alimentar o perturbar la fauna silvestre.',
 'It''s forbidden to throw garbage, extract plants, feed or disturb wildlife.',
 3),
('🤫', 'Silencio', 'Silence',
 'Se solicita respetar el descanso de los demás huéspedes.',
 'Please respect the rest of other guests.',
 4),
('🔒', 'Responsabilidad', 'Liability',
 'El hotel no se hace responsable por objetos de valor dejados sin supervisión.',
 'The hotel is not responsible for valuable items left unsupervised.',
 5),
('💧', 'Sostenibilidad', 'Sustainability',
 'Invitamos a hacer un uso responsable del agua y la energía para contribuir a la conservación de la Sierra Nevada de Santa Marta.',
 'We invite you to use water and energy responsibly to help conserve the Sierra Nevada de Santa Marta.',
 6),
('🚿', 'Toallas', 'Towels',
 'Está prohibido sacar las toallas del hotel. Las toallas manchadas con tinte de cabello serán cobradas al huésped ($50.000 pesos).',
 'It''s forbidden to take towels out of the hotel. Towels stained with hair dye will be charged to the guest (COP $50,000).',
 7),
('🔑', 'Llaves', 'Keys',
 'Dejarlas en recepción al salir.',
 'Leave them at reception when leaving.',
 8),
('❄️', 'Aire acondicionado', 'Air conditioning',
 'Al salir de la habitación, por favor apagarlo para contribuir a cuidar el planeta.',
 'When leaving the room, please turn it off to help take care of the planet.',
 9),
('👕', 'Sábanas dañadas', 'Damaged sheets',
 'Las sábanas quemadas por plancha de ropa o plancha de cabello deberán ser pagadas por el huésped ($90.000 pesos).',
 'Sheets burned by clothing or hair irons must be paid by the guest (COP $90,000).',
 10);

-- ---------------------------------------------------------------------
-- Elementos "Ubicación privilegiada"
-- ---------------------------------------------------------------------
INSERT INTO `location_items` (`title_es`, `title_en`, `text_es`, `text_en`, `sort_order`) VALUES
('Supermercados', 'Supermarkets',
 'Éxito, Ara, Sao, De Uno y Divercittt a poca distancia.',
 'Éxito, Ara, Sao, De Uno and Divercittt nearby.',
 1),
('Restaurantes y bares', 'Restaurants & bars',
 'A solo dos cuadras, una zona mágica de restaurantes y bares para pasar un rato agradable en familia o con amigos.',
 'Just two blocks away, a magical zone of restaurants and bars for a pleasant time with family or friends.',
 2),
('Playas', 'Beaches',
 'El Rodadero y Taganga a solo 10 minutos en taxi.',
 'El Rodadero and Taganga just 10 minutes away by taxi.',
 3),
('Parque Tayrona', 'Tayrona Park',
 'A 5 minutos a pie para tomar el transporte al Parque Natural Tayrona.',
 'A 5-minute walk to catch transport to Tayrona Natural Park.',
 4);

-- ---------------------------------------------------------------------
-- Tabla: tours (CRUD de tours a la Sierra Nevada)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `tours`;
CREATE TABLE `tours` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `title_es` VARCHAR(200) NOT NULL DEFAULT '',
  `title_en` VARCHAR(200) NOT NULL DEFAULT '',
  `description_es` TEXT,
  `description_en` TEXT,
  `reception_es` VARCHAR(300) DEFAULT '',
  `reception_en` VARCHAR(300) DEFAULT '',
  `image` VARCHAR(500) DEFAULT '',
  `tags_json` TEXT,
  `info_label_es` VARCHAR(100) DEFAULT '',
  `info_label_en` VARCHAR(100) DEFAULT '',
  `info_url` VARCHAR(500) DEFAULT '',
  `whatsapp_label_es` VARCHAR(100) DEFAULT '',
  `whatsapp_label_en` VARCHAR(100) DEFAULT '',
  `whatsapp_url` VARCHAR(500) DEFAULT '',
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Tabla: products (productos a la venta en recepción)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name_es` VARCHAR(200) NOT NULL DEFAULT '',
  `name_en` VARCHAR(200) NOT NULL DEFAULT '',
  `price_es` VARCHAR(50) NOT NULL DEFAULT '',
  `price_en` VARCHAR(50) NOT NULL DEFAULT '',
  `icon` VARCHAR(16) NOT NULL DEFAULT '🛍️',
  `sort_order` INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Productos semilla
INSERT INTO `products` (`icon`, `name_es`, `name_en`, `price_es`, `price_en`, `sort_order`) VALUES
('💧', 'Agua', 'Water', '$3.000', '$3.000', 1),
('🥤', 'Coca-Cola', 'Coca-Cola', '$5.000', '$5.000', 2),
('⚡', 'Gatorade', 'Gatorade', '$6.000', '$6.000', 3),
('🧴', 'Champú', 'Shampoo', '$5.000', '$5.000', 4),
('🧼', 'Jabón de baño', 'Bath soap', '$5.000', '$5.000', 5),
('🪒', 'Prestobarbas', 'Razors', '$5.000', '$5.000', 6),
('🪥', 'Cepillos dentales', 'Toothbrushes', '$5.000', '$5.000', 7);

-- Settings para el bloque de productos
INSERT INTO `settings` (`id`, `value_es`, `value_en`) VALUES
('block_products_title', 'Productos disponibles en recepción', 'Products available at reception'),
('block_products_intro', 'Pensando en tu comodidad, en nuestra recepción encontrarás una selección de productos de primera necesidad y bebidas, entre ellos:', 'Thinking of your comfort, at our reception you will find a selection of essential products and beverages, including:'),
('block_products_outro', 'Si necesitas alguno de estos productos, con gusto nuestro equipo de recepción estará disponible para ayudarte.', 'If you need any of these products, our reception team will be happy to help you.');

SET FOREIGN_KEY_CHECKS = 1;
