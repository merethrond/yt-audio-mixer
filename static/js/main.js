document.addEventListener('DOMContentLoaded', () => {
    // Elements Selection
    const tutInput = document.getElementById('tutorial-url-input');
    const soundInput = document.getElementById('soundtrack-url-input');
    const clearTutBtn = document.getElementById('clear-tut-btn');
    const clearSoundBtn = document.getElementById('clear-sound-btn');
    
    const tutPreview = document.getElementById('tutorial-preview');
    const soundPreview = document.getElementById('soundtrack-preview');
    
    const tutVolSlider = document.getElementById('tutorial-volume-slider');
    const soundVolSlider = document.getElementById('soundtrack-volume-slider');
    const tutVolVal = document.getElementById('tutorial-volume-val');
    const soundVolVal = document.getElementById('soundtrack-volume-val');
    
    const manualDuckBtn = document.getElementById('manual-duck-btn');
    const generateBtn = document.getElementById('generate-mix-btn');
    const saveSessionBtn = document.getElementById('save-session-btn');
    
    // Output state containers
    const outputIdle = document.getElementById('output-idle-state');
    const outputCompleted = document.getElementById('output-completed-state');
    
    // Synchronized deck widgets
    const deckPlayBtn = document.getElementById('deck-play-btn');
    const deckMuteBtn = document.getElementById('deck-mute-btn');
    const soundtrackNodeTitle = document.getElementById('soundtrack-node-title');
    const deckPlaylistBtn = document.getElementById('deck-playlist-btn');
    
    const resultTitle = document.getElementById('result-video-title');
    const resultVoiceVol = document.getElementById('result-video-voice-vol');
    const resultMusicVol = document.getElementById('result-video-music-vol');
    const resultDucking = document.getElementById('result-video-ducking');
    
    // History elements
    const historyEmpty = document.getElementById('history-empty');
    const historyGrid = document.getElementById('history-grid');

    // Live App State
    let tutorialPlayer = null;
    let soundtrackPlayer = null;
    let isPlayersLoaded = false;
    
    let isMusicMuted = false;
    let isDucked = false;
    let originalSoundtrackVol = 20;

    // YouTube link regex validation (supports regular videos, shorts, embeds, and shares)
    const YT_REGEX = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    
    // Previews Cache
    const previewsCache = {};

    // Initializer
    init();

    function init() {
        // Setup inputs event listeners
        tutInput.addEventListener('input', () => handleUrlInput(tutInput, clearTutBtn, tutPreview, 'tutorial'));
        soundInput.addEventListener('input', () => handleUrlInput(soundInput, clearSoundBtn, soundPreview, 'soundtrack'));
        
        clearTutBtn.addEventListener('click', () => clearInput(tutInput, clearTutBtn, tutPreview));
        clearSoundBtn.addEventListener('click', () => clearInput(soundInput, clearSoundBtn, soundPreview));
        
        // Setup volume sliders
        tutVolSlider.addEventListener('input', () => {
            tutVolVal.textContent = `${tutVolSlider.value}%`;
            if (tutorialPlayer && typeof tutorialPlayer.setVolume === 'function') {
                tutorialPlayer.setVolume(parseInt(tutVolSlider.value));
            }
            resultVoiceVol.textContent = `${tutVolSlider.value}%`;
        });
        
        soundVolSlider.addEventListener('input', () => {
            soundVolVal.textContent = `${soundVolSlider.value}%`;
            originalSoundtrackVol = parseInt(soundVolSlider.value);
            if (!isDucked && !isMusicMuted) {
                setSoundtrackVolumeDirectly(originalSoundtrackVol);
            }
            resultMusicVol.textContent = `${soundVolSlider.value}%`;
        });
        
        // Initialize/Sync Studio Trigger
        generateBtn.addEventListener('click', initializeLiveStudio);
        
        // Save Session Bookmark Trigger
        saveSessionBtn.addEventListener('click', saveSessionTemplate);
        
        // Deck Quick Controls
        deckPlayBtn.addEventListener('click', toggleMasterPlayback);
        deckMuteBtn.addEventListener('click', toggleMusicMute);
        
        // Ducking event mouse/touch triggers
        manualDuckBtn.addEventListener('mousedown', duckMusicOn);
        manualDuckBtn.addEventListener('mouseup', duckMusicOff);
        manualDuckBtn.addEventListener('mouseleave', duckMusicOff);
        manualDuckBtn.addEventListener('touchstart', (e) => { e.preventDefault(); duckMusicOn(); });
        manualDuckBtn.addEventListener('touchend', duckMusicOff);

        // Global keybindings for active session: 'Shift' to duck, 'Space' to play/pause
        window.addEventListener('keydown', handleGlobalKeydown);
        window.addEventListener('keyup', handleGlobalKeyup);
        
        // Load initial history log
        loadSessionsList();
    }

    // Handles URL validation, clear button display, and metadata rendering
    function handleUrlInput(inputEl, clearBtn, previewEl, type) {
        const url = inputEl.value.trim();
        
        if (url.length > 0) {
            clearBtn.style.display = 'block';
        } else {
            clearBtn.style.display = 'none';
            previewEl.style.display = 'none';
            validateActionButtons();
            return;
        }

        const isValid = YT_REGEX.test(url);
        if (isValid) {
            fetchPreviewData(url, previewEl, type);
        } else {
            previewEl.style.display = 'none';
            validateActionButtons();
        }
    }

    function clearInput(inputEl, clearBtn, previewEl) {
        inputEl.value = '';
        clearBtn.style.display = 'none';
        previewEl.style.display = 'none';
        validateActionButtons();
    }

    // Serverless metadata fetching via noembed oEmbed proxy (CORS allowed)
    async function fetchPreviewData(url, previewEl, type) {
        if (previewsCache[url]) {
            renderPreviewCard(previewsCache[url], previewEl);
            return;
        }

        previewEl.style.display = 'flex';
        previewEl.innerHTML = `
            <div class="history-empty-state" style="width:100%; padding: 12px; font-size:12px;">
                <i class="fa-solid fa-circle-notch fa-spin text-primary"></i> Retrieving metadata...
            </div>
        `;

        try {
            const response = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
            const data = await response.json();
            
            if (data.title) {
                const previewData = {
                    success: true,
                    title: data.title,
                    duration: 'Live Connected',
                    thumbnail: data.thumbnail_url || 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=200',
                    author: data.author_name || 'YouTube Creator',
                    views: 'N/A'
                };
                previewsCache[url] = previewData;
                renderPreviewCard(previewData, previewEl);
            } else {
                showPreviewError("Invalid video or private link", previewEl);
            }
        } catch (err) {
            showPreviewError("Could not retrieve YouTube details", previewEl);
        }
    }

    function renderPreviewCard(data, previewEl) {
        previewEl.innerHTML = `
            <div class="preview-thumb-container">
                <img src="${data.thumbnail}" alt="Thumbnail">
                <span class="preview-duration">${data.duration}</span>
            </div>
            <div class="preview-details">
                <h4 class="preview-title" title="${data.title}">${data.title}</h4>
                <p class="preview-author"><i class="fa-regular fa-user"></i> ${data.author}</p>
                <div class="preview-stats">
                    <span>YouTube Live Bridge</span>
                </div>
            </div>
        `;
        validateActionButtons();
    }

    function showPreviewError(errorText, previewEl) {
        previewEl.innerHTML = `
            <div style="color: hsl(var(--color-error)); font-size:12px; padding: 10px; width: 100%; text-align: center;">
                <i class="fa-solid fa-triangle-exclamation"></i> ${errorText.substring(0, 80)}
            </div>
        `;
        validateActionButtons();
    }

    // Validates inputs to enable/disable button
    function validateActionButtons() {
        const tutVal = tutInput.value.trim();
        const soundVal = soundInput.value.trim();
        
        const hasValidTut = YT_REGEX.test(tutVal);
        const hasValidSound = YT_REGEX.test(soundVal);
        
        if (hasValidTut && hasValidSound) {
            generateBtn.disabled = false;
            saveSessionBtn.disabled = false;
        } else {
            generateBtn.disabled = true;
            saveSessionBtn.disabled = true;
        }
    }

    // Parses video ID from YouTube URL
    function extractVideoId(url) {
        const match = url.match(YT_REGEX);
        return (match && match[1]) ? match[1] : null;
    }

    // Instantiates the embedded YouTube iFrames side-by-side
    function initializeLiveStudio() {
        const tutorialUrl = tutInput.value.trim();
        const soundtrackUrl = soundInput.value.trim();
        
        const tutorialId = extractVideoId(tutorialUrl);
        const soundtrackId = extractVideoId(soundtrackUrl);
        
        if (!tutorialId || !soundtrackId) return;

        // Hide idle state and show studio player deck
        outputIdle.style.display = 'none';
        outputCompleted.style.display = 'flex';

        // Load titles to visual controls
        const tutMeta = previewsCache[tutorialUrl];
        const soundMeta = previewsCache[soundtrackUrl];
        
        resultTitle.textContent = tutMeta ? tutMeta.title : "Tutorial Stream";
        soundtrackNodeTitle.textContent = soundMeta ? soundMeta.title : "Soundtrack Audio Stream Connected";
        
        originalSoundtrackVol = parseInt(soundVolSlider.value);
        resultVoiceVol.textContent = `${tutVolSlider.value}%`;
        resultMusicVol.textContent = `${soundVolSlider.value}%`;
        resultDucking.textContent = "Live";
        
        // Generate YouTube Playlist Sharing URL
        deckPlaylistBtn.href = `https://www.youtube.com/watch_videos?video_ids=${tutorialId},${soundtrackId}`;

        // Clean up previous players if any to prevent memory leaks and API conflicts
        cleanupPlayers();

        // Create fresh IFrame Player instances
        try {
            tutorialPlayer = new YT.Player('tutorial-player-container', {
                height: '100%',
                width: '100%',
                videoId: tutorialId,
                host: 'https://www.youtube-nocookie.com',
                playerVars: {
                    'playsinline': 1,
                    'modestbranding': 1,
                    'rel': 0,
                    'controls': 1
                },
                events: {
                    'onStateChange': onTutorialStateChange,
                    'onReady': onTutorialReady
                }
            });

            soundtrackPlayer = new YT.Player('soundtrack-player-container', {
                height: '100%',
                width: '100%',
                videoId: soundtrackId,
                host: 'https://www.youtube-nocookie.com',
                playerVars: {
                    'playsinline': 1,
                    'modestbranding': 1,
                    'controls': 0,
                    'disablekb': 1,
                    'rel': 0
                },
                events: {
                    'onStateChange': onSoundtrackStateChange,
                    'onReady': onSoundtrackReady
                }
            });
            
            isPlayersLoaded = true;
            isMusicMuted = false;
            deckMuteBtn.innerHTML = `<i class="fa-solid fa-volume-xmark"></i> Mute Music`;
            
            // Scroll control deck into view smoothly
            outputCompleted.scrollIntoView({ behavior: 'smooth' });
        } catch (e) {
            console.error("Failed to load YouTube player iframes:", e);
            alert("Error loading player bridge. Make sure you are online and have not blocked YouTube.");
        }
    }

    function cleanupPlayers() {
        isPlayersLoaded = false;
        try {
            if (tutorialPlayer && typeof tutorialPlayer.destroy === 'function') {
                tutorialPlayer.destroy();
            }
            if (soundtrackPlayer && typeof soundtrackPlayer.destroy === 'function') {
                soundtrackPlayer.destroy();
            }
        } catch (e) {
            console.error("Cleanup error:", e);
        }
        tutorialPlayer = null;
        soundtrackPlayer = null;
        
        // Recreate clean container nodes in HTML to bind fresh iframe creations
        const tutWrapper = document.querySelector('.player-wrapper');
        tutWrapper.innerHTML = `<div id="tutorial-player-container"></div>`;
        
        const soundWrapper = document.querySelector('.node-player-container');
        soundWrapper.innerHTML = `<div id="soundtrack-player-container"></div>`;
    }

    // YT Player Callbacks
    function onTutorialReady(event) {
        event.target.setVolume(parseInt(tutVolSlider.value));
    }

    function onSoundtrackReady(event) {
        event.target.setVolume(parseInt(soundVolSlider.value));
    }

    // Sync Playback states: if tutorial plays, soundtrack plays. If paused, soundtrack pauses.
    function onTutorialStateChange(event) {
        if (!soundtrackPlayer || typeof soundtrackPlayer.getPlayerState !== 'function') return;
        
        const state = event.data;
        
        if (state === YT.PlayerState.PLAYING) {
            soundtrackPlayer.playVideo();
            deckPlayBtn.innerHTML = `<i class="fa-solid fa-pause"></i> Sync Pause`;
        } else if (state === YT.PlayerState.PAUSED) {
            soundtrackPlayer.pauseVideo();
            deckPlayBtn.innerHTML = `<i class="fa-solid fa-play"></i> Sync Play`;
        } else if (state === YT.PlayerState.ENDED) {
            soundtrackPlayer.pauseVideo();
            deckPlayBtn.innerHTML = `<i class="fa-solid fa-rotate-right"></i> Replay`;
        } else if (state === YT.PlayerState.BUFFERING) {
            soundtrackPlayer.pauseVideo();
        }
    }

    function onSoundtrackStateChange(event) {
        const state = event.data;
        // Loop soundtrack automatically if it finishes before the tutorial
        if (state === YT.PlayerState.ENDED) {
            if (soundtrackPlayer && typeof soundtrackPlayer.playVideo === 'function') {
                soundtrackPlayer.playVideo();
            }
        }
    }

    // Toggle master play/pause from deck button
    function toggleMasterPlayback() {
        if (!tutorialPlayer || typeof tutorialPlayer.getPlayerState !== 'function') return;
        
        const state = tutorialPlayer.getPlayerState();
        if (state === YT.PlayerState.PLAYING) {
            tutorialPlayer.pauseVideo();
        } else {
            tutorialPlayer.playVideo();
        }
    }

    // Soundtrack Mute Toggle
    function toggleMusicMute() {
        if (!soundtrackPlayer || typeof soundtrackPlayer.setVolume === 'function' === false) return;
        
        if (isMusicMuted) {
            isMusicMuted = false;
            setSoundtrackVolumeDirectly(isDucked ? Math.round(originalSoundtrackVol * 0.15) : originalSoundtrackVol);
            deckMuteBtn.innerHTML = `<i class="fa-solid fa-volume-xmark"></i> Mute Music`;
            resultDucking.textContent = isDucked ? "Ducked" : "Live";
        } else {
            isMusicMuted = true;
            soundtrackPlayer.setVolume(0);
            deckMuteBtn.innerHTML = `<i class="fa-solid fa-volume-high"></i> Unmute Music`;
            resultDucking.textContent = "Music Muted";
        }
    }

    // Safely sets volume on soundtrack player
    function setSoundtrackVolumeDirectly(vol) {
        if (soundtrackPlayer && typeof soundtrackPlayer.setVolume === 'function') {
            soundtrackPlayer.setVolume(vol);
        }
    }

    // Manual Ducking Engine
    function duckMusicOn() {
        if (!isPlayersLoaded || isMusicMuted) return;
        isDucked = true;
        
        const duckedVol = Math.max(1, Math.round(originalSoundtrackVol * 0.15));
        setSoundtrackVolumeDirectly(duckedVol);
        
        manualDuckBtn.classList.add('active');
        resultDucking.textContent = "Ducked (15%)";
    }

    function duckMusicOff() {
        if (!isPlayersLoaded || isMusicMuted) return;
        isDucked = false;
        
        setSoundtrackVolumeDirectly(originalSoundtrackVol);
        
        manualDuckBtn.classList.remove('active');
        resultDucking.textContent = "Live";
    }

    // Keybindings: 'Shift' (duck music), 'Space' (play/pause main video)
    function handleGlobalKeydown(e) {
        if (document.activeElement.tagName === 'INPUT') return;
        
        if (e.key === 'Shift') {
            e.preventDefault();
            duckMusicOn();
        }
        
        if (e.key === ' ' || e.code === 'Space') {
            e.preventDefault();
            toggleMasterPlayback();
        }
    }

    function handleGlobalKeyup(e) {
        if (document.activeElement.tagName === 'INPUT') return;
        
        if (e.key === 'Shift') {
            e.preventDefault();
            duckMusicOff();
        }
    }

    // Helper functions for localStorage sessions management (Serverless database)
    function getSavedSessions() {
        try {
            return JSON.parse(localStorage.getItem('audiosync_live_sessions')) || [];
        } catch (e) {
            return [];
        }
    }

    function saveSavedSessions(sessions) {
        localStorage.setItem('audiosync_live_sessions', JSON.stringify(sessions));
    }

    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // Saves a session configuration template to LocalStorage
    function saveSessionTemplate() {
        const tutorial_url = tutInput.value.trim();
        const soundtrack_url = soundInput.value.trim();
        
        const tutMeta = previewsCache[tutorial_url];
        const soundMeta = previewsCache[soundtrack_url];
        
        const tutorial_title = tutMeta ? tutMeta.title : "Tutorial Video";
        const soundtrack_title = soundMeta ? soundMeta.title : "Soundtrack";
        
        const tutorial_vol = parseInt(tutVolSlider.value);
        const soundtrack_vol = parseInt(soundVolSlider.value);
        const thumbnail = tutMeta ? tutMeta.thumbnail : '';

        const sessions = getSavedSessions();
        const session_id = generateUUID();
        
        const new_session = {
            session_id,
            tutorial_url,
            soundtrack_url,
            tutorial_title,
            soundtrack_title,
            tutorial_vol,
            soundtrack_vol,
            thumbnail,
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
        };

        sessions.unshift(new_session);
        saveSavedSessions(sessions);

        // Visual feedback (safe for FontAwesome SVG replacements)
        try {
            const bookmarkIcon = saveSessionBtn.querySelector('i, svg');
            if (bookmarkIcon) {
                bookmarkIcon.classList.remove('fa-regular', 'far');
                bookmarkIcon.classList.add('fa-solid', 'fas', 'fa-bookmark');
            }
            saveSessionBtn.style.color = "hsl(var(--color-success))";
            setTimeout(() => {
                try {
                    const activeIcon = saveSessionBtn.querySelector('i, svg');
                    if (activeIcon) {
                        activeIcon.classList.remove('fa-solid', 'fas');
                        activeIcon.classList.add('fa-regular', 'far');
                    }
                    saveSessionBtn.style.color = "";
                } catch (e) {
                    console.error("Icon restore failed:", e);
                }
            }, 1500);
        } catch (e) {
            console.error("Bookmark feedback failed:", e);
        }

        loadSessionsList();
    }

    // Load saved templates list
    function loadSessionsList() {
        const data = getSavedSessions();
        
        if (data && data.length > 0) {
            historyEmpty.style.display = 'none';
            historyGrid.style.display = 'grid';
            
            historyGrid.innerHTML = '';
            data.forEach(item => {
                const card = document.createElement('div');
                card.className = 'history-card';
                
                card.innerHTML = `
                    <div class="history-card-thumb">
                        <img src="${item.thumbnail || 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=300'}" alt="Thumbnail">
                    </div>
                    <div class="history-card-content">
                        <h4 class="history-card-title" title="${item.tutorial_title}">${item.tutorial_title}</h4>
                        <div style="font-size: 10px; color: hsl(var(--text-secondary)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: -4px;">
                            <i class="fa-solid fa-music"></i> ${item.soundtrack_title}
                        </div>
                        <div class="history-card-stats">
                            <span class="history-card-badge"><i class="fa-solid fa-microphone"></i> Voice: ${item.tutorial_vol}%</span>
                            <span class="history-card-badge"><i class="fa-solid fa-music"></i> Music: ${item.soundtrack_vol}%</span>
                        </div>
                        <div class="history-card-actions">
                            <button class="btn-play-history" data-tut-url="${item.tutorial_url}" data-sound-url="${item.soundtrack_url}" data-tut-vol="${item.tutorial_vol}" data-sound-vol="${item.soundtrack_vol}">
                                <i class="fa-solid fa-rotate-left"></i> Load Session
                            </button>
                            <button class="btn-delete-history" data-id="${item.session_id}">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        </div>
                    </div>
                `;
                historyGrid.appendChild(card);
            });
            
            attachSessionActions();
        } else {
            historyGrid.style.display = 'none';
            historyEmpty.style.display = 'block';
        }
    }

    function attachSessionActions() {
        // Load session action
        document.querySelectorAll('.btn-play-history').forEach(btn => {
            btn.addEventListener('click', async () => {
                const tutUrl = btn.getAttribute('data-tut-url');
                const soundUrl = btn.getAttribute('data-sound-url');
                const tutVol = btn.getAttribute('data-tut-vol');
                const soundVol = btn.getAttribute('data-sound-vol');
                
                // Populate inputs
                tutInput.value = tutUrl;
                soundInput.value = soundUrl;
                clearTutBtn.style.display = 'block';
                clearSoundBtn.style.display = 'block';
                
                // Populate volumes
                tutVolSlider.value = tutVol;
                tutVolVal.textContent = `${tutVol}%`;
                
                soundVolSlider.value = soundVol;
                soundVolVal.textContent = `${soundVol}%`;
                originalSoundtrackVol = parseInt(soundVol);
                
                // Trigger preview requests to cache titles
                await Promise.all([
                    fetchPreviewData(tutUrl, tutPreview, 'tutorial'),
                    fetchPreviewData(soundUrl, soundPreview, 'soundtrack')
                ]);
                
                // Initialize the studio directly
                initializeLiveStudio();
            });
        });

        // Delete session action
        document.querySelectorAll('.btn-delete-history').forEach(btn => {
            btn.addEventListener('click', () => {
                const sessionId = btn.getAttribute('data-id');
                if (confirm("Are you sure you want to permanently delete this saved session template?")) {
                    let sessions = getSavedSessions();
                    sessions = sessions.filter(item => item.session_id !== sessionId);
                    saveSavedSessions(sessions);
                    loadSessionsList();
                }
            });
        });
    }
});
