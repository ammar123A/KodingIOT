// Main Application
class CodingIoTApp {
    static STORAGE = {
        CURRENT_PROJECT: 'kodingiot_current_project',
        CURRENT_USER: 'kodingiot_current_user'
    };

    constructor() {
        this.workspace = null;
        this.currentProjectId = null;   // DB integer id
        this.currentProjectName = null;
        this.init();
    }

    init() {
        // Initialize Blockly workspace
        this.initBlockly();
        
        // Initialize IoT Simulator
        window.iotSimulator = new IoTsimulator();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load default project
        this.loadDefaultProject();

        // If user came from Gallery, load selected project
        this.loadProjectFromGallery();
        
        console.log('🚀 KodingIoT App berjaya dimulakan!');
    }

    initBlockly() {
        const blocklyDiv = document.getElementById('blocklyDiv');
        const toolbox = document.getElementById('toolbox');
        
        this.workspace = Blockly.inject(blocklyDiv, {
            toolbox: toolbox,
            collapse: true,
            comments: true,
            disable: true,
            maxBlocks: 100,
            trashcan: true,
            horizontalLayout: false,
            toolboxPosition: 'start',
            css: true,
            media: 'https://unpkg.com/blockly/media/',
            rtl: false,
            scrollbars: true,
            sounds: true,
            oneBasedIndex: true,
            grid: {
                spacing: 20,
                length: 3,
                colour: '#ccc',
                snap: true
            },
            zoom: {
                controls: true,
                wheel: true,
                startScale: 1.0,
                maxScale: 3,
                minScale: 0.3,
                scaleSpeed: 1.2
            }
        });

        // Update code when workspace changes
        this.workspace.addChangeListener(() => {
            this.updateGeneratedCode();
        });
    }

    updateGeneratedCode() {
        try {
            const code = Blockly.JavaScript.workspaceToCode(this.workspace);
            document.getElementById('generatedCode').textContent = code;
        } catch (error) {
            console.error('Error generating code:', error);
            document.getElementById('generatedCode').textContent = '// Ralat menjana kod';
        }
    }

    setupEventListeners() {
        // Run button
        document.getElementById('btn-run').addEventListener('click', () => {
            this.runCode();
        });

        // New Project button
        document.getElementById('btn-new').addEventListener('click', () => {
            this.newProject();
        });

        // Save button
        document.getElementById('btn-save').addEventListener('click', () => {
            this.saveProject();
        });

        // Load button
        document.getElementById('btn-load').addEventListener('click', () => {
            this.loadProject();
        });

        // Tutorial button
        document.getElementById('btn-tutorial').addEventListener('click', () => {
            this.showTutorial();
        });

        // Arduino connect/disconnect button
        document.getElementById('btn-arduino').addEventListener('click', () => {
            this.toggleArduinoConnection();
        });

        // Arduino code view button
        document.getElementById('btn-arduino-code').addEventListener('click', () => {
            this.showArduinoCode();
        });

        // Arduino code modal buttons
        document.getElementById('btnCloseArduino')?.addEventListener('click', () => {
            document.getElementById('arduinoCodeModal').style.display = 'none';
        });
        document.getElementById('btnCopyArduino')?.addEventListener('click', () => {
            const code = document.getElementById('arduinoCodeOutput').textContent;
            navigator.clipboard.writeText(code).then(() => {
                this.showMessage('📋 Kod Arduino disalin!', 'success');
            });
        });
        document.getElementById('arduinoCodeModal')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                e.currentTarget.style.display = 'none';
            }
        });

        // Setup Arduino connection status
        this.setupArduinoUI();
    }

    async runCode() {
        try {
            const code = Blockly.JavaScript.workspaceToCode(this.workspace);
            console.log('Running code:', code);
            
            // Wrap in async IIFE so 'await' works inside generated code
            const asyncCode = `(async () => {\n${code}\n})()`;
            await eval(asyncCode);
            
            // Show success message
            this.showMessage('✅ Program berjaya dijalankan!', 'success');
        } catch (error) {
            console.error('Error running code:', error);
            this.showMessage('❌ Ralat menjalankan program: ' + error.message, 'error');
        }
    }

    async saveProject() {
        // Must be logged in
        const user = this.getCurrentUser();
        if (!user) {
            this.showMessage('❌ Sila log masuk terlebih dahulu.', 'error');
            if (confirm('Buka halaman log masuk?')) window.location.href = 'login.html';
            return;
        }

        // If editing existing project, offer to overwrite
        if (this.currentProjectId) {
            const overwrite = confirm(
                `Simpan perubahan ke "${this.currentProjectName}"?\n\n` +
                `OK = Timpa projek sedia ada\nCancel = Simpan sebagai projek baharu`
            );
            if (overwrite) {
                await this.overwriteProject();
                return;
            }
        }

        const projectName = prompt('Masukkan nama projek:', this.currentProjectName || 'Projek Saya');
        if (!projectName) return;

        const description = prompt('Penerangan projek (pilihan):', '') || '';
        const tagsInput = prompt('Tag (pisahkan dengan koma, pilihan):', 'iot,mudah') || '';
        const tags = tagsInput
            .split(',')
            .map(t => t.trim())
            .filter(Boolean);

        const workspaceData = Blockly.serialization.workspaces.save(this.workspace);
        const code = Blockly.JavaScript.workspaceToCode(this.workspace);

        const payload = {
            name: projectName,
            description,
            tags: tags.length ? tags : ['iot'],
            level: tags.includes('sulit') ? 'sulit' : tags.includes('menengah') ? 'menengah' : 'mudah',
            type: tags.includes('game') ? 'game' : tags.includes('sensor') ? 'sensor' : 'iot',
            workspaceData,
            code
        };

        try {
            const res = await ApiClient.saveProject(payload);
            if (res.error) {
                this.showMessage('❌ ' + res.error, 'error');
                return;
            }
            this.currentProjectId = res.project_id;
            this.currentProjectName = projectName;
            this.updateProjectNameDisplay();
            this.showMessage('💾 Projek disimpan ke Galeri!', 'success');

            if (confirm('Projek berjaya disimpan. Buka Galeri sekarang?')) {
                window.location.href = 'gallery.html';
            }
        } catch (err) {
            console.error('Save error:', err);
            this.showMessage('❌ Gagal menyimpan: ' + err.message, 'error');
        }
    }

    async overwriteProject() {
        const workspaceData = Blockly.serialization.workspaces.save(this.workspace);
        const code = Blockly.JavaScript.workspaceToCode(this.workspace);

        try {
            const res = await ApiClient.saveProject({
                id: this.currentProjectId,
                name: this.currentProjectName,
                workspaceData,
                code
            });
            if (res.error) {
                this.showMessage('❌ ' + res.error, 'error');
                return;
            }
            this.showMessage('💾 Projek berjaya dikemas kini!', 'success');
        } catch (err) {
            console.error('Overwrite error:', err);
            this.showMessage('❌ Gagal mengemas kini: ' + err.message, 'error');
        }
    }

    async loadProject() {
        try {
            const res = await ApiClient.loadProjects({ mine: 1 });
            if (res.error) {
                this.showMessage('❌ ' + res.error, 'error');
                return;
            }
            const allProjects = res.projects || [];
            if (allProjects.length === 0) {
                alert('Tiada projek yang tersimpan.');
                return;
            }

            const lines = allProjects.map((p, idx) => `${idx + 1}) ${p.name}`);
            const selected = prompt('Pilih projek (taip nombor):\n' + lines.join('\n'), '1');
            const selectedIndex = parseInt(selected, 10) - 1;
            if (Number.isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= allProjects.length) return;

            const project = allProjects[selectedIndex];
            const workspaceData = project.workspace_data || project.workspaceData;

            if (!workspaceData) {
                alert('Projek ini tidak mempunyai data Blockly untuk dimuatkan.');
                return;
            }

            Blockly.serialization.workspaces.load(workspaceData, this.workspace);
            this.currentProjectId = project.id;
            this.currentProjectName = project.name;
            this.updateProjectNameDisplay();
            this.showMessage('📂 Projek berjaya dimuatkan!', 'success');
        } catch (err) {
            console.error('Load error:', err);
            // Fallback: try localStorage for offline usage
            this.loadProjectFromLocalStorage();
        }
    }

    loadProjectFromLocalStorage() {
        // Fallback for when API is unavailable
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('kodingiot_project_')) {
                try {
                    const p = JSON.parse(localStorage.getItem(key));
                    if (p) keys.push(p);
                } catch { /* ignore */ }
            }
        }
        if (keys.length === 0) {
            alert('Tiada projek yang tersimpan (luar talian).');
            return;
        }
        const lines = keys.map((p, idx) => `${idx + 1}) ${p.name}`);
        const selected = prompt('Pilih projek (luar talian):\n' + lines.join('\n'), '1');
        const idx = parseInt(selected, 10) - 1;
        if (Number.isNaN(idx) || idx < 0 || idx >= keys.length) return;
        const project = keys[idx];
        const wd = project.workspaceData || project.data;
        if (wd) {
            Blockly.serialization.workspaces.load(wd, this.workspace);
            this.currentProjectId = project.id || null;
            this.currentProjectName = project.name || null;
            this.updateProjectNameDisplay();
            this.showMessage('📂 Projek dimuatkan (luar talian)!', 'success');
        }
    }

    loadProjectFromGallery() {
        const projectData = localStorage.getItem(CodingIoTApp.STORAGE.CURRENT_PROJECT);
        if (!projectData) return;

        try {
            const project = JSON.parse(projectData);
            const workspaceData = project.workspace_data || project.workspaceData || project.data;
            if (workspaceData) {
                Blockly.serialization.workspaces.load(workspaceData, this.workspace);
                this.currentProjectId = project.id || null;
                this.currentProjectName = project.name || null;
                this.updateProjectNameDisplay();
                this.showMessage(`📂 Projek "${project.name || 'Tanpa Nama'}" dimuatkan!`, 'success');
            } else {
                alert('Projek dari Galeri tidak mempunyai data Blockly.');
            }
        } catch (error) {
            console.error('Error loading project from gallery:', error);
        } finally {
            localStorage.removeItem(CodingIoTApp.STORAGE.CURRENT_PROJECT);
        }
    }

    getCurrentUser() {
        const str = localStorage.getItem(CodingIoTApp.STORAGE.CURRENT_USER);
        return str ? JSON.parse(str) : null;
    }

    newProject() {
        if (this.workspace.getAllBlocks().length > 0) {
            if (!confirm('Buat projek baharu? Blok yang belum disimpan akan hilang.')) return;
        }
        this.workspace.clear();
        this.currentProjectId = null;
        this.currentProjectName = null;
        this.updateProjectNameDisplay();
        this.showMessage('📝 Projek baharu dimulakan!', 'success');
    }

    updateProjectNameDisplay() {
        const el = document.getElementById('currentProjectName');
        if (!el) return;
        el.textContent = this.currentProjectName ? `📁 ${this.currentProjectName}` : '';
    }

    // ═══════════════════════════════════════
    // ARDUINO CONNECTION
    // ═══════════════════════════════════════

    setupArduinoUI() {
        const connector = window.arduinoConnector;
        if (!connector) return;

        // Show status bar if WebSerial is supported
        if (ArduinoConnector.isSupported()) {
            document.getElementById('arduinoStatus').style.display = '';
            document.getElementById('btn-arduino-code').style.display = '';
        }

        // Update UI when connection changes
        connector.onConnectionChange((connected) => {
            this.updateArduinoUI(connected);
        });
    }

    updateArduinoUI(connected) {
        const btn = document.getElementById('btn-arduino');
        const badge = document.getElementById('arduinoStatusBadge');

        if (connected) {
            btn.textContent = '🔌 Putuskan';
            btn.style.background = '#fc8181';
            if (badge) {
                badge.textContent = '✅ Arduino: Tersambung';
                badge.style.background = '#c6f6d5';
                badge.style.color = '#276749';
            }
        } else {
            btn.textContent = '🔌 Arduino';
            btn.style.background = '';
            if (badge) {
                badge.textContent = '🔌 Arduino: Tidak Tersambung';
                badge.style.background = '#fed7d7';
                badge.style.color = '#c53030';
            }
        }
    }

    async toggleArduinoConnection() {
        const connector = window.arduinoConnector;
        if (!connector) {
            this.showMessage('❌ Arduino connector tidak tersedia.', 'error');
            return;
        }

        if (!ArduinoConnector.isSupported()) {
            this.showMessage('❌ WebSerial tidak disokong. Gunakan Chrome atau Edge.', 'error');
            return;
        }

        try {
            if (connector.isConnected) {
                await connector.disconnect();
                this.showMessage('🔌 Arduino diputuskan.', 'info');
            } else {
                await connector.connect();
                this.showMessage('✅ Arduino tersambung! Sensor sebenar aktif.', 'success');
            }
        } catch (err) {
            console.error('Arduino connection error:', err);
            this.showMessage('❌ ' + err.message, 'error');
        }
    }

    showArduinoCode() {
        const code = Blockly.JavaScript.workspaceToCode(this.workspace);
        if (!code.trim()) {
            this.showMessage('⚠️ Buat program dahulu sebelum melihat kod Arduino.', 'error');
            return;
        }

        const arduinoCode = window.arduinoConnector.generateArduinoCode(code);
        document.getElementById('arduinoCodeOutput').textContent = arduinoCode;
        document.getElementById('arduinoCodeModal').style.display = 'flex';
    }

    showTutorial() {
        const tutorialContent = `
# 📚 Tutorial KodingIoT

## 🧩 Cara Menggunakan:
1. **Seret blok** dari toolbox di sebelah kiri
2. **Sambungkan blok** seperti puzzle
3. Klik **"Jalankan"** untuk melihat hasilnya

## 🔌 Blok IoT yang Tersedia:
- **Hidupkan LED**: Menghidupkan LED maya
- **Padamkan LED**: Memadamkan LED maya  
- **Tunggu**: Memberi jeda masa
- **Paparkan di LCD**: Memaparkan teks di paparan
- **Jika butang ditekan**: Tindakan apabila butang ditekan

## 🎮 Contoh Mudah:
Cuba buat program:
1. Hidupkan LED 1
2. Tunggu 1 saat
3. Padamkan LED 1
4. Paparkan "Selesai!" di LCD

Selamat belajar coding! 🚀
        `;
        
        alert(tutorialContent);
    }

    loadDefaultProject() {
        // Load a simple starter project
        const defaultProject = {
            "blocks": {
                "languageVersion": 0,
                "blocks": [
                    {
                        "type": "iot_led_on",
                        "id": "start",
                        "x": 100,
                        "y": 100,
                        "fields": {
                            "LED_NUMBER": "1"
                        }
                    }
                ]
            }
        };
        
        // Uncomment line below to load default project automatically
        // Blockly.serialization.workspaces.load(defaultProject, this.workspace);
    }

    showMessage(message, type = 'info') {
        // Create temporary message element
        const messageEl = document.createElement('div');
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#f56565' : '#4299e1'};
            color: white;
            border-radius: 10px;
            z-index: 10000;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            font-weight: bold;
        `;
        
        document.body.appendChild(messageEl);
        
        // Remove after 3 seconds
        setTimeout(() => {
            document.body.removeChild(messageEl);
        }, 3000);
    }
}

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.codingIoTApp = new CodingIoTApp();
});