const { Server } = require('socket.io');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('./models');

const { PiggyBank, PiggyDeposit, PiggyMember } = db;

// roomId -> Map(socket.id -> userName): кто сейчас онлайн в каждой копилке
const online = new Map();

const roomKey = (id) => `piggy:${id}`;
const userRoomKey = (userId) => `user:${userId}`;

function getOnlineList(id) {
  const room = online.get(id);
  return room ? [...new Set(room.values())] : [];
}

// Код приглашения: 6 символов без похожих (0/O, 1/I)
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const makeCode = () =>
  Array.from({ length: 6 }, () => CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]).join('');

async function createUniqueCode() {
  for (let i = 0; i < 10; i++) {
    const code = makeCode();
    const exists = await PiggyBank.findOne({ where: { code } });
    if (!exists) return code;
  }
  throw new Error('Не удалось создать код, попробуйте ещё раз');
}

// DECIMAL в Sequelize приходит строкой, приводим к числам
const serializePiggy = (p) => ({
  id: p.id,
  name: p.name,
  goal: Number(p.goal),
  current: Number(p.current),
  createdBy: p.createdBy,
  code: p.code,
  createdAt: p.createdAt,
});

const serializeDeposit = (d) => ({
  id: d.id,
  piggyBankId: d.piggyBankId,
  userName: d.userName,
  amount: Number(d.amount),
  createdAt: d.createdAt,
});

const isMember = async (userId, piggyBankId) =>
  !!(await PiggyMember.findOne({ where: { userId, piggyBankId } }));

function initSockets(server) {
  const io = new Server(server, { cors: { origin: '*' } });

  function leaveRoom(socket) {
    const id = socket.data.roomId;
    if (!id) return;
    const room = online.get(id);
    if (room) {
      room.delete(socket.id);
      if (room.size === 0) online.delete(id);
    }
    socket.leave(roomKey(id));
    socket.data.roomId = null;
    io.to(roomKey(id)).emit('user:left', { userName: socket.data.userName, time: new Date() });
    io.to(roomKey(id)).emit('online:update', getOnlineList(id));
  }

  // Проверяем access-токен при подключении: без валидного токена сокет не открывается
  io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) return next(new Error('unauthorized'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.data.userId = decoded.id;
      socket.data.userName = String(decoded.email || 'user').split('@')[0];
      next();
    } catch (e) {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    const userName = socket.data.userName;
    console.log('User connected', socket.id, userName);

    // личная комната пользователя: сюда приходят события для всех его вкладок
    socket.join(userRoomKey(userId));

    // Список копилок, в которых состоит пользователь
    socket.on('piggybank:list', async (cb) => {
      try {
        const memberships = await PiggyMember.findAll({
          where: { userId },
          attributes: ['piggyBankId'],
        });
        const ids = memberships.map((m) => m.piggyBankId);
        const list = ids.length
          ? await PiggyBank.findAll({ where: { id: ids }, order: [['createdAt', 'DESC']] })
          : [];
        cb && cb({ ok: true, list: list.map(serializePiggy) });
      } catch (e) {
        cb && cb({ ok: false, error: e.message });
      }
    });

    // Создание копилки: создатель сразу становится участником
    socket.on('piggybank:create', async ({ name, goal }, cb) => {
      try {
        const g = Number(goal);
        if (!name || !name.trim() || !(g > 0)) throw new Error('Некорректные данные');

        const code = await createUniqueCode();
        const pb = await db.sequelize.transaction(async (t) => {
          const created = await PiggyBank.create(
            { name: name.trim().slice(0, 60), goal: g, createdBy: userName, code },
            { transaction: t }
          );
          await PiggyMember.create({ userId, piggyBankId: created.id }, { transaction: t });
          return created;
        });

        const data = serializePiggy(pb);
        // только владельцу (во все его вкладки), а не всем пользователям
        io.to(userRoomKey(userId)).emit('piggybank:created', data);
        cb && cb({ ok: true, piggybank: data });
      } catch (e) {
        cb && cb({ ok: false, error: e.message });
      }
    });

    // Вступление в копилку по коду приглашения
    socket.on('piggybank:join', async ({ code }, cb) => {
      try {
        const clean = String(code || '').trim().toUpperCase();
        if (!clean) throw new Error('Введите код');

        const pb = await PiggyBank.findOne({ where: { code: clean } });
        if (!pb) throw new Error('Копилка с таким кодом не найдена');

        const [, created] = await PiggyMember.findOrCreate({
          where: { userId, piggyBankId: pb.id },
        });

        const data = serializePiggy(pb);
        if (created) io.to(userRoomKey(userId)).emit('piggybank:created', data);
        cb && cb({ ok: true, piggybank: data });
      } catch (e) {
        cb && cb({ ok: false, error: e.message });
      }
    });

    // Вход в комнату копилки: только для участников
    socket.on('room:join', async (roomId, cb) => {
      try {
        const id = Number(roomId);
        if (!Number.isInteger(id) || id <= 0) throw new Error('Неверный id копилки');
        const pb = await PiggyBank.findByPk(id);
        if (!pb) throw new Error('Копилка не найдена');
        if (!(await isMember(userId, id))) throw new Error('Нет доступа к этой копилке');

        if (socket.data.roomId && socket.data.roomId !== id) leaveRoom(socket);

        socket.join(roomKey(id));
        socket.data.roomId = id;
        if (!online.has(id)) online.set(id, new Map());
        online.get(id).set(socket.id, userName);

        const deposits = await PiggyDeposit.findAll({
          where: { piggyBankId: id },
          order: [['createdAt', 'DESC']],
          limit: 50,
        });

        cb &&
          cb({
            ok: true,
            piggybank: serializePiggy(pb),
            history: deposits.reverse().map(serializeDeposit),
            online: getOnlineList(id),
          });

        socket.to(roomKey(id)).emit('user:joined', { userName, time: new Date() });
        io.to(roomKey(id)).emit('online:update', getOnlineList(id));
      } catch (e) {
        cb && cb({ ok: false, error: e.message });
      }
    });

    socket.on('room:leave', () => leaveRoom(socket));

    // Взнос. Сумму считает сервер, клиент шлёт только amount
    socket.on('deposit', async ({ amount }, cb) => {
      try {
        const id = socket.data.roomId;
        if (!id) throw new Error('Вы не в копилке');
        const value = Math.round(Number(amount) * 100) / 100;
        if (!Number.isFinite(value) || value <= 0) throw new Error('Некорректная сумма');

        // баланс и запись о взносе меняем в одной транзакции БД
        const { pb, dep } = await db.sequelize.transaction(async (t) => {
          const pb = await PiggyBank.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
          if (!pb) throw new Error('Копилка не найдена');
          pb.current = Math.round((Number(pb.current) + value) * 100) / 100;
          await pb.save({ transaction: t });
          const dep = await PiggyDeposit.create(
            { piggyBankId: id, userId, userName, amount: value },
            { transaction: t }
          );
          return { pb, dep };
        });

        io.to(roomKey(id)).emit('balance:update', {
          current: Number(pb.current),
          goal: Number(pb.goal),
          transaction: serializeDeposit(dep),
        });
        cb && cb({ ok: true });
      } catch (e) {
        cb && cb({ ok: false, error: e.message });
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected', socket.id);
      leaveRoom(socket);
    });
  });

  return io;
}

module.exports = initSockets;