const API_KEY = '91f59137-e3ae-4ec4-b8bd-420fef75a8c2';
const BASE_URL = 'http://cat-facts-api.std-900.ist.mospolytech.ru/api';
const ITEMS_PER_PAGE = 10;
let currentPage = 1;
let allCourses = [];
let selectedCourse = null;
const orderModal = new bootstrap.Modal(document.getElementById('orderModal'));

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

// Функция для загрузки курсов
async function loadCourses() {
    try {
        const response = await fetch(`${BASE_URL}/courses?api_key=${API_KEY}`);
        if (!response.ok) {
            throw new Error('Ошибка при загрузке курсов');
        }
        allCourses = await response.json();
        displayCourses();
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('Ошибка при загрузке курсов', 'danger');
    }
}

// Функция для отображения курсов
function displayCourses() {
    const coursesList = document.getElementById('coursesList');
    const searchQuery = document.getElementById('courseSearch').value.toLowerCase();
    const levelFilter = document.getElementById('levelFilter').value;
    
    let filteredCourses = allCourses;
    
    if (searchQuery || levelFilter) {
        filteredCourses = allCourses.filter(course => {
            const matchesSearch = !searchQuery || course.name.toLowerCase().includes(searchQuery);
            const matchesLevel = !levelFilter || course.level === levelFilter;
            return matchesSearch && matchesLevel;
        });
    }

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const coursesToShow = filteredCourses.slice(startIndex, endIndex);

    coursesList.innerHTML = '';

    coursesToShow.forEach(course => {
        const card = document.createElement('div');
        card.className = 'col-md-6 col-lg-4 mb-4';
        card.innerHTML = `
            <div class="card h-100">
                <div class="card-body">
                    <h5 class="card-title">${course.name}</h5>
                    <p class="card-text">
                        <small class="text-muted">Уровень: ${course.level}</small><br>
                        <small class="text-muted">Длительность: ${course.total_length} недель</small><br>
                        <small class="text-muted">Преподаватель: ${course.teacher}</small>
                    </p>
                    <button class="btn btn-primary" onclick="selectCourse(${course.id})">
                        Выбрать курс
                    </button>
                </div>
            </div>
        `;
        coursesList.appendChild(card);
    });

    updatePagination(filteredCourses.length);
}

// Функция для обновления пагинации
function updatePagination(totalItems) {
    const pagination = document.getElementById('pagination');
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    
    pagination.innerHTML = '';

    for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${currentPage === i ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
        li.onclick = (e) => {
            e.preventDefault();
            currentPage = i;
            displayCourses();
        };
        pagination.appendChild(li);
    }
}

// Функция инициализации формы заказа с датами из API
function initializeOrderForm(startDates) {
    const dateSelect = document.getElementById('orderStartDate');
    const timeSelect = document.getElementById('orderStartTime');
    
    // Очищаем селекты
    dateSelect.innerHTML = '<option value="">Выберите дату</option>';
    timeSelect.innerHTML = '<option value="">Выберите время</option>';
    
    // Создаем Map для группировки времени по датам
    const dateTimeMap = new Map();
    
    startDates.forEach(datetime => {
        const date = new Date(datetime);
        const dateStr = date.toISOString().split('T')[0];
        const timeStr = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        
        if (!dateTimeMap.has(dateStr)) {
            dateTimeMap.set(dateStr, new Set());
        }
        dateTimeMap.get(dateStr).add(timeStr);
    });

    // Сортируем даты
    const sortedDates = Array.from(dateTimeMap.keys()).sort();
    
    // Заполняем select с датами
    sortedDates.forEach(date => {
        const option = document.createElement('option');
        option.value = date;
        // Форматируем дату для отображения
        const displayDate = new Date(date).toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        option.textContent = displayDate;
        dateSelect.appendChild(option);
    });

    // Добавляем обработчик изменения даты
    dateSelect.addEventListener('change', () => {
        const selectedDate = dateSelect.value;
        timeSelect.innerHTML = '<option value="">Выберите время</option>';
        
        if (selectedDate && dateTimeMap.has(selectedDate)) {
            // Сортируем времена для выбранной даты
            const times = Array.from(dateTimeMap.get(selectedDate)).sort();
            times.forEach(time => {
                const option = document.createElement('option');
                option.value = time;
                option.textContent = time;
                timeSelect.appendChild(option);
            });
        }
    });
}

// Функция расчета стоимости
function calculatePrice() {
    const teacherSelect = document.getElementById('orderTeacherName');
    const selectedTutorId = parseInt(teacherSelect.value);
    const studentsCount = parseInt(document.getElementById('orderStudentsCount').value) || 1;
    const duration = parseInt(selectedCourse.total_length) || 1;

    // Если репетитор не выбран, показываем 0
    if (!selectedTutorId) {
        document.getElementById('orderTotalPrice').textContent = '0';
        return;
    }

    // Находим выбранного репетитора
    const tutors = Array.from(teacherSelect.options).slice(1); // пропускаем первую опцию "Выберите репетитора"
    const selectedTutor = tutors.find(option => parseInt(option.value) === selectedTutorId);
    if (!selectedTutor) return;

    // Получаем базовую стоимость из текста опции
    const priceMatch = selectedTutor.textContent.match(/(\d+)₽\/час/);
    if (!priceMatch) return;

    let totalPrice = parseInt(priceMatch[1]); // Базовая стоимость в час

    // Умножаем на количество недель и добавляем наценки
    totalPrice = totalPrice * duration * 8; // 8 часов в неделю

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

// Выбор курса
async function selectCourse(courseId) {
    try {
        // Загружаем детальную информацию о курсе
        const courseResponse = await fetch(`${BASE_URL}/courses/${courseId}?api_key=${API_KEY}`);
        if (!courseResponse.ok) {
            throw new Error('Ошибка при загрузке информации о курсе');
        }
        const course = await courseResponse.json();
        selectedCourse = course;
        window.selectedCourse = course;
        console.log('Выбранный курс:', course);

        // Заполняем информацию о курсе
        document.getElementById('orderCourseName').value = course.name;
        document.getElementById('orderDuration').value = `${course.total_length} недель`;

        // Инициализируем форму заказа с датами из API
        initializeOrderForm(course.start_dates);

        // Загружаем репетиторов для конкретного курса
        const tutorsResponse = await fetch(`${BASE_URL}/tutors?api_key=${API_KEY}`);
        if (!tutorsResponse.ok) {
            throw new Error(`Ошибка при загрузке репетиторов: ${tutorsResponse.status} ${tutorsResponse.statusText}`);
        }

        const tutors = await tutorsResponse.json();
        console.log('Загруженные репетиторы:', tutors);
        console.log('Уровень курса:', course.level);

        // Заполняем список репетиторов
        const teacherSelect = document.getElementById('orderTeacherName');
        teacherSelect.innerHTML = '<option value="">Выберите репетитора</option>';
        
        if (Array.isArray(tutors) && tutors.length > 0) {
            // Фильтруем репетиторов по уровню
            const filteredTutors = tutors.filter(tutor => {
                // Проверяем, преподает ли репетитор нужный язык
                const teachesLanguage = tutor.languages_offered.some(lang => 
                    course.name.toLowerCase().includes(lang.toLowerCase())
                );
                if (!teachesLanguage) return false;

                // Репетиторы Advanced уровня могут преподавать на всех уровнях
                if (tutor.language_level === 'Advanced') return true;
                
                // Репетиторы Intermediate уровня могут преподавать на Beginner и Intermediate
                if (tutor.language_level === 'Intermediate') {
                    return course.level === 'Beginner' || course.level === 'Intermediate';
                }
                
                // Репетиторы Beginner уровня могут преподавать только на Beginner
                return tutor.language_level === course.level;
            });

            if (filteredTutors.length > 0) {
                filteredTutors.forEach(tutor => {
                    const option = document.createElement('option');
                    option.value = tutor.id;
                    
                    // Формируем информацию о репетиторе
                    const languages = tutor.languages_spoken.join(', ');
                    const teachingLanguages = tutor.languages_offered.join(', ');
                    const tutorInfo = `${tutor.name} | Уровень: ${tutor.language_level} | Преподает: ${teachingLanguages} | Опыт: ${tutor.work_experience} лет | ${tutor.price_per_hour}₽/час | Языки общения: ${languages}`;
                    
                    option.textContent = tutorInfo;
                    teacherSelect.appendChild(option);
                });
            } else {
                teacherSelect.innerHTML = '<option value="">Нет подходящих репетиторов для данного курса</option>';
            }
        } else {
            teacherSelect.innerHTML = '<option value="">Нет доступных репетиторов</option>';
        }

        // Добавляем обработчики для расчета стоимости
        document.getElementById('orderTeacherName').addEventListener('change', calculatePrice);
        document.getElementById('orderStudentsCount').addEventListener('input', calculatePrice);
        
        const checkboxes = document.querySelectorAll('#orderForm input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', calculatePrice);
        });

        // Показываем модальное окно
        orderModal.show();

    } catch (error) {
        console.error('Ошибка:', error);
        showNotification(error.message, 'danger');
    }
}

// Функция для отображения репетиторов в таблице
async function displayTutors() {
    try {
        console.log('Начинаем загрузку репетиторов...');
        
        // Загружаем репетиторов
        const response = await fetch(`${BASE_URL}/tutors?api_key=${API_KEY}`);
        if (!response.ok) {
            throw new Error('Ошибка при загрузке репетиторов');
        }
        const tutors = await response.json();
        console.log('Получены репетиторы с сервера:', tutors);

        // Получаем значения фильтров
        const levelFilter = document.getElementById('languageLevel').value;
        
        // Отображаем репетиторов
        const tutorsList = document.getElementById('tutorsList');
        if (!tutorsList) {
            console.error('Не найден элемент tutorsList');
            return;
        }
        
        tutorsList.innerHTML = '';

        // Фильтруем репетиторов, если выбран уровень
        let filteredTutors = tutors;
        if (levelFilter) {
            filteredTutors = tutors.filter(tutor => tutor.language_level === levelFilter);
        }

        // Отображаем репетиторов
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

        console.log('Завершено отображение репетиторов');

    } catch (error) {
        console.error('Произошла ошибка:', error);
        showNotification('Ошибка при загрузке репетиторов', 'danger');
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    loadCourses();
    displayTutors(); // Добавляем загрузку репетиторов
    
    // Обработчики для фильтров курсов
    document.getElementById('courseSearch').addEventListener('input', () => {
        currentPage = 1;
        displayCourses();
    });

    document.getElementById('levelFilter').addEventListener('change', () => {
        currentPage = 1;
        displayCourses();
    });

    // Обработчики для фильтров репетиторов
    document.getElementById('languageLevel').addEventListener('change', displayTutors);
    document.getElementById('timeFrom').addEventListener('change', displayTutors);
    document.getElementById('timeTo').addEventListener('change', displayTutors);
    
    // Обработчики для чекбоксов дней недели
    const dayCheckboxes = document.querySelectorAll('input[type="checkbox"][id^="day"]');
    dayCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', displayTutors);
    });
}); 