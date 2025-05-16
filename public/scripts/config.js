/**
 * Конфигурация Firebase для приложения
 * Загружает настройки из переменных окружения
 */

// Функция для получения переменных окружения на Glitch
function getEnvVariable(name, defaultValue = '') {
    // Проверяем, есть ли доступ к переменным окружения на Glitch
    if (typeof window !== 'undefined' && window.ENV && window.ENV[name]) {
        console.log(`Загружена переменная окружения: ${name}`);
        return window.ENV[name];
    }
    
    console.warn(`Не найдена переменная окружения: ${name}, используется значение по умолчанию`);
    // Если переменная не найдена, возвращаем значение по умолчанию
    return defaultValue;
}

// Отладочная информация для проверки переменных окружения
console.log('Доступные переменные окружения:', window.ENV ? Object.keys(window.ENV) : 'window.ENV отсутствует');

// Конфигурация Firebase из переменных окружения
const firebaseConfig = {
    apiKey: getEnvVariable('FIREBASE_API_KEY', 'YOUR_API_KEY'),
    authDomain: getEnvVariable('FIREBASE_AUTH_DOMAIN', 'YOUR_PROJECT_ID.firebaseapp.com'),
    projectId: getEnvVariable('FIREBASE_PROJECT_ID', 'YOUR_PROJECT_ID'),
    storageBucket: getEnvVariable('FIREBASE_STORAGE_BUCKET', 'YOUR_PROJECT_ID.appspot.com'),
    messagingSenderId: getEnvVariable('FIREBASE_MESSAGING_SENDER_ID', 'YOUR_MESSAGING_SENDER_ID'),
    appId: getEnvVariable('FIREBASE_APP_ID', 'YOUR_APP_ID')
};

// Вывод в консоль для отладки конфигурации (без отображения чувствительных данных)
console.log('Firebase настроен:', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain
});

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);

// Инициализация сервисов Firebase
const auth = firebase.auth();
const db = firebase.firestore();

// Настройки для Firestore
db.settings({ 
    timestampsInSnapshots: true,
    merge: true 
});

/**
 * Получить текущее время в формате ISOString
 * @returns {string} Текущая дата и время в формате ISO
 */
function getCurrentDateTime() {
    return new Date().toISOString();
}

/**
 * Форматирование даты для отображения
 * @param {string|Date} date - Дата для форматирования
 * @returns {string} Отформатированная дата
 */
function formatDate(date) {
    if (typeof date === 'string') {
        date = new Date(date);
    }
    
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

/**
 * Форматирование времени для отображения
 * @param {string|Date} time - Время для форматирования
 * @returns {string} Отформатированное время
 */
function formatTime(time) {
    if (time instanceof Date) {
        return time.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    return time;
}

/**
 * Показать уведомление пользователю
 * @param {string} message - Текст сообщения
 * @param {string} type - Тип уведомления (success, error, warning, info)
 */
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    const id = `toast-${Date.now()}`;
    
    const toast = document.createElement('div');
    toast.className = `toast show bg-${type === 'error' ? 'danger' : type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    toast.id = id;
    
    toast.innerHTML = `
        <div class="toast-header">
            <strong class="me-auto">Уведомление</strong>
            <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body text-white">
            ${message}
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Автоматическое скрытие через 5 секунд
    setTimeout(() => {
        const toastElement = document.getElementById(id);
        if (toastElement) {
            toastElement.remove();
        }
    }, 5000);
}