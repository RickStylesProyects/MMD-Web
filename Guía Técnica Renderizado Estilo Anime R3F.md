# **Arquitectura de Renderizado No Fotorrealista de Alta Fidelidad en la Web: Implementación del Estilo 'Genshin Impact' mediante React Three Fiber**

## **1\. Introducción: El Paradigma del Estilizado Cinemático en WebGL**

La evolución de los gráficos en tiempo real en la web ha seguido tradicionalmente una trayectoria asintótica hacia el fotorrealismo, impulsada por la adopción generalizada de modelos de Renderizado Basado en Física (PBR). Sin embargo, paralelamente a esta búsqueda de la simulación óptica perfecta, ha surgido y madurado una corriente estética divergente que prioriza la intención artística sobre la precisión física: el Renderizado No Fotorrealista (NPR), específicamente el estilo "Anime Cel-Shaded" de alta fidelidad popularizado por títulos como *Genshin Impact* o *Honkai: Star Rail*. Este informe técnico desglosa la arquitectura, las matemáticas y la implementación de ingeniería requeridas para replicar este estilo visual utilizando **React Three Fiber (R3F)**, la abstracción declarativa sobre Three.js.

A diferencia del *Cel Shading* rudimentario de principios de los 2000, que se limitaba a una cuantización simple de la iluminación (banding), el estilo moderno "Genshin" es un sistema complejo de múltiples capas que involucra la manipulación directa de los vectores de normales, el uso de texturas de datos (SDF) para el sombreado facial, la simulación física de apéndices (cabello y ropa) y una tubería de post-procesamiento cinematográfico calibrada meticulosamente. La implementación de este sistema en un entorno web presenta desafíos únicos debido a las limitaciones de rendimiento de WebGL y la necesidad de gestionar el estado complejo de la escena a través del ciclo de vida de los componentes de React.

Este documento no es un tutorial superficial, sino un análisis exhaustivo de la ingeniería de software y gráficos necesaria para construir un motor de renderizado NPR capaz de soportar:

1. **Iluminación de Personajes Dinámica:** Shaders personalizados que responden a la dirección de la luz con rampas de gradiente y control artístico sobre la terminación de la sombra.  
2. **Sombreado Facial Basado en SDF:** Eliminación de sombras geométricas no favorecedoras mediante mapas de distancia con signo.  
3. **Delineado (Outlines) Reactivo:** Algoritmos de casco invertido (inverted hull) compatibles con mallas animadas (Skinned Meshes).  
4. **Atmósfera Volumétrica Simulada:** Implementación de "Godrays" y niebla de altura mediante técnicas de bajo costo computacional.  
5. **Física de Cuerpos Blandos:** Integración de Ammo.js para la simulación de movimiento secundario en tiempo real.  
6. **Post-Procesamiento HDR:** Gestión de rango dinámico y efectos de resplandor (Bloom) selectivo.

## ---

**2\. Arquitectura del Entorno y Gestión del Color en R3F**

El primer paso crítico en la construcción de una escena estilizada no es el modelado 3D, sino la configuración del "lienzo" sobre el cual se renderizará. La gestión del color y la configuración del renderizador determinan cómo se interpretan los valores de luz y color antes de llegar a la pantalla. En el contexto de R3F, esto implica una configuración precisa del componente \<Canvas /\> y el sistema de WebGLRenderer.

### **2.1. Espacio de Color Lineal y Mapeo de Tonos (Tone Mapping)**

El renderizado moderno opera idealmente en un espacio de color lineal. Esto significa que los cálculos matemáticos de la luz (adición, multiplicación) se realizan en valores que son directamente proporcionales a la intensidad física de la luz. Sin embargo, los monitores muestran colores en espacio sRGB (gamma corregido). La conversión entre estos espacios es fundamental.

Para un estilo anime vibrante, la elección del algoritmo de mapeo de tonos (Tone Mapping) es una decisión arquitectónica fundamental. El mapeo de tonos comprime el alto rango dinámico (HDR) de la iluminación calculada (que puede exceder 1.0) al rango dinámico bajo (LDR) del monitor (0.0 \- 1.0).

La investigación indica una dicotomía en la industria:

* **Reinhard Tone Mapping:** Preserva bien los colores pero tiende a desaturar los negros y blancos, resultando en una imagen "plana".  
* **ACES Filmic Tone Mapping:** Es el estándar de la industria cinematográfica y de Three.js por defecto. Ofrece un contraste superior y una respuesta a la luz muy "fílmica". Sin embargo, introduce un problema conocido en el renderizado estilizado: el "hue shift" o cambio de matiz en altas intensidades y una desaturación notable de los colores brillantes, lo cual es contraproducente para la estética anime que requiere colores puros y vibrantes.3

Estrategia de Implementación:  
Se recomienda utilizar ACESFilmicToneMapping para mantener la coherencia con los efectos de post-procesado (como el Bloom), pero compensar la desaturación dentro de los shaders de los materiales o mediante una corrección de color posterior. La configuración del Canvas en R3F debe ser explícita:

JavaScript

\<Canvas  
  gl={{  
    antialias: true,  
    toneMapping: THREE.ACESFilmicToneMapping,  
    toneMappingExposure: 1.0, // Ajustable según la escena  
    outputColorSpace: THREE.SRGBColorSpace,  
    powerPreference: "high-performance",  
    stencil: true, // Necesario para técnicas avanzadas de mascaras  
    depth: true  
  }}  
  dpr={} // Optimización dinámica de densidad de píxeles  
  shadows  
\>  
  {/\* Graph de Escena \*/}  
\</Canvas\>

Es crucial notar que el uso de outputColorSpace: THREE.SRGBColorSpace asegura que Three.js realice la conversión final de Linear a sRGB automáticamente. Si se omite esto, los colores se verán oscuros y lavados.

### **2.2. Contexto de Iluminación Global**

A diferencia del renderizado realista que puede depender de HDRI (High Dynamic Range Imaging) para la iluminación compleja, el estilo *Genshin* se basa en un control estricto de la dirección de la luz. Se debe establecer un sistema de **Iluminación Global Estilizada**.

Este sistema no utiliza rebotes de luz reales (Global Illumination \- GI) en tiempo real, ya que el ruido visual que generan es indeseable para el estilo limpio del anime. En su lugar, se simula mediante:

1. **Luz Direccional Principal (Sun Light):** Define la dirección de las sombras y el vector de luz ($L$) que se pasará a todos los shaders.  
2. **Luz Ambiental Hemisférica:** Controla el color de las sombras. En *Genshin*, las sombras nunca son negras; son de un tono azulado o violeta frío que contrasta con la luz cálida. HemisphereLight de Three.js es ideal para esto, permitiendo definir un color para el "cielo" (luz) y otro para el "suelo" (sombra).5

La dirección de la luz principal debe ser accesible globalmente para los shaders de los personajes, ya que el cálculo del sombreado facial depende de la posición relativa de esta luz, no solo de su incidencia en la geometría. En R3F, esto se gestiona eficientemente mediante un Contexto de React (useContext) o una tienda de estado (como Zustand) que inyecta el uLightDirection en los uniformes de todos los materiales dinámicos.

## ---

**3\. Ingeniería de Shaders de Personajes: Rostro y Piel**

El componente más crítico y distintivo del estilo es el renderizado del rostro. El enfoque estándar de Lambert ($N \\cdot L$) falla estrepitosamente en rostros humanos estilizados porque la geometría de la nariz, los labios y las cuencas de los ojos proyecta sombras complejas y "sucias" que envejecen al personaje o rompen la estética de "dibujo a mano".2

### **3.1. Teoría de Sombreado Facial Basado en SDF**

La solución técnica adoptada por miHoYo y replicada en implementaciones avanzadas de WebGL es ignorar completamente las normales de la geometría del rostro para el cálculo de sombras. En su lugar, se utiliza una técnica basada en **Campos de Distancia con Signo (SDF)** o mapas de umbral precalculados.7

#### **3.1.1. El Mapa de Sombras Facial (Face Shadow Map)**

El rostro del personaje se mapea en una textura especial (generalmente empaquetada en un canal único o combinada con otras texturas). Esta textura no contiene colores, sino valores escalares (0.0 a 1.0) que representan "en qué ángulo de luz esta parte de la cara debe entrar en sombra".

* Si un píxel en la mejilla tiene un valor de 0.5 en el mapa SDF, significa que esa zona entrará en sombra cuando la luz esté a 90 grados (0.5 mapeado al rango de ángulos).  
* Si tiene un valor de 0.0, siempre estará en sombra. Si es 1.0, casi nunca lo estará.

#### **3.1.2. Algoritmo de Implementación en GLSL**

El shader debe realizar un cálculo trigonométrico para determinar la orientación de la luz relativa a la cabeza. Esto requiere que el shader conozca los vectores Forward (hacia donde mira la cara) y Right (hacia la derecha de la cara) del objeto en coordenadas de mundo.

OpenGL Shading Language

// Fragment Shader Logic  
uniform vec3 uLightDir; // Dirección de la luz principal  
uniform vec3 uHeadForward; // Vector frontal de la cabeza  
uniform vec3 uHeadRight; // Vector derecho de la cabeza  
uniform sampler2D tFaceSDF; // Textura de datos de sombra

void main() {  
    // 1\. Proyectar vectores en el plano XZ (ignorando inclinación vertical para simplicidad estilizada)  
    vec3 lightDirXZ \= normalize(vec3(uLightDir.x, 0.0, uLightDir.z));  
    vec3 headForwardXZ \= normalize(vec3(uHeadForward.x, 0.0, uHeadForward.z));  
    vec3 headRightXZ \= normalize(vec3(uHeadRight.x, 0.0, uHeadRight.z));

    // 2\. Calcular el ángulo de la luz relativo a la cara  
    // El producto punto nos da el coseno del ángulo  
    float dotF \= dot(headForwardXZ, lightDirXZ); // 1.0 \= luz frontal, \-1.0 \= luz trasera  
    float dotR \= dot(headRightXZ, lightDirXZ);   // Determina si la luz viene de izq o der

    // 3\. Normalizar el ángulo a un rango 0-1 para muestreo de textura (aproximado)  
    // En implementaciones reales, se usa una LUT o matemáticas de remap  
    float shadowThreshold \= texture2D(tFaceSDF, vUv).r;  
      
    // 4\. Lógica de "Flip"  
    // Las texturas SDF suelen estar horneadas para un solo lado de la cara (simetría)  
    // Si la luz viene del lado opuesto, invertimos la coordenada U de lectura o la lógica  
    // Para Genshin, el mapa suele contener la información completa.  
      
    // 5\. Decisión de Sombra  
    // Si el ángulo de luz actual es mayor que el umbral definido en la textura, es sombra.  
    float isShadow \= step(shadowThreshold, map(dotF, \-1.0, 1.0, 0.0, 1.0));  
      
    // 6\. Suavizado (Opcional)  
    // Para anime duro, usamos step. Para suavizado, smoothstep con un ancho muy pequeño.  
    float feather \= 0.05;  
    float shadowFactor \= smoothstep(shadowThreshold \- feather, shadowThreshold \+ feather, derivedLightAngle);  
      
    // 7\. Composición  
    vec3 finalColor \= mix(shadowColor, lightColor, shadowFactor);  
}

La investigación 6 enfatiza que para que esto funcione en R3F, se debe actualizar en cada frame (useFrame) la orientación de la cabeza del personaje y pasarla como uniforme al shader. No se puede confiar en gl\_NormalMatrix estándar porque necesitamos la orientación del "objeto cabeza" como entidad lógica, no la normal de cada vértice.

### **3.2. Gestión de "Dirty Shadows"**

Un problema recurrente documentado 6 es que la sombra proyectada por el pelo o accesorios sobre la cara SDF puede entrar en conflicto con la sombra calculada por el SDF. La solución técnica es usar una máscara o un booleano IsFace en el material. Si es la cara, se suelen desactivar las sombras recibidas (receiveShadow \= false) de la geometría externa, o se las tiñe de un color específico para integrarlas con la sombra SDF.

## ---

**4\. Shaders de Cuerpo, Ropa y Materiales Estilizados**

Mientras que la cara ignora las normales, el cuerpo las utiliza extensivamente, pero con una respuesta a la luz altamente procesada.

### **4.1. Gradient Mapping (Rampas de Iluminación)**

El renderizado estándar calcula la intensidad de la luz ($L\_{int} \= N \\cdot L$) y multiplica el color base por este valor. Esto crea gradientes suaves y realistas. El estilo anime requiere "bandas" de color definidas.

En lugar de usar lógica condicional (if (intensity \< 0.5) color \= shadow), se utiliza una **Textura de Rampa (Gradient Map)** o **Ramp Texture**.

* **Mecanismo:** El valor calculado de Lambert ($N \\cdot L$, rango \-1 a 1, remapeado a 0 a 1\) se utiliza como coordenada U para muestrear una textura de gradiente 1D.9  
* **Flexibilidad:** Esto permite a los artistas controlar la suavidad ("falloff") de la sombra. Un material como el metal puede tener una rampa con una transición nítida, mientras que la seda o la piel (del cuerpo) pueden tener una rampa con una pequeña zona de transición suave (subsurface scattering falso).

En Three.js, MeshToonMaterial soporta gradientMap, pero para replicar *Genshin*, se necesita un shader personalizado que permita **rampas múltiples** basadas en el tipo de material (definido por una máscara en el canal Alfa o una textura de control dedicada).11

### **4.2. Metalicidad Estilizada y MatCaps**

Los metales en este estilo no reflejan el entorno real (lo cual sería visualmente ruidoso). En su lugar, utilizan:

1. **MatCap (Material Capture):** Una textura esférica que simula reflejos complejos. Se mapea utilizando la normal del espacio de vista (View Space Normal).12  
2. **Specular Highlighting Anisótropo:** Para el cabello, se desplaza el punto especular a lo largo de la tangente del cabello, creando el característico "halo" angelical en la cabeza.1

### **4.3. Implementación de Rim Light (Luz de Borde)**

La luz de borde es esencial para separar al personaje del fondo 3D.  
La fórmula matemática estándar es el Fresnel invertido:

$$Rim \= (1.0 \- (N \\cdot V))^P$$

Donde $N$ es la normal y $V$ es el vector de visión.  
Sin embargo, para el estilo anime, esta fórmula básica crea un borde "fantasmal" alrededor de todo el objeto. La implementación correcta debe:

1. **Multiplicar por la luz:** Solo mostrar Rim Light en el lado iluminado o en el lado opuesto a la luz principal, según la dirección artística.  
2. **Step Function:** Aplicar un smoothstep duro al resultado del Fresnel para crear una línea de grosor constante en lugar de un gradiente difuso.13  
3. **Control por Textura:** Usar una textura de máscara para evitar que el Rim Light aparezca en zonas ocluidas (como axilas o entre las piernas) donde la luz no debería llegar.

## ---

**5\. Algoritmos de Delineado (Outlines) y Geometría**

El delineado negro o coloreado es la firma del estilo 2D. Existen métodos de post-procesado (detección de bordes en el buffer de profundidad/normales), pero estos a menudo fallan en capturar detalles internos o producen líneas de ancho variable indeseado. La técnica superior para personajes es el **Método de Casco Invertido (Inverted Hull)**.

### **5.1. El Método Inverted Hull en Detalle**

La técnica consiste en renderizar la geometría del personaje dos veces:

1. **Paso de Contorno (Outline Pass):**  
   * Se renderiza la malla.  
   * Se configura el material para sacrificar las caras frontales (cullFace \= Front) y dibujar solo las traseras (BackSide).  
   * En el Vertex Shader, se desplaza cada vértice a lo largo de su normal: $P' \= P \+ N \\times Grosor$.  
   * El resultado es una silueta negra ligeramente más grande que el objeto original.  
2. **Paso de Color (Shading Pass):**  
   * Se renderiza la malla normalmente (FrontSide) encima del contorno.

### **5.2. El Desafío del SkinnedMesh en R3F**

Una limitación técnica crítica descubierta en la investigación 16 es que aplicar un ShaderMaterial básico para el contorno a un SkinnedMesh (personaje con huesos) resulta en un contorno estático que no sigue la animación.

**Causa:** La deformación de la malla por los huesos (Skinning) ocurre en el GPU dentro del Vertex Shader. Un shader personalizado estándar no incluye estas operaciones matemáticas complejas.

Solución de Ingeniería:  
Se debe inyectar la lógica de skinning de Three.js en el shader de contorno. Esto se puede hacer manualmente con ShaderChunk o utilizando la abstracción \<Outlines /\> de la librería @react-three/drei, que maneja esto internamente. Si se opta por el shader manual para mayor control (ej. modulación del grosor por distancia de cámara), el código debe incluir:

OpenGL Shading Language

// Vertex Shader del Outline  
\#include \<common\>  
\#include \<skinning\_pars\_vertex\> // Uniformes de matrices de huesos

void main() {  
    \#include \<skinbase\_vertex\>  
    \#include \<begin\_vertex\>  
    \#include \<skinning\_vertex\> // Aplica la transformación de huesos a 'transformed'  
    \#include \<project\_vertex\> // Proyecta al espacio de pantalla

    // Aplicar extrusión DESPUÉS del skinning  
    vec4 mvPosition \= modelViewMatrix \* vec4( transformed \+ normal \* outlineThickness, 1.0 );  
    gl\_Position \= projectionMatrix \* mvPosition;  
}

Es vital también manejar el "Z-Fighting" o problemas de profundidad. Es común aplicar un pequeño polygonOffset al material del contorno para empujarlo ligeramente hacia atrás en el buffer de profundidad.

## ---

**6\. Simulación Física y Dinámica de Movimiento: Integración de Ammo.js**

El movimiento secundario (pelo ondeando, faldas moviéndose, accesorios colgantes) es lo que da vida al personaje. La animación keyframeada manual ("baked") es rígida y no reacciona al entorno.

### **6.1. Arquitectura de Física en la Web: Ammo.js (WASM)**

Ammo.js es un puerto directo del motor Bullet Physics (escrito en C++) a WebAssembly (WASM). Esto permite un rendimiento cercano al nativo, esencial para calcular colisiones complejas en cada frame.

En el ecosistema R3F, la integración se realiza mediante bibliotecas puente como use-ammojs o los componentes de física de react-three/cannon (aunque Cannon es menos preciso que Ammo para restricciones complejas). Para modelos de anime que a menudo vienen del formato MMD (MikuMikuDance), Ammo.js es preferible debido a su soporte para cuerpos blandos y restricciones rígidas avanzadas.18

### **6.2. MMDPhysics y el Render Loop**

Three.js proporciona un cargador específico MMDLoader y un gestor de física MMDPhysics. Estos módulos leen los metadatos físicos incrustados en los archivos .pmx (masas, restricciones, resortes) y construyen automáticamente el mundo de física en Ammo.js.20

**Integración Paso a Paso en R3F:**

1. **Carga Asíncrona:** Usar useLoader(MMDLoader, url) para traer el modelo.  
2. **Instanciación del Mundo Físico:** Se debe inicializar Ammo.js antes de cualquier renderizado.  
3. **Sincronización del Frame:** La física debe avanzar en sincronía con el renderizado visual. Esto se logra dentro del hook useFrame de R3F.

JavaScript

// Pseudocódigo de integración MMDPhysics  
import { MMDPhysics } from 'three-stdlib';

function Character({ url }) {  
  const { scene } \= useLoader(MMDLoader, url);  
  const physicsRef \= useRef();

  useEffect(() \=\> {  
    // Inicializar el helper de física MMD  
    // Requiere que la malla sea un SkinnedMesh y tenga datos de física  
    physicsRef.current \= new MMDPhysics(scene, physicsParams);  
  }, \[scene\]);

  useFrame((state, delta) \=\> {  
    // Avanzar la simulación física  
    if (physicsRef.current) {  
        // step(timeStep, maxSubSteps, fixedTimeStep)  
        physicsRef.current.step(delta);   
    }  
  });

  return \<primitive object\={scene} /\>;  
}

Esta implementación permite que los huesos de la falda y el cabello sean controlados por el motor de física, respondiendo a la gravedad y a la inercia del movimiento del personaje, mientras que los huesos principales (brazos, piernas) siguen la animación base.

## ---

**7\. Efectos Atmosféricos: Godrays, Niebla y Ambiente**

La atmósfera transforma una escena 3D estéril en un mundo vibrante. El renderizado volumétrico real (Raymarching volumétrico) es prohibitivo en rendimiento para WebGL móvil. Se deben usar técnicas de "falsificación" (faking) de alta fidelidad.22

### **7.1. Godrays (Rayos Crepusculares) Híbridos**

Existen dos enfoques principales documentados:

1. **Screen Space Godrays (Post-procesado):** Analiza las áreas brillantes de la pantalla (el sol ocluido por árboles) y aplica un desenfoque radial. Es eficiente pero tiene limitaciones: si la fuente de luz sale de la pantalla, el efecto desaparece.  
2. **Mesh-based Volumetrics:** Conos o cilindros geométricos colocados en el mundo con un shader especial.

Implementación Recomendada:  
Para un control artístico estilo Genshin, el enfoque basado en mallas (Mesh-based) para rayos localizados (ej. luz entrando por una ventana o a través de árboles específicos) es superior.  
El shader para estos conos de luz debe:

* Usar transparent: true, depthWrite: false.  
* Implementar un "Fade" suave en los bordes usando Fresnel invertido (para que no se vean como geometría sólida).  
* Usar una textura de ruido desplazándose en coordenadas UV para simular polvo flotando en la luz.  
* Implementar "Soft Particles" leyendo el buffer de profundidad para desvanecer la geometría cuando intersecta con el suelo u objetos sólidos, evitando cortes duros.22

Para los rayos del sol globales, se puede complementar con el efecto GodRays de @react-three/postprocessing, ajustando la densidad y el decaimiento para que sea sutil y onírico, no abrumador.

### **7.2. Niebla de Altura (Height Fog)**

La niebla nativa de Three.js (scene.fog) es basada en distancia (esférica). Para paisajes abiertos tipo anime, se prefiere una niebla exponencial basada en la altura (Y). Esto permite ver las cimas de las montañas claras mientras los valles están brumosos.  
Esto se logra modificando los shaders de todos los objetos de la escena (onBeforeCompile en materiales estándar) para mezclar el color final con el color de la niebla basándose en la posición vWorldPosition.y del vértice.24

## ---

**8\. Pipeline de Post-Procesado y Bloom Selectivo**

La etapa final es el post-procesado, donde se cohesiona la imagen. El uso de EffectComposer en R3F es estándar, pero la configuración es delicada.

### **8.1. Bloom Selectivo y Umbrales de Luminancia**

El efecto de resplandor (Bloom) a menudo "contamina" toda la escena, haciendo que la piel blanca brille, lo cual es incorrecto.  
Configuración Correcta:

1. Establecer el luminanceThreshold del efecto Bloom en un valor alto, por ejemplo, 1.0 o 0.9.  
2. Configurar los materiales que *deben* brillar (magia, neón, ojos) con un color emisivo cuya intensidad supere el umbral. Por ejemplo, emissiveIntensity={2.0} o emissive="\#ff0000" (donde el color se multiplica para exceder el rango 0-1).26  
3. Asegurarse de que el toneMapping no recorte estos valores antes de que llegue al pase de Bloom. En R3F, el orden de los pases en el EffectComposer es crítico, o se debe usar un render target de punto flotante (HalfFloatType) para preservar el rango dinámico entre pases.

### **8.2. Corrección de Color Final (LUTs)**

Para finalizar el look, se aplica una corrección de color. El método más eficiente y artístico es usar LUTs (Look-Up Tables). Los artistas pueden tomar una captura de la escena, ajustarla en Photoshop para lograr los tonos azules/cyans característicos de *Genshin* en las sombras y dorados en las luces, y exportar una LUT .cube o .png. Esta LUT se carga en el LUTPass del compositor, transformando instantáneamente la colorimetría de toda la escena con un costo de rendimiento mínimo.28

## ---

**9\. Tabla Resumen de Componentes Técnicos**

La siguiente tabla resume las decisiones de arquitectura recomendadas frente a las opciones estándar de Three.js, destacando la complejidad de implementación.

| Componente | Implementación Estándar (Three.js) | Implementación NPR "Anime" (R3F) | Complejidad |
| :---- | :---- | :---- | :---- |
| **Sombra Facial** | NdotL (Lambertiano) | Shader Custom con SDF \+ Forward Vector Logic | Alta |
| **Sombra Cuerpo** | MeshToonMaterial | Custom Shader con Multi-Ramp y Canales de Control | Media |
| **Outlines** | No nativo | Inverted Hull Shader con Skinning Injection | Alta |
| **Física** | Cannon.js | Ammo.js \+ MMDPhysics (WASM) | Alta |
| **Tone Mapping** | ACESFilmic (Default) | ACESFilmic \+ Compensación de Saturación | Media |
| **Bloom** | Global | Selectivo por Umbral HDR (\>1.0) | Media |
| **Atmósfera** | FogExp2 | Height Fog (Custom Shader Chunk) \+ Mesh Godrays | Media |
| **Gestión de Luz** | Point/Spot Lights | Contexto Global de Luz Direccional \+ Hemi Ambient | Baja |

## ---

**10\. Conclusión y Hoja de Ruta**

La implementación de un renderizado estilo *Genshin Impact* en React Three Fiber es un ejercicio avanzado de gráficos por computadora que va mucho más allá de cargar modelos y aplicar texturas. Requiere una desviación deliberada de los pipelines PBR estándar. El éxito de la implementación depende de tres pilares fundamentales: **Geometría Especializada** (mapas SDF y topología limpia), **Shaders Personalizados** (que priorizan la dirección artística sobre la física) y una **Arquitectura de Escena** robusta (gestión de estado de luces, física WASM y post-procesado HDR).

Al seguir esta guía, los desarrolladores pueden trascender las limitaciones del renderizado web convencional, entregando experiencias visuales que rivalizan con aplicaciones nativas, aprovechando la flexibilidad declarativa de React y la potencia de bajo nivel de WebGL.

#### **Obras citadas**

1. Genshin Impact Character Shader Breakdown \[Unity URP\] \- Adrian Mendez, fecha de acceso: diciembre 31, 2025, [https://adrianmendez.artstation.com/projects/wJZ4Gg](https://adrianmendez.artstation.com/projects/wJZ4Gg)  
2. Genshin 3D shading explained \- YouTube, fecha de acceso: diciembre 31, 2025, [https://www.youtube.com/watch?v=OdZTf4JdqCY](https://www.youtube.com/watch?v=OdZTf4JdqCY)  
3. Pmndrs Post Processing: Tone Mapping guidance \- Questions \- three.js forum, fecha de acceso: diciembre 31, 2025, [https://discourse.threejs.org/t/pmndrs-post-processing-tone-mapping-guidance/59374](https://discourse.threejs.org/t/pmndrs-post-processing-tone-mapping-guidance/59374)  
4. ACESFilmicToneMapping leading to low-contrast textures \- Questions \- three.js forum, fecha de acceso: diciembre 31, 2025, [https://discourse.threejs.org/t/acesfilmictonemapping-leading-to-low-contrast-textures/15484](https://discourse.threejs.org/t/acesfilmictonemapping-leading-to-low-contrast-textures/15484)  
5. Tone Mapping Overview \- Showcase \- three.js forum, fecha de acceso: diciembre 31, 2025, [https://discourse.threejs.org/t/tone-mapping-overview/75204](https://discourse.threejs.org/t/tone-mapping-overview/75204)  
6. Knosiz/URPSimpleGenshinShaders: A simple Genshin Impact facial shader for Unity URP, based on NiloCat shader example \- GitHub, fecha de acceso: diciembre 31, 2025, [https://github.com/Knosiz/URPSimpleGenshinShaders](https://github.com/Knosiz/URPSimpleGenshinShaders)  
7. NoiRC256/URPSimpleGenshinShaders: A simple Genshin Impact facial shader for Unity URP, based on NiloCat shader example \- GitHub, fecha de acceso: diciembre 31, 2025, [https://github.com/NoiRC256/URPSimpleGenshinShaders](https://github.com/NoiRC256/URPSimpleGenshinShaders)  
8. I tried to generate SDF in Three.js and use it to calculate shadows, but it looks ugly\! help\!, fecha de acceso: diciembre 31, 2025, [https://discourse.threejs.org/t/i-tried-to-generate-sdf-in-three-js-and-use-it-to-calculate-shadows-but-it-looks-ugly-help/69291](https://discourse.threejs.org/t/i-tried-to-generate-sdf-in-three-js-and-use-it-to-calculate-shadows-but-it-looks-ugly-help/69291)  
9. MeshToonMaterial – three.js docs, fecha de acceso: diciembre 31, 2025, [https://threejs.org/docs/pages/MeshToonMaterial.html](https://threejs.org/docs/pages/MeshToonMaterial.html)  
10. Implementing a gradient shader in three.js \- Stack Overflow, fecha de acceso: diciembre 31, 2025, [https://stackoverflow.com/questions/45092071/implementing-a-gradient-shader-in-three-js](https://stackoverflow.com/questions/45092071/implementing-a-gradient-shader-in-three-js)  
11. ThreeJS \[r85\]: Custom Shader with Shadowmap \- Stack Overflow, fecha de acceso: diciembre 31, 2025, [https://stackoverflow.com/questions/43528748/threejs-r85-custom-shader-with-shadowmap](https://stackoverflow.com/questions/43528748/threejs-r85-custom-shader-with-shadowmap)  
12. Suggestion: Refactor MeshToonMaterial · Issue \#16257 · mrdoob/three.js \- GitHub, fecha de acceso: diciembre 31, 2025, [https://github.com/mrdoob/three.js/issues/16257](https://github.com/mrdoob/three.js/issues/16257)  
13. Toon Shading & Rim Lighting // OpenGL Tutorial \#34 \- YouTube, fecha de acceso: diciembre 31, 2025, [https://www.youtube.com/watch?v=h15kTY3aWaY](https://www.youtube.com/watch?v=h15kTY3aWaY)  
14. Rim-Lighting Shader Problem \- OpenGL \- Khronos Forums, fecha de acceso: diciembre 31, 2025, [https://community.khronos.org/t/rim-lighting-shader-problem/55531](https://community.khronos.org/t/rim-lighting-shader-problem/55531)  
15. Rim Lighting Shader \- Three.js Roadmap, fecha de acceso: diciembre 31, 2025, [https://threejsroadmap.com/blog/rim-lighting-shader](https://threejsroadmap.com/blog/rim-lighting-shader)  
16. OutlineEffect: Support for SkinnedMesh? · Issue \#194 · pmndrs/postprocessing \- GitHub, fecha de acceso: diciembre 31, 2025, [https://github.com/pmndrs/postprocessing/issues/194](https://github.com/pmndrs/postprocessing/issues/194)  
17. three.js \- Best method to get Outline effect with animated skinned mesh \- Stack Overflow, fecha de acceso: diciembre 31, 2025, [https://stackoverflow.com/questions/59786826/best-method-to-get-outline-effect-with-animated-skinned-mesh](https://stackoverflow.com/questions/59786826/best-method-to-get-outline-effect-with-animated-skinned-mesh)  
18. r3f with ammo physics \- CodeSandbox, fecha de acceso: diciembre 31, 2025, [https://codesandbox.io/s/r3f-with-ammo-physics-mw45t](https://codesandbox.io/s/r3f-with-ammo-physics-mw45t)  
19. notrabs/use-ammojs: ammo.js physics for use with react-three-fiber \- GitHub, fecha de acceso: diciembre 31, 2025, [https://github.com/notrabs/use-ammojs](https://github.com/notrabs/use-ammojs)  
20. How to use sharedPhysics in MMDAnimationHelper? \- Questions \- three.js forum, fecha de acceso: diciembre 31, 2025, [https://discourse.threejs.org/t/how-to-use-sharedphysics-in-mmdanimationhelper/35446](https://discourse.threejs.org/t/how-to-use-sharedphysics-in-mmdanimationhelper/35446)  
21. AmmoPhysics – three.js docs, fecha de acceso: diciembre 31, 2025, [https://threejs.org/docs/pages/AmmoPhysics.html](https://threejs.org/docs/pages/AmmoPhysics.html)  
22. How to Fake Godrays in Three.js (WebGPU \+ React) \- Wawa Sensei, fecha de acceso: diciembre 31, 2025, [https://wawasensei.dev/tuto/how-to-build-godrays](https://wawasensei.dev/tuto/how-to-build-godrays)  
23. Recreating a volumetric light effect \- Questions \- three.js forum, fecha de acceso: diciembre 31, 2025, [https://discourse.threejs.org/t/recreating-a-volumetric-light-effect/31387](https://discourse.threejs.org/t/recreating-a-volumetric-light-effect/31387)  
24. Volumetric Fog (God Rays) : r/GraphicsProgramming \- Reddit, fecha de acceso: diciembre 31, 2025, [https://www.reddit.com/r/GraphicsProgramming/comments/1aqj2dc/volumetric\_fog\_god\_rays/](https://www.reddit.com/r/GraphicsProgramming/comments/1aqj2dc/volumetric_fog_god_rays/)  
25. Volumetric fog makes a very beautiful god rays in two clicks. : r/godot \- Reddit, fecha de acceso: diciembre 31, 2025, [https://www.reddit.com/r/godot/comments/1htvcka/volumetric\_fog\_makes\_a\_very\_beautiful\_god\_rays\_in/](https://www.reddit.com/r/godot/comments/1htvcka/volumetric_fog_makes_a_very_beautiful_god_rays_in/)  
26. Bloom \- React Postprocessing, fecha de acceso: diciembre 31, 2025, [https://react-postprocessing.docs.pmnd.rs/effects/bloom](https://react-postprocessing.docs.pmnd.rs/effects/bloom)  
27. What does the threshold in unrealbloompass means and how to make a color just pass that threshold a bit? how to calculate the threshold for a color? \- three.js forum, fecha de acceso: diciembre 31, 2025, [https://discourse.threejs.org/t/what-does-the-threshold-in-unrealbloompass-means-and-how-to-make-a-color-just-pass-that-threshold-a-bit-how-to-calculate-the-threshold-for-a-color/60984](https://discourse.threejs.org/t/what-does-the-threshold-in-unrealbloompass-means-and-how-to-make-a-color-just-pass-that-threshold-a-bit-how-to-calculate-the-threshold-for-a-color/60984)  
28. OutlineEffect – three.js docs, fecha de acceso: diciembre 31, 2025, [https://threejs.org/docs/pages/OutlineEffect.html](https://threejs.org/docs/pages/OutlineEffect.html)