/**
 * Основной модуль приложения
 * Инициализирует приложение и управляет навигацией между страницами
 */

// Элементы навигации
const navHome = document.getElementById('nav-home');
const navAnalytics = document.getElementById('nav-analytics');
const navProfile = document.getElementById('nav-profile');
const navLogin = document.getElementById('nav-login');
const navRegister = document.getElementById('nav-register');

// Контейнеры страниц - используем существующие элементы без повторного объявления
const mainEventsContainer = document.getElementById('events-container');
const authContainer = document.getElementById('auth-container');
const profileContainer = document.getElementById('profile-container');
const analyticsContainer = document.getElementById('analytics-container');

/**
 * Инициализация приложения
 */
function initApp() {
    // Инициализация обработчиков событий для аутентификации
    initAuthListeners();
    
    // Инициализация обработчиков событий для мероприятий
    initEventsListeners();
    
    // Инициализация обработчиков событий для участников (если функция существует)
    if (typeof initParticipantsListeners === 'function') {
        initParticipantsListeners();
    }
    
    // Инициализация обработчиков событий для уведомлений
    initNotificationsListeners();
    
    // Инициализация навигации
    initNavigation();
    
    // Инициализация графиков аналитики
    initAnalyticsCharts();
    
    console.log('Приложение инициализировано');
}

/**
 * Инициализация обработчиков событий для навигации
 */
function initNavigation() {
    // Главная страница (мероприятия)
    navHome.addEventListener('click', function(e) {
        e.preventDefault();
        showPage('events');
    });
    
    // Страница аналитики
    navAnalytics.addEventListener('click', function(e) {
        e.preventDefault();
        showPage('analytics');
        
        // Обновляем данные аналитики при переходе на страницу
        loadAnalytics();
    });
    
    // Страница профиля
    navProfile.addEventListener('click', function(e) {
        e.preventDefault();
        showPage('profile');
    });
    
    // Страница входа
    navLogin.addEventListener('click', function(e) {
        e.preventDefault();
        showPage('auth');
        
        // Открываем вкладку входа
        loginTab.click();
    });
    
    // Страница регистрации
    navRegister.addEventListener('click', function(e) {
        e.preventDefault();
        showPage('auth');
        
        // Открываем вкладку регистрации
        registerTab.click();
    });
}

/**
 * Отображение выбранной страницы
 * @param {string} page - Идентификатор страницы ('events', 'auth', 'profile', 'analytics')
 */
function showPage(page) {
    // Скрываем все контейнеры
    mainEventsContainer.classList.add('d-none');
    authContainer.classList.add('d-none');
    profileContainer.classList.add('d-none');
    analyticsContainer.classList.add('d-none');
    
    // Сбрасываем активные классы у пунктов навигации
    navHome.classList.remove('active');
    navAnalytics.classList.remove('active');
    navProfile.classList.remove('active');
    
    // Показываем выбранную страницу и активируем соответствующий пункт навигации
    switch (page) {
        case 'events':
            mainEventsContainer.classList.remove('d-none');
            navHome.classList.add('active');
            break;
        case 'auth':
            authContainer.classList.remove('d-none');
            break;
        case 'profile':
            profileContainer.classList.remove('d-none');
            navProfile.classList.add('active');
            break;
        case 'analytics':
            analyticsContainer.classList.remove('d-none');
            navAnalytics.classList.add('active');
            break;
    }
}

// Инициализация приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});