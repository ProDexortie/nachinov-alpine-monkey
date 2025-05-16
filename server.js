// Базовый серверный файл для Glitch
// Загружает переменные окружения и предоставляет их клиенту безопасным способом

// Подключаем необходимые модули
const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

// Загружаем переменные окружения из .env файла
dotenv.config();

// Создаем экземпляр приложения Express
const app = express();
const port = process.env.PORT || 3000;

// Выводим переменные окружения для отладки (без значений)
console.log('Доступные переменные окружения на сервере:', Object.keys(process.env));

// Создаем объект с переменными окружения
function getClientEnv() {
  return {
    FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
    FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
    FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
    FIREBASE_APP_ID: process.env.FIREBASE_APP_ID
  };
}

// ВАЖНО: Обработчики маршрутов должны быть ДО настройки статических файлов,
// чтобы иметь возможность модифицировать HTML перед отправкой

// Обработчик для страницы отметки посещения
app.get('/attend/:eventId', (req, res) => {
  // Получаем ID мероприятия из параметров URL
  const eventId = req.params.eventId;
  console.log(`Обработка запроса отметки посещения для мероприятия: ${eventId}`);
  
  try {
    // Читаем HTML-файл
    let html = fs.readFileSync(path.join(__dirname, 'public', 'attend.html'), 'utf8');
    
    // Создаем объект с переменными окружения
    const clientEnv = getClientEnv();
    
    // Добавляем скрипт, который передаст переменные окружения в клиентский код
    const envScript = `<script>window.ENV = ${JSON.stringify(clientEnv)};</script>`;
    
    // Вставляем скрипт перед закрывающим тегом head
    html = html.replace('</head>', `${envScript}</head>`);
    
    // Отправляем HTML с внедренными переменными окружения
    res.send(html);
  } catch (error) {
    console.error('Ошибка при обработке запроса отметки посещения:', error);
    res.status(500).send('Ошибка сервера при обработке запроса отметки посещения');
  }
});

// Обработчик для главной страницы и всех остальных маршрутов SPA
app.get('/', (req, res) => {
  try {
    // Читаем HTML-файл
    let html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
    
    // Создаем объект с переменными окружения
    const clientEnv = getClientEnv();
    
    // Добавляем скрипт, который передаст переменные окружения в клиентский код
    const envScript = `<script>window.ENV = ${JSON.stringify(clientEnv)};</script>`;
    
    // Вставляем скрипт перед закрывающим тегом head
    html = html.replace('</head>', `${envScript}</head>`);
    
    // Отправляем HTML с внедренными переменными окружения
    res.send(html);
  } catch (error) {
    console.error('Ошибка при обработке запроса корневой страницы:', error);
    res.status(500).send('Ошибка сервера');
  }
});

// ПОСЛЕ обработчиков HTML-страниц настраиваем статические файлы
app.use(express.static('public'));

// Общий обработчик для всех остальных маршрутов SPA
app.get('*', (req, res) => {
  // Пропускаем обработку для статических файлов и API
  if (req.path.includes('.') || req.path.startsWith('/api/')) {
    return res.status(404).send('Файл не найден');
  }
  
  // Для любого другого маршрута возвращаем index.html с переменными окружения
  try {
    // Читаем HTML-файл
    let html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
    
    // Создаем объект с переменными окружения
    const clientEnv = getClientEnv();
    
    // Добавляем скрипт, который передаст переменные окружения в клиентский код
    const envScript = `<script>window.ENV = ${JSON.stringify(clientEnv)};</script>`;
    
    // Вставляем скрипт перед закрывающим тегом head
    html = html.replace('</head>', `${envScript}</head>`);
    
    // Отправляем HTML с внедренными переменными окружения
    res.send(html);
  } catch (error) {
    console.error('Ошибка при обработке запроса:', error);
    res.status(500).send('Ошибка сервера');
  }
});

// Запускаем сервер
app.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}`);
  console.log(`Корневой каталог: ${__dirname}`);
});