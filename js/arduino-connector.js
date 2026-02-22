// Arduino/ESP32 Connector using WebSerial API
class ArduinoConnector {
    constructor() {
        this.port = null;
        this.reader = null;
        this.writer = null;
        this.isConnected = false;
        this.lineBuffer = '';          // accumulates partial serial lines
        this.connectionCallbacks = [];
        this._readLoopActive = false;
    }

    // ═══════════════════════════════════════
    // CONNECTION
    // ═══════════════════════════════════════

    static isSupported() {
        return 'serial' in navigator;
    }

    async connect() {
        if (!ArduinoConnector.isSupported()) {
            throw new Error('WebSerial API tidak disokong di pelayar ini. Gunakan Chrome atau Edge.');
        }

        try {
            this.port = await navigator.serial.requestPort();
            await this.port.open({
                baudRate: 9600,
                dataBits: 8,
                stopBits: 1,
                parity: 'none'
            });

            this.isConnected = true;
            this._readLoopActive = true;
            this.startReadLoop();
            this.notifyConnectionChange(true);

            // Stop simulated sensor updates — real data takes over
            if (window.iotSimulator?._sensorIntervalId) {
                clearInterval(window.iotSimulator._sensorIntervalId);
                window.iotSimulator._sensorIntervalId = null;
            }

            console.log('✅ Tersambung dengan Arduino/ESP32');
            return true;
        } catch (error) {
            console.error('❌ Gagal menyambung:', error);
            throw error;
        }
    }

    async disconnect() {
        this._readLoopActive = false;

        try {
            if (this.reader) {
                await this.reader.cancel();
                this.reader = null;
            }
            if (this.port) {
                await this.port.close();
                this.port = null;
            }
        } catch (err) {
            console.warn('Disconnect warning:', err);
        }

        this.writer = null;
        this.isConnected = false;
        this.lineBuffer = '';
        this.notifyConnectionChange(false);

        // Restart simulated sensors
        if (window.iotSimulator && !window.iotSimulator._sensorIntervalId) {
            window.iotSimulator.startSensorSimulation();
        }

        console.log('🔌 Sambungan Arduino diputuskan');
    }

    // ═══════════════════════════════════════
    // SERIAL READ LOOP
    // ═══════════════════════════════════════

    async startReadLoop() {
        while (this._readLoopActive && this.port?.readable) {
            this.reader = this.port.readable.getReader();
            try {
                while (true) {
                    const { value, done } = await this.reader.read();
                    if (done) break;
                    this.processIncomingData(value);
                }
            } catch (error) {
                if (this._readLoopActive) {
                    console.error('Serial read error:', error);
                }
            } finally {
                try { this.reader.releaseLock(); } catch { /* ignore */ }
                this.reader = null;
            }
        }

        // If we exited unexpectedly, clean up
        if (this.isConnected) {
            this.isConnected = false;
            this.notifyConnectionChange(false);
            console.warn('⚠️ Sambungan Arduino terputus secara tidak dijangka');
        }
    }

    processIncomingData(data) {
        const text = new TextDecoder().decode(data);
        this.lineBuffer += text;

        // Process complete lines (split by \n)
        const lines = this.lineBuffer.split('\n');
        // Keep the last incomplete chunk in the buffer
        this.lineBuffer = lines.pop() || '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) {
                console.log('📥 Arduino:', trimmed);
                this.parseArduinoMessage(trimmed);
            }
        }
    }

    // ═══════════════════════════════════════
    // PARSE INCOMING SENSOR DATA
    // Expected format: "TEMP:25.5,HUM:60,LIGHT:700,DISTANCE:50,MOTION:1"
    // ═══════════════════════════════════════

    parseArduinoMessage(message) {
        const parts = message.split(',');

        parts.forEach(part => {
            const colonIdx = part.indexOf(':');
            if (colonIdx === -1) return;
            const key   = part.substring(0, colonIdx).trim().toUpperCase();
            const value = part.substring(colonIdx + 1).trim();

            this.updateSensorValue(key, value);
        });
    }

    updateSensorValue(sensor, rawValue) {
        const sim = window.iotSimulator;
        if (!sim) return;

        const num = parseFloat(rawValue);

        switch (sensor) {
            case 'TEMP':
            case 'TEMPERATURE':
                sim.sensorData.temperature = num;
                break;
            case 'HUM':
            case 'HUMIDITY':
                sim.sensorData.humidity = num;
                break;
            case 'LIGHT':
            case 'LDR':
                sim.sensorData.light = num;
                break;
            case 'DIST':
            case 'DISTANCE':
                sim.sensorData.distance = num;
                break;
            case 'MOTION':
            case 'PIR':
                sim.sensorData.motion = (rawValue === '1' || rawValue.toLowerCase() === 'true');
                break;
            default:
                console.log(`Unknown sensor key: ${sensor}`);
                return;
        }

        sim.updateSensorDisplays();
    }

    // ═══════════════════════════════════════
    // SEND COMMANDS TO ARDUINO
    // ═══════════════════════════════════════

    async sendCommand(command) {
        if (!this.isConnected || !this.port?.writable) {
            throw new Error('Tidak tersambung dengan Arduino');
        }

        const writer = this.port.writable.getWriter();
        try {
            const encoded = new TextEncoder().encode(command + '\n');
            await writer.write(encoded);
            console.log('📤 Arahan dihantar:', command);
        } finally {
            writer.releaseLock();
        }
    }

    // ═══════════════════════════════════════
    // CONNECTION CHANGE CALLBACKS
    // ═══════════════════════════════════════

    onConnectionChange(callback) {
        this.connectionCallbacks.push(callback);
    }

    notifyConnectionChange(connected) {
        this.connectionCallbacks.forEach(cb => {
            try { cb(connected); } catch { /* ignore */ }
        });
    }

    // ═══════════════════════════════════════
    // ARDUINO CODE GENERATION
    // ═══════════════════════════════════════

    generateArduinoCode(blocklyCode) {
        const pins = this.detectPinsUsed(blocklyCode);
        const pinSetup = pins.map(p => `    pinMode(${p.pin}, ${p.mode});`).join('\n');

        return `// ====================================
// Generated by KodingIoT
// ====================================
#include <Servo.h>

// --- Pin Definitions ---
#define LED1_PIN    2
#define LED2_PIN    3
#define LED3_PIN    4
#define BUTTON1_PIN 5
#define BUTTON2_PIN 6
#define BUZZER_PIN  7
#define SERVO1_PIN  9
#define SERVO2_PIN  10
#define LDR_PIN     A0
#define TRIG_PIN    11
#define ECHO_PIN    12
#define PIR_PIN     13

// --- DHT Sensor (optional) ---
// #include <DHT.h>
// #define DHT_PIN 8
// #define DHT_TYPE DHT11
// DHT dht(DHT_PIN, DHT_TYPE);

Servo servo1;
Servo servo2;

void setup() {
    Serial.begin(9600);
${pinSetup}
    servo1.attach(SERVO1_PIN);
    servo2.attach(SERVO2_PIN);
    // dht.begin();  // uncomment if using DHT
}

void loop() {
${this.convertToArduino(blocklyCode)}
}

// --- Helper: read ultrasonic distance (cm) ---
long readDistance() {
    digitalWrite(TRIG_PIN, LOW);
    delayMicroseconds(2);
    digitalWrite(TRIG_PIN, HIGH);
    delayMicroseconds(10);
    digitalWrite(TRIG_PIN, LOW);
    long duration = pulseIn(ECHO_PIN, HIGH, 30000);
    return duration * 0.034 / 2;
}
`;
    }

    detectPinsUsed(code) {
        const pins = [];
        if (/iot_led_on|iot_led_off/.test(code)) {
            pins.push({ pin: 'LED1_PIN', mode: 'OUTPUT' });
            pins.push({ pin: 'LED2_PIN', mode: 'OUTPUT' });
            pins.push({ pin: 'LED3_PIN', mode: 'OUTPUT' });
        }
        if (/iot_setup_button/.test(code)) {
            pins.push({ pin: 'BUTTON1_PIN', mode: 'INPUT_PULLUP' });
            pins.push({ pin: 'BUTTON2_PIN', mode: 'INPUT_PULLUP' });
        }
        if (/buzzer_beep|buzzer_tone/.test(code)) {
            pins.push({ pin: 'BUZZER_PIN', mode: 'OUTPUT' });
        }
        if (/sensor_distance/.test(code)) {
            pins.push({ pin: 'TRIG_PIN', mode: 'OUTPUT' });
            pins.push({ pin: 'ECHO_PIN', mode: 'INPUT' });
        }
        if (/sensor_motion/.test(code)) {
            pins.push({ pin: 'PIR_PIN', mode: 'INPUT' });
        }
        if (/sensor_light/.test(code)) {
            pins.push({ pin: 'LDR_PIN', mode: 'INPUT' });
        }
        return pins;
    }

    convertToArduino(jsCode) {
        let c = jsCode;

        // LED
        c = c.replace(/iot_led_on\("all"\);/g,
            'digitalWrite(LED1_PIN, HIGH);\n    digitalWrite(LED2_PIN, HIGH);\n    digitalWrite(LED3_PIN, HIGH);');
        c = c.replace(/iot_led_off\("all"\);/g,
            'digitalWrite(LED1_PIN, LOW);\n    digitalWrite(LED2_PIN, LOW);\n    digitalWrite(LED3_PIN, LOW);');
        c = c.replace(/iot_led_on\("(\d+)"\);/g, 'digitalWrite(LED$1_PIN, HIGH);');
        c = c.replace(/iot_led_off\("(\d+)"\);/g, 'digitalWrite(LED$1_PIN, LOW);');

        // Delay
        c = c.replace(/await\s+iot_delay\(([^)]+)\);/g, 'delay((int)($1 * 1000));');
        c = c.replace(/iot_delay\(([^)]+)\);/g, 'delay((int)($1 * 1000));');

        // LCD (→ Serial for simplicity)
        c = c.replace(/iot_lcd_display\(([^)]+)\);/g, 'Serial.println($1);');
        c = c.replace(/lcd_clear\(\);/g, '// LCD cleared');
        c = c.replace(/lcd_set_cursor\((\d+),\s*(\d+)\);/g, '// LCD cursor set to $1,$2');

        // Sensors (→ read functions)
        c = c.replace(/sensor_temperature\(\)/g, '/* dht.readTemperature() */ 25.0');
        c = c.replace(/sensor_humidity\(\)/g, '/* dht.readHumidity() */ 60.0');
        c = c.replace(/sensor_light\(\)/g, 'analogRead(LDR_PIN)');
        c = c.replace(/sensor_distance\(\)/g, 'readDistance()');
        c = c.replace(/sensor_motion\(\)/g, 'digitalRead(PIR_PIN)');

        // Servo
        c = c.replace(/servo_rotate\("1",\s*(\d+)\);/g, 'servo1.write($1);');
        c = c.replace(/servo_rotate\("2",\s*(\d+)\);/g, 'servo2.write($1);');

        // Buzzer
        c = c.replace(/buzzer_tone\((\d+),\s*([^)]+)\);/g, 'tone(BUZZER_PIN, $1, (int)($2 * 1000));');
        c = c.replace(/buzzer_beep\("short"\);/g, 'tone(BUZZER_PIN, 1000, 100);');
        c = c.replace(/buzzer_beep\("long"\);/g, 'tone(BUZZER_PIN, 800, 500);');
        c = c.replace(/buzzer_beep\("siren"\);/g,
            'tone(BUZZER_PIN, 800, 500); delay(500); tone(BUZZER_PIN, 1600, 500);');
        c = c.replace(/buzzer_beep\("[^"]*"\);/g, 'tone(BUZZER_PIN, 900, 200);');

        // Button
        c = c.replace(/iot_setup_button\("1",\s*function\(\)\s*\{/g,
            'if (digitalRead(BUTTON1_PIN) == LOW) {');
        c = c.replace(/iot_setup_button\("2",\s*function\(\)\s*\{/g,
            'if (digitalRead(BUTTON2_PIN) == LOW) {');

        // Game (→ serial log)
        c = c.replace(/game_move\("([^"]+)"\);/g, 'Serial.println("Move: $1");');

        // Indent all lines
        c = c.split('\n').map(line => '    ' + line).join('\n');

        return c;
    }
}

// Global instance
window.arduinoConnector = new ArduinoConnector();