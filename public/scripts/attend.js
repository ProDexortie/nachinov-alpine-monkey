/**
 * Скрипт для страницы отметки посещения мероприятия
 * Позволяет отмечать посещение без необходимости регистрации
 */

// Проверка и инициализация Firebase
try {
    console.log('Инициализация Firebase для страницы отметки посещения...');
    
    // Проверяем наличие Firebase
    if (typeof firebase === 'undefined') {
        console.error('Firebase не найден. Подключите Firebase SDK.');
        throw new Error('Firebase не инициализирован');
    }
    
    // Проверяем, был ли Firebase уже инициализирован
    if (firebase.apps.length === 0) {
        // Проверяем наличие конфигурации Firebase
        if (typeof firebaseConfig === 'undefined' && window.ENV) {
            console.log('Используем конфигурацию из переменных окружения');
            // Если конфигурация не определена, но есть переменные окружения,
            // создаем конфигурацию из них
            window.firebaseConfig = {
                apiKey: window.ENV.FIREBASE_API_KEY,
                authDomain: window.ENV.FIREBASE_AUTH_DOMAIN,
                projectId: window.ENV.FIREBASE_PROJECT_ID,
                storageBucket: window.ENV.FIREBASE_STORAGE_BUCKET,
                messagingSenderId: window.ENV.FIREBASE_MESSAGING_SENDER_ID,
                appId: window.ENV.FIREBASE_APP_ID
            };
        }
        
        // Проверяем наличие конфигурации
        if (typeof firebaseConfig !== 'undefined') {
            // Инициализируем Firebase с конфигурацией
            firebase.initializeApp(firebaseConfig);
            console.log('Firebase инициализирован успешно');
        } else {
            throw new Error('Конфигурация Firebase не найдена');
        }
    } else {
        console.log('Firebase уже инициализирован');
    }
    
    // Убедимся, что db доступна
    if (typeof db === 'undefined') {
        console.log('Инициализируем Firestore...');
        window.db = firebase.firestore();
    }
    
    console.log('Firestore готов к использованию');
} catch (error) {
    console.error('Ошибка настройки Firebase:', error);
}

// Элементы интерфейса
const eventTitle = document.getElementById('event-title');
const eventName = document.getElementById('event-name');
const eventDate = document.getElementById('event-date');
const eventDescription = document.getElementById('event-description');
const attendanceForm = document.getElementById('attendance-form');
const attendeeName = document.getElementById('attendee-name');
const attendeeEmail = document.getElementById('attendee-email');
const markAttendanceBtn = document.getElementById('mark-attendance-btn');
const attendanceFormContainer = document.getElementById('attendance-form-container');
const successMessage = document.getElementById('success-message');
const errorMessage = document.getElementById('error-message');
const errorText = document.getElementById('error-text');

// Объект мероприятия
let eventData = null;
// ID мероприятия из URL
let eventId = null;

/**
 * Инициализация страницы при загрузке
 */
document.addEventListener('DOMContentLoaded', function() {
    console.log('Страница отметки посещения загружена');
    
    // Проверяем наличие Firestore
    if (typeof db === 'undefined') {
        console.error('Firestore не инициализирован!');
        showError('Ошибка загрузки компонентов приложения. Пожалуйста, обновите страницу или обратитесь к администратору.');
        return;
    }
    
    // Получаем ID мероприятия из URL
    eventId = getEventIdFromUrl();
    
    if (!eventId) {
        showError('Некорректный URL. Идентификатор мероприятия не найден.');
        return;
    }
    
    // Загружаем данные мероприятия
    loadEventData(eventId);
    
    // Инициализируем обработчики событий
    initEventHandlers();
});

/**
 * Получение ID мероприятия из URL
 * @returns {string|null} ID мероприятия или null, если не найден
 */
function getEventIdFromUrl() {
    // Получаем текущий URL
    const url = window.location.href;
    console.log('Текущий URL:', url);
    
    // Проверяем, содержит ли URL путь /attend/
    if (!url.includes('/attend/')) {
        console.log('URL не содержит /attend/');
        return null;
    }
    
    // Извлекаем ID мероприятия из URL
    const eventIdMatch = url.match(/\/attend\/([^\/\?#]+)/);
    console.log('Результат поиска ID:', eventIdMatch);
    
    if (!eventIdMatch || !eventIdMatch[1]) {
        console.log('ID не найден в URL');
        return null;
    }
    
    console.log('Найден ID мероприятия:', eventIdMatch[1]);
    return eventIdMatch[1];
}

/**
 * Загрузка данных мероприятия
 * @param {string} eventId - ID мероприятия
 */
function loadEventData(eventId) {
    console.log('Загрузка данных мероприятия:', eventId);
    
    // Проверяем, инициализированы ли сервисы Firebase
    if (typeof db === 'undefined') {
        console.error('Firestore не инициализирован!');
        showError('Ошибка доступа к данным. Пожалуйста, обновите страницу или обратитесь к администратору.');
        return;
    }
    
    // Получаем данные мероприятия из Firestore
    db.collection('events').doc(eventId).get()
        .then(function(doc) {
            if (!doc.exists) {
                throw new Error('Мероприятие не найдено');
            }
            
            // Сохраняем данные мероприятия
            eventData = {
                id: doc.id,
                ...doc.data()
            };
            
            console.log('Данные мероприятия загружены:', eventData);
            
            // Обновляем интерфейс
            updateEventUI(eventData);
        })
        .catch(function(error) {
            console.error('Ошибка загрузки мероприятия:', error);
            showError('Не удалось загрузить информацию о мероприятии. ' + error.message);
        });
}

/**
 * Обновление интерфейса данными мероприятия
 * @param {Object} eventData - Данные мероприятия
 */
function updateEventUI(eventData) {
    // Обновляем заголовок страницы
    document.title = `Отметка посещения: ${eventData.name}`;
    
    // Обновляем информацию о мероприятии
    eventTitle.textContent = 'Отметка посещения мероприятия';
    eventName.textContent = eventData.name;
    
    // Форматируем дату и время
    const eventDateTime = new Date(eventData.date);
    let dateString = eventDateTime.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    
    if (eventData.time) {
        dateString += `, ${eventData.time}`;
    }
    
    eventDate.textContent = dateString;
    eventDescription.textContent = eventData.description || 'Нет описания';
    
    // Проверяем, прошло ли мероприятие
    const now = new Date();
    const isPast = eventDateTime < now && !isSameDay(eventDateTime, now);
    
    if (isPast) {
        showError('Это мероприятие уже прошло. Отметка посещения недоступна.');
    }
}

/**
 * Проверка, является ли дата текущим днем
 * @param {Date} date - Дата для проверки
 * @param {Date} today - Текущая дата
 * @returns {boolean} true, если даты совпадают по дню
 */
function isSameDay(date, today) {
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
}

/**
 * Инициализация обработчиков событий
 */
function initEventHandlers() {
    // Обработка отправки формы отметки посещения
    attendanceForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Получаем данные из формы
        const name = attendeeName.value.trim();
        const email = attendeeEmail.value.trim();
        
        // Проверяем наличие данных
        if (!name || !email) {
            showError('Пожалуйста, заполните все поля формы');
            return;
        }
        
        // Валидируем email
        if (!validateEmail(email)) {
            showError('Пожалуйста, введите корректный email');
            return;
        }
        
        // Отмечаем посещение
        markAttendance(name, email);
    });
}

/**
 * Отметка посещения мероприятия
 * @param {string} name - Имя участника
 * @param {string} email - Email участника
 */
function markAttendance(name, email) {
    // Проверяем наличие данных о мероприятии
    if (!eventData || !eventId) {
        showError('Данные о мероприятии не загружены');
        return;
    }
    
    // Блокируем форму на время обработки
    setFormLoading(true);
    
    // Проверяем, существует ли участник с таким email
    db.collection('events').doc(eventId)
        .collection('participants')
        .where('email', '==', email)
        .get()
        .then(function(querySnapshot) {
            let participantId = null;
            let isNewParticipant = true;
            
            // Если участник найден
            if (!querySnapshot.empty) {
                const participantDoc = querySnapshot.docs[0];
                participantId = participantDoc.id;
                isNewParticipant = false;
                
                // Проверяем, не отмечен ли уже участник
                const participantData = participantDoc.data();
                if (participantData.status === 'attended') {
                    showSuccess(`Вы уже отмечены как посетивший это мероприятие`);
                    return Promise.reject('already_attended');
                }
                
                // Обновляем данные участника
                return db.collection('events').doc(eventId)
                    .collection('participants')
                    .doc(participantId)
                    .update({
                        name: name, // Обновляем имя
                        status: 'attended',
                        attendedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
            } else {
                // Если участник не найден, создаем нового
                return db.collection('events').doc(eventId)
                    .collection('participants')
                    .add({
                        email: email,
                        name: name,
                        status: 'attended',
                        invitedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        attendedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        eventDate: eventData.date,
                        eventTime: eventData.time || ''
                    });
            }
        })
        .then(function(result) {
            // Добавляем запись в журнал посещений
            return db.collection('events').doc(eventId)
                .collection('attendance_log')
                .add({
                    participantEmail: email,
                    participantName: name,
                    markedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    source: 'Публичная форма'
                });
        })
        .then(function() {
            // Показываем сообщение об успехе
            showSuccess('Ваше присутствие успешно отмечено!');
        })
        .catch(function(error) {
            if (error === 'already_attended') {
                // Это уже обработано выше
                return;
            }
            
            console.error('Ошибка отметки посещения:', error);
            showError('Произошла ошибка при отметке посещения. Пожалуйста, попробуйте снова.');
        })
        .finally(function() {
            // Разблокируем форму
            setFormLoading(false);
        });
}

/**
 * Блокировка/разблокировка формы при загрузке
 * @param {boolean} isLoading - Состояние загрузки
 */
function setFormLoading(isLoading) {
    // Элементы формы
    const formElements = attendanceForm.elements;
    
    // Блокируем/разблокируем все элементы формы
    for (let i = 0; i < formElements.length; i++) {
        formElements[i].disabled = isLoading;
    }
    
    // Меняем текст кнопки
    markAttendanceBtn.textContent = isLoading ? 'Обработка...' : 'Отметить присутствие';
}

/**
 * Отображение сообщения об успехе
 * @param {string} message - Текст сообщения
 */
function showSuccess(message) {
    // Скрываем форму
    attendanceFormContainer.classList.add('d-none');
    
    // Показываем сообщение об успехе
    successMessage.classList.remove('d-none');
    successMessage.querySelector('p').textContent = message;
    
    // Скрываем сообщение об ошибке
    errorMessage.classList.add('d-none');
}

/**
 * Отображение сообщения об ошибке
 * @param {string} message - Текст сообщения
 */
function showError(message) {
    // Показываем сообщение об ошибке
    errorMessage.classList.remove('d-none');
    errorText.textContent = message;
}

/**
 * Валидация email
 * @param {string} email - Email для проверки
 * @returns {boolean} Результат валидации
 */
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}