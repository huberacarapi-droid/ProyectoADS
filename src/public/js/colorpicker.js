const dropZone = document.getElementById('dropZone');
const imageInput = document.getElementById('imageInput');
const selectedImage = document.getElementById('selectedImage');

const colorPalette = document.getElementById('colorPalette');
const selectedColorDiv = document.getElementById('selectedColor');
const selectedColorHex = document.getElementById('selectedColorHex');
const colorDisplay = document.getElementById('colorDisplay');
const colorInput = document.getElementById('colorInput');

// Manejar click para abrir el input file
dropZone.addEventListener('click', () => imageInput.click());

// Manejar drag and drop
dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropZone.classList.add('dragging');
    dropZone.style.backgroundColor = '#f0f0f0';
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragging');
    dropZone.style.backgroundColor = 'transparent';
});

dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('dragging');
    dropZone.style.backgroundColor = 'transparent';

    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        loadImage(file);
    }
});

// Manejar cambios en el input file
imageInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        loadImage(file);
    }
});

// Función para cargar la paleta de colores
function loadPalette() {
    
        const colorThief = new ColorThief();
        const colors = colorThief.getPalette(selectedImage, 6);
        colorPalette.innerHTML = '';
        if (Array.isArray(colors)) {
        colors.forEach(color => {
            const hexColor = rgbToHex(color[0], color[1], color[2]);
            const colorBox = document.createElement('div');
            colorBox.className = 'colorBox';
            colorBox.style.backgroundColor = hexColor;
            colorBox.setAttribute('data-color', hexColor);
            colorBox.textContent = hexColor; // Mostrar el código hexadecimal en el centro

            colorBox.addEventListener('click', () => {
                selectedColorDiv.classList.remove('hidden');
                selectedColorHex.textContent = hexColor;
                colorDisplay.style.backgroundColor = hexColor;
                colorInput.value = hexColor;
            });

            colorPalette.appendChild(colorBox);
        });
    }
}
function loadImage(file) {
    // Limpiar la selección anterior
    clearSelection();

    const reader = new FileReader();

    reader.onload = function(e) {
        selectedImage.src = e.target.result;
        selectedImage.classList.remove('hidden');

        // Asignar la función loadPalette correctamente al evento onload
        selectedImage.onload = loadPalette;
    };

    reader.readAsDataURL(file);
    // Sincronizar el archivo con el input file (para enviar con el formulario)
    imageInput.files = event.dataTransfer ? event.dataTransfer.files : imageInput.files;
}

// Esperar a que la imagen cargue antes de ejecutar ColorThief
if (selectedImage.complete) {
    loadPalette(); // Si la imagen ya está cargada, ejecutar inmediatamente
} else {
    selectedImage.onload = loadPalette; // Ejecutar cuando la imagen termine de cargar
}
/*function loadImage(file) {
    // Limpiar la selección anterior
    clearSelection();

    const reader = new FileReader();

    reader.onload = function(e) {
        selectedImage.src = e.target.result;
        selectedImage.classList.remove('hidden');

        selectedImage.onload = loadPalette();
        
                selectedImage.onload = function() {
                    const colorThief = new ColorThief();
                    const colors = colorThief.getPalette(selectedImage, 6);
                    colorPalette.innerHTML = '';

                    colors.forEach(color => {
                        const hexColor = rgbToHex(color[0], color[1], color[2]);
                        const colorBox = document.createElement('div');
                        colorBox.className = 'colorBox';
                        colorBox.style.backgroundColor = hexColor;
                        colorBox.setAttribute('data-color', hexColor);
                        colorBox.textContent = hexColor; // Mostrar el código hexadecimal en el centro

                        colorBox.addEventListener('click', () => {
                            selectedColorDiv.classList.remove('hidden');
                            selectedColorHex.textContent = hexColor;
                            colorDisplay.style.backgroundColor = hexColor;
                            colorInput.value = hexColor;
                        });

                        colorPalette.appendChild(colorBox);
                    });
                };
                
    };

    reader.readAsDataURL(file);
    // Sincronizar el archivo con el input file (para enviar con el formulario)
    imageInput.files = event.dataTransfer ? event.dataTransfer.files : imageInput.files;
}

// Esperar a que la imagen cargue antes de ejecutar ColorThief
if (selectedImage.complete) {
    loadPalette(); // Si la imagen ya está cargada, ejecutar inmediatamente
} else {
    selectedImage.onload = function() {
        loadPalette(); // Ejecutar cuando la imagen termine de cargar
    };
}*/

function clearSelection() {
    // Resetear la imagen, los colores y el color seleccionado
    selectedImage.classList.add('hidden');
    colorPalette.innerHTML = '';
    colorDisplay.style = null;
    selectedColorDiv.classList.add('hidden');
    selectedColorHex.textContent = '';
}

// Función para convertir RGB a hexadecimal
function rgbToHex(r, g, b) {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
}