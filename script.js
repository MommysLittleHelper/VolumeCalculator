// =========================================================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ХРАНЕНИЯ ДАННЫХ
// =========================================================================
var parsedItems = [];
var textReportGlobal = '';

// =========================================================================
// 1. УПРАВЛЕНИЕ ТЕМАМИ ОФОРМЛЕНИЯ
// =========================================================================
function setTheme(theme) {
    var buttons = document.querySelectorAll('.theme-switch button');
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].classList.remove('active');
    }
    
    var activeBtn = document.getElementById('theme-' + theme);
    if (activeBtn) activeBtn.classList.add('active');
    localStorage.setItem('user-theme', theme);
    
    var isDark = false;
    if (theme === 'system') {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else {
        isDark = (theme === 'dark');
    }
    
    document.documentElement.className = isDark ? 'dark' : 'light';
}

function handleSystemThemeChange() {
    if (localStorage.getItem('user-theme') === 'system') setTheme('system');
}

// Отслеживание системной темы
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', handleSystemThemeChange);

// ФУНКЦИЯ ПОЛНОЙ ОЧИСТКИ ИНТЕРФЕЙСА
function clearAll() {
    var inputText = document.getElementById('inputText');
    var resultBox = document.getElementById('resultBox');
    if (inputText) inputText.value = '';
    if (resultBox) resultBox.style.display = 'none';
    parsedItems = [];
    textReportGlobal = '';
    if (inputText) inputText.focus();
}

// =========================================================================
// 2. ПОСТРОЧНЫЙ УМНЫЙ ПОИСК ВЕЛИЧИН (АБСОЛЮТНАЯ ВСЕЯДНОСТЬ)
// =========================================================================
function calculate() {
    var rawText = document.getElementById('inputText').value;
    if (!rawText.trim()) return alert("Введите текст");
    
    // Нормализация запятых в числах (замена на точки для parseFloat)
    var normalizedText = rawText.replace(/(\d+),(\d+)/g, '$1.$2');
    var lines = normalizedText.split('\n');
    parsedItems = [];
    
    var itemIndex = 1;
    var startPosAccumulator = 0;

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var trimmedLine = line.trim();
        var lineLength = line.length + 1; // +1 для учета символа переноса \n
        
        if (!trimmedLine) {
            startPosAccumulator += lineLength;
            continue;
        }

        var lowerLine = trimmedLine.toLowerCase();
        
        // УДАЛЕНИЕ ШУМА: Стираем слова "Позиция 1", "Груз 2" в любом регистре (флаг i)
        lowerLine = lowerLine.replace(/(?:позиция|поз|строка|груз|коробка|короб|ящик|паллет)\s*\d+\s*[:.\-——–]?/gi, ' ');
        
        // Полное удаление знаков № вместе с их цифрами [2]
        lowerLine = lowerLine.replace(/№\s*\d+/g, ' ');
        
        // Защита от дат (07.08.2026) [2]
        lowerLine = lowerLine.replace(/\d{2}\.\d{2}\.\d{4}/g, ' ');
        
        // Защита от артикулов (ищет обязательные буквы после дефиса, не ломая запись 80-120-160) [2]
        lowerLine = lowerLine.replace(/\d+-[a-z][a-z0-9]*/g, ' ');
        lowerLine = lowerLine.replace(/\d+\/[a-z][a-z0-9]*/g, ' ');

        // Ищем все числа внутри ЭТОЙ конкретной строки [2]
        var numbers = lowerLine.match(/\d+(\.\d+)?/g);
        if (numbers && numbers.length >= 3) {
            var quantity = 1;
            var hasQ = false;

// ИСПРАВЛЕНО: Добавлены все виды тире (дефис, среднее, длинное) для слитного написания "количество-4шт"
var qMatch = lowerLine.match(/(\d+(?:\.\d+)?)\s*(?:количество|кол-во|мест|шт|штук|штуки|q)/) || 
             lowerLine.match(/(?:количество|кол-во|мест|шт|штук|штуки|q)\s*[:=\-——–]?\s*(\d+(?:\.\d+)?)/);

                         
            if (qMatch) {
                var matchedValue = qMatch[1] || qMatch[2];
                var parsedQ = parseFloat(matchedValue);
                if (!isNaN(parsedQ)) {
                    quantity = parsedQ;
                    hasQ = true;
                }
            }
            // ИСПРАВЛЕНО: Четко берем 1-е, 2-е и 3-е числа из массива габаритов
            var l = parseFloat(numbers[0]);
            var w = parseFloat(numbers[1]);
            var h = parseFloat(numbers[2]);

            // Если количество не нашли текстом, но в строке есть 4-е число — берем строго 4-й элемент массива
            if (numbers.length >= 4 && !hasQ) {
                var parsedQ4 = parseFloat(numbers[3]);
                if (!isNaN(parsedQ4)) {
                    quantity = parsedQ4;
                }
            }

            var unit = 'см';
            var isDoubtful = false;
            var msg = '';
            var sum = l + w + h;
            var max = Math.max(l, w, h);
            var min = Math.min(l, w, h);
            
            // Проверка явного указания единиц измерения в тексте строки с безопасными границами слов
            if (/(?:^|[^а-яa-z])(мм|mm)(?:[^а-яa-z]|$)/.test(lowerLine)) {
                unit = 'мм';
            } else if (/(?:^|[^а-яa-z])(см|cm)(?:[^а-яa-z]|$)/.test(lowerLine)) {
                unit = 'см';
            } else if (/(?:^|[^а-яa-z])(м|m|метр|метров|метра|meter)(?:[^а-яa-z]|$)/.test(lowerLine)) {
                unit = 'м';
            } else {
                // Ваша эвристика автоматического определения (если единицы не указаны явно)
                if (sum <= 30) { 
                    if (max > 5) { 
                        unit = 'см'; 
                        isDoubtful = true; 
                        msg = '⚠️ Расчет в см, но проверьте — возможно это метры?'; 
                    } else {
                        unit = 'м'; 
                    }
                } else if (sum <= 300) { 
                    unit = 'см'; 
                    isDoubtful = true; 
                    msg = '⚠️ Расчет в см, но проверьте — возможно это мм?'; 
                } else if (sum <= 3000) {
                    if (max >= 1000 && min >= 100) {
                        unit = 'мм';
                    } else if (min <= 25 || (l > 100 && w > 100 && h > 100)) { 
                        unit = 'см'; 
                        if (min > 25) { 
                            isDoubtful = true; 
                            msg = '⚠️ Расчет в см, но проверьте — возможно это мм?'; 
                        } 
                    } else { 
                        unit = 'мм'; 
                        isDoubtful = true; 
                        msg = '⚠️ Расчет в мм, но проверьте — возможно это см?'; 
                    }
                } else {
                    unit = 'мм';
                }
            }

            parsedItems.push({
                id: itemIndex++,
                start: startPosAccumulator,
                end: startPosAccumulator + line.length,
                isValid: true,
                l: l, 
                w: w, 
                h: h,
                quantity: quantity,
                unit: unit,
                isDoubtful: isDoubtful,
                msg: msg
            });
        }
        startPosAccumulator += lineLength;
    }

    // Если во всем тексте не нашлось ни одной валидной строки
    if (parsedItems.length === 0) {
        parsedItems.push({ id: 1, isValid: false, start: 0, end: rawText.length });
    }

    // Показываем блок массовых операций, если успешно распознано больше 1 позиции
    var bulkBox = document.getElementById('bulkActions');
    if (bulkBox) {
        var validCount = parsedItems.filter(function(x) { return x.isValid; }).length;
        bulkBox.style.display = validCount > 1 ? 'flex' : 'none';
    }
    
    renderResults();
}
// =========================================================================
// 3. ОТРИСОВКА РЕЗУЛЬТАТОВ НА ЭКРАН И ГЕНЕРАЦИЯ ОТЧЕТА
// =========================================================================
function renderResults() {
    var totalVolume = 0, totalPieces = 0, detailsHtml = '', textReport = '📊 ОТЧЕТ ПО РАСЧЕТУ ОБЪЕМА:\n\n';
    
    for (var i = 0; i < parsedItems.length; i++) {
        var item = parsedItems[i];
        if (item.isValid) {
            var div = item.unit === 'мм' ? 1000000000 : (item.unit === 'м' ? 1 : 1000000);
            var vol = (item.l * item.w * item.h * item.quantity) / div;
            totalVolume += vol; 
            totalPieces += item.quantity;
            
            var warnClass = item.isDoubtful ? 'warning-line' : '';
            var mAct = item.unit === 'м' ? 'active' : '';
            var cmAct = item.unit === 'см' ? 'active' : '';
            var mmAct = item.unit === 'мм' ? 'active' : '';
            
            detailsHtml += '<div class="detail-line ' + warnClass + '" data-start="' + item.start + '" data-end="' + item.end + '">' +
                'Позиция ' + item.id + ': ' + item.l + 'x' + item.w + 'x' + item.h + ' ' +
                '<div class="badge-group">' +
                    '<button class="btn-badge ' + mAct + '" data-i="' + i + '" data-unit="м">м</button>' +
                    '<button class="btn-badge ' + cmAct + '" data-i="' + i + '" data-unit="см">см</button>' +
                    '<button class="btn-badge ' + mmAct + '" data-i="' + i + '" data-unit="мм">мм</button>' +
                '</div> × ' + item.quantity + ' шт. = <strong>' + vol.toFixed(4) + '</strong> м³' +
                (item.isDoubtful ? '<div class="warning-text">' + item.msg + '</div>' : '') +
            '</div>';
            
            textReport += '• Позиция ' + item.id + ': ' + item.l + 'x' + item.w + 'x' + item.h + ' ' + item.unit + ' × ' + item.quantity + ' шт. = ' + vol.toFixed(4) + ' м³\n' + (item.isDoubtful ? '  ' + item.msg + '\n' : '');
        } else {
            detailsHtml += '<div class="detail-line" style="color:#ef4444; border-left:4px solid #ef4444;">❌ В тексте не найдено подходящих групп из 3 или 4 чисел.</div>';
        }
    }
    
    document.getElementById('totalVolume').innerHTML = '<strong>' + totalVolume.toFixed(4) + '</strong> м³';
    document.getElementById('totalPieces').innerText = totalPieces + ' шт.';
    document.getElementById('detailsList').innerHTML = detailsHtml;
    document.getElementById('resultBox').style.display = 'block';
    
    var copyBtn = document.getElementById('copyBtn');
    if (copyBtn) copyBtn.innerText = '📋 Скопировать отчет';
    
    textReportGlobal = textReport + '\n\n🚚 ОБЩИЙ ОБЪЕМ: ' + totalVolume.toFixed(4) + ' м³\n🔢 ВСЕГО МЕСТ: ' + totalPieces + ' шт.';
}

function highlightTextRange(start, end) {
    setTimeout(function() {
        var textarea = document.getElementById('inputText');
        if (!textarea) return;
        textarea.setSelectionRange(start, end);
    }, 0);
}

// =========================================================================
// 4. ПРИВЯЗКА СОБЫТИЙ СТРАНИЦЫ (DOM)
// =========================================================================
document.addEventListener('DOMContentLoaded', function() {
    var mainTextarea = document.getElementById('inputText');
    if (mainTextarea) mainTextarea.focus();

    setTheme(localStorage.getItem('user-theme') || 'system');
    
    document.getElementById('theme-light').addEventListener('click', function() { setTheme('light'); });
    document.getElementById('theme-dark').addEventListener('click', function() { setTheme('dark'); });
    document.getElementById('theme-system').addEventListener('click', function() { setTheme('system'); });
    document.getElementById('calcBtn').addEventListener('click', calculate);
    
    document.getElementById('copyBtn').addEventListener('click', function() {
        navigator.clipboard.writeText(textReportGlobal).then(function() {
            var copyBtn = document.getElementById('copyBtn');
            copyBtn.innerText = '✅ Отчет скопирован!';
            setTimeout(function() { copyBtn.innerText = '📋 Скопировать отчет'; }, 2000);
        });
    });
    
    var clearButton = document.getElementById('clearBtn');
    if (clearButton) {
        clearButton.addEventListener('click', clearAll);
    }

    // Массовое изменение единиц измерения (.bulkActions)
    var bulkBox = document.getElementById('bulkActions');
    if (bulkBox) {
        bulkBox.addEventListener('click', function(e) {
            var btn = e.target.closest('.bulk-unit-btn');
            if (!btn) return;
            var targetUnit = btn.getAttribute('data-unit');
            for (var k = 0; k < parsedItems.length; k++) {
                if (parsedItems[k].isValid) {
                    parsedItems[k].unit = targetUnit;
                    parsedItems[k].isDoubtful = false;
                }
            }
            renderResults();
        });
    }

    // Подсветка исходного текста по клику на строчку готового отчета
    document.getElementById('detailsList').addEventListener('click', function(e) {
        var line = e.target.closest('.detail-line');
        if (!line || e.target.closest('.btn-badge')) return; // Пропускаем кнопки смены единиц
        
        var start = parseInt(line.getAttribute('data-start'));
        var end = parseInt(line.getAttribute('data-end'));
        if (!isNaN(start) && !isNaN(end)) {
            var textarea = document.getElementById('inputText');
            if (textarea) textarea.focus();
            highlightTextRange(start, end);
        }
    });

    // Индивидуальное переключение единиц (м, см, мм) по кнопкам-бейджам
    document.getElementById('detailsList').addEventListener('click', function(e) {
        var btn = e.target.closest('.btn-badge');
        if (!btn) return;
        var i = parseInt(btn.getAttribute('data-i'));
        var u = btn.getAttribute('data-unit'); 
        if (parsedItems[i]) {
            parsedItems[i].unit = u;
            parsedItems[i].isDoubtful = false;
            renderResults();
        }
    });

    // Авто-расчет при мгновенной вставке из буфера
    if (mainTextarea) {
        mainTextarea.addEventListener('paste', function() {
            setTimeout(calculate, 50);
        });
    }
});
