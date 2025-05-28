// Глобальные переменные и константы
window.API_KEY = window.API_KEY || '91f59137-e3ae-4ec4-b8bd-420fef75a8c2';
window.BASE_URL = window.BASE_URL || 'http://cat-facts-api.std-900.ist.mospolytech.ru/api';
window.allTutors = window.allTutors || [];
window.orderModal = window.orderModal || null;
window.selectedCourse = window.selectedCourse || null;

let allTutors = [];
let orderModal = null;
let selectedCourse = null;

// Делаем функции глобальными
window.submitOrder = submitOrder;
window.showNotification = showNotification;
window.loadTutors = loadTutors;
window.displayTutors = displayTutors;
window.selectTutor = selectTutor;
window.calculatePrice = calculatePrice;

// Функция для отображения уведомлений
function showNotification(message, type = 'info') {
    const notifications = document.getElementById('notifications');
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show`;
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    notifications.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
}

// Загрузка репетиторов
async function loadTutors() {
    try {
        const response = await fetch(`${window.BASE_URL}/tutors?api_key=${window.API_KEY}`);
        if (!response.ok) {
            throw new Error('Ошибка при загрузке репетиторов');
        }
        window.allTutors = await response.json();
        displayTutors();
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка при загрузке репетиторов', 'danger');
    }
}

// Отображение репетиторов
function displayTutors() {
    const tutorsList = document.getElementById('tutorsList');
    const levelFilter = document.getElementById('languageLevel').value;
    
    let filteredTutors = window.allTutors;
    if (levelFilter) {
        filteredTutors = window.allTutors.filter(tutor => tutor.language_level === levelFilter);
    }

    tutorsList.innerHTML = '';
    
    if (filteredTutors.length === 0) {
        tutorsList.innerHTML = '<tr><td colspan="7" class="text-center">Репетиторы не найдены</td></tr>';
        return;
    }

    filteredTutors.forEach(tutor => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><img src="images/tutor-placeholder.jpg" class="tutor-photo" alt="${tutor.name}"></td>
            <td>${tutor.name}</td>
            <td>${tutor.language_level}</td>
            <td>${tutor.languages_spoken.join(', ')}</td>
            <td>${tutor.work_experience} лет</td>
            <td>${tutor.price_per_hour}₽/час</td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="selectTutor(${tutor.id})">
                    Выбрать
                </button>
            </td>
        `;
        tutorsList.appendChild(row);
    });
}

// Выбор репетитора
function selectTutor(tutorId) {
    const tutor = window.allTutors.find(t => t.id === tutorId);
    if (!tutor) return;

    const teacherSelect = document.getElementById('orderTeacherName');
    teacherSelect.innerHTML = `
        <option value="">Выберите репетитора</option>
        <option value="${tutor.id}" selected>${tutor.name} (${tutor.price_per_hour}₽/час)</option>
    `;

    // Заполняем даты на ближайшие 2 недели
    const dateSelect = document.getElementById('orderStartDate');
    dateSelect.innerHTML = '<option value="">Выберите дату</option>';
    
    const today = new Date();
    for(let i = 1; i <= 14; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const option = document.createElement('option');
        option.value = date.toISOString().split('T')[0];
        option.textContent = date.toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        dateSelect.appendChild(option);
    }

    // Заполняем время
    const timeSelect = document.getElementById('orderStartTime');
    timeSelect.innerHTML = '<option value="">Выберите время</option>';
    for(let i = 9; i <= 20; i++) {
        const option = document.createElement('option');
        option.value = `${i}:00`;
        option.textContent = `${i}:00`;
        timeSelect.appendChild(option);
    }

    // Показываем модальное окно
    window.orderModal.show();
}

// Отправка формы заказа
async function submitOrder(event) {
    event.preventDefault();
    console.log('Отправка формы...');

    try {
        // Получаем данные формы
        const teacherSelect = document.getElementById('orderTeacherName');
        const selectedOption = teacherSelect.options[teacherSelect.selectedIndex];
        
        if (!selectedOption || !selectedOption.value) {
            throw new Error('Не выбран репетитор');
        }

        const startDate = document.getElementById('orderStartDate').value;
        const startTime = document.getElementById('orderStartTime').value;
        const studentsCount = parseInt(document.getElementById('orderStudentsCount').value);

        if (!startDate) throw new Error('Выберите дату начала');
        if (!startTime) throw new Error('Выберите время начала');
        if (isNaN(studentsCount) || studentsCount < 1 || studentsCount > 20) {
            throw new Error('Количество студентов должно быть от 1 до 20');
        }

        // Получаем значения чекбоксов
        const supplementary = document.getElementById('supplementary').checked;
        const personalized = document.getElementById('personalized').checked;
        const intensiveCourse = document.getElementById('intensiveCourse').checked;
        const excursions = document.getElementById('excursions').checked;
        const assessment = document.getElementById('assessment').checked;
        const interactive = document.getElementById('interactive').checked;

        // Проверяем раннюю регистрацию (за месяц)
        const earlyRegistration = new Date(startDate) > new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        
        // Проверяем групповую скидку
        const groupEnrollment = studentsCount >= 5;

        // Получаем рассчитанную стоимость
        const totalPrice = parseInt(document.getElementById('orderTotalPrice').textContent);

        const orderData = {
            tutor_id: parseInt(selectedOption.value),
            course_id: selectedCourse ? selectedCourse.id : null,
            date: startDate,
            time: startTime,
            duration: 8,
            persons: studentsCount,
            price: totalPrice,
            early_registration: earlyRegistration,
            group_enrollment: groupEnrollment,
            intensive_course: intensiveCourse,
            supplementary: supplementary,
            personalized: personalized,
            excursions: excursions,
            assessment: assessment,
            interactive: interactive
        };

        console.log('Отправляем данные:', orderData);
        console.log('URL:', `${window.BASE_URL}/orders?api_key=${window.API_KEY}`);

        const response = await fetch(`${window.BASE_URL}/orders?api_key=${window.API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });

        console.log('Статус ответа:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Ошибка от сервера:', errorText);
            throw new Error(`Ошибка при отправке заявки: ${response.status}`);
        }

        const result = await response.json();
        console.log('Ответ сервера:', result);

        // Закрываем модальное окно и очищаем форму
        const modal = document.getElementById('orderModal');
        const bootstrapModal = bootstrap.Modal.getInstance(modal);
        bootstrapModal.hide();
        
        document.getElementById('orderForm').reset();
        showNotification('Заявка успешно отправлена!', 'success');

    } catch (error) {
        console.error('Ошибка:', error);
        showNotification(error.message, 'danger');
    }
}

// Функция расчета стоимости
function calculatePrice() {
    const teacherSelect = document.getElementById('orderTeacherName');
    const selectedOption = teacherSelect.options[teacherSelect.selectedIndex];
    const studentsCount = parseInt(document.getElementById('orderStudentsCount').value) || 1;
    
    if (!selectedOption || !selectedOption.value) {
        document.getElementById('orderTotalPrice').textContent = '0';
        return;
    }

    // Получаем базовую стоимость из текста опции
    const priceMatch = selectedOption.textContent.match(/(\d+)₽\/час/);
    if (!priceMatch) {
        document.getElementById('orderTotalPrice').textContent = '0';
        return;
    }

    let totalPrice = parseInt(priceMatch[1]); // Базовая стоимость в час

    // Умножаем на количество недель и часов в неделю
    const duration = selectedCourse ? selectedCourse.total_length : 8;
    const weekLength = selectedCourse ? selectedCourse.week_length : 8;
    totalPrice = totalPrice * duration * weekLength;

    // Наценки за опции
    if (document.getElementById('supplementary').checked) {
        totalPrice += 2000 * studentsCount;
    }
    if (document.getElementById('personalized').checked) {
        totalPrice += 1500 * duration;
    }
    if (document.getElementById('intensiveCourse').checked) {
        totalPrice *= 1.2;
    }
    if (document.getElementById('excursions').checked) {
        totalPrice *= 1.25;
    }
    if (document.getElementById('assessment').checked) {
        totalPrice += 300;
    }
    if (document.getElementById('interactive').checked) {
        totalPrice *= 1.5;
    }

    // Групповая скидка
    if (studentsCount >= 5) {
        totalPrice *= 0.85; // 15% скидка для групп от 5 человек
    }

    // Округляем до целых
    totalPrice = Math.round(totalPrice);
    document.getElementById('orderTotalPrice').textContent = totalPrice;
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('Страница загружена');
    
    // Инициализируем модальное окно
    const modalElement = document.getElementById('orderModal');
    if (modalElement) {
        window.orderModal = new bootstrap.Modal(modalElement);
    }
    
    // Загружаем репетиторов
    loadTutors();
    
    // Добавляем обработчики событий
    const languageLevel = document.getElementById('languageLevel');
    if (languageLevel) {
        languageLevel.addEventListener('change', displayTutors);
    }
    
    // Добавляем обработчики для расчета стоимости
    const teacherSelect = document.getElementById('orderTeacherName');
    const studentsCount = document.getElementById('orderStudentsCount');
    
    if (teacherSelect) {
        teacherSelect.addEventListener('change', calculatePrice);
    }
    if (studentsCount) {
        studentsCount.addEventListener('input', calculatePrice);
    }
    
    // Добавляем обработчики для чекбоксов
    const checkboxes = document.querySelectorAll('#orderForm input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', calculatePrice);
    });
    
    console.log('Инициализация завершена');
}); 