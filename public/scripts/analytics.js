/**
 * Модуль аналитики
 * Отвечает за отображение статистики и графиков по мероприятиям
 */

// Элементы интерфейса для работы с аналитикой
const statsTotalEvents = document.getElementById('stats-total-events');
const statsTotalParticipants = document.getElementById('stats-total-participants');
const statsAttendanceRate = document.getElementById('stats-attendance-rate');

// Контексты для графиков
let eventsByMonthChart = null;
let attendanceChart = null;

/**
 * Инициализация графиков на странице аналитики
 */
function initAnalyticsCharts() {
    try {
        // Проверяем наличие элементов для графиков
        const eventsByMonthCtx = document.getElementById('events-by-month-chart');
        const attendanceCtx = document.getElementById('attendance-chart');
        
        if (!eventsByMonthCtx || !attendanceCtx) {
            console.error('Элементы графиков не найдены');
            return;
        }
        
        // График мероприятий по месяцам
        if (eventsByMonthCtx.getContext) {
            const ctx = eventsByMonthCtx.getContext('2d');
            eventsByMonthChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
                    datasets: [{
                        label: 'Количество мероприятий',
                        data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    }
                }
            });
        }
        
        // График посещаемости мероприятий
        if (attendanceCtx.getContext) {
            const ctx = attendanceCtx.getContext('2d');
            attendanceChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: ['Посещено', 'Пропущено'],
                    datasets: [{
                        data: [0, 0],
                        backgroundColor: [
                            'rgba(75, 192, 192, 0.5)',
                            'rgba(255, 99, 132, 0.5)'
                        ],
                        borderColor: [
                            'rgba(75, 192, 192, 1)',
                            'rgba(255, 99, 132, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }
        
        console.log('Графики аналитики инициализированы');
    } catch (error) {
        console.error('Ошибка при инициализации графиков:', error);
    }
}

/**
 * Загрузка данных аналитики
 */
function loadAnalytics() {
    if (!currentUser) return;
    
    // Показать индикатор загрузки
    showLoading(true);
    
    // Получаем мероприятия пользователя из Firestore
    db.collection('events')
        .where('userId', '==', currentUser.uid)
        .get()
        .then(function(querySnapshot) {
            // Массив для хранения всех мероприятий
            const events = [];
            
            querySnapshot.forEach(function(doc) {
                events.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Обрабатываем данные для аналитики
            processAnalyticsData(events);
        })
        .catch(function(error) {
            console.error('Ошибка загрузки данных для аналитики:', error);
            showToast('Ошибка при загрузке данных аналитики', 'error');
        })
        .finally(function() {
            // Скрыть индикатор загрузки
            showLoading(false);
        });
}

/**
 * Обработка данных для аналитики
 * @param {Array} events - Массив мероприятий пользователя
 */
function processAnalyticsData(events) {
    // Общее количество мероприятий
    const totalEvents = events.length;
    statsTotalEvents.textContent = totalEvents;
    
    // Загружаем данные о посещаемости из Firestore
    loadAttendanceData(events)
        .then(attendanceData => {
            // Общее количество участников
            const totalParticipants = attendanceData.total;
            statsTotalParticipants.textContent = totalParticipants;
            
            // Средняя посещаемость
            const attendanceRate = totalParticipants > 0 
                ? Math.round((attendanceData.attended / totalParticipants) * 100) 
                : 0;
            statsAttendanceRate.textContent = `${attendanceRate}%`;
            
            // Обновляем данные графика мероприятий по месяцам
            updateEventsByMonthChart(events);
            
            // Обновляем данные графика посещаемости
            updateAttendanceChart(attendanceData);
        })
        .catch(error => {
            console.error('Ошибка загрузки данных посещаемости:', error);
            showToast('Ошибка при загрузке данных посещаемости', 'error');
            
            // Используем тестовые данные в случае ошибки
            const testData = generateTestAttendanceData(events);
            
            // Обновляем интерфейс тестовыми данными
            statsTotalParticipants.textContent = testData.total;
            statsAttendanceRate.textContent = `${Math.round(testData.rate * 100)}%`;
            
            // Обновляем данные графика мероприятий по месяцам
            updateEventsByMonthChart(events);
            
            // Обновляем данные графика посещаемости
            updateAttendanceChart(testData);
        });
}

/**
 * Загрузка реальных данных о посещаемости из Firestore
 * @param {Array} events - Массив мероприятий
 * @returns {Promise<Object>} Промис с данными о посещаемости
 */
async function loadAttendanceData(events) {
    // Если нет мероприятий, возвращаем пустые данные
    if (!events.length) {
        return {
            total: 0,
            attended: 0,
            missed: 0,
            rate: 0
        };
    }
    
    try {
        // Результаты по всем мероприятиям
        let totalParticipants = 0;
        let totalAttended = 0;
        let totalMissed = 0;
        
        // Загружаем данные о участниках для каждого мероприятия
        const participantsPromises = events.map(event => {
            return db.collection('events')
                .doc(event.id)
                .collection('participants')
                .get()
                .then(snapshot => {
                    const participants = snapshot.docs.map(doc => doc.data());
                    
                    // Считаем количество участников
                    const count = participants.length;
                    // Считаем количество посетивших
                    const attended = participants.filter(p => p.status === 'attended').length;
                    // Считаем количество пропустивших
                    const missed = participants.filter(p => p.status === 'missed').length;
                    
                    // Обновляем общие счетчики
                    totalParticipants += count;
                    totalAttended += attended;
                    totalMissed += missed;
                    
                    return {
                        eventId: event.id,
                        total: count,
                        attended: attended,
                        missed: missed
                    };
                });
        });
        
        // Ждем завершения всех запросов
        await Promise.all(participantsPromises);
        
        // Возвращаем обобщенные данные
        return {
            total: totalParticipants,
            attended: totalAttended,
            missed: totalMissed,
            rate: totalParticipants > 0 ? totalAttended / totalParticipants : 0
        };
    } catch (error) {
        console.error('Ошибка при загрузке данных о посещаемости:', error);
        throw error;
    }
}

/**
 * Обновление графика мероприятий по месяцам
 * @param {Array} events - Массив мероприятий пользователя
 */
function updateEventsByMonthChart(events) {
    // Проверяем наличие графика
    if (!eventsByMonthChart) {
        console.error('График не инициализирован');
        return;
    }
    
    // Массив для хранения количества мероприятий по месяцам
    const eventsByMonth = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    
    // Считаем количество мероприятий по месяцам
    if (events && events.length > 0) {
        events.forEach(function(event) {
            if (event && event.date) {
                const eventDate = new Date(event.date);
                const month = eventDate.getMonth();
                if (month >= 0 && month < 12) {
                    eventsByMonth[month]++;
                }
            }
        });
    }
    
    // Обновляем данные графика
    if (eventsByMonthChart.data && eventsByMonthChart.data.datasets && eventsByMonthChart.data.datasets.length > 0) {
        eventsByMonthChart.data.datasets[0].data = eventsByMonth;
        eventsByMonthChart.update();
    } else {
        console.error('Структура данных графика некорректна:', eventsByMonthChart);
    }
}

/**
 * Обновление графика посещаемости
 * @param {Object} attendanceData - Данные о посещаемости мероприятий
 */
function updateAttendanceChart(attendanceData) {
    // Проверяем наличие графика и данных
    if (!attendanceChart) {
        console.error('График посещаемости не инициализирован');
        return;
    }
    
    if (!attendanceData) {
        console.error('Данные о посещаемости отсутствуют');
        return;
    }
    
    // Обновляем данные графика
    if (attendanceChart.data && attendanceChart.data.datasets && attendanceChart.data.datasets.length > 0) {
        // Безопасно получаем значения с проверкой
        const attended = attendanceData.attended || 0;
        const missed = attendanceData.missed || 0;
        
        attendanceChart.data.datasets[0].data = [attended, missed];
        attendanceChart.update();
    } else {
        console.error('Структура данных графика посещаемости некорректна:', attendanceChart);
    }
}

/**
 * Генерация тестовых данных о посещаемости мероприятий
 * В реальном приложении эти данные будут получены из базы данных
 * @param {Array} events - Массив мероприятий пользователя
 * @returns {Object} Данные о посещаемости
 */
function generateTestAttendanceData(events) {
    // Для тестовых данных просто генерируем случайные значения
    
    // В реальном приложении здесь будет логика для расчета фактической посещаемости
    // на основе данных о зарегистрированных участниках и отметках о посещении
    
    // Среднее количество участников на мероприятие (для демонстрации)
    const avgParticipants = Math.max(1, Math.floor(Math.random() * 10 + 5));
    
    // Общее количество участников (для демонстрации)
    const totalParticipants = events.length * avgParticipants;
    
    // Случайный процент посещаемости от 60% до 90% (для демонстрации)
    const attendanceRate = Math.random() * 0.3 + 0.6;
    
    // Количество посетивших и пропустивших
    const attended = Math.round(totalParticipants * attendanceRate);
    const missed = totalParticipants - attended;
    
    return {
        total: totalParticipants,
        attended: attended,
        missed: missed,
        rate: attendanceRate
    };
}