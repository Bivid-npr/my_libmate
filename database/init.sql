-- SMART LIBRARY MANAGEMENT SYSTEM - COMPLETE DEPLOYMENT SCRIPT

SET GLOBAL event_scheduler = ON;
SET GLOBAL time_zone = '+05:45';
SET FOREIGN_KEY_CHECKS = 0;

-- TABLES

CREATE TABLE admins (
    admin_id            INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    full_name           VARCHAR(100)    NOT NULL,
    email               VARCHAR(150)    NOT NULL UNIQUE,
    phone               VARCHAR(20)     DEFAULT NULL,
    password_hash       VARCHAR(255)    NOT NULL,
    profile_picture     VARCHAR(255)    DEFAULT NULL,
    is_active           BOOLEAN         DEFAULT TRUE,
    created_at          TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE users (
    user_id             INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    full_name           VARCHAR(100)    NOT NULL,
    email               VARCHAR(150)    NOT NULL UNIQUE,
    phone               VARCHAR(20)     DEFAULT NULL,
    password_hash       VARCHAR(255)    NOT NULL,
    profile_picture     VARCHAR(255)    DEFAULT NULL,
    address             TEXT            DEFAULT NULL,
    role                ENUM('guest', 'member') DEFAULT 'guest',
    is_active           BOOLEAN         DEFAULT TRUE,
    created_at          TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE memberships (
    membership_id       INT UNSIGNED        AUTO_INCREMENT PRIMARY KEY,
    user_id             INT UNSIGNED        NOT NULL,
    duration_months     TINYINT UNSIGNED    NOT NULL,
    requested_at        TIMESTAMP           DEFAULT CURRENT_TIMESTAMP,
    approved_at         TIMESTAMP           NULL DEFAULT NULL,
    start_date          DATE                NULL DEFAULT NULL,
    expiry_date         DATE                NULL DEFAULT NULL,
    processed_by        INT UNSIGNED        NULL DEFAULT NULL,
    status              ENUM('pending', 'active', 'expired', 'cancelled', 'rejected') DEFAULT 'pending',
    payment_receipt     VARCHAR(255)        NULL DEFAULT NULL,
    payment_status      ENUM('unpaid', 'paid') DEFAULT 'unpaid',
    paid_at             TIMESTAMP           NULL DEFAULT NULL,
    card_number         VARCHAR(50)         NULL DEFAULT NULL UNIQUE,
    card_issued_at      TIMESTAMP           NULL DEFAULT NULL,
    updated_at          TIMESTAMP           DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)       REFERENCES users(user_id)   ON DELETE CASCADE,
    FOREIGN KEY (processed_by)  REFERENCES admins(admin_id) ON DELETE SET NULL,
    INDEX idx_user_id           (user_id),
    INDEX idx_status            (status),
    INDEX idx_expiry_date       (expiry_date)
) ENGINE=InnoDB;

CREATE TABLE books (
    book_id             INT UNSIGNED        AUTO_INCREMENT PRIMARY KEY,
    title               VARCHAR(255)        NOT NULL,
    author              VARCHAR(150)        NOT NULL,
    isbn                VARCHAR(20)         NULL DEFAULT NULL UNIQUE,
    genre               VARCHAR(100)        NULL DEFAULT NULL,
    publisher           VARCHAR(150)        NULL DEFAULT NULL,
    published_year      YEAR                NULL DEFAULT NULL,
    language            VARCHAR(50)         DEFAULT 'English',
    total_copies        SMALLINT UNSIGNED   NOT NULL DEFAULT 1,
    available_copies    SMALLINT UNSIGNED   NOT NULL DEFAULT 1,
    cover_image         VARCHAR(255)        NULL DEFAULT NULL,
    description         TEXT                NULL DEFAULT NULL,
    status              ENUM('available', 'reserved', 'checked_out', 'unavailable') DEFAULT 'available',
    is_archived         BOOLEAN             DEFAULT FALSE,
    total_borrow_count  INT UNSIGNED        DEFAULT 0,
    added_by            INT UNSIGNED        NULL DEFAULT NULL,
    created_at          TIMESTAMP           DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP           DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_available_non_negative CHECK (available_copies >= 0),
    CONSTRAINT chk_available_lte_total    CHECK (available_copies <= total_copies),
    FOREIGN KEY (added_by)  REFERENCES admins(admin_id) ON DELETE SET NULL,
    INDEX idx_title         (title),
    INDEX idx_author        (author),
    INDEX idx_genre         (genre),
    INDEX idx_status        (status),
    INDEX idx_is_archived   (is_archived)
) ENGINE=InnoDB;

CREATE TABLE book_requests (
    request_id          INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    user_id             INT UNSIGNED    NOT NULL,
    title               VARCHAR(255)    NOT NULL,
    author              VARCHAR(150)    NULL DEFAULT NULL,
    genre               VARCHAR(100)    NULL DEFAULT NULL,
    reason              TEXT            NULL DEFAULT NULL,
    status              ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at          TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)   REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_user_id       (user_id),
    INDEX idx_status        (status)
) ENGINE=InnoDB;

CREATE TABLE reservations (
    reservation_id      INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    user_id             INT UNSIGNED    NOT NULL,
    book_id             INT UNSIGNED    NOT NULL,
    reserved_at         TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    expires_at          TIMESTAMP       NOT NULL,
    status              ENUM('pending', 'fulfilled', 'cancelled', 'expired') DEFAULT 'pending',
    reservation_type    ENUM('pickup', 'waitlist') DEFAULT 'pickup',
    FOREIGN KEY (user_id)   REFERENCES users(user_id)   ON DELETE CASCADE,
    FOREIGN KEY (book_id)   REFERENCES books(book_id)   ON DELETE CASCADE,
    INDEX idx_user_id       (user_id),
    INDEX idx_book_id       (book_id),
    INDEX idx_status        (status),
    INDEX idx_expires_at    (expires_at)
) ENGINE=InnoDB;

CREATE TABLE borrowings (
    borrow_id           INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    user_id             INT UNSIGNED    NOT NULL,
    book_id             INT UNSIGNED    NOT NULL,
    issued_by           INT UNSIGNED    NULL DEFAULT NULL,
    issued_at           TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    due_date            DATE            NOT NULL,
    returned_at         TIMESTAMP       NULL DEFAULT NULL,
    renewal_count       TINYINT UNSIGNED DEFAULT 0,
    renewal_requested   BOOLEAN         DEFAULT FALSE,
    renewal_status      ENUM('none', 'pending', 'approved', 'rejected') DEFAULT 'none',
    status              ENUM('borrowed', 'overdue', 'renewed', 'returned', 'lost') DEFAULT 'borrowed',
    fine_status         ENUM('none', 'unpaid', 'paid', 'waived') DEFAULT 'none',
    fine_paid_at        TIMESTAMP       NULL DEFAULT NULL,
    updated_at          TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)       REFERENCES users(user_id)   ON DELETE CASCADE,
    FOREIGN KEY (book_id)       REFERENCES books(book_id)   ON DELETE CASCADE,
    FOREIGN KEY (issued_by)     REFERENCES admins(admin_id) ON DELETE SET NULL,
    INDEX idx_user_id           (user_id),
    INDEX idx_book_id           (book_id),
    INDEX idx_status            (status),
    INDEX idx_due_date          (due_date),
    INDEX idx_returned_at       (returned_at),
    INDEX idx_user_status       (user_id, status)
) ENGINE=InnoDB;

CREATE TABLE borrow_history (
    history_id          INT UNSIGNED        AUTO_INCREMENT PRIMARY KEY,
    borrow_id           INT UNSIGNED        NOT NULL,
    user_id             INT UNSIGNED        NOT NULL,
    book_id             INT UNSIGNED        NOT NULL,
    issued_by           INT UNSIGNED        NULL DEFAULT NULL,
    issued_at           TIMESTAMP           NOT NULL,
    due_date            DATE                NOT NULL,
    returned_at         TIMESTAMP           NOT NULL,
    returned_to         INT UNSIGNED        NULL DEFAULT NULL,
    renewal_count       TINYINT UNSIGNED    DEFAULT 0,
    return_condition    ENUM('good', 'damaged', 'lost') DEFAULT 'good',
    fine_amount         DECIMAL(10,2)       DEFAULT 0.00,
    fine_status         ENUM('none', 'unpaid', 'paid', 'waived') DEFAULT 'none',
    days_borrowed       SMALLINT UNSIGNED   GENERATED ALWAYS AS (DATEDIFF(returned_at, issued_at)) STORED,
    was_overdue         BOOLEAN             GENERATED ALWAYS AS (returned_at > due_date) STORED,
    FOREIGN KEY (user_id)       REFERENCES users(user_id)   ON DELETE CASCADE,
    FOREIGN KEY (book_id)       REFERENCES books(book_id)   ON DELETE RESTRICT,
    FOREIGN KEY (issued_by)     REFERENCES admins(admin_id) ON DELETE SET NULL,
    FOREIGN KEY (returned_to)   REFERENCES admins(admin_id) ON DELETE SET NULL,
    INDEX idx_user_id           (user_id),
    INDEX idx_book_id           (book_id),
    INDEX idx_returned_at       (returned_at),
    INDEX idx_ai_engine         (user_id, book_id, returned_at)
) ENGINE=InnoDB;

CREATE TABLE reviews (
    review_id           INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    user_id             INT UNSIGNED    NOT NULL,
    book_id             INT UNSIGNED    NOT NULL,
    rating              TINYINT UNSIGNED NOT NULL,
    review_text         TEXT            NULL DEFAULT NULL,
    created_at          TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_rating CHECK (rating BETWEEN 1 AND 5),
    UNIQUE KEY uq_user_book     (user_id, book_id),
    FOREIGN KEY (user_id)       REFERENCES users(user_id)   ON DELETE CASCADE,
    FOREIGN KEY (book_id)       REFERENCES books(book_id)   ON DELETE RESTRICT,
    INDEX idx_book_id           (book_id)
) ENGINE=InnoDB;

CREATE TABLE wishlist (
    wishlist_id         INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    user_id             INT UNSIGNED    NOT NULL,
    book_id             INT UNSIGNED    NOT NULL,
    added_at            TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_book     (user_id, book_id),
    FOREIGN KEY (user_id)       REFERENCES users(user_id)   ON DELETE CASCADE,
    FOREIGN KEY (book_id)       REFERENCES books(book_id)   ON DELETE RESTRICT,
    INDEX idx_user_id           (user_id)
) ENGINE=InnoDB;

CREATE TABLE recommendations (
    recommendation_id   INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    user_id             INT UNSIGNED    NOT NULL,
    book_id             INT UNSIGNED    NOT NULL,
    similarity_score    DECIMAL(6,4)    NOT NULL,
    generated_at        TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_book     (user_id, book_id),
    FOREIGN KEY (user_id)       REFERENCES users(user_id)   ON DELETE CASCADE,
    FOREIGN KEY (book_id)       REFERENCES books(book_id)   ON DELETE CASCADE,
    INDEX idx_user_score        (user_id, similarity_score)
) ENGINE=InnoDB;

CREATE TABLE trending_books (
    book_id             INT UNSIGNED        NOT NULL,
    period_start        DATE                NOT NULL,
    period_end          DATE                NOT NULL,
    borrow_count        INT UNSIGNED        NOT NULL DEFAULT 0,
    trend_rank          TINYINT UNSIGNED    NOT NULL,
    generated_at        TIMESTAMP           DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_trend_rank CHECK (trend_rank BETWEEN 1 AND 100),
    PRIMARY KEY         (book_id, period_start, period_end),
    FOREIGN KEY (book_id)   REFERENCES books(book_id) ON DELETE CASCADE,
    INDEX idx_period        (period_start, period_end),
    INDEX idx_trend_rank    (trend_rank)
) ENGINE=InnoDB;

CREATE TABLE notifications (
    notification_id     INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    type                ENUM(
                            'due_date_reminder', 'book_available', 'smoke_alert',
                            'renewal_approved', 'renewal_rejected', 'membership_approved',
                            'membership_rejected', 'membership_expiry', 'fine_generated',
                            'reservation_fulfilled', 'reservation_expired', 'announcement',
                            'book_request', 'renewal_request', 'overdue_notice', 'max_borrow_reached'
                        ) NOT NULL,
    title               VARCHAR(255)    NOT NULL,
    message             TEXT            NOT NULL,
    created_at          TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_type      (type)
) ENGINE=InnoDB;

CREATE TABLE user_notifications (
    user_id             INT UNSIGNED    NOT NULL,
    notification_id     INT UNSIGNED    NOT NULL,
    is_read             BOOLEAN         DEFAULT FALSE,
    read_at             TIMESTAMP       NULL DEFAULT NULL,
    PRIMARY KEY         (user_id, notification_id),
    FOREIGN KEY (user_id)           REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (notification_id)   REFERENCES notifications(notification_id) ON DELETE CASCADE,
    INDEX idx_is_read               (is_read)
) ENGINE=InnoDB;

CREATE TABLE admin_notifications (
    admin_id            INT UNSIGNED    NOT NULL,
    notification_id     INT UNSIGNED    NOT NULL,
    is_read             BOOLEAN         DEFAULT FALSE,
    read_at             TIMESTAMP       NULL DEFAULT NULL,
    PRIMARY KEY         (admin_id, notification_id),
    FOREIGN KEY (admin_id)          REFERENCES admins(admin_id) ON DELETE CASCADE,
    FOREIGN KEY (notification_id)   REFERENCES notifications(notification_id) ON DELETE CASCADE,
    INDEX idx_is_read               (is_read)
) ENGINE=InnoDB;

CREATE TABLE smoke_alerts (
    alert_id            INT UNSIGNED    AUTO_INCREMENT PRIMARY KEY,
    device_id           VARCHAR(100)    NOT NULL,
    sensor_value        FLOAT           NOT NULL,
    threshold_value     FLOAT           NOT NULL,
    status              ENUM('active', 'resolved') DEFAULT 'active',
    detected_at         TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
    resolved_at         TIMESTAMP       NULL DEFAULT NULL,
    resolved_by         INT UNSIGNED    NULL DEFAULT NULL,
    resolution_note     TEXT            NULL DEFAULT NULL,
    FOREIGN KEY (resolved_by)   REFERENCES admins(admin_id) ON DELETE SET NULL,
    INDEX idx_status            (status),
    INDEX idx_detected_at       (detected_at),
    INDEX idx_device_id         (device_id)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- TRIGGERS

DELIMITER $$

CREATE TRIGGER trg_before_reservation_insert
BEFORE INSERT ON reservations
FOR EACH ROW
BEGIN
    DECLARE v_existing INT DEFAULT 0;
    IF NEW.expires_at IS NULL THEN
        SET NEW.expires_at = DATE_ADD(NOW(), INTERVAL 48 HOUR);
    END IF;
    SELECT COUNT(*) INTO v_existing
    FROM reservations
    WHERE user_id = NEW.user_id AND book_id = NEW.book_id AND status = 'pending';
    IF v_existing > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot reserve: you already have a pending reservation for this book.';
    END IF;
END$$

CREATE TRIGGER trg_before_borrow_insert
BEFORE INSERT ON borrowings
FOR EACH ROW
BEGIN
    DECLARE v_membership INT UNSIGNED DEFAULT 0;
    DECLARE v_available SMALLINT UNSIGNED DEFAULT 0;
    DECLARE v_has_reservation INT UNSIGNED DEFAULT 0;
    DECLARE v_user_reserved INT UNSIGNED DEFAULT 0;
    DECLARE v_duplicate INT UNSIGNED DEFAULT 0;
    DECLARE v_active_borrows INT UNSIGNED DEFAULT 0;
    DECLARE v_pending_pickup INT UNSIGNED DEFAULT 0;

    SELECT COUNT(*) INTO v_membership
    FROM memberships
    WHERE user_id = NEW.user_id AND status = 'active' AND expiry_date > CURDATE();
    IF v_membership = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot borrow: no active membership found.';
    END IF;

    SELECT COUNT(*) INTO v_pending_pickup
    FROM reservations
    WHERE user_id = NEW.user_id AND book_id = NEW.book_id AND status = 'pending';

    SELECT available_copies INTO v_available FROM books WHERE book_id = NEW.book_id;

    IF v_pending_pickup = 0 THEN
        IF v_available < 1 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot borrow: no available copies.';
        END IF;
    END IF;

    IF v_available = 1 AND v_pending_pickup = 0 THEN
        SELECT COUNT(*) INTO v_has_reservation
        FROM reservations WHERE book_id = NEW.book_id AND status IN ('pending', 'fulfilled');
        IF v_has_reservation > 0 THEN
            SELECT COUNT(*) INTO v_user_reserved
            FROM reservations WHERE book_id = NEW.book_id AND user_id = NEW.user_id AND status IN ('pending', 'fulfilled');
            IF v_user_reserved = 0 THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot borrow: this copy is reserved for another member.';
            END IF;
        END IF;
    END IF;

    SELECT COUNT(*) INTO v_duplicate
    FROM borrowings WHERE user_id = NEW.user_id AND book_id = NEW.book_id AND status NOT IN ('returned', 'lost');
    IF v_duplicate > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot borrow: you already have an active borrow for this book.';
    END IF;

    SELECT COUNT(*) INTO v_active_borrows
    FROM borrowings WHERE user_id = NEW.user_id AND status NOT IN ('returned', 'lost');
    IF v_active_borrows >= 5 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot borrow: maximum simultaneous borrow limit (5) reached.';
    END IF;
END$$

CREATE TRIGGER trg_after_borrow_insert
AFTER INSERT ON borrowings
FOR EACH ROW
BEGIN
    DECLARE new_available SMALLINT UNSIGNED;
    DECLARE has_reservations INT UNSIGNED;
    DECLARE has_pending_reservation INT UNSIGNED DEFAULT 0;

    SELECT COUNT(*) INTO has_pending_reservation
    FROM reservations 
    WHERE book_id = NEW.book_id AND user_id = NEW.user_id AND status = 'pending';

    IF has_pending_reservation = 0 THEN
        UPDATE books SET available_copies = available_copies - 1 WHERE book_id = NEW.book_id;
    END IF;

    UPDATE books SET total_borrow_count = total_borrow_count + 1 WHERE book_id = NEW.book_id;

    SELECT available_copies INTO new_available FROM books WHERE book_id = NEW.book_id;
    SELECT COUNT(*) INTO has_reservations FROM reservations WHERE book_id = NEW.book_id AND status = 'pending';

    IF new_available > 0 THEN
        UPDATE books SET status = 'available' WHERE book_id = NEW.book_id;
    ELSEIF has_reservations > 0 THEN
        UPDATE books SET status = 'reserved' WHERE book_id = NEW.book_id;
    ELSE
        UPDATE books SET status = 'checked_out' WHERE book_id = NEW.book_id;
    END IF;

    UPDATE reservations SET status = 'fulfilled'
    WHERE book_id = NEW.book_id AND user_id = NEW.user_id AND status = 'pending';
END$$

CREATE TRIGGER trg_before_borrow_return
BEFORE UPDATE ON borrowings
FOR EACH ROW
BEGIN
    IF NEW.status = 'returned' AND OLD.status != 'returned' AND NEW.returned_at IS NULL THEN
        SET NEW.returned_at = NOW();
    END IF;
END$$

CREATE TRIGGER trg_after_borrow_return
AFTER UPDATE ON borrowings
FOR EACH ROW
BEGIN
    DECLARE v_next_res_id INT UNSIGNED DEFAULT NULL;
    DECLARE v_next_user_id INT UNSIGNED DEFAULT NULL;
    DECLARE v_days_late INT DEFAULT 0;
    DECLARE v_final_fine DECIMAL(10,2) DEFAULT 0.00;

    IF NEW.status = 'returned' AND OLD.status != 'returned' THEN
        SELECT reservation_id, user_id INTO v_next_res_id, v_next_user_id
        FROM reservations WHERE book_id = NEW.book_id AND status = 'pending'
        ORDER BY reserved_at ASC LIMIT 1;

        IF v_next_user_id IS NOT NULL THEN
            UPDATE books SET available_copies = available_copies + 1 WHERE book_id = NEW.book_id;
            UPDATE reservations SET status = 'fulfilled' WHERE reservation_id = v_next_res_id;
        ELSE
            UPDATE books SET available_copies = available_copies + 1, status = 'available' WHERE book_id = NEW.book_id;
        END IF;

        SET v_days_late = GREATEST(DATEDIFF(NEW.returned_at, NEW.due_date), 0);
        SET v_final_fine = v_days_late * 5.00;

        INSERT INTO borrow_history (borrow_id, user_id, book_id, issued_by, issued_at, due_date,
            returned_at, returned_to, renewal_count, return_condition, fine_amount, fine_status)
        VALUES (NEW.borrow_id, NEW.user_id, NEW.book_id, NEW.issued_by, NEW.issued_at, NEW.due_date,
            NEW.returned_at, NULL, NEW.renewal_count, 'good', v_final_fine,
            CASE WHEN v_final_fine > 0 THEN 'unpaid' ELSE 'none' END);
    END IF;
END$$

CREATE TRIGGER trg_membership_activate
AFTER UPDATE ON memberships
FOR EACH ROW
BEGIN
    IF NEW.status = 'active' AND OLD.status != 'active' THEN
        UPDATE users SET role = 'member' WHERE user_id = NEW.user_id;
    END IF;
END$$

CREATE TRIGGER trg_membership_deactivate
AFTER UPDATE ON memberships
FOR EACH ROW
BEGIN
    DECLARE v_other_active INT DEFAULT 0;
    IF OLD.status = 'active' AND NEW.status IN ('expired', 'cancelled') THEN
        SELECT COUNT(*) INTO v_other_active
        FROM memberships WHERE user_id = NEW.user_id AND status = 'active' AND membership_id != NEW.membership_id;
        IF v_other_active = 0 THEN
            UPDATE users SET role = 'guest' WHERE user_id = NEW.user_id;
        END IF;
    END IF;
END$$

DELIMITER ;

-- EVENTS

CREATE EVENT IF NOT EXISTS evt_mark_overdue
ON SCHEDULE EVERY 1 DAY STARTS (CURRENT_DATE + INTERVAL 1 DAY)
DO UPDATE borrowings SET status = 'overdue' WHERE due_date < CURDATE() AND status = 'borrowed';

DELIMITER $$

CREATE EVENT IF NOT EXISTS evt_expire_reservations
ON SCHEDULE EVERY 1 HOUR
DO
BEGIN
    UPDATE books b
    INNER JOIN reservations r ON b.book_id = r.book_id
    SET b.available_copies = b.available_copies + 1
    WHERE r.status = 'pending' AND r.expires_at < NOW() AND b.available_copies < b.total_copies;

    UPDATE reservations SET status = 'expired'
    WHERE status = 'pending' AND expires_at < NOW();
END$$

DELIMITER ;

CREATE EVENT IF NOT EXISTS evt_expire_memberships
ON SCHEDULE EVERY 1 DAY STARTS (CURRENT_DATE + INTERVAL 1 DAY)
DO UPDATE memberships SET status = 'expired' WHERE status = 'active' AND expiry_date < CURDATE();

-- VIEWS

CREATE VIEW vw_active_borrowings AS
SELECT b.borrow_id, u.user_id, u.full_name AS member_name, u.email AS member_email,
       bk.book_id, bk.title AS book_title, bk.author, bk.cover_image,
       b.issued_at, b.due_date, DATEDIFF(CURDATE(), b.due_date) AS days_overdue,
       b.renewal_count, b.renewal_status, b.status,
       ROUND(GREATEST(DATEDIFF(CURDATE(), b.due_date), 0) * 5.00, 2) AS current_fine, b.fine_status
FROM borrowings b
JOIN users u ON b.user_id = u.user_id
JOIN books bk ON b.book_id = bk.book_id
WHERE b.status NOT IN ('returned', 'lost');

CREATE VIEW vw_borrow_history AS
SELECT bh.history_id, bh.borrow_id, bh.user_id, u.full_name AS member_name, u.email AS member_email,
       bh.book_id, bk.title AS book_title, bk.author, bk.genre, bk.cover_image,
       bh.issued_at, bh.due_date, bh.returned_at, bh.renewal_count,
       bh.return_condition, bh.days_borrowed, bh.was_overdue, bh.fine_amount, bh.fine_status
FROM borrow_history bh
JOIN users u ON bh.user_id = u.user_id
JOIN books bk ON bh.book_id = bk.book_id
ORDER BY bh.returned_at DESC;

CREATE VIEW vw_book_catalogue AS
SELECT b.book_id, b.title, b.author, b.isbn, b.genre, b.publisher, b.published_year,
       b.language, b.total_copies, b.available_copies, b.status, b.total_borrow_count,
       b.description, b.cover_image,
       ROUND(IFNULL(AVG(r.rating), 0), 1) AS avg_rating, COUNT(r.review_id) AS total_reviews
FROM books b
LEFT JOIN reviews r ON b.book_id = r.book_id
WHERE b.is_archived = FALSE
GROUP BY b.book_id, b.description, b.cover_image;

CREATE VIEW vw_user_membership AS
SELECT u.user_id, u.full_name, u.email, u.role, m.membership_id, m.duration_months,
       m.start_date, m.expiry_date, DATEDIFF(m.expiry_date, CURDATE()) AS days_remaining,
       m.status AS membership_status, m.payment_status, m.card_number, m.card_issued_at
FROM users u
LEFT JOIN memberships m ON u.user_id = m.user_id AND m.status = 'active';

CREATE VIEW vw_overdue_borrowings AS
SELECT b.borrow_id, u.user_id, u.full_name, u.email, bk.title, b.due_date,
       DATEDIFF(CURDATE(), b.due_date) AS days_overdue,
       ROUND(DATEDIFF(CURDATE(), b.due_date) * 5.00, 2) AS current_fine, b.fine_status
FROM borrowings b
JOIN users u ON b.user_id = u.user_id
JOIN books bk ON b.book_id = bk.book_id
WHERE b.due_date < CURDATE() AND b.status NOT IN ('returned', 'lost');

CREATE VIEW vw_trending_books AS
SELECT t.trend_rank, t.book_id, b.title, b.author, b.genre, b.cover_image, b.description,
       b.available_copies, b.status, t.borrow_count, t.period_start, t.period_end,
       COALESCE(ROUND(AVG(r.rating), 1), 0) AS avg_rating, COUNT(DISTINCT r.review_id) AS total_reviews
FROM trending_books t
JOIN books b ON t.book_id = b.book_id
LEFT JOIN reviews r ON b.book_id = r.book_id
GROUP BY t.trend_rank, t.book_id, b.title, b.author, b.genre, b.cover_image, b.description,
         b.available_copies, b.status, t.borrow_count, t.period_start, t.period_end
ORDER BY t.trend_rank ASC;

CREATE VIEW vw_new_arrivals AS
SELECT b.book_id, b.title, b.author, b.genre, b.cover_image, b.description,
       b.available_copies, b.status, b.created_at,
       ROUND(IFNULL(AVG(r.rating), 0), 1) AS avg_rating, COUNT(DISTINCT r.review_id) AS total_reviews,
       DATEDIFF(NOW(), b.created_at) AS days_since_added
FROM books b
LEFT JOIN reviews r ON b.book_id = r.book_id
WHERE b.is_archived = FALSE AND b.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY b.book_id
ORDER BY b.created_at DESC;

CREATE VIEW vw_recommendations AS
SELECT rec.user_id, rec.similarity_score, b.book_id, b.title, b.author, b.genre,
       b.cover_image, b.description, b.available_copies, b.status,
       ROUND(IFNULL(AVG(r.rating), 0), 1) AS avg_rating
FROM recommendations rec
JOIN books b ON rec.book_id = b.book_id
LEFT JOIN reviews r ON b.book_id = r.book_id
GROUP BY rec.recommendation_id, rec.user_id, rec.similarity_score,
         b.book_id, b.title, b.author, b.genre, b.cover_image, b.available_copies, b.status
ORDER BY rec.similarity_score DESC;

CREATE VIEW vw_member_summary AS
SELECT u.user_id, u.full_name, u.email, u.role, m.expiry_date AS membership_expiry,
       DATEDIFF(m.expiry_date, CURDATE()) AS membership_days_left, m.status AS membership_status,
       IFNULL(bc.active_borrows, 0) AS active_borrows, IFNULL(bc.overdue_count, 0) AS overdue_count,
       ROUND(IFNULL((SELECT SUM(GREATEST(DATEDIFF(CURDATE(), b2.due_date), 0)) * 5.00
           FROM borrowings b2 WHERE b2.user_id = u.user_id AND b2.fine_status IN ('none', 'unpaid')
           AND b2.due_date < CURDATE() AND b2.status NOT IN ('returned', 'lost')), 0), 2) AS unpaid_fine_total,
       IFNULL(hist.total_books_read, 0) AS total_books_read
FROM users u
LEFT JOIN memberships m ON u.user_id = m.user_id AND m.status = 'active'
LEFT JOIN (SELECT user_id, COUNT(*) AS active_borrows,
                  SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) AS overdue_count
           FROM borrowings WHERE status NOT IN ('returned', 'lost') GROUP BY user_id) bc ON u.user_id = bc.user_id
LEFT JOIN (SELECT user_id, COUNT(*) AS total_books_read FROM borrow_history GROUP BY user_id) hist ON u.user_id = hist.user_id;

-- DONE
SELECT 'Database deployment complete!' AS status;