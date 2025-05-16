/**
 * Упрощенная версия Cloud Functions для бесплатного тарифа Firebase
 * 
 * ВАЖНО: Данный файл предназначен только для демонстрационных целей
 * В бесплатном тарифе Firebase Spark Cloud Functions недоступны
 * 
 * Логика отправки уведомлений перенесена на клиентскую сторону в notifications.js
 */

// Примечание: Если вы хотите использовать Cloud Functions, 
// необходимо перейти на тарифный план Blaze (оплата по факту использования)

/*
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Инициализация Firebase Admin SDK
admin.initializeApp();

// Простая функция для демонстрации
exports.helloWorld = functions.https.onRequest((request, response) => {
  response.send("Привет от Firebase!");
});
*/

// Комментарий: Вместо серверных функций для отправки уведомлений
// используется клиентская логика в файле notifications.js