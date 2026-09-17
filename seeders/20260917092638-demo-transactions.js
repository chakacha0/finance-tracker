'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
     await queryInterface.bulkInsert('Transactions', [
      { amount: 50000, type: 'income', category: 'Зарплата', description: 'Аванс', date: '2026-09-01', isRecurring: true, createdAt: new Date(), updatedAt: new Date() },
      { amount: 1200, type: 'expense', category: 'Продукты', description: 'Магазин', date: '2026-09-02', isRecurring: false, createdAt: new Date(), updatedAt: new Date() },
      { amount: 800, type: 'expense', category: 'Транспорт', description: 'Такси', date: '2026-09-03', isRecurring: false, createdAt: new Date(), updatedAt: new Date() }
    ]);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Transactions', null, {});
  }
};
