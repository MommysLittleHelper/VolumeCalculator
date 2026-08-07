var parsedItems = [];
var textReportGlobal = '';

// --- 1. ИНИЦИАЛИЗАЦИЯ И НАСТРОЙКА КНОПОК ПРИ ЗАГРУЗКЕ ОКНА ---
document.addEventListener('DOMContentLoaded', function() {
    var mainTextarea = document.getElementById('inputText');
    if (mainTextarea) mainTextarea.focus();

    var theme = localStorage.getItem('user-theme') || 'system';
    var isDark = theme === 'system' ? window.matchMedia('(prefers-color-scheme: dark)').matches : theme === 'dark';
    document.documentElement.className = isDark ? 'dark' : 'light';
    if (document.getElementById('theme-' + theme)) {
        document.getElementById('theme-' + theme).classList.add('active');
    }

    document.querySelector('.theme-switch').addEventListener('click', function(e) {
        var btn = e.target.closest('button');
        if (!btn) return;
        localStorage.setItem('user-theme', btn.id.replace('theme-', ''));
        location.reload(); 
    });

    document.getElementById('calcBtn').addEventListener('click', calculate);

    document.getElementById('copyBtn').addEventListener('click', function() {
        if (!textReportGlobal) return;
        navigator.clipboard.writeText(textReportGlobal);
        var btn = document.getElementById('copyBtn');
        btn.innerText = '✅ Отчет скопирован!';
        setTimeout(function() { btn.innerText = '📋 Скопировать отчет'; }, 2000);
    });

    document.getElementById('resultBox').addEventListener('click', function(e) {
        var btn = e.target.closest('.btn-badge');
        if (!btn) return;
        var u = btn.getAttribute('data-unit');
        var idx = btn.getAttribute('data-i');

        if (btn.classList.contains('bulk-unit-btn')) {
            parsedItems.forEach(function(x) { if(x.isValid) { x.unit = u; x.isDoubtful = false; } });
        } else if (idx !== null) {
            parsedItems[parseInt(idx)].unit = u;
            parsedItems[parseInt(idx)].isDoubtful = false;
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

    window.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
            var textarea = document.getElementById('inputText');
            if (document.activeElement !== textarea) {
                textarea.focus();
                setTimeout(function() { calculate(); }, 10);
            }
        }
    });
});

// --- 2. УМНЫЙ ВСЕЯДНЫЙ ПОИСК ВЕЛИЧИН (СТРОГИЙ ЛОГИСТИЧЕСКИЙ РАЗБОР) ---
function calculate() {
    var rawText = document.getElementById('inputText').value;
    if (!rawText.trim()) return alert("Введите текст");
    
    // Заменяем запятые в дробях на точки
    var normalizedText = rawText.replace(/(\d+),(\d+)/g, '$1.$2');
    parsedItems = [];
    
    // Шаблон ищет три числа, разделенные типичными знаками: *, x, х (рус), /, мм, см, м или пробелами
    var blockRegex = /(\d+(?:\.\d+)?)\s*(?:\*|x|х|\/|мм|см|м|mm|cm|m|\s)\s*(\d+(?:\.\d+)?)\s*(?:\*|x|х|\/|мм|см|м|mm|cm|m|\s)\s*(\d+(?:\.\d+)?)/g;
    var match;
    var itemIndex = 1;

    while ((match = blockRegex.exec(normalizedText)) !== null) {
        var startPos = match.index;
        var endPos = blockRegex.lastIndex;
        
        var l = parseFloat(match[1]);
        var w = parseFloat(match[2]);
        var h = parseFloat(match[3]);
        
        // Отсекаем ложные срабатывания на датах (например, 06.08.2026 превращалось в 06, 08, 2026)
        // Если перед или после найденного блока стоят точки, это дата, пропускаем её
        if (normalizedText[startPos - 1] === '.' || normalizedText[endPos] === '.') {
            continue;
        }

        // Берем контекст вокруг найденных чисел (35 символов после), чтобы найти количество мест и единицы измерения
        var substringAfter = normalizedText.substring(endPos, endPos + 35).toLowerCase();
        var fullBlockText = match[0].toLowerCase() + substringAfter;
        
        var quantity = 1;
        var qMatch = substringAfter.match(/(\d+(?:\.\d+)?)\s*(?:количество|кол-во|мест|шт|q)/) || 
                     substringAfter.match(/(?:количество|кол-во|мест|шт|q)\s*[:=-]?\s*(\d+(?:\.\d+)?)/);
                     
        if (qMatch) {
            quantity = parseFloat(qMatch[1]);
        } else {
            // Если ключевых слов нет, ищем просто отдельно стоящее число после габаритов
            var nextNumMatch = substringAfter.match(/(?:^|[^.\d])(\d+(?:\.\d+)?)(?:[^.\d]|$)/);
            if (nextNumMatch) {
                quantity = parseFloat(nextNumMatch[1]);
            }
        }

        var unit = 'см', isDoubtful = false, msg = '', sum = l + w + h, max = Math.max(l,w,h), min = Math.min(l,w,h);
        
        // Проверяем единицы измерения
        if (/(?:^|[^а-яa-z])(мм|mm)(?:[^а-яa-z]|$)/.test(fullBlockText)) unit = 'мм';
        else if (/(?:^|[^а-яa-z])(см|cm)(?:[^а-яa-z]|$)/.test(fullBlockText)) unit = 'см';
        else if (/(?:^|[^а-яa-z])(м|m)(?:[^а-яa-z]|$)/.test(fullBlockText)) unit = 'м';
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
            start: startPos,
            end: endPos,
            isValid: true,
            l: l, w: w, h: h,
            quantity: quantity,
            unit: unit,
            isDoubtful: isDoubtful,
            msg: msg
        });
    }

    if (parsedItems.length === 0) {
        parsedItems.push({ id: 1, isValid: false, start: 0, end: rawText.length });
    }

    document.getElementById('bulkActions').style.display = parsedItems.filter(function(x){return x.isValid;}).length > 1 ? 'flex' : 'none';
    renderResults();
}

// --- 3. ОТРИСОВКА РЕЗУЛЬТАТОВ И СИСТЕМА ВЫДЕЛЕНИЯ ФРАГМЕНТОВ ---
function renderResults() {
    var totalVolume = 0, totalPieces = 0, detailsHtml = '', textReport = '📊 ОТЧЕТ ПО РАСЧЕТУ ОБЪЕМА:\n\n';
    
    for (var i = 0; i < parsedItems.length; i++) {
        var item = parsedItems[i];
        if (item.isValid) {
            var div = item.unit === 'мм' ? 1000000000 : (item.unit === 'м' ? 1 : 1000000);
            var vol = (item.l * item.w * item.h * item.quantity) / div;
            totalVolume += vol; totalPieces += item.quantity;
            
            detailsHtml += '<div class="detail-line ' + (item.isDoubtful ? 'warning-line' : '') + '" data-start="' + item.start + '" data-end="' + item.end + '">' +
                'Позиция ' + item.id + ': ' + item.l + 'x' + item.w + 'x' + item.h + ' ' +
                '<div class="badge-group">' +
                    '<button class="btn-badge ' + (item.unit==='м'?'active':'') + '" data-i="' + i + '" data-unit="м">м</button>' +
                    '<button class="btn-badge ' + (item.unit==='см'?'active':'') + '" data-i="' + i + '" data-unit="см">см</button>' +
                    '<button class="btn-badge ' + (item.unit==='мм'?'active':'') + '" data-i="' + i + '" data-unit="мм">мм</button>' +
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
