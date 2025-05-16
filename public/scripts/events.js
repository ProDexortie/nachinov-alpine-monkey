/**
 * Модуль управления мероприятиями
 * Отвечает за создание, редактирование, удаление и отображение мероприятий
 */

// Элементы интерфейса для работы с мероприятиями
const eventsList = document.getElementById('events-list');
const createEventBtn = document.getElementById('create-event-btn');
const eventModal = new bootstrap.Modal(document.getElementById('event-modal'));
const eventForm = document.getElementById('event-form');
const eventId = document.getElementById('event-id');
const eventName = document.getElementById('event-name');
const eventDate = document.getElementById('event-date');
const eventTime = document.getElementById('event-time');
const eventDescription = document.getElementById('event-description');
const eventNotifications = document.getElementById('event-notifications');
const saveEventBtn = document.getElementById('save-event-btn');
const eventModalTitle = document.getElementById('event-modal-title');

// Коллекция для хранения всех мероприятий пользователя
let userEvents = [];

/**
 * Инициализация обработчиков событий для управления мероприятиями
 */
function initEventsListeners() {
    // Обработка нажатия на кнопку создания мероприятия
    createEventBtn.addEventListener('click', function() {
        openEventModal();
    });
    
    // Обработка нажатия на кнопку сохранения мероприятия
    saveEventBtn.addEventListener('click', function() {
        saveEvent();
    });
}

/**
 * Загрузка мероприятий пользователя из Firestore
 */
function loadUserEvents() {
    if (!currentUser) return;
    
    // Показать индикатор загрузки
    showLoading(true);
    
    // Очищаем список мероприятий
    userEvents = [];
    
    // Получаем мероприятия пользователя из Firestore
    db.collection('events')
        .where('userId', '==', currentUser.uid)
        .orderBy('date', 'asc')
        .get()
        .then(function(querySnapshot) {
            querySnapshot.forEach(function(doc) {
                const event = {
                    id: doc.id,
                    ...doc.data()
                };
                
                userEvents.push(event);
            });
            
            // Отображаем мероприятия
            renderEvents();
        })
        .catch(function(error) {
            console.error('Ошибка загрузки мероприятий:', error);
            showToast('Ошибка при загрузке мероприятий', 'error');
        })
        .finally(function() {
            // Скрыть индикатор загрузки
            showLoading(false);
        });
}

/**
 * Отображение списка мероприятий
 */
function renderEvents() {
    // Очищаем контейнер списка мероприятий
    eventsList.innerHTML = '';
    
    if (userEvents.length === 0) {
        // Если нет мероприятий, показываем сообщение
        eventsList.innerHTML = `
            <div class="col-12 text-center py-5">
                <p class="text-muted">У вас пока нет созданных мероприятий.</p>
                <button class="btn btn-primary mt-3" onclick="openEventModal()">Создать мероприятие</button>
            </div>
        `;
        return;
    }
    
    // Отображаем мероприятия
    userEvents.forEach(function(event) {
        const eventElement = createEventElement(event);
        eventsList.appendChild(eventElement);
    });
}

/**
 * Создание элемента для отображения мероприятия
 * @param {Object} event - Объект мероприятия
 * @returns {HTMLElement} Элемент для отображения мероприятия
 */
function createEventElement(event) {
    const col = document.createElement('div');
    col.className = 'col-md-4 mb-4';
    
    // Форматирование даты и времени
    const eventDateTime = new Date(event.date);
    
    // Добавляем время к дате события
    if (event.time) {
        const [hours, minutes] = event.time.split(':');
        eventDateTime.setHours(parseInt(hours, 10));
        eventDateTime.setMinutes(parseInt(minutes, 10));
    }
    
    const formattedDate = formatDate(eventDateTime);
    const formattedTime = event.time || '00:00';
    
    // Проверка, прошло ли мероприятие
    const now = new Date();
    console.log(`Сравнение времени - Событие: ${eventDateTime}, Текущее: ${now}`);
    const isPast = eventDateTime < now;
    const statusClass = isPast ? 'text-muted' : 'text-success';
    const statusText = isPast ? 'Прошедшее' : 'Предстоящее';
    
    col.innerHTML = `
        <div class="card event-card">
            <div class="card-body">
                <h5 class="card-title">${event.name}</h5>
                <h6 class="card-subtitle mb-2 event-date">
                    <i class="bi bi-calendar-event"></i> ${formattedDate}, ${formattedTime}
                </h6>
                <p class="card-text">${event.description || 'Нет описания'}</p>
                <div class="d-flex justify-content-between align-items-center">
                    <span class="${statusClass}">
                        <i class="bi bi-circle-fill me-1"></i> ${statusText}
                    </span>
                    <div class="notification-status">
                        <i class="bi ${event.notifications ? 'bi-bell notification-on' : 'bi-bell-slash notification-off'}"></i>
                    </div>
                </div>
                <div class="event-actions mt-3">
                    <button class="btn btn-sm btn-outline-primary edit-event-btn" data-event-id="${event.id}">
                        Редактировать
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-event-btn" data-event-id="${event.id}">
                        Удалить
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Добавляем обработчики событий для кнопок редактирования и удаления
    col.querySelector('.edit-event-btn').addEventListener('click', function() {
        const eventId = this.getAttribute('data-event-id');
        editEvent(eventId);
    });
    
    col.querySelector('.delete-event-btn').addEventListener('click', function() {
        const eventId = this.getAttribute('data-event-id');
        deleteEvent(eventId);
    });
    
    return col;
}

/**
 * Открытие модального окна для создания/редактирования мероприятия
 * @param {Object} [eventData=null] - Данные мероприятия для редактирования (null для создания нового)
 */
function openEventModal(eventData = null) {
    // Сбрасываем форму
    eventForm.reset();
    
    // Очищаем список участников
    if (typeof currentParticipants !== 'undefined') {
        currentParticipants = [];
    }
    
    if (eventData) {
        // Редактирование существующего мероприятия
        eventModalTitle.textContent = 'Редактирование мероприятия';
        
        // Заполняем форму данными мероприятия
        eventId.value = eventData.id;
        eventName.value = eventData.name;
        
        // Форматируем дату для ввода в формате YYYY-MM-DD
        const eventDateTime = new Date(eventData.date);
        const year = eventDateTime.getFullYear();
        const month = String(eventDateTime.getMonth() + 1).padStart(2, '0');
        const day = String(eventDateTime.getDate()).padStart(2, '0');
        eventDate.value = `${year}-${month}-${day}`;
        
        eventTime.value = eventData.time || '';
        eventDescription.value = eventData.description || '';
        eventNotifications.checked = eventData.notifications !== false;
        
        // Загружаем участников, если функция существует
        if (typeof loadParticipants === 'function') {
            loadParticipants(eventData.id);
        }
        
        // Активируем вкладку информации по умолчанию
        const infoTab = document.getElementById('event-info-tab');
        if (infoTab) {
            infoTab.click();
        }
    } else {
        // Создание нового мероприятия
        eventModalTitle.textContent = 'Новое мероприятие';
        eventId.value = '';
        
        // Устанавливаем текущую дату
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        eventDate.value = `${year}-${month}-${day}`;
        
        // Устанавливаем текущее время
        const hours = String(today.getHours()).padStart(2, '0');
        const minutes = String(today.getMinutes()).padStart(2, '0');
        eventTime.value = `${hours}:${minutes}`;
        
        // Отключаем вкладки участников и отметки посещения для нового мероприятия
        const participantsTab = document.getElementById('event-participants-tab');
        const attendanceTab = document.getElementById('event-attendance-tab');
        
        if (participantsTab) {
            participantsTab.classList.add('disabled');
            participantsTab.setAttribute('disabled', 'disabled');
        }
        
        if (attendanceTab) {
            attendanceTab.classList.add('disabled');
            attendanceTab.setAttribute('disabled', 'disabled');
        }
        
        // Показываем сообщение для QR-кода
        const qrCodeContainer = document.getElementById('qr-code-image');
        if (qrCodeContainer) {
            qrCodeContainer.innerHTML = '<p class="text-muted">QR-код будет сгенерирован после сохранения мероприятия</p>';
        }
        
        // Блокируем кнопку скачивания QR-кода
        const downloadQrBtn = document.getElementById('download-qr-btn');
        if (downloadQrBtn) {
            downloadQrBtn.disabled = true;
        }
    }
    
    // Открываем модальное окно
    eventModal.show();
}

/**
 * Сохранение мероприятия
 */
function saveEvent() {
    // Проверяем валидность формы
    if (!eventForm.checkValidity()) {
        // Если форма невалидна, отображаем сообщение об ошибке
        showToast('Заполните все обязательные поля', 'error');
        return;
    }
    
    // Показать индикатор загрузки
    showLoading(true);
    
    // Получаем данные формы
    const id = eventId.value;
    const name = eventName.value;
    const date = eventDate.value;
    const time = eventTime.value;
    const description = eventDescription.value;
    const notifications = eventNotifications.checked;
    
    // Формируем объект мероприятия
    const eventData = {
        name: name,
        date: new Date(date).toISOString(),
        time: time,
        description: description,
        notifications: notifications,
        userId: currentUser.uid,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Сохраняем мероприятие в Firestore
    let savePromise;
    
    if (id) {
        // Обновление существующего мероприятия
        savePromise = db.collection('events').doc(id).update(eventData);
    } else {
        // Создание нового мероприятия
        eventData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        savePromise = db.collection('events').add(eventData);
    }
    
    savePromise
        .then(function() {
            // Закрываем модальное окно
            eventModal.hide();
            
            // Обновляем список мероприятий
            loadUserEvents();
            
            // Показываем сообщение об успешном сохранении
            showToast(`Мероприятие успешно ${id ? 'обновлено' : 'создано'}`, 'success');
        })
        .catch(function(error) {
            console.error('Ошибка сохранения мероприятия:', error);
            showToast('Ошибка при сохранении мероприятия', 'error');
        })
        .finally(function() {
            // Скрыть индикатор загрузки
            showLoading(false);
        });
}

/**
 * Редактирование мероприятия
 * @param {string} eventId - ID мероприятия для редактирования
 */
function editEvent(eventId) {
    // Находим мероприятие по ID
    const eventToEdit = userEvents.find(event => event.id === eventId);
    
    if (eventToEdit) {
        // Открываем модальное окно для редактирования мероприятия
        openEventModal(eventToEdit);
    } else {
        showToast('Мероприятие не найдено', 'error');
    }
}

/**
 * Удаление мероприятия
 * @param {string} eventId - ID мероприятия для удаления
 */
function deleteEvent(eventId) {
    // Подтверждение удаления
    if (!confirm('Вы уверены, что хотите удалить это мероприятие?')) {
        return;
    }
    
    // Показать индикатор загрузки
    showLoading(true);
    
    // Удаляем мероприятие из Firestore
    db.collection('events').doc(eventId).delete()
        .then(function() {
            // Обновляем список мероприятий
            loadUserEvents();
            
            // Показываем сообщение об успешном удалении
            showToast('Мероприятие успешно удалено', 'success');
        })
        .catch(function(error) {
            console.error('Ошибка удаления мероприятия:', error);
            showToast('Ошибка при удалении мероприятия', 'error');
        })
        .finally(function() {
            // Скрыть индикатор загрузки
            showLoading(false);
        });
}

/**
 * Получение ближайших событий
 * @param {number} days - Количество дней для фильтрации (по умолчанию 7 дней)
 * @returns {Array} Массив ближайших событий
 */
function getUpcomingEvents(days = 7) {
    // Текущая дата
    const now = new Date();
    
    // Дата окончания периода
    const endDate = new Date();
    endDate.setDate(now.getDate() + days);
    
    // Фильтруем события по дате
    return userEvents.filter(function(event) {
        const eventDate = new Date(event.date);
        return eventDate >= now && eventDate <= endDate;
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
    if (!userNotifications.email && !userNotifications.push) {
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
            // Отправляем уведомление
            sendEventNotification(event, 'upcoming_24h');
        }
        
        // Если до события осталось менее 1 часа и более 30 минут, отправляем уведомление
        if (hoursDiff <= 1 && hoursDiff > 0.5) {
            // Отправляем уведомление
            sendEventNotification(event, 'upcoming_1h');
        }
    });
}

/**
 * Отправка уведомления о событии
 * @param {Object} event - Объект события
 * @param {string} type - Тип уведомления ('upcoming_24h', 'upcoming_1h')
 */
function sendEventNotification(event, type) {
    // Формируем сообщение в зависимости от типа уведомления
    let message = '';
    
    switch (type) {
        case 'upcoming_24h':
            message = `Напоминание: мероприятие "${event.name}" состоится завтра в ${event.time || '00:00'}.`;
            break;
        case 'upcoming_1h':
            message = `Напоминание: мероприятие "${event.name}" начнется через час.`;
            break;
        default:
            message = `Напоминание о мероприятии "${event.name}".`;
    }
    
    // Проверяем настройки уведомлений пользователя
    const userNotifications = currentUser.userData.notifications || {};
    
    // Отправляем уведомление через email, если включено
    if (userNotifications.email) {
        // В реальном приложении здесь будет вызов Cloud Function для отправки email
        console.log(`Отправка email-уведомления: ${message}`);
        
        // Для демонстрации просто показываем уведомление в интерфейсе
        showToast(message, 'info');
    }
    
    // Отправляем push-уведомление, если включено
    if (userNotifications.push) {
        // В реальном приложении здесь будет вызов FCM для отправки push-уведомления
        console.log(`Отправка push-уведомления: ${message}`);
        
        // Для демонстрации можно использовать Notification API браузера
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Система уведомлений мероприятий', {
                body: message,
                icon: '/favicon.ico'
            });
        }
    }
}