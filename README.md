# Gato

Cabeza low poly del gato en React Three Fiber, con una intro hecha con Theatre.js:
cámara que se acerca a un ojo, pantalla negra y, un segundo después, imágenes y
videos flotando.

## 1. Exportar el modelo desde Blender

Abre `Cat.blend` y ve a File → Export → glTF 2.0 (.glb).

- Format: glTF Binary (.glb)
- Mesh → Apply Modifiers: activado
- Si los colores pintados salen blancos en la web, en Mesh → Attributes
  cambia Vertex Color a "Active"
- Deja los objetos `Eye_L` y `Eye_R` con ese nombre: el código los usa para saber a dónde ir

Guarda el archivo como `public/models/Gato.glb`.

## 2. Ejecutar

```bash
npm install
npm run dev
```

Abre http://localhost:5173. Arrastra para girar el gato y pulsa "Mirarlo a los ojos".

Sin ningún paso más, la cámara se acerca al ojo con una animación calculada por código.

## 3. Hacer la animación con Theatre.js (opcional)

1. Abre http://localhost:5173/?edit. Aparece el estudio de Theatre.
2. En el panel Outline elige la hoja `Intro` y el objeto `Camera`.
3. Mueve la cámara y crea keyframes de posición/rotación en la línea de tiempo.
   En la consola del navegador salen las coordenadas de `Eye_L` y `Eye_R`.
   La cámara empieza en `[0, 0.15, 5.2]`.
4. Ajusta la duración de la secuencia.
5. Exporta el proyecto a JSON (en Outline, selecciona el proyecto `Gato`) y guárdalo como
   `src/theatre-state.json`.

Con ese archivo presente, la intro usa tu animación en vez de la de código.
Sin él, en producción la animación de Theatre no existe.

## 4. Imágenes y videos

Copia tus archivos a `public/media/` y agrégalos en `src/media.js`.
Los de ejemplo (`placeholder-*.svg`) se pueden borrar.

Los videos van en silencio y en bucle. Conviene comprimirlos:

```bash
ffmpeg -i entrada.mp4 -vf scale=-2:540 -an -crf 28 salida.mp4
```

## Ajustes rápidos

| Qué | Dónde |
| --- | --- |
| Segundos de pantalla negra | `HOLD_MS` en `src/App.jsx` |
| Ojo al que se acerca | `DIVE_EYE` en `src/EyeDive.jsx` |
| Duración del acercamiento | `DIVE_SECONDS` en `src/EyeDive.jsx` |
| Si el gato se ve de espaldas | `FRONT` en `src/EyeDive.jsx` → `(0, 0, -1)` |
| Que arranque solo, sin botón | llama a `start()` en un `useEffect` de `src/App.jsx` |

## Publicar

```bash
npm run build
```

Sube la carpeta `dist` a Vercel o a cualquier hosting estático.
# BruceHead
