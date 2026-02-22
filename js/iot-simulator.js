// IoT Simulator (single implementation)
class IoTsimulator {
    constructor() {
        this.ledStates = { '1': false, '2': false, '3': false };
        this.buttonCallbacks = { '1': null, '2': null };
        this.lcdText = 'Hello!';
        this.lcdCursor = { row: 0, column: 0 };
        this.servoAngles = { '1': 90, '2': 90, '3': 90 };
        this.sensorData = {
            temperature: 25.5,
            humidity: 60,
            light: 700,
            distance: 50,
            motion: false
        };

        this._sensorIntervalId = null;
        this.initSimulator();
    }

    initSimulator() {
        this.attachButtonListener('1');
        this.attachButtonListener('2');

        this.updateLCD();
        this.updateServoDisplays();
        this.updateSensorDisplays();
        this.startSensorSimulation();
    }

    attachButtonListener(buttonNumber) {
        const element = document.getElementById(`button${buttonNumber}`);
        if (!element) return;
        element.addEventListener('click', () => this.triggerButton(buttonNumber));
    }

    // =============================================
    // LED
    // =============================================

    led_on(ledNumber) {
        if (ledNumber === 'all') {
            ['1', '2', '3'].forEach(n => this.setLedState(n, true));
        } else {
            this.setLedState(String(ledNumber), true);
        }
        console.log(`LED ${ledNumber} ON`);
    }

    led_off(ledNumber) {
        if (ledNumber === 'all') {
            ['1', '2', '3'].forEach(n => this.setLedState(n, false));
        } else {
            this.setLedState(String(ledNumber), false);
        }
        console.log(`LED ${ledNumber} OFF`);
    }

    setLedState(ledNumber, isOn) {
        this.ledStates[ledNumber] = isOn;
        const el = document.getElementById(`led${ledNumber}`);
        if (!el) return;
        if (isOn) el.classList.remove('off');
        else el.classList.add('off');
    }

    // =============================================
    // DELAY
    // =============================================

    delay(seconds) {
        const ms = Math.max(0, Number(seconds) || 0) * 1000;
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // =============================================
    // LCD
    // =============================================

    lcd_display(text) {
        this.lcdText = String(text ?? '');
        this.updateLCD();
        console.log(`LCD Display: ${this.lcdText}`);
    }

    lcd_clear() {
        this.lcdText = ' '.repeat(16);
        this.lcdCursor = { row: 0, column: 0 };
        this.updateLCD();
        console.log('LCD cleared');
    }

    lcd_set_cursor(row, column) {
        this.lcdCursor = {
            row: Math.max(0, Math.min(1, Number(row) || 0)),
            column: Math.max(0, Math.min(15, Number(column) || 0))
        };
        console.log(`LCD cursor set to row ${this.lcdCursor.row}, column ${this.lcdCursor.column}`);
    }

    updateLCD() {
        const lcdElement = document.getElementById('lcdDisplay');
        if (!lcdElement) return;
        lcdElement.textContent = this.lcdText;
    }

    // =============================================
    // BUTTONS
    // =============================================

    setup_button(buttonNumber, callback) {
        this.buttonCallbacks[String(buttonNumber)] = callback;
    }

    triggerButton(buttonNumber) {
        const cb = this.buttonCallbacks[String(buttonNumber)];
        if (typeof cb === 'function') {
            console.log(`Button ${buttonNumber} pressed`);
            cb();
        }
    }

    // =============================================
    // GAME
    // =============================================

    game_move(direction) {
        const directions = {
            forward: 'ke hadapan',
            backward: 'ke belakang',
            left: 'ke kiri',
            right: 'ke kanan'
        };

        const label = directions[direction] || String(direction);
        console.log(`Bergerak ${label}`);
        alert(`Watak bergerak ${label}!`);
    }

    // =============================================
    // SENSORS
    // =============================================

    startSensorSimulation() {
        if (this._sensorIntervalId) return;
        this._sensorIntervalId = setInterval(() => {
            this.sensorData.temperature = 25 + Math.random() * 5;
            this.sensorData.humidity = 50 + Math.random() * 20;
            this.sensorData.light = 500 + Math.random() * 500;
            this.sensorData.distance = 10 + Math.random() * 90;
            this.sensorData.motion = Math.random() > 0.8;
            this.updateSensorDisplays();
        }, 2000);
    }

    temperature() {
        return Number(this.sensorData.temperature).toFixed(1);
    }

    humidity() {
        return Number(this.sensorData.humidity).toFixed(1);
    }

    light() {
        return Math.round(Number(this.sensorData.light) || 0);
    }

    distance() {
        return Math.round(Number(this.sensorData.distance) || 0);
    }

    motion() {
        return !!this.sensorData.motion;
    }

    updateSensorDisplays() {
        const sensorElements = {
            temperature: `🌡️ ${this.temperature()}°C`,
            humidity: `💧 ${this.humidity()}%`,
            light: `🔆 ${this.light()} lx`,
            distance: `📏 ${this.distance()} cm`,
            motion: `🚶 ${this.motion() ? 'ADA GERAKAN' : 'TIADA'}`
        };

        for (const [sensor, value] of Object.entries(sensorElements)) {
            const el = document.getElementById(`sensor-${sensor}`);
            if (el) el.textContent = value;
        }
    }

    // =============================================
    // SERVO
    // =============================================

    servo_rotate(servoNumber, angle) {
        const servoId = String(servoNumber);
        const numericAngle = Math.max(0, Math.min(180, Number(angle) || 0));
        this.servoAngles[servoId] = numericAngle;
        this.updateServoDisplays();
        console.log(`Servo ${servoId} diputar ke ${numericAngle}°`);
    }

    updateServoDisplays() {
        for (let i = 1; i <= 3; i++) {
            const servoId = String(i);
            const servoElement = document.getElementById(`servo${servoId}`);
            if (!servoElement) continue;
            servoElement.textContent = `${this.servoAngles[servoId]}°`;
            servoElement.style.transform = `rotate(${this.servoAngles[servoId] - 90}deg)`;
        }
    }

    // =============================================
    // BUZZER
    // =============================================

    buzzer_beep(soundType) {
        console.log(`Buzzer: ${soundType} beep`);
        this.playBuzzerSound(soundType);
        this.showBuzzerAnimation();
    }

    buzzer_tone(frequency, duration) {
        const hz = Number(frequency) || 440;
        const ms = Math.max(0, (Number(duration) || 0) * 1000);
        console.log(`Buzzer tone: ${hz}Hz for ${ms}ms`);
        this.playTone(hz, ms);
        this.showBuzzerAnimation();
    }

    playBuzzerSound(soundType) {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const audioContext = new AudioContext();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            const now = audioContext.currentTime;
            gainNode.gain.setValueAtTime(0.0001, now);
            gainNode.gain.exponentialRampToValueAtTime(0.25, now + 0.02);

            switch (soundType) {
                case 'short': {
                    oscillator.frequency.setValueAtTime(1000, now);
                    oscillator.start(now);
                    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
                    oscillator.stop(now + 0.12);
                    break;
                }
                case 'long': {
                    oscillator.frequency.setValueAtTime(800, now);
                    oscillator.start(now);
                    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
                    oscillator.stop(now + 0.5);
                    break;
                }
                case 'siren': {
                    oscillator.frequency.setValueAtTime(800, now);
                    oscillator.frequency.exponentialRampToValueAtTime(1600, now + 0.5);
                    oscillator.frequency.exponentialRampToValueAtTime(800, now + 1.0);
                    oscillator.start(now);
                    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.0);
                    oscillator.stop(now + 1.0);
                    break;
                }
                default: {
                    oscillator.frequency.setValueAtTime(900, now);
                    oscillator.start(now);
                    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
                    oscillator.stop(now + 0.2);
                    break;
                }
            }

            oscillator.onended = () => {
                try { audioContext.close(); } catch { /* ignore */ }
            };
        } catch {
            // ignore audio errors
        }
    }

    playTone(frequency, durationMs) {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const audioContext = new AudioContext();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            const now = audioContext.currentTime;
            oscillator.frequency.setValueAtTime(Number(frequency) || 440, now);
            gainNode.gain.setValueAtTime(0.0001, now);
            gainNode.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(0.05, durationMs / 1000));

            oscillator.start(now);
            oscillator.stop(now + Math.max(0.05, durationMs / 1000));

            oscillator.onended = () => {
                try { audioContext.close(); } catch { /* ignore */ }
            };
        } catch {
            // ignore audio errors
        }
    }

    showBuzzerAnimation() {
        const buzzerElement = document.getElementById('buzzer');
        if (!buzzerElement) return;
        buzzerElement.classList.add('active');
        setTimeout(() => buzzerElement.classList.remove('active'), 250);
    }
}

// =============================================
// FUNGSI GLOBAL UNTUK BLOK BARU
// =============================================

// Global functions untuk Blockly (basic IoT + Game)
function iot_led_on(ledNumber) {
    window.iotSimulator.led_on(ledNumber);
}

function iot_led_off(ledNumber) {
    window.iotSimulator.led_off(ledNumber);
}

async function iot_delay(seconds) {
    await window.iotSimulator.delay(seconds);
}

function iot_lcd_display(text) {
    window.iotSimulator.lcd_display(text);
}

function iot_setup_button(buttonNumber, callback) {
    window.iotSimulator.setup_button(buttonNumber, callback);
}

function game_move(direction) {
    window.iotSimulator.game_move(direction);
}

function sensor_temperature() {
    return parseFloat(window.iotSimulator.temperature());
}

function sensor_humidity() {
    return parseFloat(window.iotSimulator.humidity());
}

function sensor_light() {
    return window.iotSimulator.light();
}

function servo_rotate(servoNumber, angle) {
    window.iotSimulator.servo_rotate(servoNumber, angle);
}

function buzzer_beep(soundType) {
    window.iotSimulator.buzzer_beep(soundType);
}

function buzzer_tone(frequency, duration) {
    window.iotSimulator.buzzer_tone(frequency, duration);
}

function sensor_distance() {
    return window.iotSimulator.distance();
}

function sensor_motion() {
    return window.iotSimulator.motion();
}

function lcd_clear() {
    window.iotSimulator.lcd_clear();
}

function lcd_set_cursor(row, column) {
    window.iotSimulator.lcd_set_cursor(row, column);
}