function validatePassword(password) {
  const errors = [];

  if (typeof password !== "string") {
    return ["Пароль должен быть строкой"];
  }

  if (password.length < 8) {
    errors.push("Пароль должен содержать минимум 8 символов");
  }
  if (!/[A-ZА-ЯЁ]/.test(password)) {
    errors.push("Добавьте хотя бы одну заглавную букву");
  }
  if (!/[a-zа-яё]/.test(password)) {
    errors.push("Добавьте хотя бы одну строчную букву");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Добавьте хотя бы одну цифру");
  }
  if (!/[^A-Za-zА-Яа-яЁё0-9\s]/.test(password)) {
    errors.push("Добавьте хотя бы один спецсимвол (например ! @ # $ % &)");
  }

  return errors;
}

module.exports = validatePassword;
