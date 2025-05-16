/**
 * Модуль управления участниками мероприятий
 * Отвечает за приглашение, отметку посещения и учет статистики
 */

// Элементы интерфейса для работы с участниками
const participantsList = document.getElementById('participants-list');
const inviteEmailInput = document.getElementById('invite-email');
const addParticipantBtn = document.getElementById('add-participant-btn');
const manualAttendanceEmailInput = document.getElementById('manual-attendance-email');
const markAttendanceBtn = document.getElementById('mark-attendance-btn');

// Элементы интерфейса для работы с QR-кодами
const qrCodeContainer = document.getElementById('qr-code-image');
const qrCodeUrl = document.getElementById('qr-code-url');
const downloadQrBtn = document.getElementById('download-qr-btn');
const startScanBtn = document.getElementById('start-scan-btn');
const stopScanBtn = document.getElementById('stop-scan-btn');
const scannerContainer = document.getElementById('scanner-container');
const qrVideo = document.getElementById('qr-video');
const scanRegionHighlight = document.getElementById('scan-region-highlight');
const scanResult = document.getElementById('scan-result');
const attendanceLogList = document.getElementById('attendance-log-list');

// Переменные для работы с QR-сканером
let videoStream = null;
let canvasElement = document.createElement('canvas');
let canvas = canvasElement.getContext('2d');
let scanning = false;

// Статистика посещения
const participantsTotal = document.getElementById('participants-total');
const participantsAttended = document.getElementById('participants-attended');
const participantsMissed = document.getElementById('participants-missed');

// Текущий список участников
let currentParticipants = [];
// ID текущего мероприятия
let currentEventId = null;

/**
 * Инициализация обработчиков событий для управления участниками
 */
function initParticipantsListeners() {
    // Обработка добавления участника
    addParticipantBtn.addEventListener('click', function() {
        inviteParticipant();
    });
    
    // Обработка нажатия Enter в поле email
    inviteEmailInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            inviteParticipant();
        }
    });
    
    // Обработка отметки посещения
    markAttendanceBtn.addEventListener('click', function() {
        markAttendance();
    });
    
    // Обработка нажатия Enter в поле email для отметки посещения
    manualAttendanceEmailInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            markAttendance();
        }
    });
    
    // Обработка сканирования QR-кода
    startScanBtn.addEventListener('click', function() {
        startQrScanner();
    });
    
    // Обработка остановки сканирования
    stopScanBtn?.addEventListener('click', function() {
        stopQrScanner();
    });
    
    // Обработка скачивания QR-кода
    downloadQrBtn.addEventListener('click', function() {
        downloadQrCode();
    });
}

/**
 * Загрузка списка участников мероприятия
 * @param {string} eventId - ID мероприятия
 */
function loadParticipants(eventId) {
    if (!eventId || !currentUser) return;
    
    currentEventId = eventId;
    currentParticipants = [];
    
    // Показать индикатор загрузки
    showLoading(true);
    
    // Получаем участников из Firestore
    db.collection('events').doc(eventId)
        .collection('participants')
        .get()
        .then(function(querySnapshot) {
            querySnapshot.forEach(function(doc) {
                const participant = {
                    id: doc.id,
                    ...doc.data()
                };
                
                currentParticipants.push(participant);
            });
            
            // Отображаем участников
            renderParticipants();
            
            // Обновляем статистику
            updateAttendanceStats();
            
            // Генерируем QR-код для мероприятия
            generateEventQrCode(eventId);
        })
        .catch(function(error) {
            console.error('Ошибка загрузки участников:', error);
            showToast('Ошибка при загрузке списка участников', 'error');
        })
        .finally(function() {
            // Скрыть индикатор загрузки
            showLoading(false);
        });
}

/**
 * Отображение списка участников
 */
function renderParticipants() {
    // Очищаем контейнер списка участников
    participantsList.innerHTML = '';
    
    if (currentParticipants.length === 0) {
        // Если нет участников, показываем сообщение
        participantsList.innerHTML = `
            <tr class="text-center text-muted">
                <td colspan="4">Нет приглашенных участников</td>
            </tr>
        `;
        return;
    }
    
    // Отображаем участников
    currentParticipants.forEach(function(participant) {
        const row = document.createElement('tr');
        
        // Определяем статус
        let statusText = '';
        let statusClass = '';
        
        switch (participant.status) {
            case 'invited':
                statusText = 'Приглашен';
                statusClass = 'text-info';
                break;
            case 'registered':
                statusText = 'Зарегистрирован';
                statusClass = 'text-primary';
                break;
            case 'attended':
                statusText = 'Посетил';
                statusClass = 'text-success';
                break;
            case 'missed':
                statusText = 'Не посетил';
                statusClass = 'text-danger';
                break;
            default:
                statusText = 'Неизвестно';
                statusClass = 'text-muted';
        }
        
        row.innerHTML = `
            <td>${participant.name || '-'}</td>
            <td>${participant.email}</td>
            <td class="${statusClass}">${statusText}</td>
            <td>
                <div class="btn-group btn-group-sm" role="group">
                    ${participant.status !== 'attended' ? 
                        `<button type="button" class="btn btn-outline-success mark-attended-btn" data-participant-id="${participant.id}">
                            <i class="bi bi-check"></i>
                        </button>` : ''}
                    ${participant.status !== 'missed' && new Date(participant.eventDate) < new Date() ? 
                        `<button type="button" class="btn btn-outline-danger mark-missed-btn" data-participant-id="${participant.id}">
                            <i class="bi bi-x"></i>
                        </button>` : ''}
                    <button type="button" class="btn btn-outline-secondary remove-participant-btn" data-participant-id="${participant.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        participantsList.appendChild(row);
    });
    
    // Добавляем обработчики событий для кнопок
    const markAttendedBtns = document.querySelectorAll('.mark-attended-btn');
    markAttendedBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            const participantId = this.getAttribute('data-participant-id');
            updateParticipantStatus(participantId, 'attended');
        });
    });
    
    const markMissedBtns = document.querySelectorAll('.mark-missed-btn');
    markMissedBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            const participantId = this.getAttribute('data-participant-id');
            updateParticipantStatus(participantId, 'missed');
        });
    });
    
    const removeParticipantBtns = document.querySelectorAll('.remove-participant-btn');
    removeParticipantBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            const participantId = this.getAttribute('data-participant-id');
            removeParticipant(participantId);
        });
    });
}

/**
 * Приглашение нового участника
 */
function inviteParticipant() {
    const email = inviteEmailInput.value.trim();
    
    // Проверяем валидность email
    if (!email || !validateEmail(email)) {
        showToast('Введите корректный email', 'error');
        return;
    }
    
    // Проверяем, существует ли уже такой участник
    const existingParticipant = currentParticipants.find(p => p.email === email);
    if (existingParticipant) {
        showToast('Этот участник уже приглашен', 'warning');
        return;
    }
    
    // Проверяем, выбрано ли мероприятие
    if (!currentEventId) {
        showToast('Сначала сохраните мероприятие', 'warning');
        return;
    }
    
    // Показать индикатор загрузки
    showLoading(true);
    
    // Получаем данные о текущем мероприятии
    db.collection('events').doc(currentEventId).get()
        .then(function(eventDoc) {
            if (!eventDoc.exists) {
                throw new Error('Мероприятие не найдено');
            }
            
            const eventData = eventDoc.data();
            
            // Создаем нового участника
            let newParticipant = {
                email: email,
                name: '', // Имя будет заполнено, если пользователь зарегистрирован
                userId: '', // ID пользователя, если он зарегистрирован
                status: 'invited',
                invitedBy: currentUser.uid,
                invitedAt: firebase.firestore.FieldValue.serverTimestamp(),
                eventDate: eventData.date, // Дата мероприятия для расчетов
                eventTime: eventData.time // Время мероприятия для расчетов
            };
            
            // Проверяем, зарегистрирован ли пользователь с таким email
            return db.collection('users')
                .where('email', '==', email)
                .limit(1)
                .get()
                .then(function(querySnapshot) {
                    if (!querySnapshot.empty) {
                        // Если пользователь найден, обновляем данные участника
                        const userDoc = querySnapshot.docs[0];
                        const userData = userDoc.data();
                        
                        newParticipant.name = userData.name || '';
                        newParticipant.userId = userDoc.id;
                        newParticipant.status = 'registered';
                    }
                    
                    // Сохраняем участника в Firestore
                    return db.collection('events').doc(currentEventId)
                        .collection('participants')
                        .add(newParticipant)
                        .then(function(docRef) {
                            // Очищаем поле ввода
                            inviteEmailInput.value = '';
                            
                            // Добавляем участника в локальный массив с его ID
                            const participantToAdd = {
                                id: docRef.id,
                                ...newParticipant,
                                invitedAt: new Date().toISOString() // Для отображения
                            };
                            
                            currentParticipants.push(participantToAdd);
                            
                            // Обновляем отображение
                            renderParticipants();
                            updateAttendanceStats();
                            
                            // Отправляем приглашение (в реальном приложении)
                            sendInvitation(email, currentEventId);
                            
                            showToast('Участник успешно приглашен', 'success');
                        });
                });
        })
        .catch(function(error) {
            console.error('Ошибка приглашения участника:', error);
            showToast('Ошибка при приглашении участника', 'error');
        })
        .finally(function() {
            // Скрыть индикатор загрузки
            showLoading(false);
        });
}

/**
 * Удаление участника
 * @param {string} participantId - ID участника
 */
function removeParticipant(participantId) {
    // Подтверждение удаления
    if (!confirm('Вы уверены, что хотите удалить этого участника?')) {
        return;
    }
    
    // Показать индикатор загрузки
    showLoading(true);
    
    // Удаляем участника из Firestore
    db.collection('events').doc(currentEventId)
        .collection('participants')
        .doc(participantId)
        .delete()
        .then(function() {
            // Удаляем участника из локального массива
            currentParticipants = currentParticipants.filter(p => p.id !== participantId);
            
            // Обновляем отображение
            renderParticipants();
            updateAttendanceStats();
            
            showToast('Участник успешно удален', 'success');
        })
        .catch(function(error) {
            console.error('Ошибка удаления участника:', error);
            showToast('Ошибка при удалении участника', 'error');
        })
        .finally(function() {
            // Скрыть индикатор загрузки
            showLoading(false);
        });
}

/**
 * Обновление статуса участника
 * @param {string} participantId - ID участника
 * @param {string} status - Новый статус ('invited', 'registered', 'attended', 'missed')
 */
function updateParticipantStatus(participantId, status) {
    // Показать индикатор загрузки
    showLoading(true);
    
    // Обновляем статус в Firestore
    db.collection('events').doc(currentEventId)
        .collection('participants')
        .doc(participantId)
        .update({
            status: status,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            ...(status === 'attended' ? { attendedAt: firebase.firestore.FieldValue.serverTimestamp() } : {})
        })
        .then(function() {
            // Обновляем статус в локальном массиве
            const participantIndex = currentParticipants.findIndex(p => p.id === participantId);
            if (participantIndex !== -1) {
                currentParticipants[participantIndex].status = status;
                if (status === 'attended') {
                    currentParticipants[participantIndex].attendedAt = new Date().toISOString();
                }
            }
            
            // Обновляем отображение
            renderParticipants();
            updateAttendanceStats();
            
            showToast(`Статус участника изменен на "${getStatusText(status)}"`, 'success');
        })
        .catch(function(error) {
            console.error('Ошибка обновления статуса участника:', error);
            showToast('Ошибка при обновлении статуса участника', 'error');
        })
        .finally(function() {
            // Скрыть индикатор загрузки
            showLoading(false);
        });
}

/**
 * Отметка посещения участника по email
 */
function markAttendance() {
    const email = manualAttendanceEmailInput.value.trim();
    
    // Проверяем валидность email
    if (!email || !validateEmail(email)) {
        showToast('Введите корректный email', 'error');
        return;
    }
    
    // Ищем участника с таким email
    const participant = currentParticipants.find(p => p.email === email);
    if (!participant) {
        showToast('Участник с таким email не найден', 'error');
        return;
    }
    
    // Если участник уже отмечен как посетивший
    if (participant.status === 'attended') {
        showToast('Участник уже отмечен как посетивший', 'info');
        return;
    }
    
    // Обновляем статус участника
    updateParticipantStatus(participant.id, 'attended');
    
    // Очищаем поле ввода
    manualAttendanceEmailInput.value = '';
}

/**
 * Обновление статистики посещений
 */
function updateAttendanceStats() {
    const total = currentParticipants.length;
    const attended = currentParticipants.filter(p => p.status === 'attended').length;
    const missed = currentParticipants.filter(p => p.status === 'missed').length;
    
    participantsTotal.textContent = total;
    participantsAttended.textContent = attended;
    participantsMissed.textContent = missed;
}

/**
 * Генерация QR-кода для мероприятия
 * @param {string} eventId - ID мероприятия
 */
function generateEventQrCode(eventId) {
    if (!eventId) {
        qrCodeContainer.innerHTML = '<p class="text-muted">QR-код будет сгенерирован после сохранения мероприятия</p>';
        qrCodeUrl.textContent = '';
        downloadQrBtn.disabled = true;
        return;
    }
    
    // Очищаем контейнер QR-кода
    qrCodeContainer.innerHTML = '';
    
    // Формируем данные для QR-кода (URL для отметки)
    // В реальном приложении это должен быть URL с токеном безопасности
    const baseUrl = window.location.origin;
    const qrData = `${baseUrl}/attend/${eventId}`;
    
    // Добавляем текстовую подсказку о публичной отметке
    const publicFormInfo = document.createElement('div');
    publicFormInfo.className = 'alert alert-info mt-2 mb-0 small';
    publicFormInfo.innerHTML = `
        <p class="mb-1"><strong>Публичная ссылка для отметки посещения</strong></p>
        <p class="mb-0">Участники могут отметиться без регистрации, просто указав своё имя и email.</p>
    `;
    qrCodeContainer.appendChild(publicFormInfo);
    
    try {
        // Создаем элемент canvas
        const canvas = document.createElement('canvas');
        qrCodeContainer.appendChild(canvas);
        
        // Генерируем QR-код с помощью библиотеки QRCode
        QRCode.toCanvas(canvas, qrData, {
            width: 200,
            margin: 1,
            color: {
                dark: '#000',
                light: '#fff'
            }
        }, function(error) {
            if (error) {
                console.error('Ошибка генерации QR-кода:', error);
                qrCodeContainer.innerHTML = '<p class="text-danger">Ошибка генерации QR-кода</p>';
                downloadQrBtn.disabled = true;
            } else {
                // QR-код успешно сгенерирован
                qrCodeUrl.textContent = `URL: ${qrData}`;
                downloadQrBtn.disabled = false;
                
                // Для удобства тестирования - выводим простую ссылку для клика
                const testLink = document.createElement('a');
                testLink.href = '#';
                testLink.textContent = 'Тест отметки (имитация сканирования)';
                testLink.className = 'small d-block mt-2';
                testLink.onclick = function(e) {
                    e.preventDefault();
                    processQrCode(qrData);
                };
                qrCodeContainer.appendChild(testLink);
            }
        });
    } catch (error) {
        console.error('Ошибка при работе с QR-кодом:', error);
        qrCodeContainer.innerHTML = '<p class="text-danger">Ошибка генерации QR-кода</p>';
        downloadQrBtn.disabled = true;
    }
}

/**
 * Запуск сканера QR-кодов
 */
function startQrScanner() {
    // Показываем контейнер сканера
    scannerContainer.classList.remove('d-none');
    
    // Меняем текст кнопки и скрываем ее
    startScanBtn.textContent = 'Сканирование...';
    startScanBtn.disabled = true;
    
    // Сбрасываем результат сканирования
    scanResult.textContent = '';
    
    // Запускаем видео поток
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        // Запрашиваем доступ к камере
        navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: "environment",
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        })
        .then(function(stream) {
            videoStream = stream;
            qrVideo.srcObject = stream;
            qrVideo.setAttribute('playsinline', true); // для iOS
            qrVideo.play();
            
            // Начинаем сканирование QR-кода
            requestAnimationFrame(scanQrCode);
            scanning = true;
        })
        .catch(function(error) {
            console.error('Ошибка доступа к камере:', error);
            showToast('Не удалось получить доступ к камере', 'error');
            stopQrScanner();
        });
    } else {
        showToast('Ваш браузер не поддерживает доступ к камере', 'error');
        stopQrScanner();
    }
}

/**
 * Остановка сканера QR-кодов
 */
function stopQrScanner() {
    // Останавливаем сканирование
    scanning = false;
    
    // Останавливаем видео поток
    if (videoStream) {
        videoStream.getTracks().forEach(track => {
            track.stop();
        });
        videoStream = null;
    }
    
    // Очищаем видео
    if (qrVideo.srcObject) {
        qrVideo.srcObject = null;
    }
    
    // Скрываем контейнер сканера
    scannerContainer.classList.add('d-none');
    
    // Возвращаем кнопку в исходное состояние
    startScanBtn.textContent = 'Начать сканирование';
    startScanBtn.disabled = false;
    
    // Скрываем подсветку области сканирования
    scanRegionHighlight.style.display = 'none';
}

/**
 * Функция сканирования QR-кода (вызывается рекурсивно)
 */
function scanQrCode() {
    if (!scanning) return;
    
    if (qrVideo.readyState === qrVideo.HAVE_ENOUGH_DATA) {
        // Получаем размеры видео
        canvasElement.height = qrVideo.videoHeight;
        canvasElement.width = qrVideo.videoWidth;
        
        // Отрисовываем текущий кадр на canvas
        canvas.drawImage(qrVideo, 0, 0, canvasElement.width, canvasElement.height);
        
        // Получаем изображение с canvas
        const imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
        
        // Ищем QR-код на изображении
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
        });
        
        // Если QR-код найден
        if (code) {
            console.log('QR-код обнаружен:', code.data);
            
            // Подсвечиваем область с QR-кодом
            const scaleFactor = qrVideo.clientWidth / canvasElement.width;
            
            scanRegionHighlight.style.left = `${code.location.topLeftCorner.x * scaleFactor}px`;
            scanRegionHighlight.style.top = `${code.location.topLeftCorner.y * scaleFactor}px`;
            scanRegionHighlight.style.width = `${(code.location.bottomRightCorner.x - code.location.topLeftCorner.x) * scaleFactor}px`;
            scanRegionHighlight.style.height = `${(code.location.bottomRightCorner.y - code.location.topLeftCorner.y) * scaleFactor}px`;
            scanRegionHighlight.style.display = 'block';
            
            // Обрабатываем данные QR-кода
            processQrCode(code.data);
            
            // Останавливаем сканирование
            setTimeout(() => {
                stopQrScanner();
            }, 500);
            
            return;
        }
    }
    
    // Продолжаем сканирование в следующем кадре
    requestAnimationFrame(scanQrCode);
}

/**
 * Обработка данных из QR-кода
 * @param {string} qrData - Данные из QR-кода
 */
function processQrCode(qrData) {
    // Проверяем, содержит ли QR-код валидный URL для отметки посещения
    if (!qrData.includes('/attend/')) {
        scanResult.innerHTML = `<div class="alert alert-warning">Невалидный QR-код: ${qrData}</div>`;
        showToast('Невалидный QR-код', 'warning');
        return;
    }
    
    // Извлекаем ID мероприятия из URL
    const eventIdMatch = qrData.match(/\/attend\/([^\/]+)/);
    if (!eventIdMatch || !eventIdMatch[1]) {
        scanResult.innerHTML = `<div class="alert alert-warning">Невалидный формат QR-кода</div>`;
        showToast('Невалидный формат QR-кода', 'warning');
        return;
    }
    
    const scannedEventId = eventIdMatch[1];
    
    // Проверяем, соответствует ли ID мероприятия текущему
    if (scannedEventId !== currentEventId) {
        scanResult.innerHTML = `<div class="alert alert-warning">QR-код от другого мероприятия</div>`;
        showToast('QR-код от другого мероприятия', 'warning');
        return;
    }
    
    // QR-код валиден, показываем форму для отметки посещения
    scanResult.innerHTML = `
        <div class="alert alert-success">
            <p class="mb-2">QR-код успешно отсканирован!</p>
            <div class="input-group input-group-sm">
                <input type="email" class="form-control" id="qr-attendance-email" placeholder="Введите email участника">
                <button class="btn btn-success" id="qr-mark-attendance-btn">Отметить</button>
            </div>
        </div>
    `;
    
    // Обработчик отметки посещения по QR-коду
    document.getElementById('qr-mark-attendance-btn').addEventListener('click', function() {
        const email = document.getElementById('qr-attendance-email').value.trim();
        
        if (!email || !validateEmail(email)) {
            showToast('Введите корректный email', 'error');
            return;
        }
        
        // Отмечаем посещение
        markAttendanceByEmail(email, 'QR-код');
        
        // Очищаем форму
        scanResult.innerHTML = `<div class="alert alert-success">Посещение отмечено для ${email}</div>`;
    });
    
    // Обработка нажатия Enter в поле email
    document.getElementById('qr-attendance-email').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.getElementById('qr-mark-attendance-btn').click();
        }
    });
}

/**
 * Отметка посещения участника по email
 * @param {string} email - Email участника
 * @param {string} [source='Вручную'] - Источник отметки (QR-код, вручную и т.д.)
 */
function markAttendanceByEmail(email, source = 'Вручную') {
    // Проверяем валидность email
    if (!email || !validateEmail(email)) {
        showToast('Введите корректный email', 'error');
        return false;
    }
    
    // Ищем участника с таким email
    const participant = currentParticipants.find(p => p.email === email);
    if (!participant) {
        showToast('Участник с таким email не найден', 'error');
        return false;
    }
    
    // Если участник уже отмечен как посетивший
    if (participant.status === 'attended') {
        showToast('Участник уже отмечен как посетивший', 'info');
        return false;
    }
    
    // Обновляем статус участника
    updateParticipantStatus(participant.id, 'attended');
    
    // Добавляем запись в журнал отметок
    addAttendanceLogEntry(participant, source);
    
    // Отображаем уведомление
    showToast(`Посещение отмечено для ${participant.name || email}`, 'success');
    
    return true;
}

/**
 * Отметка посещения из ручного ввода
 */
function markAttendance() {
    const email = manualAttendanceEmailInput.value.trim();
    
    // Отмечаем посещение
    if (markAttendanceByEmail(email, 'Вручную')) {
        // Очищаем поле ввода
        manualAttendanceEmailInput.value = '';
    }
}

/**
 * Добавление записи в журнал отметок посещения
 * @param {Object} participant - Объект участника
 * @param {string} source - Источник отметки (QR-код, вручную и т.д.)
 */
function addAttendanceLogEntry(participant, source) {
    // Проверяем, существует ли контейнер для журнала
    if (!attendanceLogList) return;
    
    // Очищаем заглушку, если это первая запись
    if (attendanceLogList.querySelector('.text-muted')) {
        attendanceLogList.innerHTML = '';
    }
    
    // Создаем элемент записи
    const logItem = document.createElement('li');
    logItem.className = 'list-group-item bg-transparent py-1 small border-0';
    
    // Форматируем время
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Формируем содержимое записи
    logItem.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <span><strong>${participant.name || participant.email}</strong> отмечен(а)</span>
            <span class="text-muted">${timeStr} · ${source}</span>
        </div>
    `;
    
    // Добавляем запись в начало списка
    attendanceLogList.insertBefore(logItem, attendanceLogList.firstChild);
    
    // Сохраняем запись в Firestore (опционально)
    saveAttendanceLog(participant, source);
}

/**
 * Сохранение записи журнала посещений в Firestore
 * @param {Object} participant - Объект участника
 * @param {string} source - Источник отметки
 */
function saveAttendanceLog(participant, source) {
    if (!currentEventId) return;
    
    // Создаем объект записи
    const logEntry = {
        participantId: participant.id,
        participantEmail: participant.email,
        participantName: participant.name || '',
        markedBy: currentUser.uid,
        markedAt: firebase.firestore.FieldValue.serverTimestamp(),
        source: source
    };
    
    // Сохраняем запись в Firestore
    db.collection('events').doc(currentEventId)
        .collection('attendance_log')
        .add(logEntry)
        .catch(function(error) {
            console.error('Ошибка сохранения записи журнала:', error);
        });
}

/**
 * Скачивание QR-кода
 */
function downloadQrCode() {
    // Получаем canvas с QR-кодом
    const canvas = qrCodeContainer.querySelector('canvas');
    if (!canvas) {
        showToast('QR-код не найден', 'error');
        return;
    }
    
    try {
        // Создаем ссылку для скачивания
        const link = document.createElement('a');
        link.download = `qrcode-event-${currentEventId}.png`;
        link.href = canvas.toDataURL('image/png');
        
        // Эмулируем клик по ссылке
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast('QR-код успешно скачан', 'success');
    } catch (error) {
        console.error('Ошибка скачивания QR-кода:', error);
        showToast('Ошибка при скачивании QR-кода', 'error');
    }
}

/**
 * Отправка приглашения участнику
 * @param {string} email - Email участника
 * @param {string} eventId - ID мероприятия
 */
function sendInvitation(email, eventId) {
    // В реальном приложении здесь был бы код для отправки приглашения
    // по электронной почте
    console.log(`Отправка приглашения на ${email} для мероприятия ${eventId}`);
    
    // Для демонстрации просто показываем уведомление
    showToast(`Приглашение отправлено на ${email}`, 'info');
}

/**
 * Получение текстового представления статуса
 * @param {string} status - Статус участника
 * @returns {string} Текстовое представление статуса
 */
function getStatusText(status) {
    switch (status) {
        case 'invited': return 'Приглашен';
        case 'registered': return 'Зарегистрирован';
        case 'attended': return 'Посетил';
        case 'missed': return 'Не посетил';
        default: return 'Неизвестно';
    }
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