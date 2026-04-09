document.addEventListener('DOMContentLoaded', () => {
    const inputWrapper = document.getElementById('inputWrapper');
    const outputWrapper = document.getElementById('outputWrapper');
    const addInputBtn = document.getElementById('addInputBtn');
    const generateBtn = document.getElementById('generateBtn');
    const platformRadios = document.querySelectorAll('input[name="platform"]');
    const platformOptions = document.querySelectorAll('.radio-option');

    let currentPlatform = 'melon';
    const savedInputs = {
        melon: [''],
        genie: '',
        flo: ''
    };

    const placeholders = {
        melon: '예시:\nhttps://www.melon.com/song/detail.htm?songId=32907450',
        genie: '예시:\nhttps://www.genie.co.kr/detail/songInfo?xgnm=93269771',
        flo: '예시:\nhttps://www.music-flo.com/detail/track/30911050/details'
    };

    function saveCurrentInputs(platform) {
        const textareas = Array.from(inputWrapper.querySelectorAll('.url-input'));

        if (platform === 'melon') {
            savedInputs.melon = textareas.map(textarea => textarea.value);
            if (savedInputs.melon.length === 0) {
                savedInputs.melon = [''];
            }
            return;
        }

        savedInputs[platform] = textareas[0]?.value || '';
    }

    function renderInputs() {
        inputWrapper.innerHTML = '';
        outputWrapper.innerHTML = '';

        addInputBtn.style.display = currentPlatform === 'melon' ? 'block' : 'none';

        if (currentPlatform === 'melon') {
            const restoredValues = savedInputs.melon.length > 0 ? savedInputs.melon : [''];
            restoredValues.forEach(value => addBox(value));
        } else {
            addBox(savedInputs[currentPlatform] || '');
        }
    }

    function addBox(initialValue = '') {
        const index = inputWrapper.children.length + 1;
        const div = document.createElement('div');
        div.className = 'input-block';

        let headerHtml = '';
        if (currentPlatform === 'melon') {
            headerHtml = `
                <div class="input-header">
                    <span>리스트 ${index} (엔터로 구분)</span>
                    ${index > 1 ? '<button type="button" class="delete-btn">삭제</button>' : '<span></span>'}
                </div>
            `;
        } else {
            headerHtml = '<div class="input-header"><span>음원 웹 주소 입력 (엔터로 구분)</span></div>';
        }

        div.innerHTML = `
            ${headerHtml}
            <textarea class="url-input" placeholder="${placeholders[currentPlatform]}"></textarea>
        `;

        const textarea = div.querySelector('.url-input');
        textarea.value = initialValue;

        const deleteButton = div.querySelector('.delete-btn');
        if (deleteButton) {
            deleteButton.addEventListener('click', () => {
                div.remove();
            });
        }

        inputWrapper.appendChild(div);
    }

    platformOptions.forEach(option => {
        option.addEventListener('click', e => {
            const clickedInput = e.target.closest('input[type="radio"]');
            if (clickedInput) return;

            const radio = option.querySelector('input[type="radio"]');
            if (!radio || radio.checked) return;

            radio.checked = true;
            radio.dispatchEvent(new Event('change', { bubbles: true }));
        });
    });

    platformRadios.forEach(radio => {
        radio.addEventListener('change', e => {
            saveCurrentInputs(currentPlatform);
            currentPlatform = e.target.value;
            renderInputs();
        });
    });

    addInputBtn.addEventListener('click', () => {
        addBox();
        const newestTextarea = inputWrapper.querySelector('.input-block:last-child .url-input');
        newestTextarea?.focus();
    });

    generateBtn.addEventListener('click', () => {
        saveCurrentInputs(currentPlatform);
        outputWrapper.innerHTML = '';

        const textareas = document.querySelectorAll('.url-input');

        if (currentPlatform === 'melon') {
            textareas.forEach((textarea, index) => {
                const { ids, hasDuplicates } = extractIds(textarea.value, currentPlatform);
                if (ids.length > 0) {
                    const finalUrl = `melonapp://play?menuid=0&ctype=1&cid=${ids.join(',')}`;
                    const warningMsg = hasDuplicates
                        ? `${index + 1}번 칸에 동일한 songId가 감지되었습니다. 멜론은 하나의 플레이리스트를 추가할 때 동일한 음원이 추가되지 않습니다.`
                        : '';
                    createOutputBlock(`멜론 리스트 ${index + 1} 결과`, finalUrl, warningMsg);
                }
            });
        } else if (currentPlatform === 'genie') {
            const { ids } = extractIds(textareas[0].value, currentPlatform);
            if (ids.length > 0) {
                const joinedIds = ids.join(';');
                const androidUrl = `cromegenie://scan/?landing_type=31&landing_target=${joinedIds}`;
                const iosUrl = `ktolleh00167://landing/?landing_type=31&landing_target=${joinedIds}`;

                createOutputBlock('안드로이드 (Android) 결과', androidUrl);
                createOutputBlock('아이폰 (iOS) 결과', iosUrl);
            }
        } else if (currentPlatform === 'flo') {
            const { ids } = extractIds(textareas[0].value, currentPlatform);
            if (ids.length > 0) {
                const finalUrl = `flomusic://play/track?ids=${ids.join(',')}`;
                createOutputBlock('플로 스밍 결과', finalUrl);
            }
        }

        if (outputWrapper.innerHTML === '') {
            outputWrapper.innerHTML = '<div class="error-message">유효한 음원 주소를 찾을 수 없습니다.</div>';
        }
    });

    function extractIds(text, platform) {
        const urls = text.split('\n').map(u => u.trim()).filter(u => u !== '');
        const ids = [];
        let hasDuplicates = false;
        const seen = new Set();

        urls.forEach(url => {
            let match = null;
            if (platform === 'melon') match = url.match(/songId=(\d+)/);
            if (platform === 'genie') match = url.match(/xgnm=(\d+)/);
            if (platform === 'flo') match = url.match(/\/track\/(\d+)\/details/);

            if (match) {
                const id = match[1];
                if (platform === 'melon' && seen.has(id)) {
                    hasDuplicates = true;
                }
                seen.add(id);
                ids.push(id);
            }
        });

        return { ids, hasDuplicates };
    }

    function createOutputBlock(title, url, warningMsg = '') {
        const div = document.createElement('div');
        div.className = 'output-block';

        const uniqueId = `out_${Math.random().toString(36).slice(2, 11)}`;
        const warningSpan = warningMsg ? `<span class="warning-text">${warningMsg}</span>` : '';

        div.innerHTML = `
            <label>${title} ${warningSpan}</label>
            <textarea id="${uniqueId}" readonly>${url}</textarea>
            <button type="button" class="btn-copy">복사하기</button>
        `;

        const copyButton = div.querySelector('.btn-copy');
        copyButton.addEventListener('click', () => {
            copyText(uniqueId);
        });

        outputWrapper.appendChild(div);
    }

    function copyText(elementId) {
        const textarea = document.getElementById(elementId);
        if (!textarea || !textarea.value) return;

        navigator.clipboard.writeText(textarea.value)
            .then(() => alert('클립보드에 복사되었습니다.'))
            .catch(() => {
                textarea.select();
                document.execCommand('copy');
                alert('클립보드에 복사되었습니다.');
            });
    }

    renderInputs();
});
