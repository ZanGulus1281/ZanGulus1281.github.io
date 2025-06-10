document.addEventListener('DOMContentLoaded', () => {
    // --- Constants ---
    const LS_KEYS = {
        SAVED_LISTS: 'dspWheelSavedLists',
        CURRENT_NAMES: 'dspWheelCurrentNames',
        CONTROLS_HIDDEN: 'dspWheelControlsHidden',
        VOLUME: 'dspWheelVolume',
        CUSTOM_BG: 'dspWheelCustomBackground',
        MUSIC_SOURCE: 'dspWheelMusicSource',
        MUSIC_URL_PREFIX: 'dspWheelMusicUrl_'
    };
    const DEFAULT_VOLUME = 50;
    const SPIN_ANIMATION_CSS = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
    const SPIN_DURATION_MS = 4000;
    const RESULT_MODAL_DELAY_MS = SPIN_DURATION_MS + 100;
    const COLORS = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
        '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
        '#10AC84', '#EE5A24', '#009432', '#0652DD', '#9980FA',
        '#EA2027', '#006BA6', '#0652DD', '#9980FA', '#EA2027'
    ];
    const PLACEHOLDER_TEXT_NO_NAMES = "Chưa có tên nào được thêm";
    const PLACEHOLDER_TEXT_NO_SAVED_LISTS = "Chưa có danh sách nào được lưu";
    const WHEEL_EMPTY_PLACEHOLDER_TEXT = "Thêm tên và nhấn 'Quay Ngay!'";

    // --- DOM Elements ---
    const wheelEl = document.getElementById('wheel');
    const spinBtn = document.getElementById('spinBtn');
    const namesBatchInput = document.getElementById('namesBatchInput');
    const addNamesBatchBtn = document.getElementById('addNamesBatchBtn');
    const shuffleNamesBtn = document.getElementById('shuffleNamesBtn');
    const namesListEl = document.getElementById('namesList');
    const nameCountEl = document.getElementById('nameCount');
    const clearAllNamesBtn = document.getElementById('clearAllNamesBtn');
    const listNameInput = document.getElementById('listNameInput');
    const saveListBtn = document.getElementById('saveListBtn');
    const savedListsContainer = document.getElementById('savedListsContainer');
    const resultModal = document.getElementById('resultModal');
    const winnerNameEl = document.getElementById('winnerName');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const musicSourceRadios = document.querySelectorAll('input[name="musicSource"]');
    const localMusicControlsEl = document.getElementById('localMusicControls');
    const urlMusicControlsEl = document.getElementById('urlMusicControls');
    const musicInput = document.getElementById('musicInput');
    const musicUrlInput = document.getElementById('musicUrlInput');
    const loadMusicUrlBtn = document.getElementById('loadMusicUrlBtn');
    const embeddedPlayerContainer = document.getElementById('embeddedPlayerContainer');
    const musicSourceNoteEl = document.querySelector('.music-source-note');
    const infoBannerEl = document.getElementById('infoBanner');
    const infoBannerTextEl = document.getElementById('infoBannerText');
    const playMusicBtn = document.getElementById('playMusicBtn');
    const stopMusicBtn = document.getElementById('stopMusicBtn');
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeValueDisplay = document.getElementById('volumeValue');
    const backgroundInput = document.getElementById('backgroundInput');
    const videoBackgroundEl = document.getElementById('videoBackground');
    const applyBackgroundBtn = document.getElementById('applyBackgroundBtn');
    const resetBackgroundBtn = document.getElementById('resetBackgroundBtn');
    const toggleControlsButton = document.getElementById('toggleControlsBtn');
    const controlsElement = document.getElementById('controlsElement');
    const mainContentElement = document.getElementById('mainContent');

    // DOM Elements for new Modals
    const toastContainer = document.getElementById('toastContainer');
    const confirmModal = document.getElementById('confirmModal');
    const confirmMessage = document.getElementById('confirmMessage');
    const confirmOkBtn = document.getElementById('confirmOkBtn');
    const confirmCancelBtn = document.getElementById('confirmCancelBtn');

    // --- Application State ---
    let names = [];
    let savedLists = {};
    let isSpinning = false;
    let backgroundImageData = null;
    let currentVideoObjectURL = null;
    let backgroundMusic = null;
    let currentMusicSource = 'local';
    let originalBodyBackground = document.body.style.background;
    let elementThatTriggeredModal = null;
    const discordLinkHTML = `<a href="https://discord.gg/9HGHVWSjfv" target="_blank" rel="noopener noreferrer">Tham gia Discord của chúng tôi: https://discord.gg/9HGHVWSjfv</a>`;

    // --- Notification System ---
    function showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, duration);
    }

    function showConfirm(message) {
        return new Promise((resolve) => {
            confirmMessage.textContent = message;
            confirmModal.style.display = 'flex';

            const onOk = () => {
                confirmModal.style.display = 'none';
                cleanup();
                resolve(true);
            };

            const onCancel = () => {
                confirmModal.style.display = 'none';
                cleanup();
                resolve(false);
            };

            const cleanup = () => {
                confirmOkBtn.removeEventListener('click', onOk);
                confirmCancelBtn.removeEventListener('click', onCancel);
            };

            confirmOkBtn.addEventListener('click', onOk);
            confirmCancelBtn.addEventListener('click', onCancel);
        });
    }

    // --- Persistence Functions ---
    function persistItem(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error(`Lỗi khi lưu vào localStorage (key: ${key}):`, error);
            showToast('Lỗi khi lưu dữ liệu vào trình duyệt.', 'error');
        }
    }

    function loadItem(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error(`Lỗi khi tải từ localStorage (key: ${key}):`, error);
            showToast('Lỗi khi tải dữ liệu từ trình duyệt.', 'error');
            return defaultValue;
        }
    }

    function loadPersistedData() {
        names = loadItem(LS_KEYS.CURRENT_NAMES, []);
        savedLists = loadItem(LS_KEYS.SAVED_LISTS, {});
        const controlsHidden = loadItem(LS_KEYS.CONTROLS_HIDDEN, false);
        if (controlsHidden) {
            toggleControlsVisibility(true);
        }
        const storedVolume = loadItem(LS_KEYS.VOLUME, DEFAULT_VOLUME);
        volumeSlider.value = storedVolume;

        backgroundImageData = loadItem(LS_KEYS.CUSTOM_BG, null);
        if (backgroundImageData) {
            applyCustomImageBackground(backgroundImageData);
        }

        currentMusicSource = loadItem(LS_KEYS.MUSIC_SOURCE, 'local');
        const currentSourceRadio = document.querySelector(`input[name="musicSource"][value="${currentMusicSource}"]`);
        if (currentSourceRadio) {
            currentSourceRadio.checked = true;
        }
        if (currentMusicSource !== 'local') {
            musicUrlInput.value = loadItem(LS_KEYS.MUSIC_URL_PREFIX + currentMusicSource, '');
        }
    }

    // --- Core Functions (Wheel, Names, Lists) ---
    function updateNamesDisplay() {
        nameCountEl.textContent = names.length;
        namesListEl.innerHTML = '';
        if (names.length === 0) {
            const p = document.createElement('p');
            p.className = 'names-list-placeholder';
            p.textContent = PLACEHOLDER_TEXT_NO_NAMES;
            namesListEl.appendChild(p);
        } else {
            names.forEach((name, index) => {
                const nameItem = document.createElement('div');
                nameItem.className = 'name-item';
                nameItem.innerHTML = `
                    <span>${escapeHtml(name)}</span>
                    <button class="delete-btn" data-index="${index}" aria-label="Xóa tên ${escapeHtml(name)}">Xóa</button>
                `;
                namesListEl.appendChild(nameItem);
            });
        }
    }
    
    function updateWheel() {
        if (!wheelEl) return;
        const wheelSize = wheelEl.offsetWidth;
        wheelEl.innerHTML = '';

        if (names.length === 0) {
            wheelEl.style.background = getComputedStyle(document.documentElement).getPropertyValue('--wheel-bg-empty').trim();
            const placeholder = document.createElement('div');
            placeholder.className = 'wheel-placeholder';
            placeholder.textContent = WHEEL_EMPTY_PLACEHOLDER_TEXT;
            wheelEl.appendChild(placeholder);
            return;
        }
        wheelEl.style.background = 'transparent';

        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute('viewBox', `0 0 ${wheelSize} ${wheelSize}`);
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';

        const centerX = wheelSize / 2;
        const centerY = wheelSize / 2;
        const borderWidth = parseInt(getComputedStyle(wheelEl).borderWidth) * 2 || 16;
        const radius = (wheelSize - borderWidth) / 2;
        const segmentAngleDegrees = 360 / names.length;

        names.forEach((name, index) => {
            const startAngleRad = (index * segmentAngleDegrees - 90) * Math.PI / 180;
            const endAngleRad = ((index + 1) * segmentAngleDegrees - 90) * Math.PI / 180;
            const x1 = centerX + radius * Math.cos(startAngleRad);
            const y1 = centerY + radius * Math.sin(startAngleRad);
            const x2 = centerX + radius * Math.cos(endAngleRad);
            const y2 = centerY + radius * Math.sin(endAngleRad);
            const largeArcFlag = segmentAngleDegrees > 180 ? 1 : 0;
            const pathData = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
            const path = document.createElementNS(svgNS, 'path');
            path.setAttribute('d', pathData);
            path.setAttribute('fill', COLORS[index % COLORS.length]);
            path.setAttribute('stroke', getComputedStyle(document.documentElement).getPropertyValue('--wheel-border-color').trim());
            path.setAttribute('stroke-width', '2');
            svg.appendChild(path);

            const textAngleRad = (startAngleRad + endAngleRad) / 2;
            const textRadiusFactor = names.length <= 4 ? 0.5 : (names.length <= 8 ? 0.55 : 0.6);
            const textRadius = radius * textRadiusFactor;
            const textX = centerX + textRadius * Math.cos(textAngleRad);
            const textY = centerY + textRadius * Math.sin(textAngleRad);
            const text = document.createElementNS(svgNS, 'text');
            text.setAttribute('x', textX);
            text.setAttribute('y', textY);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'middle');
            text.setAttribute('fill', 'white');
            text.setAttribute('font-weight', 'bold');
            let fontSize;
            if (wheelSize > 450) fontSize = names.length > 16 ? 13 : names.length > 12 ? 16 : names.length > 8 ? 18 : 21;
            else if (wheelSize > 350) fontSize = names.length > 16 ? 10 : names.length > 12 ? 12 : names.length > 8 ? 14 : 16;
            else fontSize = names.length > 16 ? 8 : names.length > 12 ? 10 : names.length > 8 ? 12 : 14;
            text.setAttribute('font-size', fontSize);
            text.setAttribute('font-family', 'Arial, sans-serif');
            text.style.textShadow = '1px 1px 2px rgba(0,0,0,0.7)';
            const textRotationAngleDegrees = (textAngleRad * 180 / Math.PI) + (names.length === 1 || names.length > 20 ? 0 : 90);
            text.setAttribute('transform', `rotate(${textRotationAngleDegrees}, ${textX}, ${textY})`);
            let displayName = name;
            const maxLength = names.length > 8 ? (wheelSize > 400 ? 10 : 8) : (wheelSize > 400 ? 12 : 10);
            if (name.length > maxLength && names.length > 2) {
                displayName = name.substring(0, maxLength - 2) + '...';
            }
            text.textContent = escapeHtml(displayName);
            svg.appendChild(text);
        });
        wheelEl.appendChild(svg);
    }
    
    function addNamesBatchHandler() {
        const rawText = namesBatchInput.value.trim();
        if (!rawText) {
            showToast('Vui lòng nhập tên!', 'error');
            return;
        }

        const newNames = rawText.split('\n')
                                .map(name => name.trim())
                                .filter(name => name !== '');

        let addedCount = 0;
        newNames.forEach(name => {
            if (name && !names.includes(name)) {
                names.push(name);
                addedCount++;
            }
        });

        if (addedCount > 0) {
            namesBatchInput.value = '';
            updateNamesDisplay();
            updateWheel();
            persistItem(LS_KEYS.CURRENT_NAMES, names);
            showToast(`Đã thêm thành công ${addedCount} tên mới!`, 'success');
        } else {
            showToast('Không có tên mới nào được thêm. Có thể tên đã tồn tại.', 'info');
        }
        namesBatchInput.focus();
    }
    
    function shuffleNamesHandler() {
        if (names.length < 2) {
            showToast('Cần ít nhất 2 tên để đảo vị trí!', 'info');
            return;
        }

        for (let i = names.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [names[i], names[j]] = [names[j], names[i]];
        }

        updateNamesDisplay();
        updateWheel();
        persistItem(LS_KEYS.CURRENT_NAMES, names);
        showToast('Đã đảo vị trí các tên trong danh sách!', 'success');
    }

    function removeName(index) {
        names.splice(index, 1);
        updateNamesDisplay();
        updateWheel();
        persistItem(LS_KEYS.CURRENT_NAMES, names);
    }

    async function clearAllNamesHandler() {
        if (names.length === 0) {
            showToast("Danh sách tên đã trống!", "info");
            return;
        }
        const confirmed = await showConfirm('Bạn có chắc muốn xóa tất cả tên?');
        if (confirmed) {
            names = [];
            updateNamesDisplay();
            updateWheel();
            persistItem(LS_KEYS.CURRENT_NAMES, names);
            showToast("Đã xóa tất cả các tên.", "success");
        }
    }

    async function saveListHandler() {
        const listName = listNameInput.value.trim();
        if (!listName) {
            showToast('Vui lòng nhập tên danh sách!', 'error');
            listNameInput.focus();
            return;
        }
        if (names.length === 0) {
            showToast('Danh sách tên hiện tại rỗng, không thể lưu!', 'error');
            return;
        }
        if (savedLists.hasOwnProperty(listName)) {
            const confirmed = await showConfirm(`Danh sách "${escapeHtml(listName)}" đã tồn tại. Bạn có muốn ghi đè không?`);
            if (!confirmed) return;
        }
        savedLists[listName] = [...names];
        listNameInput.value = '';
        updateSavedListsDisplay();
        persistItem(LS_KEYS.SAVED_LISTS, savedLists);
        showToast(`Đã lưu danh sách "${escapeHtml(listName)}" thành công!`, 'success');
    }

    async function loadList(listName) {
        if (savedLists[listName]) {
            if (names.length > 0) {
                 const confirmed = await showConfirm('Thao tác này sẽ thay thế danh sách tên hiện tại. Tiếp tục?');
                 if (!confirmed) return;
            }
            names = [...savedLists[listName]];
            updateNamesDisplay();
            updateWheel();
            persistItem(LS_KEYS.CURRENT_NAMES, names);
            showToast(`Đã tải danh sách "${escapeHtml(listName)}".`, 'success');
        }
    }

    async function deleteList(listName) {
        if (savedLists[listName]) {
            const confirmed = await showConfirm(`Bạn có chắc muốn xóa danh sách đã lưu "${escapeHtml(listName)}"?`);
            if (confirmed) {
                delete savedLists[listName];
                updateSavedListsDisplay();
                persistItem(LS_KEYS.SAVED_LISTS, savedLists);
                showToast(`Đã xóa danh sách "${escapeHtml(listName)}".`, 'success');
            }
        }
    }

    function updateSavedListsDisplay() {
        savedListsContainer.innerHTML = '';
        const listNames = Object.keys(savedLists);
        if (listNames.length === 0) {
             const p = document.createElement('p');
            p.className = 'saved-lists-placeholder';
            p.textContent = PLACEHOLDER_TEXT_NO_SAVED_LISTS;
            savedListsContainer.appendChild(p);
        } else {
            listNames.forEach(listName => {
                const listItem = document.createElement('div');
                listItem.className = 'list-item';
                const loadBtn = document.createElement('button');
                loadBtn.className = 'load-list-btn';
                loadBtn.innerHTML = `📋 ${escapeHtml(listName)} (${savedLists[listName].length} tên)`;
                loadBtn.title = `Tải danh sách ${escapeHtml(listName)}`;
                loadBtn.setAttribute('aria-label', `Tải danh sách ${escapeHtml(listName)}`);
                loadBtn.onclick = () => loadList(listName);
                const delBtn = document.createElement('button');
                delBtn.className = 'delete-btn';
                delBtn.textContent = 'Xóa';
                delBtn.title = `Xóa danh sách ${escapeHtml(listName)}`;
                delBtn.setAttribute('aria-label', `Xóa danh sách ${escapeHtml(listName)}`);
                delBtn.onclick = () => deleteList(listName);
                listItem.appendChild(loadBtn);
                listItem.appendChild(delBtn);
                savedListsContainer.appendChild(listItem);
            });
        }
    }

    function spinWheelHandler() {
        if (names.length === 0) {
            showToast('Vui lòng thêm ít nhất một tên vào vòng quay!', 'error');
            return;
        }
        if (names.length === 1) {
            showResult(names[0]);
            return;
        }
        if (isSpinning) return;
        isSpinning = true;
        spinBtn.disabled = true;
        spinBtn.textContent = 'Đang quay...';
        elementThatTriggeredModal = spinBtn;

        if (currentMusicSource === 'local' && backgroundMusic && !backgroundMusic.paused) {
            const originalVolume = backgroundMusic.volume;
            backgroundMusic.volume = Math.min(1, originalVolume * 1.2);
            setTimeout(() => {
                if (backgroundMusic) backgroundMusic.volume = originalVolume;
            }, 1000);
        }

        const currentRotationMatch = wheelEl.style.transform.match(/rotate\(([-]?\d*\.?\d+)deg\)/);
        const currentRotation = currentRotationMatch ? parseFloat(currentRotationMatch[1]) : 0;
        const segmentAngle = 360 / names.length;
        const randomSpins = Math.floor(Math.random() * 4) + 5;
        const randomExtraAngle = Math.random() * 360;
        const totalRotation = currentRotation + (randomSpins * 360) + randomExtraAngle;
        wheelEl.style.transition = SPIN_ANIMATION_CSS;
        wheelEl.style.transform = `rotate(${totalRotation}deg)`;
        
        setTimeout(() => {
            const finalRotationAngle = totalRotation % 360;
            const angleOnStaticWheelUnderPointer = (270 - finalRotationAngle + 360) % 360;
            const drawingStartAngle = 270;
            const normalizedAngle = (angleOnStaticWheelUnderPointer - drawingStartAngle + 360) % 360;
            let winnerIndex = Math.floor(normalizedAngle / segmentAngle);
            
            winnerIndex = winnerIndex % names.length; 

            const winner = names[winnerIndex];
            showResult(winner);
            isSpinning = false;
            spinBtn.disabled = false;
            spinBtn.textContent = '🎲 QUAY NGAY!';
        }, RESULT_MODAL_DELAY_MS);
    }

    function showResult(winner) {
        winnerNameEl.textContent = escapeHtml(winner);
        resultModal.style.display = 'flex';
        closeModalBtn.focus();
    }

    function closeModalHandler() {
        resultModal.style.display = 'none';
        if (elementThatTriggeredModal) {
            elementThatTriggeredModal.focus();
        }
    }

    function toggleControlsVisibility(skipPersist = false) {
        controlsElement.classList.toggle('hidden');
        mainContentElement.classList.toggle('controls-hidden');
        const isHidden = controlsElement.classList.contains('hidden');
        toggleControlsButton.textContent = isHidden ? 'Hiện Controls' : 'Ẩn Controls';
        toggleControlsButton.setAttribute('aria-label', isHidden ? 'Hiện bảng điều khiển' : 'Ẩn bảng điều khiển');
        if(!skipPersist) {
            persistItem(LS_KEYS.CONTROLS_HIDDEN, isHidden);
        }
    }

    // --- Music Functions ---
    function updateInfoBanner(nowPlayingTextValue) {
        let fullText = "";
        const separator = "    |    ";

        if (nowPlayingTextValue && nowPlayingTextValue.trim() !== "") {
            fullText = `🎧 Đang phát: ${escapeHtml(nowPlayingTextValue)}${separator}${discordLinkHTML}`;
        } else {
            fullText = discordLinkHTML;
        }

        if (fullText) {
            infoBannerTextEl.innerHTML = fullText; 
            infoBannerEl.style.display = 'block';

            infoBannerTextEl.style.animationName = 'none';
            void infoBannerTextEl.offsetHeight;

            const textWidth = infoBannerTextEl.scrollWidth;
            const pixelsPerSecond = 75; 
            let duration = textWidth / pixelsPerSecond;

            duration = Math.max(10, duration); 
            duration = Math.min(60, duration); 
            
            infoBannerTextEl.style.animationDuration = `${duration}s`;
            infoBannerTextEl.style.animationName = 'scroll-info-text'; 
        } else {
            infoBannerEl.style.display = 'none';
            infoBannerTextEl.style.animationName = 'none';
        }
    }


    function clearEmbeddedPlayer() {
        embeddedPlayerContainer.innerHTML = '';
        const placeholder = document.createElement('span');
        placeholder.id = 'embeddedPlayerPlaceholder';
        placeholder.textContent = 'Trình phát nhạc sẽ hiện ở đây';
        embeddedPlayerContainer.appendChild(placeholder);
        embeddedPlayerContainer.style.minHeight = '80px';
        updateInfoBanner('');
    }

    function clearLocalMusic() {
        if (backgroundMusic) {
            backgroundMusic.pause();
            URL.revokeObjectURL(backgroundMusic.src);
            backgroundMusic = null;
        }
        musicInput.value = '';
        playMusicBtn.textContent = "▶️ Phát";
        playMusicBtn.setAttribute('aria-label', 'Phát nhạc');
        updateInfoBanner('');
    }

    function enableCustomMusicControls(enabled) {
        playMusicBtn.disabled = !enabled;
        stopMusicBtn.disabled = !enabled;
        volumeSlider.disabled = !enabled;
        if (musicSourceNoteEl) {
            musicSourceNoteEl.classList.toggle('highlight', !enabled);
        }
        playMusicBtn.setAttribute('aria-label', enabled ? 'Phát nhạc' : 'Phát nhạc (chỉ cho file từ máy)');
        stopMusicBtn.setAttribute('aria-label', enabled ? 'Dừng nhạc' : 'Dừng nhạc (chỉ cho file từ máy)');
        volumeSlider.setAttribute('aria-label', enabled ? 'Điều chỉnh âm lượng nhạc nền' : 'Điều chỉnh âm lượng (chỉ cho file từ máy)');
    }

    function handleMusicSourceChange() {
        const newSource = document.querySelector('input[name="musicSource"]:checked').value;
        if (newSource === currentMusicSource && newSource !== 'local' && musicUrlInput.value === loadItem(LS_KEYS.MUSIC_URL_PREFIX + newSource, '')) {
            return;
        }

        currentMusicSource = newSource;
        persistItem(LS_KEYS.MUSIC_SOURCE, currentMusicSource);

        clearLocalMusic();
        clearEmbeddedPlayer(); 

        if (currentMusicSource === 'local') {
            localMusicControlsEl.style.display = 'block';
            urlMusicControlsEl.style.display = 'none';
            enableCustomMusicControls(true);
        } else {
            localMusicControlsEl.style.display = 'none';
            urlMusicControlsEl.style.display = 'block';
            musicUrlInput.placeholder = currentMusicSource === 'soundcloud' ?
                "Dán URL SoundCloud (bài hát/playlist)..." :
                "Dán URL Spotify (bài hát/album/playlist)...";
            enableCustomMusicControls(false);
            const lastUrl = loadItem(LS_KEYS.MUSIC_URL_PREFIX + currentMusicSource, '');
            musicUrlInput.value = lastUrl;
            if (lastUrl) {
                loadMusicUrlHandler(true);
            } else {
                updateInfoBanner(''); 
            }
        }
         adjustVolume();
    }


    function loadMusicUrlHandler(skipPersistUrl = false) {
        const url = musicUrlInput.value.trim();
        if (!url) {
            showToast("Vui lòng nhập URL nhạc!", 'error');
            updateInfoBanner(''); 
            return;
        }

        if (!skipPersistUrl) {
            persistItem(LS_KEYS.MUSIC_URL_PREFIX + currentMusicSource, url);
        }

        clearLocalMusic();
        clearEmbeddedPlayer();

        let iframeHtml = '';
        const currentPlaceholder = document.getElementById('embeddedPlayerPlaceholder');
        if (currentPlaceholder) currentPlaceholder.style.display = 'none';

        let displayText = "";

        try {
            if (currentMusicSource === 'soundcloud' && url.includes('soundcloud.com')) {
                const soundCloudUrl = new URL(url);
                iframeHtml = `<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(soundCloudUrl.href)}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=true&visual=true"></iframe>`;
                displayText = "SoundCloud";
                try {
                   let pathParts = soundCloudUrl.pathname.split('/').filter(part => part.length > 0);
                   if (pathParts.length > 1) {
                        displayText = `SoundCloud: ${pathParts[pathParts.length -1].replace(/-/g, ' ')}`;
                   } else if (pathParts.length === 1) {
                        displayText = `SoundCloud: ${pathParts[0].replace(/-/g, ' ')}`;
                   }
                } catch {}

            } else if (currentMusicSource === 'spotify' && url.includes('spotify.com')) {
                const spotifyUrl = new URL(url);
                let embedUrl = spotifyUrl.href.replace('open.spotify.com/', 'open.spotify.com/embed/');
                embedUrl = embedUrl.split('?')[0];

                displayText = "Spotify";
                try {
                   let pathParts = spotifyUrl.pathname.split('/').filter(part => part.length > 0 && part !== 'embed');
                   if (pathParts.length > 1) {
                        displayText = `Spotify: ${pathParts[0].charAt(0).toUpperCase() + pathParts[0].slice(1)} - ${pathParts[1]}`;
                   } else if (pathParts.length === 1) {
                        displayText = `Spotify: ${pathParts[0]}`;
                   }
                } catch {}


                if (embedUrl.includes('/playlist/') || embedUrl.includes('/album/')) {
                    embeddedPlayerContainer.style.minHeight = '380px';
                    iframeHtml = `<iframe style="border-radius:12px" src="${embedUrl}" width="100%" height="380" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
                } else if (embedUrl.includes('/track/')) {
                    embeddedPlayerContainer.style.minHeight = '80px';
                    iframeHtml = `<iframe style="border-radius:12px" src="${embedUrl}" width="100%" height="80" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
                } else {
                     throw new Error("URL Spotify không hợp lệ.");
                }
            } else {
                throw new Error("URL không hợp lệ hoặc không được hỗ trợ.");
            }
        } catch (e) {
            console.error("Lỗi tạo iframe:", e);
            showToast(e.message || "Có lỗi xảy ra khi tải URL nhạc.", 'error');
            if (currentPlaceholder) currentPlaceholder.style.display = 'block';
            updateInfoBanner('');
            return;
        }

        if (iframeHtml) {
            embeddedPlayerContainer.innerHTML = iframeHtml;
            updateInfoBanner(displayText || `Đang phát từ ${currentMusicSource}`);
        } else {
             if (currentPlaceholder) currentPlaceholder.style.display = 'block';
             updateInfoBanner('');
        }
    }

    function handleMusicUploadLocal(event) {
        if (currentMusicSource !== 'local') {
            document.querySelector('input[name="musicSource"][value="local"]').checked = true;
            handleMusicSourceChange();
        }

        const file = event.target.files[0];
        if (file && file.type.startsWith('audio/')) {
            clearEmbeddedPlayer();
            const objectUrl = URL.createObjectURL(file);
            if (backgroundMusic) {
                backgroundMusic.pause();
                URL.revokeObjectURL(backgroundMusic.src);
            }
            backgroundMusic = new Audio(objectUrl);
            backgroundMusic.loop = true;
            backgroundMusic.volume = parseInt(volumeSlider.value) / 100;
            showToast('Nhạc đã được tải lên! Nhấn "Phát" để bắt đầu.', 'success');
            playMusicBtn.textContent = "▶️ Phát";
            playMusicBtn.setAttribute('aria-label', 'Phát nhạc');
            updateInfoBanner(file.name);
            enableCustomMusicControls(true);
        } else if (file) {
            showToast('Vui lòng chọn file audio hợp lệ!', 'error');
            musicInput.value = '';
            updateInfoBanner('');
        }
    }

    function playMusicHandlerLocal() {
        if (currentMusicSource !== 'local' || !backgroundMusic) return;
        if (backgroundMusic.paused) {
            backgroundMusic.play().then(() => {
                playMusicBtn.textContent = "⏸️ Tạm dừng";
                playMusicBtn.setAttribute('aria-label', 'Tạm dừng nhạc');
                if (musicInput.files.length > 0) {
                   updateInfoBanner(musicInput.files[0].name);
                }
            }).catch(e => {
                console.error("Lỗi phát nhạc:", e);
                showToast('Không thể phát nhạc. Vui lòng tương tác với trang.', 'error');
            });
        } else {
            backgroundMusic.pause();
            playMusicBtn.textContent = "▶️ Phát";
            playMusicBtn.setAttribute('aria-label', 'Phát nhạc');
             if (musicInput.files.length > 0) { 
                   updateInfoBanner(musicInput.files[0].name);
             } else {
                   updateInfoBanner(''); 
             }
        }
    }

    function stopMusicHandlerLocal() {
         if (currentMusicSource !== 'local' || !backgroundMusic) return;
        backgroundMusic.pause();
        backgroundMusic.currentTime = 0;
        playMusicBtn.textContent = "▶️ Phát";
        playMusicBtn.setAttribute('aria-label', 'Phát nhạc');
        updateInfoBanner('');
    }

    function adjustVolume() {
        const volume = parseInt(volumeSlider.value);
        volumeValueDisplay.textContent = volume + '%';
        if (currentMusicSource === 'local' && backgroundMusic) {
            backgroundMusic.volume = volume / 100;
        }
        persistItem(LS_KEYS.VOLUME, volume);
    }

    // --- Background Functions ---
    function clearVideoBackground() {
        if (currentVideoObjectURL) {
            URL.revokeObjectURL(currentVideoObjectURL);
            currentVideoObjectURL = null;
        }
        videoBackgroundEl.src = "";
        videoBackgroundEl.style.display = 'none';
    }

    function clearImageBackground() {
        backgroundImageData = null;
        localStorage.removeItem(LS_KEYS.CUSTOM_BG);
        backgroundInput.value = '';
    }

    function applySelectedBackground() {
        const file = backgroundInput.files[0];

        if (!file) {
            showToast('Vui lòng chọn một file ảnh hoặc video.', 'error');
            return;
        }

        if (file.type.startsWith('image/')) {
            clearVideoBackground();
            const reader = new FileReader();
            reader.onload = function(e) {
                backgroundImageData = e.target.result;
                applyCustomImageBackground(backgroundImageData);
                persistItem(LS_KEYS.CUSTOM_BG, backgroundImageData);
            };
            reader.readAsDataURL(file);
            showToast('Đã áp dụng ảnh nền.', 'success');

        } else if (file.type.startsWith('video/')) {
            clearImageBackground();
            
            document.body.style.background = 'transparent'; 
            
            if (currentVideoObjectURL) {
                URL.revokeObjectURL(currentVideoObjectURL);
            }
            currentVideoObjectURL = URL.createObjectURL(file);
            videoBackgroundEl.src = currentVideoObjectURL;
            videoBackgroundEl.style.display = 'block';
            videoBackgroundEl.play().catch(e => console.error("Lỗi tự động phát video:", e));
            showToast('Đã áp dụng video nền.', 'success');

        } else {
            showToast('Định dạng file không được hỗ trợ.', 'error');
            backgroundInput.value = '';
        }
    }


    function applyCustomImageBackground(dataUrl) {
        clearVideoBackground();
        document.body.style.background = `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url('${dataUrl}')`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundAttachment = 'fixed';
    }


    function resetBackgroundHandler() {
        clearImageBackground();
        clearVideoBackground();
        document.body.style.background = originalBodyBackground;
        document.body.style.backgroundSize = 'auto';
        document.body.style.backgroundPosition = 'initial';
        document.body.style.backgroundAttachment = 'initial';
    }


    // --- Utility ---
    function escapeHtml(unsafe) {
        if (typeof unsafe !== 'string') {
            return unsafe;
        }
        return unsafe
             .replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
    }

    // --- Event Listeners ---
    addNamesBatchBtn.addEventListener('click', addNamesBatchHandler);
    shuffleNamesBtn.addEventListener('click', shuffleNamesHandler);
    clearAllNamesBtn.addEventListener('click', clearAllNamesHandler);
    saveListBtn.addEventListener('click', saveListHandler);
    spinBtn.addEventListener('click', spinWheelHandler);
    closeModalBtn.addEventListener('click', closeModalHandler);
    resultModal.addEventListener('click', (event) => {
        if (event.target === resultModal) closeModalHandler();
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && resultModal.style.display === 'flex') {
            closeModalHandler();
        }
    });
    toggleControlsButton.addEventListener('click', () => toggleControlsVisibility(false));
    musicSourceRadios.forEach(radio => radio.addEventListener('change', handleMusicSourceChange));
    musicInput.addEventListener('change', handleMusicUploadLocal);
    loadMusicUrlBtn.addEventListener('click',() => loadMusicUrlHandler(false));
    playMusicBtn.addEventListener('click', playMusicHandlerLocal);
    stopMusicBtn.addEventListener('click', stopMusicHandlerLocal);
    volumeSlider.addEventListener('input', adjustVolume);
    applyBackgroundBtn.addEventListener('click', applySelectedBackground);
    resetBackgroundBtn.addEventListener('click', resetBackgroundHandler);
    namesListEl.addEventListener('click', (event) => {
        if (event.target.classList.contains('delete-btn')) {
            const index = parseInt(event.target.dataset.index);
            removeName(index);
        }
    });
    
    let initialWheelUpdateDone = false;
    if (wheelEl) {
        const observer = new ResizeObserver(entries => {
            if (initialWheelUpdateDone) {
                 for (let entry of entries) {
                    if (entry.contentRect.width > 0) {
                        updateWheel();
                    }
                }
            }
        });
        observer.observe(wheelEl);
    }

    // --- Initial Load ---
    originalBodyBackground = getComputedStyle(document.body).background;
    loadPersistedData();
    handleMusicSourceChange(); 
    updateNamesDisplay();
    updateSavedListsDisplay();
    updateWheel();
    initialWheelUpdateDone = true;
    updateInfoBanner(''); 
});
