/**
 * Модуль аутентификации пользователей
 * Управляет входом, выходом и регистрацией пользователей
 */

// Элементы интерфейса для работы с аутентификацией
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginTab = document.getElementById('login-tab');
const registerTab = document.getElementById('register-tab');
const logoutBtn = document.getElementById('nav-logout');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const registerName = document.getElementById('register-name');
const registerEmail = document.getElementById('register-email');
const registerPassword = document.getElementById('register-password');
const registerPasswordConfirm = document.getElementById('register-password-confirm');

// Глобальный объект для хранения данных текущего пользователя
let currentUser = null;

/**
 * Инициализация обработчиков событий для форм аутентификации
 */
function initAuthListeners() {
    // Переключение между вкладками входа и регистрации
    loginTab.addEventListener('click', function(e) {
        e.preventDefault();
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.classList.remove('d-none');
        registerForm.classList.add('d-none');
    });
    
    registerTab.addEventListener('click', function(e) {
        e.preventDefault();
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerForm.classList.remove('d-none');
        loginForm.classList.add('d-none');
    });
    
    // Обработка отправки формы входа
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const email = loginEmail.value;
        const password = loginPassword.value;
        
        signIn(email, password);
    });
    
    // Обработка отправки формы регистрации
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const name = registerName.value;
        const email = registerEmail.value;
        const password = registerPassword.value;
        const passwordConfirm = registerPasswordConfirm.value;
        
        // Проверка совпадения паролей
        if (password !== passwordConfirm) {
            showToast('Пароли не совпадают', 'error');
            return;
        }
        
        signUp(email, password, name);
    });
    
    // Обработка выхода из системы
    logoutBtn.addEventListener('click', function(e) {
        e.preventDefault();
        signOut();
    });
    
    // Отслеживание изменения статуса аутентификации
    auth.onAuthStateChanged(function(user) {
        if (user) {
            userSignedIn(user);
        } else {
            userSignedOut();
        }
    });
}

/**
 * Авторизация пользователя
 * @param {string} email - Email пользователя
 * @param {string} password - Пароль пользователя
 */
function signIn(email, password) {
    // Показать индикатор загрузки
    showLoading(true);
    
    auth.signInWithEmailAndPassword(email, password)
        .then(function(userCredential) {
            // Успешный вход
            loginForm.reset();
            showToast('Вы успешно вошли в систему', 'success');
        })
        .catch(function(error) {
            // Обработка ошибок
            console.error('Ошибка входа:', error);
            let errorMessage = 'Ошибка входа';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'Пользователь с таким email не найден';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Неверный пароль';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Некорректный формат email';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Слишком много попыток входа. Попробуйте позже';
                    break;
            }
            
            showToast(errorMessage, 'error');
        })
        .finally(function() {
            // Скрыть индикатор загрузки
            showLoading(false);
        });
}

/**
 * Регистрация нового пользователя
 * @param {string} email - Email пользователя
 * @param {string} password - Пароль пользователя
 * @param {string} name - Имя пользователя
 */
function signUp(email, password, name) {
    // Показать индикатор загрузки
    showLoading(true);
    
    auth.createUserWithEmailAndPassword(email, password)
        .then(function(userCredential) {
            // Успешная регистрация
            const user = userCredential.user;
            
            // Создаем документ пользователя в Firestore
            return db.collection('users').doc(user.uid).set({
                name: name,
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                notifications: {
                    email: true,
                    push: true
                }
            });
        })
        .then(function() {
            registerForm.reset();
            showToast('Регистрация успешно завершена', 'success');
        })
        .catch(function(error) {
            // Обработка ошибок
            console.error('Ошибка регистрации:', error);
            let errorMessage = 'Ошибка регистрации';
            
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'Пользователь с таким email уже существует';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Некорректный формат email';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Слишком слабый пароль';
                    break;
            }
            
            showToast(errorMessage, 'error');
        })
        .finally(function() {
            // Скрыть индикатор загрузки
            showLoading(false);
        });
}

/**
 * Выход пользователя из системы
 */
function signOut() {
    auth.signOut()
        .then(function() {
            showToast('Вы вышли из системы', 'info');
        })
        .catch(function(error) {
            console.error('Ошибка выхода:', error);
            showToast('Ошибка при выходе из системы', 'error');
        });
}

/**
 * Обработка успешного входа пользователя
 * @param {Object} user - Объект пользователя Firebase
 */
function userSignedIn(user) {
    // Сохраняем объект пользователя
    currentUser = user;
    
    // Получаем дополнительные данные о пользователе из Firestore
    db.collection('users').doc(user.uid).get()
        .then(function(doc) {
            if (doc.exists) {
                const userData = doc.data();
                // Обновляем объект пользователя данными из Firestore
                currentUser.userData = userData;
                
                // Обновляем профиль пользователя
                updateProfileUI(userData);
            } else {
                // Если документ не существует, создаем его
                return db.collection('users').doc(user.uid).set({
                    name: user.displayName || 'Пользователь',
                    email: user.email,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    notifications: {
                        email: true,
                        push: true
                    }
                });
            }
        })
        .then(function() {
            // Переключаем видимость элементов для авторизованного пользователя
            toggleAuthUI(true);
            
            // Загружаем мероприятия пользователя
            loadUserEvents();
            
            // Загружаем статистику
            loadAnalytics();
        })
        .catch(function(error) {
            console.error('Ошибка получения данных пользователя:', error);
        });
}

/**
 * Обработка выхода пользователя из системы
 */
function userSignedOut() {
    // Очищаем объект пользователя
    currentUser = null;
    
    // Переключаем видимость элементов для неавторизованного пользователя
    toggleAuthUI(false);
}

/**
 * Переключение элементов интерфейса в зависимости от статуса авторизации
 * @param {boolean} isLoggedIn - Статус авторизации (true - авторизован, false - не авторизован)
 */
function toggleAuthUI(isLoggedIn) {
    // Получаем все элементы, которые зависят от статуса авторизации
    const authLoggedInElements = document.querySelectorAll('.auth-logged-in');
    const authNotLoggedInElements = document.querySelectorAll('.auth-not-logged-in');
    
    // Показываем/скрываем элементы для авторизованного пользователя
    authLoggedInElements.forEach(function(element) {
        if (isLoggedIn) {
            element.classList.remove('d-none');
        } else {
            element.classList.add('d-none');
        }
    });
    
    // Показываем/скрываем элементы для неавторизованного пользователя
    authNotLoggedInElements.forEach(function(element) {
        if (isLoggedIn) {
            element.classList.add('d-none');
        } else {
            element.classList.remove('d-none');
        }
    });
    
    // Показываем/скрываем контейнеры страниц
    if (isLoggedIn) {
        document.getElementById('events-container').classList.remove('d-none');
        document.getElementById('auth-container').classList.add('d-none');
    } else {
        document.getElementById('events-container').classList.add('d-none');
        document.getElementById('auth-container').classList.remove('d-none');
        
        // Скрываем другие контейнеры
        document.getElementById('profile-container').classList.add('d-none');
        document.getElementById('analytics-container').classList.add('d-none');
    }
}

/**
 * Обновление интерфейса профиля пользователя
 * @param {Object} userData - Данные о пользователе из Firestore
 */
function updateProfileUI(userData) {
    if (!userData) return;
    
    // Обновляем имя и email пользователя
    document.getElementById('profile-name').textContent = userData.name || 'Пользователь';
    document.getElementById('profile-email').textContent = userData.email || '';
    
    // Обновляем настройки уведомлений
    const emailToggle = document.getElementById('notification-email-toggle');
    const pushToggle = document.getElementById('notification-push-toggle');
    
    if (userData.notifications) {
        emailToggle.checked = userData.notifications.email || false;
        pushToggle.checked = userData.notifications.push || false;
    }
}

/**
 * Функция для отображения/скрытия индикатора загрузки
 * @param {boolean} show - Показать (true) или скрыть (false) индикатор загрузки
 */
function showLoading(show) {
    // Здесь можно реализовать отображение индикатора загрузки
    // Например, показать/скрыть спиннер
    // Для простоты оставим пустым
}