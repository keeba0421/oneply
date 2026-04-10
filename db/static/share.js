document.addEventListener('DOMContentLoaded', () => {
    const toggleButtons = document.querySelectorAll('.toggle-btn');
    const inputArea = document.getElementById('inputArea');
    const resultArea = document.getElementById('resultArea');
    const generateBtn = document.getElementById('generateBtn');
    const listTitleInput = document.getElementById('listTitle');

    const fieldMeta = {
        melon1: { label: '멜론1', placeholder: '멜론 웹링크 또는 melonapp:// 링크' },
        melon2: { label: '멜론2', placeholder: '멜론 웹링크 또는 melonapp:// 링크' },
        melon3: { label: '멜론3', placeholder: '멜론 웹링크 또는 melonapp:// 링크' },
        melon4: { label: '멜론4', placeholder: '멜론 웹링크 또는 melonapp:// 링크' },
        melon_ios: { label: '멜론 iOS', placeholder: '멜론 웹링크 또는 melonapp:// 링크' },
        genie_android: { label: '지니 안드로이드', placeholder: '지니 웹링크 또는 cromegenie:// 링크' },
        genie_ios: { label: '지니 iOS', placeholder: '지니 웹링크 또는 ktolleh00167:// 링크' },
        flo: { label: '플로', placeholder: '플로 웹링크 또는 flomusic:// 링크' },
    };

    const activeFields = new Set();

    toggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            const field = button.dataset.field;
            if (!field || !fieldMeta[field]) return;

            button.classList.toggle('active');
            if (activeFields.has(field)) {
                activeFields.delete(field);
                removeInput(field);
            } else {
                activeFields.add(field);
                addInput(field);
            }
        });
    });

    function addInput(field) {
        const block = document.createElement('div');
        block.className = 'input-block';
        block.id = `block-${field}`;
        block.innerHTML = `
            <label for="input-${field}">${fieldMeta[field].label}</label>
            <input id="input-${field}" class="url-input" type="text" placeholder="${fieldMeta[field].placeholder}">
        `;
        inputArea.appendChild(block);
    }

    function removeInput(field) {
        const block = document.getElementById(`block-${field}`);
        if (block) block.remove();
    }

    generateBtn.addEventListener('click', async () => {
        const listTitle = listTitleInput ? listTitleInput.value.trim() : '';
        if (!listTitle) {
            resultArea.innerHTML = '<div class="result-error">리스트 제목을 입력해 주세요.</div>';
            listTitleInput?.focus();
            return;
        }

        const payload = {};
        activeFields.forEach(field => {
            const input = document.getElementById(`input-${field}`);
            payload[field] = input ? input.value.trim() : '';
        });

        resultArea.innerHTML = '';

        try {
            const response = await fetch('/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ list_title: listTitle, links: payload }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.detail || '생성에 실패했습니다.');
            }

            const absoluteUrl = `${window.location.origin}${data.short_url}`;
            resultArea.innerHTML = `
                <div class="result-success">생성 완료</div>
                <div class="result-title">${listTitle}</div>
                <div class="result-url">${absoluteUrl}</div>
                <button type="button" class="btn-secondary" id="copyBtn">복사하기</button>
            `;

            const copyBtn = document.getElementById('copyBtn');
            copyBtn?.addEventListener('click', async () => {
                await navigator.clipboard.writeText(absoluteUrl);
                copyBtn.textContent = '복사됨';
            });
        } catch (error) {
            resultArea.innerHTML = `<div class="result-error">${error.message}</div>`;
        }
    });
});
