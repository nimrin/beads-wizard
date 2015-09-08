var CONST = {
    BEAD_HEIGHT: 14,
    BEAD_WIDTH: 14,
    modes: {drawing: "default", pipet: "pipet", filling: "filling"},
    WHITE: "#ffffff",
    LIGHTER_INDEX: 0.8,
    LINE_SPACE: 25,
    SCALE_WIDTH: 30,
    colors: ['violet', 'siren', 'mint']
};

var wizard = {
    linesNumber: 0,
    beadsNumber: 0,
    canvasObj: null,
    jcanvas: null,
    contextObj: null,
    fillByColorBtn: null,
    color: null,
    mode: CONST.modes.drawing,
    offsetX: CONST.BEAD_WIDTH / 2,
    beads: {nextIndex: 0},
    linesY: [],
    linesMaxIndex: 0,
    beadsMaxIndex: 0,
    schemaStartX: CONST.SCALE_WIDTH + 0.5,
    prevState: {nextIndex: 0},
    totalBeadsNumber: 0,
    colorsCount: {}
};
function generateColorSelect() {
    var select = '<select><option value="">select color name</option>';
    for (var i = 0; i < CONST.colors.length; i++) {
        select += '<option value="' + CONST.colors[i] + '">' + CONST.colors[i] + '</option>'
    }
    select += '</select>';
    return select;
}
$(function () {
    var isDragging = false, colorSelect = generateColorSelect();

    setCurrentColor(CONST.WHITE);

    wizard.jcanvas = $("#canvas");
    wizard.canvasObj = document.getElementById("canvas");
    wizard.contextObj = wizard.canvasObj.getContext('2d');

    wizard.fillByColorBtn = $("#fill-by-color");

    init(false);

    $("button").click(function () {
        setDefaultMode();
    });

    $("#apply").click(function () {
        savePrevState();
        init(false);
    });

    $("#clear").click(function () {
        savePrevState();
        $("#color").ColorPickerSetColor(CONST.WHITE);
        setCurrentColor(CONST.WHITE);
        init(false);
    });

    $("#pipet").click(function () {
        setPipetMode();

    }).hover(
        function () {
            $(this).addClass("focus");
        },
        function () {
            $(this).removeClass("focus");
        }
    );

    $("#color").ColorPicker({
        color: wizard.color,
        flat: true,
        onSubmit: function (hsb, hex) {
            setCurrentColor("#" + hex);
        },
        onBeforeShow: function () {
            $(this).ColorPickerSetColor(wizard.color.substring(1));
        }
    });

    $('.colorpicker_submit').html('<button>Select</button>');

    $("#save-file").click(function () {
        saveAsFile();
    });

    $("#load-file").click(function () {
        $("#file-to-load").click();
    });

    $("#file-to-load").change(function () {
        savePrevState();
        loadFile();
    });

    $("#revert").click(function () {
        revert();
    });

    $("#add-line").click(function () {
        addLine(true);
    });

    $("#remove-line").click(function () {
        removeLine();
    });

    wizard.jcanvas.click(function (e) {
        var bead;
        if (wizard.mode == CONST.modes.drawing) {
            fillBeadAtEvent(e);
        } else if (wizard.mode == CONST.modes.pipet) {
            setDefaultMode();
            bead = defineBeadUnderCursor(e);
            if (bead != null) {
                var pipetColor = bead.color;
                $("#color").ColorPickerSetColor(pipetColor);
                setCurrentColor(pipetColor);
            }
        } else if (wizard.mode == CONST.modes.filling) {
            savePrevState();
            setDefaultMode();
            bead = defineBeadUnderCursor(e);
            if (bead != null) {
                fillBeadsByColor(bead.color, bead.fillStyle);
            }
        }
    }).mousedown(function () {
        if (wizard.mode == CONST.modes.drawing) {
            savePrevState();
            isDragging = true;
            $(window).mousemove(function (e) {
                if (isDragging) {
                    fillBeadAtEvent(e);
                }
            });
        }
    }).mouseup(function () {
        if (isDragging) {
            isDragging = false;
            $(window).unbind("mousemove");
        }
    });

    $(window).mouseup(function () {
        if (isDragging) {
            isDragging = false;
            $(window).unbind("mousemove");
        }
    });

    $("#fill-all").click(function () {
        savePrevState();
        fillAllBeads();
    });

    wizard.fillByColorBtn.click(function () {
        setFillingMode();
    });

    $("#schema").click(function () {
        setDefaultMode();
    });

    var ctrlDown = false;
    var ctrlKey = 17, zKey = 90;

    window.onkeydown = function (e) {
        if (e.keyCode == ctrlKey) {
            ctrlDown = true;
        }
        if (ctrlDown && e.keyCode == zKey) {
            revert();
        }
    };

    window.onkeyup = function (e) {
        if (e.keyCode == ctrlKey) {
            ctrlDown = false;
        }
    };

function countColor(oldColor, newColor) {
    if (wizard.colorsCount[oldColor]) {
        wizard.colorsCount[oldColor]--;
        if (wizard.colorsCount[oldColor] == 0) {
            delete wizard.colorsCount[oldColor];
        }
    }
    if (wizard.colorsCount[newColor]) {
        wizard.colorsCount[newColor]++
    } else {
        wizard.colorsCount[newColor] = 1;
    }
    var str = '';

    for (var color in wizard.colorsCount) {
        if (wizard.colorsCount.hasOwnProperty(color)) {
            str += '<tr class="color-container"><td><div class="color-sample" style="background-color: '
                + color + '"></div></td><td class="color-count"> ' + wizard.colorsCount[color] + '</td>' +
                '<td>' + colorSelect + '</td></tr>'
        }
    }
    $('#color-samples').html(str);
}
function addLine(addition) {
    var lineY = 0.5 + wizard.beads.nextIndex * CONST.BEAD_HEIGHT;
    wizard.beads[wizard.beads.nextIndex] = [];

    var offset = 0;
    var beadsInLine = wizard.beadsNumber;
    if (wizard.beads.nextIndex % 2 != 0) {
        offset = wizard.offsetX;
    }
    for (var j = 0; j < beadsInLine; j++) {
        wizard.beads[wizard.beads.nextIndex][j] = {
            x: wizard.schemaStartX + offset + j * CONST.BEAD_WIDTH,
            y: lineY,
            color: CONST.WHITE
        }
    }
    wizard.beads.nextIndex++;

    if (addition) {
        wizard.linesNumber++;
        $("#lines-number").val(wizard.linesNumber);
        init(true);
    }
}
function removeLine() {
    if (wizard.beads.nextIndex > 0) {
        delete wizard.beads[wizard.beads.nextIndex - 1];
    }
    wizard.beads.nextIndex--;

    wizard.linesNumber--;
    $("#lines-number").val(wizard.linesNumber);

    init(true);
}
function savePrevState() {
    $("#revert").removeAttr("disabled");
    wizard.prevState = jQuery.extend(true, {}, wizard.beads);
    wizard.prevState.beadsNumber = wizard.beadsNumber;
    wizard.prevState.linesNumber = wizard.linesNumber;
}
function revert() {
    $("#revert").attr("disabled", "disabled");
    if (wizard.prevState.nextIndex > 0) {
        wizard.beads = jQuery.extend(true, {}, wizard.prevState);
        $("#lines-number").val(wizard.prevState.linesNumber);
        $("#beads-number").val(wizard.prevState.beadsNumber);
        wizard.prevState = {nextIndex: 0};
        init(true);
    }
}
function setCurrentColor(newColor) {
    wizard.color = newColor;
}
function fillAllBeads() {
    fillBeadsByColor(null, null);
}
function fillBeadsByColor(oldColor, oldStyle) {
    if (wizard.beads.nextIndex > 0) {
        for (var i = 0; i < wizard.beads.nextIndex; i++) {
            for (var j = 0; j < wizard.beads[i].length; j++) {
                if ((oldColor == null || wizard.beads[i][j].color == oldColor) && (oldStyle == null || wizard.beads[i][j].fillStyle == oldStyle)) {
                    fillBead(wizard.beads[i][j], wizard.color);
                }
            }
        }
    }
}
function defineBeadUnderCursor(e) {
    var canvasOffset = $(wizard.canvasObj).offset();
    var canvasX = Math.floor(e.pageX - canvasOffset.left);
    var canvasY = Math.floor(e.pageY - canvasOffset.top);

    return findAmbientBead(canvasX, canvasY);
}
function fillBeadAtEvent(e) {
    var offset = wizard.jcanvas.offset();
    var relativeX = (e.pageX - offset.left);
    var relativeY = (e.pageY - offset.top);

    var ambientBead = findAmbientBead(relativeX, relativeY);
    fillBead(ambientBead, wizard.color);
}
function colorLuminance(hex, lum) {
    hex = String(hex).replace(/[^0-9a-f]/gi, '');
    if (hex.length < 6) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    lum = lum || 0;

    var rgb = "#", c, i;
    for (i = 0; i < 3; i++) {
        c = parseInt(hex.substr(i * 2, 2), 16);
        c = Math.round(Math.min(Math.max(0, c + c * lum), 255)).toString(16);
        rgb += ("00" + c).substr(c.length);
    }
    return rgb;
}
function initGradColor(grd, style, color) {
    var lighterColor = colorLuminance(color, CONST.LIGHTER_INDEX);
    if (style == "mat") {
        grd.addColorStop(0, color);
        grd.addColorStop(0.5, lighterColor);
        grd.addColorStop(1, color);
    } else {
        grd.addColorStop(0, color);
        grd.addColorStop(0.2, lighterColor);
        grd.addColorStop(0.5, CONST.WHITE);
        grd.addColorStop(0.8, lighterColor);
        grd.addColorStop(1, color);
    }
}
function fillBead(bead, newColor) {
    if (bead != null) {
        countColor(bead.color, newColor);
        bead.color = newColor;

        var startX = bead.x + 0.5;
        var startY = bead.y + 0.5;
        var fillWidth = CONST.BEAD_WIDTH - 1;
        var fillHeight = CONST.BEAD_HEIGHT - 1;

        var gradY = startY + fillHeight / 2;
        var grd = wizard.contextObj.createLinearGradient(startX, gradY, startX + fillWidth, gradY);

        var beadStyle = $('input[name=bead-style]:checked').val();
        bead.fillStyle = beadStyle;

        initGradColor(grd, beadStyle, newColor);

        wizard.contextObj.fillStyle = grd;

        wizard.contextObj.fillRect(startX, startY, fillWidth, fillHeight);
    }
}
function setDefaultMode() {
    $("button").removeClass("selected");
    wizard.mode = CONST.modes.drawing;
    wizard.jcanvas.css("cursor", "auto !important");
}

function setPipetMode() {
    $("#pipet").addClass("selected");
    wizard.mode = CONST.modes.pipet;
    wizard.jcanvas.css("cursor", "crosshair");
}
function setFillingMode() {
    wizard.fillByColorBtn.addClass("selected");
    wizard.mode = CONST.modes.filling;
    wizard.jcanvas.css("cursor", "crosshair");
}

function findLineIndex(cursorY) {
    var lineNumber = Math.floor(cursorY / CONST.BEAD_HEIGHT);
    if (lineNumber <= wizard.linesNumber - 1 && lineNumber >= 0) {
        return lineNumber;
    }

    return null
}

function findAmbientBead(cursorX, cursorY) {
    cursorX = cursorX - CONST.SCALE_WIDTH;
    if (wizard.beads.nextIndex > 0) {
        var lineIndex = findLineIndex(cursorY);

        if (lineIndex != null) {
            var offset = 0;
            if ((lineIndex + 1) % 2 == 0) {
                offset = wizard.offsetX;
            }

            var beadIndex = Math.floor((cursorX - offset) / CONST.BEAD_WIDTH);
            if (beadIndex <= wizard.beadsNumber - 1) {
                return wizard.beads[lineIndex][beadIndex];
            }
        }
    }
    return null;
}

function init(fromFile) {
    var progressLoader = $("#progress-loader");

    progressLoader.show();

    wizard.contextObj.fillStyle = CONST.WHITE;
    wizard.contextObj.fillRect(0, 0, wizard.canvasObj.width, wizard.canvasObj.height);

    wizard.beadsNumber = $("#beads-number").val();
    wizard.linesNumber = $("#lines-number").val();

    wizard.totalBeadsNumber = wizard.beadsNumber * wizard.linesNumber;

    if (/^\d+$/.test(wizard.beadsNumber.toString()) && /^\d+$/.test(wizard.linesNumber.toString())) {
        wizard.linesMaxIndex = wizard.linesNumber - 1;
        wizard.beadsMaxIndex = wizard.beadsNumber - 1;

        wizard.canvasObj.width = wizard.schemaStartX + wizard.beadsNumber * CONST.BEAD_WIDTH + CONST.BEAD_WIDTH;
        wizard.canvasObj.height = getCanvasHeight();

        drawScale();

        if (!fromFile) {
            wizard.colorsCount = {};
            initBeadsMatrix();
        }
        drawSchema(fromFile);
    }
    progressLoader.hide();
}
function drawScale() {
    wizard.contextObj.textBaseline = "top";
    wizard.contextObj.font = "8pt Arial";
    wizard.contextObj.fillStyle = "#000000";

    for (var i = 1; i <= wizard.linesNumber; i++) {
        wizard.contextObj.fillText(i.toString(), 0.5, (i - 1) * CONST.BEAD_HEIGHT);
    }
}
function getCanvasHeight() {
    return wizard.linesNumber * (CONST.BEAD_HEIGHT) + 1;
}
function initBeadsMatrix() {
    wizard.beads = {nextIndex: 0};

    for (var i = 0; i < wizard.linesNumber; i++) {
        addLine(false);
    }
}
function drawSchema(withColor) {
    if (wizard.beads.nextIndex > 0) {
        for (var i = 0; i < wizard.beads.nextIndex; i++) {
            for (var j = 0; j < wizard.beads[i].length; j++) {
                wizard.contextObj.rect(wizard.beads[i][j].x, wizard.beads[i][j].y, CONST.BEAD_WIDTH, CONST.BEAD_HEIGHT);
                if (withColor) {
                    fillBead(wizard.beads[i][j], wizard.beads[i][j].color)
                } else {
                    fillBead(wizard.beads[i][j], CONST.WHITE)
                }
            }
        }
        wizard.contextObj.strokeStyle = "#181818";
        wizard.contextObj.stroke();
    }
}

function saveAsFile() {
    var textToWrite = JSON.stringify(wizard.beads);
    var textFileAsBlob = new Blob([textToWrite], {type: 'text/javascript'});
    var fileNameToSaveAs = "beadsMaster.bms";

    var downloadLink = document.createElement("a");
    downloadLink.download = fileNameToSaveAs;
    downloadLink.innerHTML = "Download File";
    if (window.webkitURL != null) {
        // Chrome allows the link to be clicked
        // without actually adding it to the DOM.
        downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
    }
    else {
        // Firefox requires the link to be added to the DOM
        // before it can be clicked.
        downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
        downloadLink.onclick = destroyClickedElement;
        downloadLink.style.display = "none";
        document.body.appendChild(downloadLink);
    }

    downloadLink.click();
}

function destroyClickedElement(event) {
    document.body.removeChild(event.target);
}

function loadFile() {
    var fileToLoad = document.getElementById("file-to-load").files[0];

    var fileReader = new FileReader();
    fileReader.onloadend = function (fileLoadedEvent) {
        try {
            wizard.beads = JSON.parse(fileLoadedEvent.target.result);
            if (wizard.beads.nextIndex > 1) {
                $("#lines-number").val(wizard.beads.nextIndex);
                $("#beads-number").val(wizard.beads[0].length);

                init(true);
            }
        } catch (err) {
            alert("Неправильный формат файла.")
        }
    };
    fileReader.readAsText(fileToLoad);
}

function schemaToLine() {
    if (wizard.beads.nextIndex > 0) {
        var lineBeads = [];

        var current = {number:1, color:wizard.beads[0][0].color, fillStyle:wizard.beads[0][0].fillStyle};
        for (var i = 0; i < wizard.beads.nextIndex; i++) {
            for (var j = 0; j < wizard.beads[i].length; j++) {
                var nextInd = nextIndex(i,j);
                if (nextInd != null) {
                    var nextBead = wizard.beads[nextInd.lineIndex][nextInd.beadIndex];
                    if (isSameColor(nextBead, current.color, current.fillStyle)) {
                        current.number++;
                    } else {
                        var newCount = {number:current.number, color:current.color, fillStyle:current.fillStyle};
                        lineBeads.push(newCount);
                        current = {number:1, color:nextBead.color, fillStyle:nextBead.fillStyle};
                    }
                } else {
                    lineBeads.push(current);
                }
            }
        }
        console.log(lineBeads);
    }
}

function nextIndex(lineIndex, beadIndex) {
    var maxBeadIndex = wizard.beadsMaxIndex;
    if (lineIndex % 2 != 0) {
        maxBeadIndex--;
    }
    if (lineIndex == wizard.linesMaxIndex && beadIndex == maxBeadIndex)
        return null;
    var index = {};

    if (beadIndex < maxBeadIndex) {
        index.lineIndex = lineIndex;
        index.beadIndex = beadIndex + 1;
    } else {
        index.lineIndex = lineIndex + 1;
        index.beadIndex = 0;
    }

    return index;
}

function isSameColor(bead, color, style) {
    return bead.color == color && bead.fillStyle == style;
}
});


