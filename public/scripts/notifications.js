/**
 * Модуль уведомлений
 * Отвечает за настройку и управление уведомлениями
 * Адаптирован для работы без Firebase Cloud Messaging
 */

// Элементы интерфейса для работы с уведомлениями
const notificationEmailToggle = document.getElementById('notification-email-toggle');
const notificationPushToggle = document.getElementById('notification-push-toggle');
const saveProfileBtn = document.getElementById('save-profile-btn');

// Коллекция для хранения уведомлений
let userNotifications = [];

/**
 * Инициализация обработчиков событий для настроек уведомлений
 */
function initNotificationsListeners() {
    // Обработка сохранения настроек профиля
    saveProfileBtn.addEventListener('click', function() {
        saveNotificationSettings();
    });
    
    // Запрос разрешения на отправку уведомлений в браузере
    requestNotificationPermission();
    
    // Загрузка существующих уведомлений
    loadUserNotifications();
    
    // Запускаем периодическую проверку уведомлений (каждую минуту)
    setInterval(checkNotifications, 60000);
}

/**
 * Загрузка уведомлений пользователя
 */
function loadUserNotifications() {
    if (!currentUser) return;
    
    // Очищаем массив уведомлений
    userNotifications = [];
    
    // Получаем уведомления из локального хранилища
    const storedNotifications = localStorage.getItem(`notifications_${currentUser.uid}`);
    
    if (storedNotifications) {
        try {
            userNotifications = JSON.parse(storedNotifications);
        } catch (error) {
            console.error('Ошибка при загрузке уведомлений:', error);
        }
    }
}

/**
 * Сохранение уведомления
 * @param {Object} notification - Объект уведомления для сохранения
 */
function saveNotification(notification) {
    if (!currentUser) return;
    
    // Добавляем новое уведомление в массив
    userNotifications.push(notification);
    
    // Ограничиваем количество хранимых уведомлений (последние 50)
    if (userNotifications.length > 50) {
        userNotifications = userNotifications.slice(-50);
    }
    
    // Сохраняем в локальное хранилище
    localStorage.setItem(`notifications_${currentUser.uid}`, JSON.stringify(userNotifications));
}

/**
 * Запрос разрешения на отправку браузерных уведомлений
 */
function requestNotificationPermission() {
    // Проверяем поддержку Notification API
    if ('Notification' in window) {
        // Если уже есть разрешение, ничего не делаем
        if (Notification.permission === 'granted') {
            return;
        }
        
        // Если уже есть запрет, отключаем переключатель
        if (Notification.permission === 'denied') {
            notificationPushToggle.checked = false;
            notificationPushToggle.disabled = true;
            return;
        }
        
        // Запрашиваем разрешение при клике на переключатель
        notificationPushToggle.addEventListener('change', function() {
            if (this.checked && Notification.permission !== 'granted') {
                Notification.requestPermission().then(function(permission) {
                    if (permission !== 'granted') {
                        // Если пользователь отказал, отключаем переключатель
                        notificationPushToggle.checked = false;
                    }
                });
            }
        });
    } else {
        // Если браузер не поддерживает Notification API, отключаем переключатель
        notificationPushToggle.checked = false;
        notificationPushToggle.disabled = true;
    }
}

/**
 * Сохранение настроек уведомлений пользователя
 */
function saveNotificationSettings() {
    if (!currentUser) return;
    
    // Показать индикатор загрузки
    showLoading(true);
    
    // Получаем настройки уведомлений
    const emailNotifications = notificationEmailToggle.checked;
    const pushNotifications = notificationPushToggle.checked;
    
    // Обновляем настройки в Firestore
    db.collection('users').doc(currentUser.uid).update({
        'notifications.email': emailNotifications,
        'notifications.browser': pushNotifications,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(function() {
        // Обновляем локальные данные пользователя
        if (currentUser.userData) {
            currentUser.userData.notifications = {
                email: emailNotifications,
                browser: pushNotifications
            };
        }
        
        // Показываем сообщение об успешном сохранении
        showToast('Настройки уведомлений сохранены', 'success');
    })
    .catch(function(error) {
        console.error('Ошибка сохранения настроек уведомлений:', error);
        showToast('Ошибка при сохранении настроек', 'error');
    })
    .finally(function() {
        // Скрыть индикатор загрузки
        showLoading(false);
    });
}

/**
 * Отправка браузерного уведомления
 * @param {string} title - Заголовок уведомления
 * @param {string} body - Текст уведомления
 */
function sendBrowserNotification(title, body) {
    // Проверяем разрешения
    if ('Notification' in window && Notification.permission === 'granted') {
        // Отправляем уведомление
        const notification = new Notification(title, {
            body: body,
            icon: '/favicon.ico'
        });
        
        // Обработка клика по уведомлению
        notification.onclick = function() {
            window.focus();
            this.close();
        };
    }
}

/**
 * Отправка уведомления по электронной почте
 * Эта функция эмулирует отправку email, в реальном приложении 
 * здесь должен быть запрос к API для отправки писем
 * @param {string} email - Email получателя
 * @param {string} subject - Тема письма
 * @param {string} message - Текст письма
 */
function sendEmailNotification(email, subject, message) {
    console.log(`Эмуляция отправки email на ${email}`);
    console.log(`Тема: ${subject}`);
    console.log(`Сообщение: ${message}`);
    
    // В реальном приложении здесь был бы запрос к API для отправки email
    // Но поскольку мы отказываемся от использования Cloud Functions,
    // здесь просто эмулируем успешную отправку
    
    // Можно использовать сторонние сервисы отправки email через их API
    // например, SendGrid, Mailgun, или даже запрос к собственному серверу
    
    // Для учебного проекта достаточно просто показать уведомление в интерфейсе
    showToast(`Email уведомление отправлено: ${subject}`, 'info');
    
    // Сохраняем запись о отправленном уведомлении
    saveNotification({
        eventId: 'example-event',
        type: 'email',
        subject: subject,
        message: message,
        sentAt: new Date().toISOString(),
        status: 'sent'
    });
}

/**
 * Проверка на необходимость отправки уведомлений
 * Вызывается периодически для проверки наличия событий для отправки уведомлений
 */
function checkNotifications() {
    if (!currentUser || !currentUser.userData) return;
    
    // Проверяем настройки уведомлений пользователя
    const userNotifications = currentUser.userData.notifications || {};
    
    // Если уведомления отключены, выходим
    if (!userNotifications.email && !userNotifications.browser) {
        return;
    }
    
    // Получаем ближайшие события (на 24 часа)
    const upcomingEvents = getUpcomingEvents(1);
    
    // Для каждого события проверяем необходимость отправки уведомления
    upcomingEvents.forEach(function(event) {
        // Если для события отключены уведомления, пропускаем
        if (event.notifications === false) {
            return;
        }
        
        // Получаем дату и время события
        const eventDateTime = new Date(event.date);
        if (event.time) {
            const [hours, minutes] = event.time.split(':');
            eventDateTime.setHours(parseInt(hours, 10));
            eventDateTime.setMinutes(parseInt(minutes, 10));
        }
        
        // Текущее время
        const now = new Date();
        
        // Разница во времени в миллисекундах
        const timeDiff = eventDateTime.getTime() - now.getTime();
        
        // Разница во времени в часах
        const hoursDiff = timeDiff / (1000 * 60 * 60);
        
        // Если до события осталось менее 24 часов и более 23 часов, отправляем уведомление
        // (таким образом уведомление отправится только один раз в день)
        if (hoursDiff <= 24 && hoursDiff > 23) {
            // Формируем сообщение
            const subject = `Напоминание о мероприятии "${event.name}" завтра`;
            const message = `Напоминаем, что завтра в ${event.time || '00:00'} состоится мероприятие "${event.name}".`;
            
            // Отправляем уведомления в зависимости от настроек
            sendEventNotification(event, subject, message);
        }
        
        // Если до события осталось менее 1 часа и более 30 минут, отправляем уведомление
        if (hoursDiff <= 1 && hoursDiff > 0.5) {
            // Формируем сообщение
            const subject = `Мероприятие "${event.name}" через час`;
            const message = `Напоминаем, что через час в ${event.time || '00:00'} состоится мероприятие "${event.name}".`;
            
            // Отправляем уведомления в зависимости от настроек
            sendEventNotification(event, subject, message);
        }
    });
}

/**
 * Отправка уведомления о событии
 * @param {Object} event - Объект события
 * @param {string} subject - Тема уведомления
 * @param {string} message - Текст уведомления
 */
function sendEventNotification(event, subject, message) {
    // Проверяем настройки уведомлений пользователя
    const userNotifications = currentUser.userData.notifications || {};
    
    // Отправляем уведомление через email, если включено
    if (userNotifications.email) {
        sendEmailNotification(currentUser.email, subject, message);
    }
    
    // Отправляем браузерное уведомление, если включено
    if (userNotifications.browser) {
        sendBrowserNotification(subject, message);
    }
    
    // Также показываем уведомление в интерфейсе
    showToast(message, 'info');
    
    // Дополнительно для тестирования - имитируем отправку через 3 секунды
    if (event.time) {
        // Специально для тестирования - отправляем уведомление через 3 секунды
        setTimeout(() => {
            sendBrowserNotification(
                `Тестовое напоминание: ${event.name}`,
                `Это тестовое уведомление о мероприятии "${event.name}", которое начнется в ${event.time}`
            );
            showToast(`Тестовое напоминание о мероприятии "${event.name}"`, 'info');
        }, 3000);
    }
}