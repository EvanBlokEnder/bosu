import * as THREE from 'three';
import * as TWEEN from 'tween';

let scene, camera, renderer;
let currentNote = null;
let gameStarted = false;
let score = 0;
let combo = 0;
const maxComboResetTime = 1000;
let lastHitTime = 0;
let hitSoundBuffer, missSoundBuffer;
let audioContext;
let currentMusic;
let musicVolume = 0.5;
let currentLevel = null;

const COLORS = {
    note: 0x00ffff,
    up: 0xff0000,
    down: 0x00ff00,
    left: 0x0000ff,
    right: 0xffff00
};

const NOTE_DIRECTIONS = {
    UP: 'up',
    DOWN: 'down',
    LEFT: 'left',
    RIGHT: 'right'
};

const initAudio = async () => {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Load hit sounds
    const hitResponse = await fetch('assets/hitsound.mp3');
    const hitArrayBuffer = await hitResponse.arrayBuffer();
    hitSoundBuffer = await audioContext.decodeAudioData(hitArrayBuffer);
    
    const missResponse = await fetch('assets/misssound.mp3');
    const missArrayBuffer = await missResponse.arrayBuffer();
    missSoundBuffer = await audioContext.decodeAudioData(missArrayBuffer);
    
    currentMusic = document.getElementById('background-music');
};

const playSound = (buffer, volume = 1.0) => {
    if (!audioContext) return;
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    const gainNode = audioContext.createGain();
    gainNode.gain.value = volume;
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    source.start(0);
};

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('game-container').appendChild(renderer.domElement);

    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);

    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('keydown', onKeyDown);

    document.getElementById('start-button').addEventListener('click', showLevelSelection);
    document.getElementById('back-button').addEventListener('click', hideLevelSelection);
    document.getElementById('editor-button').addEventListener('click', () => {
        window.location.href = 'editor.html';
    });

    initAudio();
    loadOnlineLevels();
}

function showLevelSelection() {
    document.getElementById('controller-status').style.display = 'none';
    document.getElementById('start-button').style.display = 'none';
    document.getElementById('level-selection').style.display = 'block';
}

function hideLevelSelection() {
    document.getElementById('controller-status').style.display = 'block';
    document.getElementById('start-button').style.display = 'block';
    document.getElementById('level-selection').style.display = 'none';
}

async function loadOnlineLevels() {
    try {
        const response = await fetch('https://your-render-backend-url.onrender.com/api/levels');
        const levels = await response.json();
        const levelList = document.getElementById('level-list');
        levelList.innerHTML = '';

        levels.forEach(level => {
            const levelCard = document.createElement('div');
            levelCard.className = 'level-card';
            levelCard.innerHTML = `
                <img src="${level.coverUrl}" alt="${level.title}">
                <h3>${level.title}</h3>
                <p>By ${level.author}</p>
                <p>Difficulty: ${'★'.repeat(level.difficulty)}</p>
            `;
            levelCard.addEventListener('click', () => startGame(level));
            levelList.appendChild(levelCard);
        });
    } catch (error) {
        console.error('Error loading levels:', error);
    }
}

function startGame(level) {
    currentLevel = level;
    gameStarted = true;
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('game-info').style.display = 'flex';
    
    currentMusic.src = level.songUrl;
    currentMusic.volume = musicVolume;
    currentMusic.play();
    
    document.getElementById('song-info').textContent = `Now Playing: ${level.title} by ${level.author}`;
    
    score = 0;
    combo = 0;
    updateScoreDisplay();
    
    // Start generating notes from the level data
    generateNotesFromLevel(level);
}

function generateNotesFromLevel(level) {
    // This would be more complex in a real implementation
    // For now, we'll just generate random notes in the rhythm of the music
    setInterval(() => {
        if (gameStarted && !currentNote) {
            createNote();
        }
    }, 1000);
}

function createNote() {
    if (currentNote) {
        scene.remove(currentNote);
        currentNote = null;
    }

    const noteGroup = new THREE.Group();
    const frustumHeight = 2 * Math.tan(camera.fov * 0.5 * Math.PI / 180) * camera.position.z;
    const frustumWidth = frustumHeight * camera.aspect;
    const size = Math.min(frustumWidth, frustumHeight) * 0.9;

    const boxGeometry = new THREE.BoxGeometry(size, size, 0.1);
    const directions = Object.values(NOTE_DIRECTIONS);
    const direction = directions[Math.floor(Math.random() * directions.length)];
    
    const boxMaterial = new THREE.MeshStandardMaterial({ 
        color: COLORS[direction] || COLORS.note 
    });
    const note = new THREE.Mesh(boxGeometry, boxMaterial);
    noteGroup.add(note);

    const arrowGeometry = new THREE.PlaneGeometry(size * 0.5, size * 0.5);
    const arrowCanvas = document.createElement('canvas');
    arrowCanvas.width = 128;
    arrowCanvas.height = 128;
    const ctx = arrowCanvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.beginPath();
    
    // Draw arrow based on direction
    switch (direction) {
        case NOTE_DIRECTIONS.UP:
            ctx.moveTo(64, 10);
            ctx.lineTo(108, 80);
            ctx.lineTo(80, 80);
            ctx.lineTo(80, 118);
            ctx.lineTo(48, 118);
            ctx.lineTo(48, 80);
            ctx.lineTo(20, 80);
            break;
        case NOTE_DIRECTIONS.DOWN:
            ctx.moveTo(64, 118);
            ctx.lineTo(108, 48);
            ctx.lineTo(80, 48);
            ctx.lineTo(80, 10);
            ctx.lineTo(48, 10);
            ctx.lineTo(48, 48);
            ctx.lineTo(20, 48);
            break;
        case NOTE_DIRECTIONS.LEFT:
            ctx.moveTo(10, 64);
            ctx.lineTo(80, 20);
            ctx.lineTo(80, 48);
            ctx.lineTo(118, 48);
            ctx.lineTo(118, 80);
            ctx.lineTo(80, 80);
            ctx.lineTo(80, 108);
            break;
        case NOTE_DIRECTIONS.RIGHT:
            ctx.moveTo(118, 64);
            ctx.lineTo(48, 20);
            ctx.lineTo(48, 48);
            ctx.lineTo(10, 48);
            ctx.lineTo(10, 80);
            ctx.lineTo(48, 80);
            ctx.lineTo(48, 108);
            break;
    }
    
    ctx.closePath();
    ctx.fill();

    const arrowTexture = new THREE.CanvasTexture(arrowCanvas);
    const arrowMaterial = new THREE.MeshBasicMaterial({ 
        map: arrowTexture, 
        transparent: true, 
        side: THREE.DoubleSide 
    });
    const arrowMesh = new THREE.Mesh(arrowGeometry, arrowMaterial);
    arrowMesh.position.z = 0.06;
    noteGroup.add(arrowMesh);

    noteGroup.position.z = -10;
    noteGroup.userData = { direction, hit: false };
    scene.add(noteGroup);
    currentNote = noteGroup;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(event) {
    if (!gameStarted || !currentNote || currentNote.userData.hit) return;

    const requiredDirection = currentNote.userData.direction;
    let correctHit = false;

    switch (event.key.toLowerCase()) {
        case 'w': if (requiredDirection === NOTE_DIRECTIONS.UP) correctHit = true; break;
        case 's': if (requiredDirection === NOTE_DIRECTIONS.DOWN) correctHit = true; break;
        case 'a': if (requiredDirection === NOTE_DIRECTIONS.LEFT) correctHit = true; break;
        case 'd': if (requiredDirection === NOTE_DIRECTIONS.RIGHT) correctHit = true; break;
    }

    if (correctHit) {
        currentNote.userData.hit = true;
        score++;
        combo++;
        lastHitTime = performance.now();
        updateScoreDisplay();
        playSound(hitSoundBuffer);
        showFeedback('Perfect!');
        
        new TWEEN.Tween(currentNote.scale)
            .to({ x: 0, y: 0, z: 0 }, 150)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onComplete(() => {
                scene.remove(currentNote);
                currentNote = null;
            })
            .start();
    } else {
        playSound(missSoundBuffer, 0.7);
        combo = 0;
        updateScoreDisplay();
        showFeedback('Miss!');
        
        new TWEEN.Tween(currentNote.scale)
            .to({ x: 0, y: 0, z: 0 }, 150)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onComplete(() => {
                scene.remove(currentNote);
                currentNote = null;
            })
            .start();
    }
}

function update() {
    requestAnimationFrame(update);
    TWEEN.update();

    if (gameStarted) {
        if (currentNote) {
            currentNote.position.z += 0.2;

            if (currentNote.position.z > camera.position.z + 1 && !currentNote.userData.hit) {
                playSound(missSoundBuffer, 0.7);
                combo = 0;
                updateScoreDisplay();
                showFeedback('Miss!');
                scene.remove(currentNote);
                currentNote = null;
            }
        }

        if (combo > 0 && performance.now() - lastHitTime > maxComboResetTime) {
            combo = 0;
            updateScoreDisplay();
        }
    }

    renderer.render(scene, camera);
}

function updateScoreDisplay() {
    document.getElementById('score').textContent = `Score: ${score}`;
    document.getElementById('combo').textContent = `Combo: ${combo}`;
}

function showFeedback(message) {
    const feedbackElement = document.getElementById('feedback-message');
    feedbackElement.textContent = message;
    feedbackElement.style.opacity = 1;

    new TWEEN.Tween({ opacity: 1 })
        .to({ opacity: 0 }, 500)
        .delay(300)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(obj => {
            feedbackElement.style.opacity = obj.opacity;
        })
        .start();
}

init();
update();
