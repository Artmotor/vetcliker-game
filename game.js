// Игровые переменные
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const speedElement = document.getElementById('speed');
const missedElement = document.getElementById('missed');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over');
const rulesScreen = document.getElementById('rules-screen');
const pauseOverlay = document.getElementById('pause-overlay');
const finalScoreElement = document.getElementById('final-score');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');
const rulesBtn = document.getElementById('rules-btn');
const rulesBtnStart = document.getElementById('rules-btn-start');
const rulesBtnEnd = document.getElementById('rules-btn-end');
const backBtn = document.getElementById('back-btn');
const pauseBtn = document.getElementById('pause-btn');
const shareBtn = document.getElementById('share-btn');
const tools = document.querySelectorAll('.tool');
const tapBtn = document.getElementById('btn-tap');
const soundToggle = document.getElementById('sound-toggle');

// Настройка размера canvas
function setupCanvas() {
    const container = document.getElementById('game-container');
    const containerRect = container.getBoundingClientRect();

    // Устанавливаем размеры canvas равными размерам контейнера
    canvas.width = containerRect.width;
    canvas.height = containerRect.height;
}

// Глобальные игровые переменные
let score = 0;
let speed = 1.0;
let animals = [];
let gameRunning = false;
let gamePaused = false;
let lastSpawnTime = 0;
let missedAnimals = 0;
let lastUpdateTime = 0;
let activeTool = 'syringe';
let soundEnabled = true;
let animationFrameId = null;

// Звуковые эффекты
let audioContext;

// Улучшенная инициализация аудио
function initAudio() {
    try {
        // Создаем контекст только если его нет
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return true;
    } catch (e) {
        console.log("Аудио не поддерживается", e);
        return false;
    }
}

function playSound(type, animalType) {
    if (!soundEnabled) return;

    // Убедимся, что аудиоконтекст инициализирован
    if (!audioContext) {
        if (!initAudio()) return;
    }

    // Проверим состояние аудиоконтекста
    if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            playSoundActual(type, animalType);
        }).catch(console.error);
    } else {
        playSoundActual(type, animalType);
    }
}

function playSoundActual(type, animalType) {
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        switch(type) {
            case 'heal':
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
                oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1);
                oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2);
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                break;

            case 'miss':
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(220, audioContext.currentTime + 0.4);
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
                break;

            case 'select':
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(392, audioContext.currentTime);
                gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
                break;

            case 'animal':
                const freq = ANIMAL_SOUND_FREQUENCIES[animalType] || ANIMAL_SOUND_FREQUENCIES.cat;
                oscillator.type = 'triangle';
                oscillator.frequency.setValueAtTime(freq[0], audioContext.currentTime);
                oscillator.frequency.setValueAtTime(freq[1], audioContext.currentTime + 0.1);
                oscillator.frequency.setValueAtTime(freq[2], audioContext.currentTime + 0.2);
                gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                break;

            case 'start':
                oscillator.type = 'sine';
                const startFreqs = [523.25, 659.25, 783.99, 1046.50];
                for (let i = 0; i < startFreqs.length; i++) {
                    oscillator.frequency.setValueAtTime(startFreqs[i], audioContext.currentTime + i * 0.1);
                }
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
                break;

            case 'gameover':
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
                oscillator.frequency.setValueAtTime(392.00, audioContext.currentTime + 0.2);
                oscillator.frequency.setValueAtTime(261.63, audioContext.currentTime + 0.4);
                oscillator.frequency.setValueAtTime(196.00, audioContext.currentTime + 0.6);
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
                break;

            case 'click':
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(330, audioContext.currentTime);
                gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.05);
                break;

            case 'pause':
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(262, audioContext.currentTime);
                oscillator.frequency.setValueAtTime(196, audioContext.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
                break;
        }

        oscillator.start();
        oscillator.stop(audioContext.currentTime + (type === 'gameover' ? 0.8 : 0.3));
    } catch (e) {
        console.log("Ошибка воспроизведения звука", e);
    }
}

// Переключение звука
function toggleSound() {
    soundEnabled = !soundEnabled;
    soundToggle.textContent = soundEnabled ? '🔊' : '🔇';
    playSound('click');
    localStorage.setItem('vetGameSound', soundEnabled);
}

// Пауза игры
function togglePause() {
    if (!gameRunning) return;

    gamePaused = !gamePaused;
    pauseOverlay.classList.toggle('hidden', !gamePaused);
    pauseBtn.textContent = gamePaused ? '▶️' : '⏸️';
    playSound('pause');

    // Для мобильных устройств - обработка состояния аудиоконтекста
    if (audioContext) {
        if (gamePaused && audioContext.state === 'running') {
            audioContext.suspend().catch(() => {});
        } else if (!gamePaused && audioContext.state === 'suspended') {
            audioContext.resume().catch(() => {});
        }
    }
}

// Поделиться результатом
function shareResult() {
    const shareText = `Я вылечил ${score} животных в игре "ВетКликер"! 🐾🎮 Попробуй побить мой рекорд!`;

    if (navigator.share) {
        navigator.share({
            title: 'ВетКликер',
            text: shareText,
            url: window.location.href
        }).catch(() => {
            copyToClipboard(shareText);
        });
    } else {
        copyToClipboard(shareText);
    }
}

// Копирование в буфер обмена
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('Результат скопирован в буфер обмена! 📋\n' + text);
    }).catch(() => {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Результат скопирован в буфер обмена! 📋\n' + text);
    });
}

// Показать правила
function showRules() {
    if (gameRunning && !gamePaused) {
        togglePause();
    }
    rulesScreen.classList.remove('hidden');
    playSound('click');
}

// Скрыть правила
function hideRules() {
    rulesScreen.classList.add('hidden');
    playSound('click');
}

// Класс животного
class Animal {
    constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.width = 70;
        this.height = 70;
        this.speed = 1 + Math.random() * 0.5;
        this.health = 100;
        this.healing = false;
        this.healProgress = 0;
        this.sprite = this.createSprite();
        this.orientation = Math.random() > 0.5 ? 'front' : 'side';
    }

    createSprite() {
        const spriteData = ANIMAL_SPRITES[this.type] || ANIMAL_SPRITES.cat;
        const orientationData = spriteData[this.orientation] || spriteData.front;

        return {
            pixels: orientationData,
            color: ANIMAL_COLORS[this.type] || ANIMAL_COLORS.cat
        };
    }

    update(deltaTime) {
        this.x -= this.speed * speed * deltaTime;

        if (this.healing) {
            this.healProgress += deltaTime * 0.1;
            if (this.healProgress >= 1) {
                this.health = 100;
                score++;
                scoreElement.textContent = score;
                playSound('heal');
                return true;
            }
        }

        if (this.x + this.width < 0) {
            missedAnimals++;
            missedElement.textContent = missedAnimals;
            playSound('miss');
            return true;
        }

        return false;
    }

    draw() {
        if (!this.sprite || !this.sprite.pixels) return;

        const pixelSize = this.width / 7;

        for (let row = 0; row < 7; row++) {
            if (!this.sprite.pixels[row]) continue;

            for (let col = 0; col < 7; col++) {
                if (this.sprite.pixels[row][col]) {
                    ctx.fillStyle = this.sprite.color;
                    ctx.fillRect(
                        this.x + col * pixelSize,
                        this.y + row * pixelSize,
                        pixelSize,
                        pixelSize
                    );
                }
            }
        }

        ctx.fillStyle = '#333';
        ctx.fillRect(this.x, this.y - 10, this.width, 5);

        if (this.healing) {
            ctx.fillStyle = '#4caf50';
            ctx.fillRect(this.x, this.y - 10, this.width * this.healProgress, 5);
        } else {
            ctx.fillStyle = '#ff5252';
            ctx.fillRect(this.x, this.y - 10, this.width * (this.health / 100), 5);
        }
    }

    isPointInside(x, y) {
        return x >= this.x && x <= this.x + this.width &&
               y >= this.y && y <= this.y + this.height;
    }
}

// Инициализация игры
function initGame() {
    // Остановка предыдущей анимации если есть
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }

    setupCanvas();
    score = 0;
    speed = 1.0;
    animals = [];
    missedAnimals = 0;
    lastSpawnTime = 0;
    gameRunning = true;
    gamePaused = false;

    scoreElement.textContent = score;
    speedElement.textContent = speed.toFixed(1);
    missedElement.textContent = missedAnimals;
    pauseOverlay.classList.add('hidden');
    pauseBtn.textContent = '⏸️';

    initAudio();
    playSound('start');

    lastUpdateTime = 0;
    gameLoop();
}

// Основной игровой цикл
function gameLoop(timestamp) {
    if (!lastUpdateTime) lastUpdateTime = timestamp;
    const deltaTime = (timestamp - lastUpdateTime) / 16.67;
    lastUpdateTime = timestamp;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();

    if (gameRunning && !gamePaused) {
        if (timestamp - lastSpawnTime > 2000 / speed) {
            spawnAnimal();
            lastSpawnTime = timestamp;
        }

        for (let i = animals.length - 1; i >= 0; i--) {
            if (animals[i].update(deltaTime)) {
                animals.splice(i, 1);
            } else {
                animals[i].draw();
            }
        }

        speed = 1.0 + score * 0.05;
        speedElement.textContent = speed.toFixed(1);

        if (missedAnimals >= 5) {
            gameRunning = false;
            finalScoreElement.textContent = score;
            gameOverScreen.classList.remove('hidden');
            playSound('gameover');
        }
    }

    animationFrameId = requestAnimationFrame(gameLoop);
}

// Рисуем фон
function drawBackground() {
    ctx.fillStyle = '#a5d8ff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#8bc34a';
    ctx.fillRect(0, canvas.height - 40, canvas.width, 40);

    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 5; i++) {
        const x = (Date.now() / 20 + i * 200) % (canvas.width + 100) - 50;
        const y = 50 + i * 30;
        drawPixelatedCloud(x, y);
    }

    ctx.fillStyle = '#ffeb3b';
    drawPixelatedSun(canvas.width - 50, 50);
    drawVetClinic();
}

function drawPixelatedCloud(x, y) {
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.arc(x + 10, y - 5, 12, 0, Math.PI * 2);
    ctx.arc(x + 20, y, 15, 0, Math.PI * 2);
    ctx.arc(x + 10, y + 5, 12, 0, Math.PI * 2);
    ctx.fill();
}

function drawPixelatedSun(x, y) {
    ctx.beginPath();
    ctx.arc(x, y, 25, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(angle) * 25, y + Math.sin(angle) * 25);
        ctx.lineTo(x + Math.cos(angle) * 40, y + Math.sin(angle) * 40);
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#ffeb3b';
        ctx.stroke();
    }
}

function drawVetClinic() {
    const x = 50;
    const y = canvas.height - 140;

    ctx.fillStyle = '#ffccbc';
    ctx.fillRect(x, y, 100, 100);

    ctx.fillStyle = '#ff5722';
    ctx.beginPath();
    ctx.moveTo(x - 10, y);
    ctx.lineTo(x + 50, y - 30);
    ctx.lineTo(x + 110, y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#795548';
    ctx.fillRect(x + 40, y + 30, 20, 70);

    ctx.fillStyle = '#bbdefb';
    ctx.fillRect(x + 15, y + 20, 20, 20);
    ctx.fillRect(x + 65, y + 20, 20, 20);

    ctx.fillStyle = '#fff';
    ctx.fillRect(x + 29, y - 10, 51, 10);
    ctx.fillStyle = '#333';
    ctx.font = '8px Courier New';
    ctx.fillText('ВЕТКЛИНИКА', x + 32, y - 3);
}

function spawnAnimal() {
    const type = ANIMAL_TYPES[Math.floor(Math.random() * ANIMAL_TYPES.length)];
    const y = canvas.height - 110 - Math.random() * 200;

    animals.push(new Animal(type, canvas.width, y));
    playSound('animal', type);
}

function handleCanvasClick(x, y) {
    if (!gameRunning || gamePaused) return;

    for (const animal of animals) {
        if (animal.isPointInside(x, y)) {
            animal.healing = true;
            drawToolEffect(x, y, activeTool);
            break;
        }
    }
}

canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    handleCanvasClick(x, y);
});

// Улучшенная обработка касаний для мобильных устройств
canvas.addEventListener('touchstart', (event) => {
    event.preventDefault();
    if (gamePaused) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const touch = event.touches[0];
    const x = (touch.clientX - rect.left) * scaleX;
    const y = (touch.clientY - rect.top) * scaleY;

    handleCanvasClick(x, y);
}, { passive: false });

function drawToolEffect(x, y, tool) {
    ctx.save();

    switch(tool) {
        case 'syringe':
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - 15, y - 15);
            ctx.lineTo(x - 5, y - 25);
            ctx.lineTo(x + 5, y - 15);
            ctx.closePath();
            ctx.fill();
            break;

        case 'stethoscope':
            ctx.strokeStyle = '#4caf50';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, 15, 0, Math.PI * 2);
            ctx.stroke();
            break;

        case 'pill':
            ctx.fillStyle = '#f44336';
            ctx.beginPath();
            ctx.arc(x, y, 10, 0, Math.PI * 2);
            ctx.fill();
            break;
    }

    ctx.restore();

    setTimeout(() => {
        if (gameRunning) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            drawBackground();
            animals.forEach(animal => animal.draw());
        }
    }, 300);
}

// Обработчики событий
tools.forEach(tool => {
    tool.addEventListener('click', () => {
        tools.forEach(t => t.classList.remove('active'));
        tool.classList.add('active');
        activeTool = tool.id.replace('tool-', '');
        playSound('select');
    });

    tool.addEventListener('touchstart', (event) => {
        event.preventDefault();
        tools.forEach(t => t.classList.remove('active'));
        tool.classList.add('active');
        activeTool = tool.id.replace('tool-', '');
        playSound('select');
    });
});

startButton.addEventListener('click', () => {
    startScreen.classList.add('hidden');
    playSound('click');
    initGame();
});

restartButton.addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    playSound('click');
    initGame();
});

pauseBtn.addEventListener('click', togglePause);
rulesBtn.addEventListener('click', showRules);
rulesBtnStart.addEventListener('click', showRules);
rulesBtnEnd.addEventListener('click', showRules);
backBtn.addEventListener('click', hideRules);
shareBtn.addEventListener('click', shareResult);
soundToggle.addEventListener('click', toggleSound);

// Мобильные элементы управления
if (tapBtn) {
    tapBtn.addEventListener('click', () => {
        if (!gameRunning || gamePaused) return;

        for (const animal of animals) {
            if (!animal.healing) {
                animal.healing = true;
                drawToolEffect(
                    animal.x + animal.width/2,
                    animal.y + animal.height/2,
                    activeTool
                );
                break;
            }
        }
    });

    tapBtn.addEventListener('touchstart', (event) => {
        event.preventDefault();
        if (!gameRunning || gamePaused) return;

        for (const animal of animals) {
            if (!animal.healing) {
                animal.healing = true;
                drawToolEffect(
                    animal.x + animal.width/2,
                    animal.y + animal.height/2,
                    activeTool
                );
                break;
            }
        }
    });
}

// Загрузка игры
window.addEventListener('load', () => {
    setupCanvas();
    startScreen.classList.remove('hidden');

    // Инициализируем аудио при загрузке
    initAudio();

    const savedSoundSetting = localStorage.getItem('vetGameSound');
    if (savedSoundSetting !== null) {
        soundEnabled = savedSoundSetting === 'true';
        soundToggle.textContent = soundEnabled ? '🔊' : '🔇';
    }
});

// Обработка клавиши P для паузы
document.addEventListener('keydown', (event) => {
    if (event.key === 'p' || event.key === 'P' || event.key === 'з' || event.key === 'З') {
        togglePause();
    }
});

// Обработка видимости страницы для паузы на мобильных устройствах
document.addEventListener('visibilitychange', () => {
    if (document.hidden && gameRunning && !gamePaused) {
        togglePause();
    }
});

// Предотвращение скролла на мобильных устройствах
document.addEventListener('touchmove', function(event) {
    if (event.scale !== 1) {
        event.preventDefault();
    }
}, { passive: false });

// Обработка потери фокуса на мобильных устройствах
window.addEventListener('blur', () => {
    if (gameRunning && !gamePaused) {
        togglePause();
    }
});

// Обработка изменения размера окна
window.addEventListener('resize', () => {
    if (gameRunning) {
        setupCanvas();
    }
});
