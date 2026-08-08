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
    document.getElementById('bulkActions').style.display = parsedItems.filter(function(x){return x.isValid;}).length > 1 ? 'flex' : 'none';
    renderResults();
}

// --- 3. ОТРИСОВКА РЕЗУЛЬТАТОВ НА ЭКРАН И ГЕНЕРАЦИЯ ОТЧЕТА ---
function renderResults() {
    var totalVolume = 0, totalPieces = 0, detailsHtml = '', textReport = '📊 ОТЧЕТ ПО РАСЧЕТУ ОБЪЕМА:\n\n';
    
    for (var i = 0; i < parsedItems.length; i++) {
        var item = parsedItems[i];
        if (item.isValid) {
            var div = item.unit === 'мм' ? 1000000000 : (item.unit === 'м' ? 1 : 1000000);
            var vol = (item.l * item.w * item.h * item.quantity) / div;
            totalVolume += vol; totalPieces += item.quantity;
            
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
        textarea.focus();
        textarea.setSelectionRange(start, end);
    }, 0);
}

// --- 4. ГЛАВНАЯ ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ СТРАНИЦЫ ---
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
            document.getElementById('copyBtn').innerText = '✅ Отчет скопирован!';
            setTimeout(function() { document.getElementById('copyBtn').innerText = '📋 Скопировать отчет'; }, 2000);
        });
    });
    
    var clearButton = document.getElementById('clearBtn');
    if (clearButton) {
        clearButton.addEventListener('click', clearAll);
    }

    document.getElementById('bulkActions').addEventListener('click', function(e) {
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

    document.getElementById('detailsList').addEventListener('mouseenter', function(e) {
        var line = e.target.closest('.detail-line');
        if (!line) return;
        var start = parseInt(line.getAttribute('data-start'));
        var end = parseInt(line.getAttribute('data-end'));
        if (!isNaN(start) && !isNaN(end)) highlightTextRange(start, end);
    }, true);

    document.getElementById('detailsList').addEventListener('click', function(e) {
        var btn = e.target.closest('.btn-badge');
        if (!btn) return;
        var i = parseInt(btn.getAttribute('data-i'));
        var u = btn.getAttribute('data-u');
        parsedItems[i].unit = u;
        parsedItems[i].isDoubtful = false;
        renderResults();
    });

    window.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
            var textarea = document.getElementById('inputText');
            if (document.activeElement !== textarea) {
                e.preventDefault();
                navigator.clipboard.readText().then(function(text) {
                    if (text) {
                        textarea.value = text;
                        calculate();
                        textarea.focus();
                    }
                });
            }
        }
    });
});
