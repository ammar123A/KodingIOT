// Custom Blocks untuk IoT dan Game

// Blok LED ON
Blockly.Blocks['iot_led_on'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("🔆 Hidupkan LED")
        .appendField(new Blockly.FieldDropdown([
          ["LED 1", "1"],
          ["LED 2", "2"],
          ["Semua LED", "all"]
        ]), "LED_NUMBER");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(120);
    this.setTooltip("Hidupkan LED yang dipilih");
  }
};

// Blok LED OFF
Blockly.Blocks['iot_led_off'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("💡 Padamkan LED")
        .appendField(new Blockly.FieldDropdown([
          ["LED 1", "1"],
          ["LED 2", "2"],
          ["Semua LED", "all"]
        ]), "LED_NUMBER");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(120);
    this.setTooltip("Padamkan LED yang dipilih");
  }
};

// Blok Delay
Blockly.Blocks['iot_delay'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("⏱️ Tunggu")
        .appendField(new Blockly.FieldNumber(1, 0.1, 10, 0.1), "SECONDS")
        .appendField("saat");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(120);
    this.setTooltip("Tunggu selama masa tertentu");
  }
};

// Blok LCD Display
Blockly.Blocks['iot_lcd_display'] = {
  init: function() {
    this.appendValueInput("TEXT")
        .setCheck(null)
        .appendField("📺 Paparkan di LCD:");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(120);
    this.setTooltip("Paparkan teks di paparan LCD");
  }
};

// Blok Button Pressed
Blockly.Blocks['iot_button_pressed'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("🔘 Jika butang")
        .appendField(new Blockly.FieldDropdown([
          ["Butang 1", "1"],
          ["Butang 2", "2"]
        ]), "BUTTON_NUMBER")
        .appendField("ditekan");
    this.appendStatementInput("DO")
        .setCheck(null)
        .appendField("maka");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(120);
    this.setTooltip("Lakukan tindakan apabila butang ditekan");
  }
};

// Blok Game - Move
Blockly.Blocks['game_move'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("🎯 Gerakkan")
        .appendField(new Blockly.FieldDropdown([
          ["ke hadapan", "forward"],
          ["ke belakang", "backward"],
          ["ke kiri", "left"],
          ["ke kanan", "right"]
        ]), "DIRECTION");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
    this.setTooltip("Gerakkan watak ke arah tertentu");
  }
};

function registerJsGenerator(blockType, generatorFn) {
  if (typeof Blockly === 'undefined' || !Blockly.JavaScript) {
    return;
  }

  // Blockly versi baru memakai `forBlock`, versi lama memakai properti langsung.
  if (!Blockly.JavaScript.forBlock) {
    Blockly.JavaScript.forBlock = Object.create(null);
  }

  Blockly.JavaScript.forBlock[blockType] = generatorFn;
  Blockly.JavaScript[blockType] = generatorFn;
}

// Generator JavaScript untuk blok kustom
registerJsGenerator('iot_led_on', function(block) {
  var ledNumber = block.getFieldValue('LED_NUMBER');
  return `iot_led_on("${ledNumber}");\n`;
});

registerJsGenerator('iot_led_off', function(block) {
  var ledNumber = block.getFieldValue('LED_NUMBER');
  return `iot_led_off("${ledNumber}");\n`;
});

registerJsGenerator('iot_delay', function(block) {
  var seconds = block.getFieldValue('SECONDS');
  return `await iot_delay(${seconds});\n`;
});

registerJsGenerator('iot_lcd_display', function(block) {
  var text = Blockly.JavaScript.valueToCode(block, 'TEXT', 
    Blockly.JavaScript.ORDER_NONE) || "''";
  return `iot_lcd_display(${text});\n`;
});

registerJsGenerator('iot_button_pressed', function(block) {
  var buttonNumber = block.getFieldValue('BUTTON_NUMBER');
  var statements_do = Blockly.JavaScript.statementToCode(block, 'DO');
  return `iot_setup_button("${buttonNumber}", function() {\n${statements_do}});\n`;
});

registerJsGenerator('game_move', function(block) {
  var direction = block.getFieldValue('DIRECTION');
  return `game_move("${direction}");\n`;
});

// =============================================
// BLOK SENSOR SUHU DAN KELEMBAPAN
// =============================================

Blockly.Blocks['sensor_temperature'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("🌡️ Baca Suhu dari Sensor");
    this.setOutput(true, "Number");
    this.setColour(160);
    this.setTooltip("Membaca nilai suhu dari sensor DHT11/DHT22");
  }
};

Blockly.Blocks['sensor_humidity'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("💧 Baca Kelembapan dari Sensor");
    this.setOutput(true, "Number");
    this.setColour(160);
    this.setTooltip("Membaca nilai kelembapan dari sensor DHT11/DHT22");
  }
};

Blockly.Blocks['sensor_light'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("🔆 Baca Cahaya dari LDR");
    this.setOutput(true, "Number");
    this.setColour(160);
    this.setTooltip("Membaca keamatan cahaya dari sensor LDR");
  }
};

// =============================================
// BLOK MOTOR SERVO
// =============================================

Blockly.Blocks['servo_rotate'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("🔄 Putar Servo")
        .appendField(new Blockly.FieldDropdown([
          ["Servo 1", "1"],
          ["Servo 2", "2"],
          ["Servo 3", "3"]
        ]), "SERVO_NUMBER")
        .appendField("ke sudut")
        .appendField(new Blockly.FieldNumber(0, 0, 180, 1), "ANGLE")
        .appendField("darjah");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(200);
    this.setTooltip("Mengawal motor servo");
  }
};

// =============================================
// BLOK BUZZER DAN SUARA
// =============================================

Blockly.Blocks['buzzer_beep'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("🔊 Bunyikan Buzzer")
        .appendField(new Blockly.FieldDropdown([
          ["Pendek", "short"],
          ["Panjang", "long"],
          ["Siren", "siren"],
          ["Happy", "happy"],
          ["Sad", "sad"]
        ]), "SOUND_TYPE");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
    this.setTooltip("Membunyikan buzzer dengan corak tertentu");
  }
};

Blockly.Blocks['buzzer_tone'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("🎵 Mainkan Nada")
        .appendField(new Blockly.FieldDropdown([
          ["Do", "262"],
          ["Re", "294"],
          ["Mi", "330"],
          ["Fa", "349"],
          ["Sol", "392"],
          ["La", "440"],
          ["Si", "494"],
          ["Do²", "523"]
        ]), "FREQUENCY")
        .appendField("selama")
        .appendField(new Blockly.FieldNumber(0.5, 0.1, 5, 0.1), "DURATION")
        .appendField("saat");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
    this.setTooltip("Memainkan nada tertentu pada buzzer");
  }
};

// =============================================
// BLOK SENSOR JARAK ULTRASONIC
// =============================================

Blockly.Blocks['sensor_distance'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("📏 Baca Jarak dari Ultrasonic");
    this.setOutput(true, "Number");
    this.setColour(160);
    this.setTooltip("Mengukur jarak dengan sensor HC-SR04");
  }
};

Blockly.Blocks['sensor_motion'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("🚶 Sensor Gerakan PIR");
    this.setOutput(true, "Boolean");
    this.setColour(160);
    this.setTooltip("Mengesan gerakan dengan sensor PIR");
  }
};

// =============================================
// BLOK LCD DISPLAY LANJUTAN
// =============================================

Blockly.Blocks['lcd_clear'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("📺 Bersihkan LCD");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(120);
    this.setTooltip("Membersihkan paparan LCD");
  }
};

Blockly.Blocks['lcd_set_cursor'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("📺 Tetapkan Kursor LCD ke Baris")
        .appendField(new Blockly.FieldNumber(0, 0, 1, 1), "ROW")
        .appendField("Lajur")
        .appendField(new Blockly.FieldNumber(0, 0, 15, 1), "COLUMN");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(120);
    this.setTooltip("Menetapkan kedudukan kursor LCD");
  }
};

// =============================================
// GENERATOR JAVASCRIPT UNTUK BLOK BARU
// =============================================

registerJsGenerator('sensor_temperature', function(block) {
  return ['sensor_temperature()', Blockly.JavaScript.ORDER_FUNCTION_CALL];
});

registerJsGenerator('sensor_humidity', function(block) {
  return ['sensor_humidity()', Blockly.JavaScript.ORDER_FUNCTION_CALL];
});

registerJsGenerator('sensor_light', function(block) {
  return ['sensor_light()', Blockly.JavaScript.ORDER_FUNCTION_CALL];
});

registerJsGenerator('servo_rotate', function(block) {
  var servoNumber = block.getFieldValue('SERVO_NUMBER');
  var angle = block.getFieldValue('ANGLE');
  return `servo_rotate("${servoNumber}", ${angle});\n`;
});

registerJsGenerator('buzzer_beep', function(block) {
  var soundType = block.getFieldValue('SOUND_TYPE');
  return `buzzer_beep("${soundType}");\n`;
});

registerJsGenerator('buzzer_tone', function(block) {
  var frequency = block.getFieldValue('FREQUENCY');
  var duration = block.getFieldValue('DURATION');
  return `buzzer_tone(${frequency}, ${duration});\n`;
});

registerJsGenerator('sensor_distance', function(block) {
  return ['sensor_distance()', Blockly.JavaScript.ORDER_FUNCTION_CALL];
});

registerJsGenerator('sensor_motion', function(block) {
  return ['sensor_motion()', Blockly.JavaScript.ORDER_FUNCTION_CALL];
});

registerJsGenerator('lcd_clear', function(block) {
  return `lcd_clear();\n`;
});

registerJsGenerator('lcd_set_cursor', function(block) {
  var row = block.getFieldValue('ROW');
  var column = block.getFieldValue('COLUMN');
  return `lcd_set_cursor(${row}, ${column});\n`;
});