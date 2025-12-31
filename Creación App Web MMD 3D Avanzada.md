# **Arquitectura de Alta Fidelidad para Personajes 3D en la Web: Un Marco Técnico Exhaustivo para la Integración de MMD, Shaders Estilizados y Rendimiento Interactivo**

## **1\. Resumen Ejecutivo y Visión Arquitectónica**

La convergencia de las tecnologías gráficas basadas en la web y el renderizado no fotorrealista (NPR) ha alcanzado un punto de madurez donde las aplicaciones de personajes interactivos de alta fidelidad no solo son viables, sino capaces de rivalizar con aplicaciones nativas de escritorio. El objetivo de este informe es proporcionar un análisis técnico exhaustivo y una hoja de ruta de implementación para la construcción de una aplicación web que aloje un personaje MikuMikuDance (MMD) en 3D. Este personaje no existirá simplemente como un activo estático, sino que funcionará como una entidad viva y "respirable" con la fidelidad visual de títulos de referencia como "Genshin Impact" o el estilo visual distintivo de "MiSide", el naturalismo conductual de "Lumi" (N0va Desktop) y la interactividad de una interfaz web moderna.

El desafío técnico reside en la intersección de tres disciplinas de ingeniería distintas: el análisis de activos en tiempo real (manejo de formatos binarios complejos .pmx y .vmd), la programación avanzada de shaders (implementación de modelos de iluminación personalizados que se desvían de la precisión física estándar) y la optimización del rendimiento (asegurando una ejecución estable a 60 FPS en el bucle principal de un solo hilo de JavaScript).

Para lograr la estética de "Genshin" —caracterizada por la cuantización nítida de la luz, la iluminación de borde (rim lighting) dependiente de la vista y los contornos de casco invertido— las tuberías de renderizado basado en física (PBR) estándar deben ser deconstruidas y reemplazadas con lógica de sombreado personalizada. Además, para emular el estilo de naturalismo de "Lumi", el sistema de animación debe ir más allá de la reproducción simple hacia una mezcla de animación en capas, donde la respiración procedural, el parpadeo y el seguimiento ocular se sintetizan en tiempo real sobre los datos de movimiento base.

Este informe aboga por una pila tecnológica centrada en **React Three Fiber (R3F)**. Si bien Three.js "vanilla" proporciona las primitivas de renderizado, R3F ofrece un modelo de componentes declarativo que es esencial para gestionar el estado complejo de un personaje interactivo (por ejemplo, intercambiar texturas, mezclar pesos de animación, gestionar el estado físico) sin descender a un código imperativo inmanejable. El análisis procederá a través de la tubería de activos, las matemáticas de sombreado, la máquina de estados de animación y, finalmente, la arquitectura de rendimiento requerida para desplegar esto a escala, integrando los requisitos específicos de los estilos visuales de MiSide y Genshin Impact.

## **2\. La Pila Tecnológica: React Three Fiber y el Ecosistema WebGL**

### **2.1 El Argumento a Favor de los Gráficos Declarativos**

La construcción de una aplicación 3D interactiva compleja requiere un cambio de los bucles de renderizado imperativos a la gestión declarativa del gráfico de escena. React Three Fiber (R3F) sirve como un renderizador para Three.js; esto significa que no envuelve Three.js, sino que *es* Three.js, expresado a través de JSX. Esta distinción es crítica para el rendimiento; R3F no incurre en gastos generales de tiempo de ejecución en comparación con Three.js plano, pero permite una programación y gestión de recursos superiores.1

En el contexto de la carga de modelos MMD, que a menudo contienen docenas de materiales, objetivos de transformación (morph targets) y estructuras óseas complejas, el modelo declarativo permite a los desarrolladores tratar partes del modelo (por ejemplo, la cara, el cabello, los accesorios) como componentes React individuales. Esta modularidad es esencial para implementar la característica solicitada de un "fondo recolorable" y la "implementación de shaders", ya que permite que los cambios de estado (como un valor de selector de color) se propaguen al gráfico de escena automáticamente sin manipulación manual del DOM o recorrido imperativo de la matriz scene.children.1

La capacidad de R3F para manejar la reconciliación del árbol de componentes significa que cuando un usuario cambia una textura o un color de fondo, solo se actualizan los nodos afectados del gráfico de escena, optimizando el ciclo de renderizado. Esto es fundamental para mantener la fluidez en una aplicación que aspira a la calidad visual de "Genshin Impact", donde la gestión eficiente de los recursos de la GPU es tan vital como la calidad del shader mismo.

### **2.2 El Requisito del Motor de Física**

Los modelos MMD dependen en gran medida de la física para el movimiento secundario, específicamente el cabello y las faldas. Sin física, un modelo MMD parece rígido y sin vida, rompiendo la ilusión del naturalismo estilo "Lumi". MMD utiliza nativamente el motor Bullet Physics. En el ecosistema web, esto se proporciona mediante **Ammo.js**, un puerto WebAssembly (WASM) de Bullet.

Aunque existen motores más nuevos como Rapier o Cannon.js, Ammo.js es el único motor que soporta las restricciones específicas y las definiciones de cuerpos rígidos incrustadas dentro de los archivos .pmx.3 El MMDPhysics loader en Three.js está escrito específicamente para interactuar con Ammo.js. Por lo tanto, a pesar del mayor tamaño de archivo del binario WASM, Ammo.js es un requisito estricto para la reproducción auténtica de MMD. Las estrategias de optimización para esta dependencia pesada, incluyendo el uso de Web Workers para evitar el bloqueo del hilo principal, se discutirán en profundidad en la sección de rendimiento.

### **2.3 Selección de Framework frente a Alternativas**

Es pertinente considerar por qué se selecciona Three.js/R3F sobre competidores como Babylon.js. Si bien Babylon.js tiene un excelente soporte nativo y un sistema de materiales basado en nodos robusto que podría facilitar la creación de shaders tipo Genshin 5, el ecosistema de Three.js posee los cargadores MMD más maduros y probados (MMDLoader), así como una comunidad masiva que ha resuelto gran parte de los problemas específicos de la conversión de formatos japoneses.3 La flexibilidad de R3F para inyectar lógica de shader personalizada (onBeforeCompile) ofrece el equilibrio perfecto entre facilidad de uso y control de bajo nivel necesario para replicar estilos visuales específicos como el de "MiSide".

## **3\. La Tubería de Activos MMD: Análisis de PMX y VMD**

### **3.1 Anatomía del Formato PMX**

El formato .pmx es un formato binario complejo que almacena datos de vértices, propiedades de materiales y, lo más importante, datos de rigging (esqueleto). A diferencia de los modelos modernos .gltf que podrían utilizar materiales PBR estándar, los modelos PMX están diseñados para un modelo de iluminación heredado más cercano a Blinn-Phong pero con parámetros "Toon" específicos. Comprender esta estructura es vital para interceptar y mejorar el renderizado.

Un archivo PMX estándar contiene:

* **Datos de Vértices**: Posición, normal y coordenadas UV. Crucialmente, a menudo contiene ponderación ósea "SDEF" (Spherical Deform), que actúa como un punto medio entre el skinning lineal y el skinning de cuaternión dual, preservando el volumen en articulaciones como codos y rodillas. El cargador de Three.js debe convertir esto en un SkinnedMesh compatible con WebGL.  
* **Materiales**: Los materiales PMX definen color difuso, especular y ambiental, pero también incluyen una referencia a una "Textura Toon" (generalmente toon01.bmp a toon10.bmp) y un "Mapa de Esfera" (matcap). La implementación del estilo "Genshin" requerirá ignorar o reinterpretar estos mapas toon predeterminados para usar un sistema de rampa de gradiente más sofisticado.  
* **Morph Targets (Blend Shapes)**: Estos son extensos en los modelos MMD, controlando las cejas, los ojos y las formas de la boca para una sincronización labial expresiva. La arquitectura de "Lumi" dependerá en gran medida de estos morphs para el parpadeo y las micro-expresiones.

### **3.2 El Formato de Movimiento VMD**

Los archivos .vmd (Vocaloid Motion Data) almacenan curvas de animación. A diferencia de las animaciones de fotogramas clave estándar que pueden ser lineales o bezier simples, VMD utiliza una curva de interpolación cúbica específica almacenada como 4 puntos de control (x1, y1, x2, y2). El cargador debe interpretar estas curvas y mapearlas a pistas de AnimationClip de Three.js.

Una complejidad crítica en la carga de VMD es que el archivo de movimiento no sabe inherentemente a qué modelo pertenece. Se basa en la coincidencia de nombres de huesos. Si el modelo .pmx utiliza nombres de huesos en japonés (por ejemplo, "センター" para Centro) y el .vmd utiliza nombres en inglés o una convención diferente, la animación fallará o el modelo se deformará grotescamente. El MMDLoader en Three.js maneja esta reorientación automáticamente hasta cierto punto, utilizando un diccionario interno de traducción, pero una aplicación de producción robusta debe verificar la compatibilidad de nombres de huesos y proporcionar retroalimentación si los huesos críticos faltan.3

### **3.3 Estrategia de Implementación: useLoader y Primitivas**

En R3F, la carga se maneja a través del gancho useLoader, que se integra con el mecanismo de Suspense de React. Esto permite que la aplicación muestre un estado de carga (por ejemplo, una barra de progreso estilizada o una pantalla de presentación) mientras ocurre el análisis binario pesado del PMX.7

JavaScript

// Implementación conceptual de un componente cargador MMD  
import { useLoader } from '@react-three/fiber';  
import { MMDLoader } from 'three/examples/jsm/loaders/MMDLoader';

function MMDCharacter({ modelUrl, motionUrl }) {  
  const mmdData \= useLoader(MMDLoader, modelUrl, (loader) \=\> {  
    // Configuración para el cargador específicamente para animación y física  
    loader.tpose \= true; // Forzar T-Pose para estabilidad física inicial  
  });  
    
  // El cargador devuelve un objeto que contiene la malla y los clips de animación  
  return \<primitive object\={mmdData} dispose\={null} /\>;  
}

Sin embargo, simplemente cargar el modelo es insuficiente para el aspecto "Genshin" o "MiSide". El MMDLoader predeterminado crea instancias estándar de MeshToonMaterial o MeshBasicMaterial que se adhieren a la configuración definida en el archivo PMX. Para lograr el aspecto de anime de alta calidad solicitado, debemos interceptar estos materiales y reemplazarlos con implementaciones de shader personalizadas que soporten la estética visual específica requerida.

## **4\. Ingeniería Estética "Genshin Impact" y "MiSide": Arquitectura de Shaders**

El usuario solicita explícitamente un estilo visual similar a "MiSide" o "Genshin Impact". Esta es la parte más técnicamente exigente del proyecto. Este aspecto no se logra a través de modelos de altos polígonos, sino a través de **Sombreado Estilizado (Stylized Shading)**. Debemos implementar una tubería de sombreado personalizada que reemplace los cálculos de iluminación predeterminados de Three.js.

### **4.1 Teoría del Sombreado de Anime**

El aspecto "Genshin" se basa en tres componentes matemáticos y artísticos primarios:

1. **Iluminación Difusa Cuantizada (Cel Shading)**: En lugar de un gradiente suave de luz a oscuridad (Lambertiano), la superficie se compone de dos o tres bandas distintas de color (Luz, Sombra y Sombra Suave).  
2. **Renderizado de Metal/Matcap**: Ciertas partes del personaje (adornos dorados, armaduras) se comportan como metal, pero metal estilizado. Esto generalmente se hace con un Mapa de Esfera (MatCap) que simula reflejos complejos sin trazado de rayos costoso.  
3. **Iluminación de Borde (Rim Lighting)**: Un borde brillante en la silueta del personaje, generalmente en el lado opuesto a la fuente de luz principal, para separar al personaje del fondo y dar volumen.  
4. **Contorno de Casco Invertido (Inverted Hull Outline)**: Una línea negra o coloreada que rodea la geometría del personaje, proporcionando la definición de dibujo lineal característica del estilo anime.

El estilo "MiSide", analizado a partir de las referencias visuales y discusiones técnicas del juego 8, comparte esta base pero a menudo presenta un contraste más alto y contornos más nítidos para evocar una sensación de mezcla entre lo "lindo" y lo "inquietante" (horror psicológico). La implementación debe permitir ajustar el grosor del contorno y la suavidad de las sombras para transicionar entre un aspecto suave tipo "Genshin" y uno más rígido tipo "MiSide".

### **4.2 Estrategia de Implementación de Shaders Personalizados**

No podemos confiar en el MeshToonMaterial predeterminado proporcionado por Three.js ya que carece del control de grano fino para características como la "corrección de sombra facial" (donde la nariz proyecta una sombra poco favorecedora en la cara). En su lugar, extenderemos MeshStandardMaterial o usaremos ShaderMaterial directamente, inyectando código a través del método onBeforeCompile o creando un ShaderMaterial personalizado desde cero.11

#### **4.2.1 El Fragment Shader: Iluminación por Rampa (Ramp Lighting)**

En el fragment shader, calculamos el producto punto de la normal de la superficie y la dirección de la luz (N dot L).

$$\\text{Intensidad} \= \\max(0.0, \\text{dot}(N, L))$$  
En el renderizado estándar, este valor de intensidad (0.0 a 1.0) se usa directamente para oscurecer el color. En el renderizado estilo Genshin, usamos esta intensidad como una coordenada UV para buscar un color en una **Textura de Rampa** (una imagen de gradiente 1D).

* Si Intensidad \> 0.5, la búsqueda devuelve blanco puro (iluminado).  
* Si Intensidad \< 0.5, la búsqueda devuelve un gris azulado o un tono cálido según el estilo artístico (sombra).

Esto permite a los artistas (o usuarios, a través de la configuración) controlar exactamente cómo se ve la sombra (por ejemplo, haciendo que las sombras sean frías/azules en lugar de simplemente negras) sin cambiar el código, fundamental para el estilo MiSide que utiliza contrastes de color específicos.

#### **4.2.2 Implementación de Rim Light (Luz de Borde)**

La iluminación de borde simula la luz que se filtra alrededor de los bordes de un objeto o la retroiluminación. Se calcula utilizando el producto punto de la Dirección de Vista (cámara al píxel) y la Normal de la Superficie.

$$\\text{Fresnel} \= 1.0 \- \\max(0.0, \\text{dot}(V, N))$$  
Elevamos este valor a una potencia (por ejemplo, pow(Fresnel, 3.0)) para afinar el borde, y lo multiplicamos por un color de borde. Esto crea el "brillo" visto en Lumi y en los personajes de Genshin, dando esa apariencia etérea.13

#### **4.2.3 Manejo de Sombras Faciales (Face Shadow SDF)**

Un artefacto común en el sombreado toon es la "sombra de nariz poco favorecedora". Juegos como Genshin Impact resuelven esto utilizando una textura "SDF" (Campo de Distancia con Signo) especialmente pintada para la cara. El shader usa la dirección de la luz (vector derecha/izquierda) para determinar un umbral, y la textura SDF dicta exactamente *dónde* aparece la sombra en la cara a medida que la luz se mueve. Implementar esto requiere verificar el nombre del material; si el material es "Cara" (Face), cambiamos a un fragment shader especializado que usa esta lógica de mapa de luz personalizada. Para modelos MMD genéricos que no tienen este mapa SDF específico, podemos aproximarlo suavizando las normales de la cara en el vertex shader para reducir las sombras duras de la nariz.

### **4.3 Contornos: El Método de Casco Invertido (Inverted Hull)**

Para lograr los contornos nítidos vistos en "MiSide", no podemos usar detección de bordes de posprocesamiento (como operadores Sobel) de manera exclusiva porque a menudo son demasiado costosos para la web y pueden verse "sucios" en la geometría interna (como los pliegues de la ropa). La técnica estándar de la industria es el método de **Casco Invertido**.15

**Algoritmo**:

1. Clonar la geometría del personaje.  
2. En el Vertex Shader, empujar cada vértice hacia afuera a lo largo de su vector normal una pequeña cantidad (el grosor del contorno).

   $$P\_{\\text{nuevo}} \= P\_{\\text{original}} \+ (N \\times \\text{Grosor})$$  
3. Invertir las caras (culling de caras frontales en lugar de traseras).  
4. Renderizar esta malla ligeramente más grande, de adentro hacia afuera, en negro sólido (o color del contorno) detrás del personaje original.

En R3F, la biblioteca @react-three/drei proporciona un componente \<Outlines /\> que abstrae esto. Sin embargo, para un modelo MMD que es un SkinnedMesh (animado), la clonación de geometría estándar es insuficiente porque el contorno también debe ser animado por los huesos. Debemos asegurarnos de que el material del contorno sea consciente de los pesos de la piel (skinning weights). El componente Outlines en Drei soporta SkinnedMesh, lo que lo convierte en una solución viable, siempre que ajustemos los accesorios de thickness y color correctamente para coincidir con el estilo delgado y nítido de MiSide.18

## **5\. Sistemas de Animación y Comportamiento: Creando el Personaje "Vivo"**

Cargar un archivo de baile .vmd es solo el primer paso. Un personaje que se congela perfectamente cuando termina el baile parece robótico. Para lograr el efecto "Lumi" (N0va Desktop), el personaje necesita **Animación en Capas** y comportamientos procedimentales.

### **5.1 La Arquitectura de Animación en Capas**

Utilizamos las capacidades de AnimationMixer de Three.js para mezclar múltiples animaciones simultáneamente.19 Esto es fundamental para que el personaje se sienta natural.

1. **Capa Base (Peso 1.0)**: Esta es la acción principal, como el Baile (.vmd) cargado por el usuario o una pose "Idle" (reposo) predeterminada.  
2. **Capa Aditiva (Peso \~0.3)**: Esta capa contiene movimientos pequeños y procedimentales, como la respiración (expansión del pecho) o un balanceo sutil.

Mezcla Aditiva (Additive Blending):  
La animación estándar sobrescribe las posiciones de los huesos. La animación aditiva añade a ellas. Si el baile mueve el brazo hacia arriba, y la animación de respiración mueve el pecho hacia afuera, la mezcla aditiva los combina suavemente. Esto evita el "parpadeo" o "chasquido" que se ve cuando dos animaciones luchan por el control del mismo hueso.21

### **5.2 Parpadeo Procedimental y Seguimiento Ocular**

Los modelos MikuMikuDance controlan los ojos a través de Morph Targets (Blend Shapes). No necesitamos un archivo de animación para el parpadeo; de hecho, depender de uno haría que el parpadeo fuera repetitivo y mecánico. Podemos implementar un bucle useFrame en R3F para gestionar el parpadeo procedimentalmente:

* Generar aleatoriamente un tiempo para el siguiente parpadeo (por ejemplo, cada 2-4 segundos, con varianza).  
* Interpolar la propiedad morphTargetInfluences para el morph "eyes\_closed" (ojos cerrados) de 0 a 1 y de vuelta a 0 durante aproximadamente 100-150ms.

Comportamiento LookAt (Seguimiento Ocular):  
Para que el personaje mire al ratón (como Lumi), manipulamos los huesos del Cuello y la Cabeza. Sin embargo, no podemos simplemente usar bone.lookAt(mouse). Esto rompería el cuello si el ratón está detrás del personaje.  
Restricciones: Debemos restringir (clamp) la rotación del hueso de la cabeza. Calculamos el cuaternión de rotación deseado basado en la posición del ratón relativa a la cámara, pero limitamos los ángulos de Euler a un rango seguro (por ejemplo, ±30 grados de guiñada/cabeceo). Esto crea un efecto de "seguimiento" natural sin giros de cabeza antinaturales.23 Además, para mayor realismo, los ojos (bones de los ojos) deben moverse primero y más rápido que la cabeza, simulando la saccade ocular humana.

### **5.3 Lógica de Implementación para Animación**

JavaScript

useFrame((state, delta) \=\> {  
  // 1\. Actualizar Mixer para el baile global  
  mixer.update(delta);  
    
  // 2\. Lógica de Parpadeo Procedimental  
  updateBlinkLogic(delta, mesh.morphTargetInfluences);  
    
  // 3\. Seguimiento de Cabeza (Lógica CCD-IK limitada)  
  const target \= state.mouse; // Coordenadas normalizadas  
  // Convertir ratón 2D a Mundo 3D  
  // Aplicar rotación con restricciones (Clamping) al hueso de la Cabeza  
})

## **6\. Implementación Física: La Búsqueda del Naturalismo**

Los modelos MMD utilizan cuerpos rígidos y articulaciones definidos en el archivo PMX para simular el cabello y la ropa. Esto es lo que da el movimiento secundario fluido característico del anime.

* **Integración de Ammo.js**: Debemos inicializar AmmoPhysics en nuestra escena R3F. El MMDLoader crea automáticamente una malla física si mmd-physics está habilitado.  
* **Optimización**: La física es costosa computacionalmente. Para mantener el rendimiento en dispositivos móviles o laptops de gama baja, podemos ejecutar la simulación física a una tasa de tics más baja (por ejemplo, 30Hz) mientras renderizamos los gráficos a 60Hz o más, interpolando las posiciones de los huesos entre tics de física. Alternativamente, podemos usar un hilo de trabajador (Worker Thread) para la física, aunque sincronizar los datos pesados de los huesos de vuelta al hilo principal puede negar las ganancias de rendimiento debido a la sobrecarga de serialización.4

Alternativa: Huesos Tambaleantes (Wiggle Bones):  
Si Ammo.js demuestra ser demasiado pesado para navegadores móviles específicos, podemos despojar los cuerpos rígidos y usar una biblioteca de "Wiggle Bone". Esto simula la física de resortes en cadenas de huesos (como el cabello) utilizando la Ley de Hooke simple (fuerza de resorte) en el hilo principal. Es significativamente más ligero que una simulación de cuerpo rígido completa pero menos preciso (las colisiones con el cuerpo pueden atravesarse o "clippear").25 Para una sensación de gama alta tipo "Genshin", la colisión adecuada es preferible, por lo que la recomendación es usar Ammo.js optimizado, recurriendo a Wiggle Bones solo como un "fallback" de bajo rendimiento.

## **7\. Entorno y Fondos: El Lienzo "Recolorable"**

El usuario solicita un fondo recolorable con efectos de partículas. Esto no debe ser una imagen estática, sino un entorno 3D vivo que responda a la configuración del usuario.

### **7.1 Fondo de Shader Personalizado**

Creamos un quad de pantalla completa (una geometría plana que llena la vista de la cámara) con un ShaderMaterial personalizado.

* **Uniforms**: uColor1, uColor2, uTime, uNoiseScale.  
* **Lógica**: Mezclamos los dos colores basándonos en una función de ruido (como Perlin o Simplex noise) que se desplaza con el tiempo. Esto crea una atmósfera suave y etérea similar al vacío de N0va Desktop.  
* **Recoloreado**: Al exponer uColor1 y uColor2 como propiedades (props) en nuestro componente R3F, podemos vincularlos a un selector de color en la interfaz de usuario (UI), satisfaciendo el requisito de "recolorable" instantáneamente sin recargar texturas.27

### **7.2 Partículas Instanciadas (Instanced Particles)**

Para la "animación de partículas" (nieve, polvo, luces flotantes), no debemos usar objetos \<mesh\> individuales. Crear 1000 objetos individuales matará el rendimiento debido a 1000 llamadas de dibujo (draw calls) separadas a la GPU.

* **InstancedMesh**: Utilizamos InstancedMesh, que permite renderizar 1000 partículas en *una sola* llamada de dibujo.  
* Movimiento en Shader: Animamos las partículas en el vertex shader. Pasando uTime al shader, podemos calcular la posición de cada partícula matemáticamente:

  $$y \= \\mod(\\text{initialY} \+ \\text{velocidad} \\times uTime, \\text{altura})$$

  Esto permite una nieve que cae infinitamente o motas de luz que suben con cero costo de CPU para las actualizaciones de posición, delegando todo el trabajo a la GPU, lo cual es vital para mantener los 60 FPS solicitados.28

## **8\. Estrategia de Optimización y Rendimiento**

Apuntar a un entorno de navegador requiere una optimización agresiva para manejar modelos MMD que a menudo son de alto poligonaje (20k-50k vértices) y tienen múltiples materiales.

1. **Compresión Draco (Pipeline Opcional)**: Si el modelo MMD no necesita ser cargado *directamente* desde un archivo.pmx local del usuario en tiempo de ejecución (es decir, si servimos modelos predefinidos), el mejor camino es convertir el.pmx a.gltf fuera de línea (offline) usando Blender con el complemento "MMD Tools", y luego comprimirlo usando Draco. Esto reduce el tamaño del archivo en un \~80% y mejora drásticamente el tiempo de carga y subida a la GPU.30 Sin embargo, si la aplicación *debe* cargar archivos.pmx proporcionados por el usuario dinámicamente, debemos optimizar la carga cruda.  
2. **Compresión de Texturas**: Los modelos MMD a menudo usan archivos .bmp o .tga. Estos son grandes y no comprimidos. Convertir texturas internas a .ktx2 o .webp en tiempo de vuelo (on-the-fly) o pre-procesarlas puede reducir drásticamente el uso de memoria de la GPU y evitar caídas de cuadros.  
3. **Renderizado Bajo Demanda**: Si el personaje está inactivo y el usuario no está interactuando, podemos reducir la velocidad de fotogramas o detener el bucle de renderizado por completo hasta que se detecte movimiento del mouse, ahorrando batería en dispositivos móviles.32  
4. **OffscreenCanvas**: Mover todo el contexto de renderizado de Three.js a un Web Worker es posible usando OffscreenCanvas. Esto evita que los cálculos físicos pesados de Ammo.js congelen el hilo principal (UI). Si bien es complejo de configurar debido al manejo de eventos (los eventos del mouse deben ser enviados al worker), proporciona la experiencia más fluida posible, separando la lógica de la aplicación del renderizado.33

## **9\. Hoja de Ruta de Implementación**

### **Fase 1: La Fundación**

* Inicializar un proyecto React con Vite.  
* Instalar @react-three/fiber, @react-three/drei, three y ammo.js.  
* Configurar un \<Canvas\> básico con sombras y cámara posicionada para vista de retrato.

### **Fase 2: El Cargador y la Física**

* Implementar el MMDLoader dentro de un límite de Suspense para manejar la carga asíncrona.  
* Integrar AmmoPhysics envolviendo el modelo.  
* Verificar que el modelo se carga, la física simula (la falda se mueve) y las animaciones base se reproducen.

### **Fase 3: El Embellecimiento (Shaders MiSide/Genshin)**

* Reemplazar materiales estándar con un ToonShaderMaterial genérico personalizado.  
* Implementar la lógica de sombreado de Rampa (Ramp Shading) en GLSL.  
* Añadir el contorno de Casco Invertido mediante drei/Outlines o inyección de vertex shader personalizado.  
* Implementar Iluminación de Borde (Rim Lighting).

### **Fase 4: El Comportamiento (Estilo Lumi)**

* Crear un gancho AnimationManager para mezclar acciones de "Baile" (.vmd) y "Respiración".  
* Implementar el gancho LookAt para el seguimiento del mouse con restricciones angulares.  
* Añadir la lógica de intervalo de "Parpadeo" procedimental.

### **Fase 5: El Entorno y UI**

* Construir el componente GradientBackground con uniformes de shader.  
* Implementar ParticleSystem usando InstancedMesh.  
* Añadir UI HTML (usando leva o HTML/CSS personalizado) para controlar los colores de fondo y alternar animaciones.

## **10\. Conclusión y Tablas de Datos**

La construcción de un visor MMD basado en la web con fidelidad de "nivel Genshin" es un ejercicio sofisticado en ingeniería gráfica. Requiere trascender las capacidades predeterminadas del MMDLoader mediante la inyección de una tubería de renderizado moderna y estilizada. Al aprovechar React Three Fiber para la gestión de estado y shaders personalizados para el control artístico, es posible crear una aplicación donde un personaje no solo reproduce una animación en bucle, sino que respira, reacciona y existe dentro de un espacio digital vivo. La clave del éxito radica en la optimización rigurosa del motor de física y el ajuste artístico de los mapas de rampa del shader para lograr la estética de anime específica deseada.

### **Tabla 1: Matriz de Características de Renderizado (Estándar vs. Objetivo)**

| Característica | MMD Estándar (Three.js Default) | Estilo "Genshin/MiSide" (Objetivo) | Dificultad de Implementación | Costo de Rendimiento |
| :---- | :---- | :---- | :---- | :---- |
| **Sombreado** | Blinn-Phong Suave (Gradiente) | Sombreado de Rampa Cuantizado (Bandas) | Alta (Shader Personalizado) | Bajo (Búsqueda de Textura) |
| **Contornos** | Ninguno o Post-Procesamiento | Casco Invertido (Basado en Geometría) | Media (Duplicación de Geometría) | Medio (2x Conteo de Vértices) |
| **Rim Light** | Ninguno | Brillo de Borde basado en Fresnel | Media (Matemáticas de Shader) | Bajo |
| **Sombras** | Mapas de Sombra (Dentados/Pesados) | Sombras Faciales SDF \+ Mapas Pintados | Alta (Dependiente del Activo) | Bajo |
| **Física** | Ammo.js (Cuerpo Rígido) | Ammo.js o Huesos de Resorte (Baked) | Alta (Configuración) | Alto (CPU) |

### **Tabla 2: Presupuesto de Rendimiento y Objetivos de Optimización**

| Métrica | Objetivo (Escritorio) | Objetivo (Móvil) | Estrategia de Optimización |
| :---- | :---- | :---- | :---- |
| **Llamadas de Dibujo** | \< 1000 | \< 200 | Instanciamiento para partículas, fusión de mallas estáticas. |
| **Conteo de Polígonos** | \~50k \- 100k | \~20k \- 30k | Uso de LOD (Nivel de Detalle) o compresión Draco. |
| **Tamaño de Textura** | 2048x2048 | 1024x1024 | Compresión KTX2 / WebP. |
| **FPS de Física** | 60 Hz | 30 Hz | Desacoplar el bucle de física del bucle de renderizado. |
| **Tiempo de Carga** | \< 2 segundos | \< 5 segundos | Carga diferida (lazy loading) de animaciones, decodificación paralela. |

Esta arquitectura asegura que el proyecto sea eficiente, escalable y visualmente distintivo, cumpliendo con el alcance ambicioso de la consulta del usuario.

#### **Obras citadas**

1. Introduction \- React Three Fiber, fecha de acceso: diciembre 31, 2025, [https://r3f.docs.pmnd.rs/getting-started/introduction](https://r3f.docs.pmnd.rs/getting-started/introduction)  
2. pmndrs/react-three-fiber: A React renderer for Three.js \- GitHub, fecha de acceso: diciembre 31, 2025, [https://github.com/pmndrs/react-three-fiber](https://github.com/pmndrs/react-three-fiber)  
3. Babylon.js MMD Loader is here \- Demos and projects, fecha de acceso: diciembre 31, 2025, [https://forum.babylonjs.com/t/babylon-js-mmd-loader-is-here/42799](https://forum.babylonjs.com/t/babylon-js-mmd-loader-is-here/42799)  
4. AmmoPhysics – three.js docs, fecha de acceso: diciembre 31, 2025, [https://threejs.org/docs/pages/AmmoPhysics.html](https://threejs.org/docs/pages/AmmoPhysics.html)  
5. Genshin Toon Shader Babylonjs NodeMaterial \- Demos and projects, fecha de acceso: diciembre 31, 2025, [https://forum.babylonjs.com/t/genshin-toon-shader-babylonjs-nodematerial/24581](https://forum.babylonjs.com/t/genshin-toon-shader-babylonjs-nodematerial/24581)  
6. MDDLoader \- Three.js Docs, fecha de acceso: diciembre 31, 2025, [https://threejs.org/docs/pages/MDDLoader.html](https://threejs.org/docs/pages/MDDLoader.html)  
7. Loading Models \- React Three Fiber \- Poimandres, fecha de acceso: diciembre 31, 2025, [https://r3f.docs.pmnd.rs/tutorials/loading-models](https://r3f.docs.pmnd.rs/tutorials/loading-models)  
8. \[Heavy SPOILERS\] An Analysis of MiSide Story :: MiSide Discusiones generales \- Steam Community, fecha de acceso: diciembre 31, 2025, [https://steamcommunity.com/app/2527500/discussions/0/596264060842943597/?l=spanish\&ctp=1](https://steamcommunity.com/app/2527500/discussions/0/596264060842943597/?l=spanish&ctp=1)  
9. An In-Depth Review of MiSide \- Katelyn Brooke \- Medium, fecha de acceso: diciembre 31, 2025, [https://katelyn-brooke.medium.com/an-in-depth-review-of-miside-e97247f723e3](https://katelyn-brooke.medium.com/an-in-depth-review-of-miside-e97247f723e3)  
10. MiSide Zero Update : r/MiSideReddit, fecha de acceso: diciembre 31, 2025, [https://www.reddit.com/r/MiSideReddit/comments/1kaecci/miside\_zero\_update/](https://www.reddit.com/r/MiSideReddit/comments/1kaecci/miside_zero_update/)  
11. Three.js Shading Language \- GitHub, fecha de acceso: diciembre 31, 2025, [https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language](https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language)  
12. ShaderMaterial.lights – three.js docs, fecha de acceso: diciembre 31, 2025, [https://threejs.org/docs/\#api/en/materials/ShaderMaterial.lights](https://threejs.org/docs/#api/en/materials/ShaderMaterial.lights)  
13. Rim Lighting Shader \- Three.js Roadmap, fecha de acceso: diciembre 31, 2025, [https://threejsroadmap.com/blog/rim-lighting-shader](https://threejsroadmap.com/blog/rim-lighting-shader)  
14. Custom Toon Shader in Three.js \[Tutorial\], fecha de acceso: diciembre 31, 2025, [https://www.maya-ndljk.com/blog/threejs-basic-toon-shader](https://www.maya-ndljk.com/blog/threejs-basic-toon-shader)  
15. Inverted Hull Outline · Delt06/toon-rp Wiki \- GitHub, fecha de acceso: diciembre 31, 2025, [https://github.com/Delt06/toon-rp/wiki/Inverted-Hull-Outline](https://github.com/Delt06/toon-rp/wiki/Inverted-Hull-Outline)  
16. \[Tutorial\] Adding outline detailing to meshes in Three.js with Blender and Post-Processing., fecha de acceso: diciembre 31, 2025, [https://www.youtube.com/watch?v=AUJlkwLiciw](https://www.youtube.com/watch?v=AUJlkwLiciw)  
17. One-line inverted hull outlines : r/threejs \- Reddit, fecha de acceso: diciembre 31, 2025, [https://www.reddit.com/r/threejs/comments/16976z0/oneline\_inverted\_hull\_outlines/](https://www.reddit.com/r/threejs/comments/16976z0/oneline_inverted_hull_outlines/)  
18. Outlines \- React Three Drei, fecha de acceso: diciembre 31, 2025, [https://drei.docs.pmnd.rs/abstractions/outlines](https://drei.docs.pmnd.rs/abstractions/outlines)  
19. AnimationAction.blendMode – three.js docs, fecha de acceso: diciembre 31, 2025, [https://threejs.org/docs/\#api/en/animation/AnimationAction.blendMode](https://threejs.org/docs/#api/en/animation/AnimationAction.blendMode)  
20. Animation 'Replace' blend mode \- Questions \- three.js forum, fecha de acceso: diciembre 31, 2025, [https://discourse.threejs.org/t/animation-replace-blend-mode/51804](https://discourse.threejs.org/t/animation-replace-blend-mode/51804)  
21. How to stop an animation from finishing and use it to blend into the next animation. To stop animation flicker when spamming an animation input. : r/threejs \- Reddit, fecha de acceso: diciembre 31, 2025, [https://www.reddit.com/r/threejs/comments/1eaksh9/how\_to\_stop\_an\_animation\_from\_finishing\_and\_use/](https://www.reddit.com/r/threejs/comments/1eaksh9/how_to_stop_an_animation_from_finishing_and_use/)  
22. Additional animation blending mode support · Issue \#22713 · mrdoob/three.js \- GitHub, fecha de acceso: diciembre 31, 2025, [https://github.com/mrdoob/three.js/issues/22713](https://github.com/mrdoob/three.js/issues/22713)  
23. ThreeJs Object look at mouse with ease \- Stack Overflow, fecha de acceso: diciembre 31, 2025, [https://stackoverflow.com/questions/53887057/threejs-object-look-at-mouse-with-ease](https://stackoverflow.com/questions/53887057/threejs-object-look-at-mouse-with-ease)  
24. Preferred physics engine (cannon.js, ammo.js, DIY...) \- three.js forum, fecha de acceso: diciembre 31, 2025, [https://discourse.threejs.org/t/preferred-physics-engine-cannon-js-ammo-js-diy/1565](https://discourse.threejs.org/t/preferred-physics-engine-cannon-js-ammo-js-diy/1565)  
25. Jiggle Bone Physics Spring Damper \- Questions \- three.js forum, fecha de acceso: diciembre 31, 2025, [https://discourse.threejs.org/t/jiggle-bone-physics-spring-damper/57783](https://discourse.threejs.org/t/jiggle-bone-physics-spring-damper/57783)  
26. Wiggle Bones Threejs Library w/ React Three Fiber \- YouTube, fecha de acceso: diciembre 31, 2025, [https://www.youtube.com/watch?v=ljL7NKCi-kg](https://www.youtube.com/watch?v=ljL7NKCi-kg)  
27. How to Code a Subtle Shader Background Effect with React Three Fiber | Codrops, fecha de acceso: diciembre 31, 2025, [https://tympanus.net/codrops/2024/10/31/how-to-code-a-subtle-shader-background-effect-with-react-three-fiber/](https://tympanus.net/codrops/2024/10/31/how-to-code-a-subtle-shader-background-effect-with-react-three-fiber/)  
28. Interactive Particles with Three.js \- Codrops, fecha de acceso: diciembre 31, 2025, [https://tympanus.net/codrops/2019/01/17/interactive-particles-with-three-js/](https://tympanus.net/codrops/2019/01/17/interactive-particles-with-three-js/)  
29. Examples \- Three.js, fecha de acceso: diciembre 31, 2025, [https://threejs.org/examples/](https://threejs.org/examples/)  
30. Batch Export PMX Files to GLTF \- reaConverter, fecha de acceso: diciembre 31, 2025, [https://www.reaconverter.com/convert/pmx\_to\_gltf.html](https://www.reaconverter.com/convert/pmx_to_gltf.html)  
31. How to improve FPS with import GLTF file \- Questions \- three.js forum, fecha de acceso: diciembre 31, 2025, [https://discourse.threejs.org/t/how-to-improve-fps-with-import-gltf-file/44814](https://discourse.threejs.org/t/how-to-improve-fps-with-import-gltf-file/44814)  
32. Scaling performance \- React Three Fiber, fecha de acceso: diciembre 31, 2025, [https://r3f.docs.pmnd.rs/advanced/scaling-performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance)  
33. Faster WebGL/Three.js 3D graphics with OffscreenCanvas and Web Workers \- Evil Martians, fecha de acceso: diciembre 31, 2025, [https://evilmartians.com/chronicles/faster-webgl-three-js-3d-graphics-with-offscreencanvas-and-web-workers](https://evilmartians.com/chronicles/faster-webgl-three-js-3d-graphics-with-offscreencanvas-and-web-workers)  
34. OffscreenCanvas—speed up your canvas operations with a web worker | Articles, fecha de acceso: diciembre 31, 2025, [https://web.dev/articles/offscreen-canvas](https://web.dev/articles/offscreen-canvas)