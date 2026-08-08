var parsedItems = [];
var textReportGlobal = '';

// --- 1. УПРАВЛЕНИЕ ТЕМАМИ ОФОРМЛЕНИЯ ---
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
window.matchMedia('(prefers-color-scheme: dark)').addListener(handleSystemThemeChange);

// ФУНКЦИЯ ПОЛНОЙ ОЧИСТКИ
function clearAll() {
    document.getElementById('inputText').value = '';
    document.getElementById('resultBox').style.display = 'none';
    parsedItems = [];
    textReportGlobal = '';
    document.getElementById('inputText').focus();
}

// --- 2. ПОСТРОЧНЫЙ УМНЫЙ ПОИСК ВЕЛИЧИН (АБСОЛЮТНАЯ ВСЕЯДНОСТЬ) ---
function calculate() {
    var rawText = document.getElementById('inputText').value;
    if (!rawText.trim()) return alert("Введите текст");
    
    var normalizedText = rawText.replace(/(\d+),(\d+)/g, '$1.$2');
    var lines = normalizedText.split('\n');
    parsedItems = [];
    
    var itemIndex = 1;
    var startPosAccumulator = 0;

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var trimmedLine = line.trim();
        var lineLength = line.length + 1; // +1 для учета \n
        
        if (!trimmedLine) {
            startPosAccumulator += lineLength;
            continue;
        }

        var lowerLine = trimmedLine.toLowerCase();
        
        // Защита от дат и сложных артикулов, чтобы они не перебивали габариты
        lowerLine = lowerLine.replace(/\d{2}\.\d{2}\.\d{4}/g, ' ');
        lowerLine = lowerLine.replace(/\d+[-/][a-z0-9]+/g, ' ');

        // ИСПРАВЛЕНО: Теперь ищем вообще любые идущие подряд числа в строке, 
        // разделители (*, /, х, пробелы) больше не имеют значения
        var numbers = lowerLine.match(/\d+(\.\d+)?/g);

        if (numbers && numbers.length >= 3) {
            var quantity = 1;
            var hasQ = false;

            // Ищем текстовые подсказки количества мест
            var qMatch = lowerLine.match(/(\d+(?:\.\d+)?)\s*(?:количество|кол-во|мест|шт|q)/) || 
                         lowerLine.match(/(?:количество|кол-во|мест|шт|q)\s*[:=-]?\s*(\d+(?:\.\d+)?)/);
                         
            if (qMatch) {
                quantity = parseFloat(qMatch[1]);
                hasQ = true;
            }

            var l = parseFloat(numbers[0]);
            var w = parseFloat(numbers[1]);
            var h = parseFloat(numbers[2]);

            // Если в строке нашлось 4-е число (неважно, после пробела или после слэша /)
            if (numbers.length >= 4 && !hasQ) {
                quantity = parseFloat(numbers[3]);
            }

            var unit = 'см', isDoubtful = false, msg = '', sum = l + w + h, max = Math.max(l,w,h), min = Math.min(l,w,h);
            
            if (/(?:^|[^а-яa-z])(мм|mm)(?:[^а-яa-z]|$)/.test(lowerLine)) unit = 'мм';
            else if (/(?:^|[^а-яa-z])(см|cm)(?:[^а-яa-z]|$)/.test(lowerLine)) unit = 'см';
            else if (/(?:^|[^а-яa-z])(м|m)(?:[^а-яa-z]|$)/.test(lowerLine)) unit = 'м';
            else {
                if (sum <= 30) { 
                    if (max > 5) { unit = 'см'; isDoubtful = true; msg = '⚠️ Расчет в см, но проверьте — возможно это метры?'; } else unit = 'м'; 
                }
                else if (sum <= 300) { unit = 'см'; isDoubtful = true; msg = '⚠️ Расчет в см, но проверьте — возможно это мм?'; }
                else if (sum <= 3000) {
                    if (max >= 1000 && min >= 100) unit = 'мм';
                    else if (min <= 25 || (l > 100 && w > 100 && h > 100)) { 
                        unit = 'см'; 
                        if(min > 25) { isDoubtful = true; msg = '⚠️ Расчет в см, но проверьте — возможно это мм?'; } 
                    }
                    else { unit = 'мм'; isDoubtful = true; msg = '⚠️ Расчет в мм, но проверьте — возможно это см?'; }
                } else unit = 'мм';
            }

            parsedItems.push({
                id: itemIndex++,
                start: startPosAccumulator,
                end: startPosAccumulator + line.length,
                isValid: true,
                l: l, w: w, h: h,
                quantity: quantity,
                unit: unit,
                isDoubtful: isDoubtful,
                msg: msg
            });
        }
        startPosAccumulator += lineLength;
    }

    if (parsedItems.length === 0) {
        parsedItems.push({ id: 1, isValid: false, start: 0, end: rawText.length });
    }
var parsedItems = [];
var textReportGlobal = '';

// --- 1. УПРАВЛЕНИЕ ТЕМАМИ ОФОРМЛЕНИЯ ---
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
window.matchMedia('(prefers-color-scheme: dark)').addListener(handleSystemThemeChange);

// ФУНКЦИЯ ПОЛНОЙ ОЧИСТКИ
function clearAll() {
    document.getElementById('inputText').value = '';
    document.getElementById('resultBox').style.display = 'none';
    parsedItems = [];
    textReportGlobal = '';
    document.getElementById('inputText').focus();
}

// --- 2. ПОСТРОЧНЫЙ УМНЫЙ ПОИСК ВЕЛИЧИН (АБСОЛЮТНАЯ ВСЕЯДНОСТЬ) ---
function calculate() {
    var rawText = document.getElementById('inputText').value;
    if (!rawText.trim()) return alert("Введите текст");
    
    var normalizedText = rawText.replace(/(\d+),(\d+)/g, '$1.$2');
    var lines = normalizedText.split('\n');
    parsedItems = [];
    
    var itemIndex = 1;
    var startPosAccumulator = 0;

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var trimmedLine = line.trim();
        var lineLength = line.length + 1; // +1 для учета \n
        
        if (!trimmedLine) {
            startPosAccumulator += lineLength;
            continue;
        }

        var lowerLine = trimmedLine.toLowerCase();
        
        // Защита от дат и сложных артикулов, чтобы они не перебивали габариты
        lowerLine = lowerLine.replace(/\d{2}\.\d{2}\.\d{4}/g, ' ');
        lowerLine = lowerLine.replace(/\d+[-/][a-z0-9]+/g, ' ');

        // ИСПРАВЛЕНО: Теперь ищем вообще любые идущие подряд числа в строке, 
        // разделители (*, /, х, пробелы) больше не имеют значения
        var numbers = lowerLine.match(/\d+(\.\d+)?/g);

        if (numbers && numbers.length >= 3) {
            var quantity = 1;
            var hasQ = false;

            // Ищем текстовые подсказки количества мест
            var qMatch = lowerLine.match(/(\d+(?:\.\d+)?)\s*(?:количество|кол-во|мест|шт|q)/) || 
                         lowerLine.match(/(?:количество|кол-во|мест|шт|q)\s*[:=-]?\s*(\d+(?:\.\d+)?)/);
                         
            if (qMatch) {
                quantity = parseFloat(qMatch[1]);
                hasQ = true;
            }

            var l = parseFloat(numbers[0]);
            var w = parseFloat(numbers[1]);
            var h = parseFloat(numbers[2]);

            // Если в строке нашлось 4-е число (неважно, после пробела или после слэша /)
            if (numbers.length >= 4 && !hasQ) {
                quantity = parseFloat(numbers[3]);
            }

            var unit = 'см', isDoubtful = false, msg = '', sum = l + w + h, max = Math.max(l,w,h), min = Math.min(l,w,h);
            
            if (/(?:^|[^а-яa-z])(мм|mm)(?:[^а-яa-z]|$)/.test(lowerLine)) unit = 'мм';
            else if (/(?:^|[^а-яa-z])(см|cm)(?:[^а-яa-z]|$)/.test(lowerLine)) unit = 'см';
            else if (/(?:^|[^а-яa-z])(м|m)(?:[^а-яa-z]|$)/.test(lowerLine)) unit = 'м';
            else {
                if (sum <= 30) { 
                    if (max > 5) { unit = 'см'; isDoubtful = true; msg = '⚠️ Расчет в см, но проверьте — возможно это метры?'; } else unit = 'м'; 
                }
                else if (sum <= 300) { unit = 'см'; isDoubtful = true; msg = '⚠️ Расчет в см, но проверьте — возможно это мм?'; }
                else if (sum <= 3000) {
                    if (max >= 1000 && min >= 100) unit = 'мм';
                    else if (min <= 25 || (l > 100 && w > 100 && h > 100)) { 
                        unit = 'см'; 
                        if(min > 25) { isDoubtful = true; msg = '⚠️ Расчет в см, но проверьте — возможно это мм?'; } 
                    }
                    else { unit = 'мм'; isDoubtful = true; msg = '⚠️ Расчет в мм, но проверьте — возможно это см?'; }
                } else unit = 'мм';
            }

            parsedItems.push({
                id: itemIndex++,
                start: startPosAccumulator,
                end: startPosAccumulator + line.length,
                isValid: true,
                l: l, w: w, h: h,
                quantity: quantity,
                unit: unit,
                isDoubtful: isDoubtful,
                msg: msg
            });
        }
        startPosAccumulator += lineLength;
    }

    if (parsedItems.length === 0) {
        parsedItems.push({ id: 1, isValid: false, start: 0, end: rawText.length });
    }
