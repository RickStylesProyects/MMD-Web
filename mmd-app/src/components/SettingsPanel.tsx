import { useState } from 'react';
import { useStore } from '../store/useStore';
import './SettingsPanel.css';

export function SettingsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'lighting' | 'shader' | 'post' | 'camera' | 'physics'>('lighting');
  
  const { 
    lightSettings, setLightSettings, 
    shaderSettings, setShaderSettings,
    postProcessingSettings, setPostProcessingSettings,
    atmosphericSettings, setAtmosphericSettings,
    physicsSettings, setPhysicsSettings,
    models, activeModelId, updateModelTransform 
  } = useStore();

  return (
    <div className={`settings-panel ${isOpen ? 'open' : ''}`}>
      <button 
        className="settings-toggle"
        onClick={() => setIsOpen(!isOpen)}
        title="Settings"
      >
        ⚙️
      </button>
      
      {isOpen && (
        <div className="settings-content">
          <h3>⚙️ Configuración</h3>
          
          {/* Tabs */}
          <div className="settings-tabs">
            <button 
              className={activeTab === 'lighting' ? 'active' : ''}
              onClick={() => setActiveTab('lighting')}
            >
              💡 Luz
            </button>
            <button 
              className={activeTab === 'shader' ? 'active' : ''}
              onClick={() => setActiveTab('shader')}
            >
              🎨 Shader
            </button>
            <button 
              className={activeTab === 'post' ? 'active' : ''}
              onClick={() => setActiveTab('post')}
            >
              ✨ Post
            </button>
            <button 
              className={activeTab === 'atmospheric' ? 'active' : ''}
              onClick={() => setActiveTab('atmospheric')}
            >
              🌫️ Atmósfera
            </button>
            <button 
              className={activeTab === 'camera' ? 'active' : ''}
              onClick={() => setActiveTab('camera')}
            >
              📷 Cámara
            </button>
            <button 
              className={activeTab === 'physics' ? 'active' : ''}
              onClick={() => setActiveTab('physics')}
            >
              ⚙️ Física
            </button>
          </div>
          
          {/* Lighting Tab */}
          {activeTab === 'lighting' && (
            <div className="settings-section">
              <h4>Key Light</h4>
              <div className="setting-row">
                <label>Intensidad</label>
                <input 
                  type="range" 
                  min="0" 
                  max="5" 
                  step="0.1"
                  value={lightSettings?.keyIntensity ?? 1.0}
                  onChange={(e) => setLightSettings({ keyIntensity: parseFloat(e.target.value) })}
                />
                <span>{(lightSettings?.keyIntensity ?? 1.0).toFixed(1)}</span>
              </div>
              <div className="setting-row">
                <label>Color</label>
                <input 
                  type="color" 
                  value={lightSettings?.keyColor ?? '#ffffff'}
                  onChange={(e) => setLightSettings({ keyColor: e.target.value })}
                />
              </div>
              
              <h4>Fill Light</h4>
              <div className="setting-row">
                <label>Intensidad</label>
                <input 
                  type="range" 
                  min="0" 
                  max="3" 
                  step="0.1"
                  value={lightSettings?.fillIntensity ?? 0.5}
                  onChange={(e) => setLightSettings({ fillIntensity: parseFloat(e.target.value) })}
                />
                <span>{(lightSettings?.fillIntensity ?? 0.5).toFixed(1)}</span>
              </div>
              <div className="setting-row">
                <label>Color</label>
                <input 
                  type="color" 
                  value={lightSettings?.fillColor ?? '#ffffff'}
                  onChange={(e) => setLightSettings({ fillColor: e.target.value })}
                />
              </div>
              
              <h4>Ambient</h4>
              <div className="setting-row">
                <label>Intensidad</label>
                <input 
                  type="range" 
                  min="0" 
                  max="3" 
                  step="0.1"
                  value={lightSettings?.ambientIntensity ?? 0.3}
                  onChange={(e) => setLightSettings({ ambientIntensity: parseFloat(e.target.value) })}
                />
                <span>{(lightSettings?.ambientIntensity ?? 0.3).toFixed(1)}</span>
              </div>
              <div className="setting-row">
                <label>Color</label>
                <input 
                  type="color" 
                  value={lightSettings?.ambientColor ?? '#ffffff'}
                  onChange={(e) => setLightSettings({ ambientColor: e.target.value })}
                />
              </div>
              
              <h4>Rim Light</h4>
              <div className="setting-row">
                <label>Intensidad</label>
                <input 
                  type="range" 
                  min="0" 
                  max="3" 
                  step="0.1"
                  value={lightSettings?.rimIntensity ?? 0.5}
                  onChange={(e) => setLightSettings({ rimIntensity: parseFloat(e.target.value) })}
                />
                <span>{(lightSettings?.rimIntensity ?? 0.5).toFixed(1)}</span>
              </div>
              
              <h4>☀️ Posición del Sol (Key Light)</h4>
              <div className="setting-row">
                <label>X (Horizontal)</label>
                <input 
                  type="range" 
                  min="-10" 
                  max="10" 
                  step="0.5"
                  value={lightSettings?.keyPosition?.[0] ?? 2}
                  onChange={(e) => setLightSettings({ 
                    keyPosition: [
                      parseFloat(e.target.value), 
                      lightSettings.keyPosition[1], 
                      lightSettings.keyPosition[2]
                    ] as [number, number, number]
                  })}
                />
                <span>{(lightSettings?.keyPosition?.[0] ?? 2).toFixed(1)}</span>
              </div>
              <div className="setting-row">
                <label>Y (Altura)</label>
                <input 
                  type="range" 
                  min="0" 
                  max="15" 
                  step="0.5"
                  value={lightSettings?.keyPosition?.[1] ?? 5}
                  onChange={(e) => setLightSettings({ 
                    keyPosition: [
                      lightSettings.keyPosition[0], 
                      parseFloat(e.target.value), 
                      lightSettings.keyPosition[2]
                    ] as [number, number, number]
                  })}
                />
                <span>{(lightSettings?.keyPosition?.[1] ?? 5).toFixed(1)}</span>
              </div>
              <div className="setting-row">
                <label>Z (Profundidad)</label>
                <input 
                  type="range" 
                  min="-15" 
                  max="5" 
                  step="0.5"
                  value={lightSettings?.keyPosition?.[2] ?? -8}
                  onChange={(e) => setLightSettings({ 
                    keyPosition: [
                      lightSettings.keyPosition[0], 
                      lightSettings.keyPosition[1], 
                      parseFloat(e.target.value)
                    ] as [number, number, number]
                  })}
                />
                <span>{(lightSettings?.keyPosition?.[2] ?? -8).toFixed(1)}</span>
              </div>
            </div>
          )}
          
          {/* Shader Tab */}
          {activeTab === 'shader' && (
            <div className="settings-section">
              <h4>Sombras</h4>
              <div className="setting-row">
                <label>Oscuridad</label>
                <input 
                  type="range" 
                  min="0" 
                  max="1.5" 
                  step="0.05"
                  value={shaderSettings?.shadowDarkness ?? 0.4}
                  onChange={(e) => setShaderSettings({ shadowDarkness: parseFloat(e.target.value) })}
                />
                <span>{(shaderSettings?.shadowDarkness ?? 0.4).toFixed(2)}</span>
              </div>
              <div className="setting-row">
                <label>Threshold</label>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05"
                  value={shaderSettings?.shadowThreshold ?? 0.5}
                  onChange={(e) => setShaderSettings({ shadowThreshold: parseFloat(e.target.value) })}
                />
                <span>{(shaderSettings?.shadowThreshold ?? 0.5).toFixed(2)}</span>
              </div>
              <div className="setting-row">
                <label>Suavidad</label>
                <input 
                  type="range" 
                  min="0" 
                  max="0.5" 
                  step="0.01"
                  value={shaderSettings?.shadowSoftness ?? 0.05}
                  onChange={(e) => setShaderSettings({ shadowSoftness: parseFloat(e.target.value) })}
                />
                <span>{(shaderSettings?.shadowSoftness ?? 0.05).toFixed(2)}</span>
              </div>
              
{/* 
              <h4>🎨 Gradient Ramps</h4>
              <div className="setting-row">
                <label>Usar Ramps</label>
                <input 
                  type="checkbox" 
                  checked={shaderSettings?.useGradientRamp ?? false}
                  onChange={(e) => setShaderSettings({ useGradientRamp: e.target.checked })}
                />
              </div>
              <div className="setting-row">
                <label style={{ fontSize: '0.8em', opacity: 0.7 }}>
                  ℹ️ Ramps: control artístico de sombras
                </label>
              </div> 
              */}
              
              <h4>✨ MatCap (Metales)</h4>
              <div className="setting-row">
                <label>Usar MatCap</label>
                <input 
                  type="checkbox" 
                  checked={shaderSettings?.useMatCap ?? false}
                  onChange={(e) => setShaderSettings({ useMatCap: e.target.checked })}
                />
              </div>
              <div className="setting-row">
                <label>Strength</label>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05"
                  value={shaderSettings?.matCapStrength ?? 0.5}
                  onChange={(e) => setShaderSettings({ matCapStrength: parseFloat(e.target.value) })}
                  disabled={!shaderSettings?.useMatCap}
                />
                <span>{(shaderSettings?.matCapStrength ?? 0.5).toFixed(2)}</span>
              </div>
              
              <h4>Efectos</h4>
              <div className="setting-row">
                <label>Rim Light</label>
                <input 
                  type="checkbox" 
                  checked={shaderSettings?.rimLightEnabled ?? true}
                  onChange={(e) => setShaderSettings({ rimLightEnabled: e.target.checked })}
                />
              </div>
              <div className="setting-row">
                <label>Rim Strength</label>
                <input 
                  type="range" 
                  min="0" 
                  max="3" 
                  step="0.1"
                  value={shaderSettings?.rimStrength ?? 0.5}
                  onChange={(e) => setShaderSettings({ rimStrength: parseFloat(e.target.value) })}
                  disabled={!(shaderSettings?.rimLightEnabled ?? true)}
                />
                <span>{(shaderSettings?.rimStrength ?? 0.5).toFixed(1)}</span>
              </div>

              <div className="setting-row">
                <label>Rim Power</label>
                <input 
                  type="range" 
                  min="0.1" 
                  max="10.0" 
                  step="0.1"
                  value={shaderSettings?.rimPower ?? 3.0}
                  onChange={(e) => setShaderSettings({ rimPower: parseFloat(e.target.value) })}
                  disabled={!(shaderSettings?.rimLightEnabled ?? true)}
                />
                <span>{(shaderSettings?.rimPower ?? 3.0).toFixed(1)}</span>
              </div>

              {/* PROFESSIONAL COLOR GRADING SECTIONS */}
              <div style={{ borderTop: '1px solid #444', marginTop: '15px', paddingTop: '10px' }}>
                <h4>🧴 Color Piel (G1)</h4>
              </div>
              
              <div className="setting-row">
                <label>Saturación</label>
                <input 
                  type="range" min="0" max="2" step="0.05"
                  value={shaderSettings?.skinSaturation ?? 1.0}
                  onChange={(e) => setShaderSettings({ skinSaturation: parseFloat(e.target.value) })}
                />
                <span>{(shaderSettings?.skinSaturation ?? 1.0).toFixed(2)}</span>
              </div>
              <div className="setting-row">
                <label>Temperatura</label>
                <input 
                  type="range" min="-1" max="1" step="0.05"
                  value={shaderSettings?.skinTemperature ?? 0}
                  onChange={(e) => setShaderSettings({ skinTemperature: parseFloat(e.target.value) })}
                />
                <span>{(shaderSettings?.skinTemperature ?? 0).toFixed(2)}</span>
              </div>
              <div className="setting-row">
                <label>Tinte</label>
                <input 
                  type="range" min="-1" max="1" step="0.05"
                  value={shaderSettings?.skinTint ?? 0}
                  onChange={(e) => setShaderSettings({ skinTint: parseFloat(e.target.value) })}
                />
                <span>{(shaderSettings?.skinTint ?? 0).toFixed(2)}</span>
              </div>
              <div className="setting-row">
                <label>Brillo (Exp)</label>
                <input 
                  type="range" min="0.5" max="2" step="0.05"
                  value={shaderSettings?.skinBrightness ?? 1.0}
                  onChange={(e) => setShaderSettings({ skinBrightness: parseFloat(e.target.value) })}
                />
                <span>{(shaderSettings?.skinBrightness ?? 1.0).toFixed(2)}</span>
              </div>

              <div style={{ borderTop: '1px solid #444', marginTop: '15px', paddingTop: '10px' }}>
                <h4>👗 Ropa y Pelo (G2)</h4>
              </div>
              
              <div className="setting-row">
                <label>Saturación</label>
                <input 
                  type="range" min="0" max="2" step="0.05"
                  value={shaderSettings?.clothingSaturation ?? 1.0}
                  onChange={(e) => setShaderSettings({ clothingSaturation: parseFloat(e.target.value) })}
                />
                <span>{(shaderSettings?.clothingSaturation ?? 1.0).toFixed(2)}</span>
              </div>
              <div className="setting-row">
                <label>Temperatura</label>
                <input 
                  type="range" min="-1" max="1" step="0.05"
                  value={shaderSettings?.clothingTemperature ?? 0}
                  onChange={(e) => setShaderSettings({ clothingTemperature: parseFloat(e.target.value) })}
                />
                <span>{(shaderSettings?.clothingTemperature ?? 0).toFixed(2)}</span>
              </div>
              <div className="setting-row">
                <label>Tinte</label>
                <input 
                  type="range" min="-1" max="1" step="0.05"
                  value={shaderSettings?.clothingTint ?? 0}
                  onChange={(e) => setShaderSettings({ clothingTint: parseFloat(e.target.value) })}
                />
                <span>{(shaderSettings?.clothingTint ?? 0).toFixed(2)}</span>
              </div>
              <div className="setting-row">
                <label>Brillo (Exp)</label>
                <input 
                  type="range" min="0.5" max="2" step="0.05"
                  value={shaderSettings?.clothingBrightness ?? 1.0}
                  onChange={(e) => setShaderSettings({ clothingBrightness: parseFloat(e.target.value) })}
                />
                <span>{(shaderSettings?.clothingBrightness ?? 1.0).toFixed(2)}</span>
              </div>

              <div className="setting-row">
                <label>Specular</label>
                <input 
                  type="checkbox" 
                  checked={shaderSettings?.specularEnabled ?? true}
                  onChange={(e) => setShaderSettings({ specularEnabled: e.target.checked })}
                />
              </div>
              <div className="setting-row">
                <label>Specular Strength</label>
                <input 
                  type="range" 
                  min="0" 
                  max="2" 
                  step="0.05"
                  value={shaderSettings?.specularStrength ?? 0.5}
                  onChange={(e) => setShaderSettings({ specularStrength: parseFloat(e.target.value) })}
                  disabled={!(shaderSettings?.specularEnabled ?? true)}
                />
                <span>{(shaderSettings?.specularStrength ?? 0.5).toFixed(2)}</span>
              </div>

              <div className="setting-row">
                <label>Outline</label>
                 <input 
                  type="checkbox" 
                  checked={shaderSettings?.outlineEnabled ?? true}
                  onChange={(e) => setShaderSettings({ outlineEnabled: e.target.checked })}
                />
              </div>
              <div className="setting-row">
                <label>Width</label>
                <input 
                  type="range" 
                  min={0.0}
                  max={0.5}
                  step={0.001}
                  value={shaderSettings?.outlineThickness ?? 0.02}
                  onChange={(e) => setShaderSettings({ outlineThickness: parseFloat(e.target.value) })}
                  disabled={!(shaderSettings?.outlineEnabled ?? true)}
                />
                <span>{(shaderSettings?.outlineThickness ?? 0.02).toFixed(3)}</span>
              </div>
            </div>
          )}
          

          {/* Atmospheric Effects Tab */}
          {activeTab === 'atmospheric' && (
            <div className="settings-section">
              <h4>🌤️ Godrays (Rayos Volumétricos)</h4>
              <div className="setting-row">
                <label>Activar</label>
                <input 
                  type="checkbox" 
                  checked={atmosphericSettings?.godraysEnabled ?? false}
                  onChange={(e) => setAtmosphericSettings({ godraysEnabled: e.target.checked })}
                />
              </div>
              <div className="setting-row">
                <label>Intensidad</label>
                <input 
                  type="range" 
                  min="0" 
                  max="2" 
                  step="0.1"
                  value={atmosphericSettings?.godraysIntensity ?? 0.5}
                  onChange={(e) => setAtmosphericSettings({ godraysIntensity: parseFloat(e.target.value) })}
                  disabled={!atmosphericSettings?.godraysEnabled}
                />
                <span>{(atmosphericSettings?.godraysIntensity ?? 0.5).toFixed(1)}</span>
              </div>
              <div className="setting-row">
                <label>Decay</label>
                <input 
                  type="range" 
                  min="0.5" 
                  max="1" 
                  step="0.01"
                  value={atmosphericSettings?.godraysDecay ?? 0.9}
                  onChange={(e) => setAtmosphericSettings({ godraysDecay: parseFloat(e.target.value) })}
                  disabled={!atmosphericSettings?.godraysEnabled}
                />
                <span>{(atmosphericSettings?.godraysDecay ?? 0.9).toFixed(2)}</span>
              </div>
              <div className="setting-row">
                <label>Densidad</label>
                <input 
                  type="range" 
                  min="0.8" 
                  max="1" 
                  step="0.01"
                  value={atmosphericSettings?.godraysDensity ?? 0.9}
                  onChange={(e) => setAtmosphericSettings({ godraysDensity: parseFloat(e.target.value) })}
                  disabled={!atmosphericSettings?.godraysEnabled}
                />
                <span>{(atmosphericSettings?.godraysDensity ?? 0.9).toFixed(2)}</span>
              </div>
              <div className="setting-row">
                <label>Color</label>
                <input 
                  type="color" 
                  value={atmosphericSettings?.godraysColor ?? '#ffffff'}
                  onChange={(e) => setAtmosphericSettings({ godraysColor: e.target.value })}
                  disabled={!atmosphericSettings?.godraysEnabled}
                />
              </div>
              
              <h4>🌫️ Height Fog (Niebla de Altura)</h4>
              <div className="setting-row">
                <label>Activar</label>
                <input 
                  type="checkbox" 
                  checked={atmosphericSettings?.heightFogEnabled ?? false}
                  onChange={(e) => setAtmosphericSettings({ heightFogEnabled: e.target.checked })}
                />
              </div>
              <div className="setting-row">
                <label>Color</label>
                <input 
                  type="color" 
                  value={atmosphericSettings?.heightFogColor ?? '#ffffff'}
                  onChange={(e) => setAtmosphericSettings({ heightFogColor: e.target.value })}
                  disabled={!atmosphericSettings?.heightFogEnabled}
                />
              </div>
              <div className="setting-row">
                <label>Densidad</label>
                <input 
                  type="range" 
                  min="0" 
                  max="0.1" 
                  step="0.005"
                  value={atmosphericSettings?.heightFogDensity ?? 0.02}
                  onChange={(e) => setAtmosphericSettings({ heightFogDensity: parseFloat (e.target.value) })}
                  disabled={!atmosphericSettings?.heightFogEnabled}
                />
                <span>{(atmosphericSettings?.heightFogDensity ?? 0.02).toFixed(3)}</span>
              </div>
              <div className="setting-row">
                <label>Altura Base</label>
                <input 
                  type="range" 
                  min="-20" 
                  max="10" 
                  step="0.5"
                  value={atmosphericSettings?.heightFogHeightBase ?? 0}
                  onChange={(e) => setAtmosphericSettings({ heightFogHeightBase: parseFloat(e.target.value) })}
                  disabled={!atmosphericSettings?.heightFogEnabled}
                />
                <span>{(atmosphericSettings?.heightFogHeightBase ?? 0).toFixed(1)}</span>
              </div>
            </div>
          )}

          {/* Post-Processing Tab */}
          {activeTab === 'post' && (
            <div className="settings-section">
              <h4>Bloom (Resplandor)</h4>
              <div className="setting-row">
                <label>Activar</label>
                <input 
                  type="checkbox" 
                  checked={postProcessingSettings.bloomEnabled}
                  onChange={(e) => setPostProcessingSettings({ bloomEnabled: e.target.checked })}
                />
              </div>
              <div className="setting-row">
                <label>Umbral (Threshold)</label>
                <input 
                  type="range" 
                  min="0" 
                  max="50" 
                  step="0.1"
                  value={postProcessingSettings.bloomThreshold}
                  onChange={(e) => setPostProcessingSettings({ bloomThreshold: parseFloat(e.target.value) })}
                />
                <span>{postProcessingSettings.bloomThreshold.toFixed(1)}</span>
              </div>
              <div className="setting-row">
                <label>Intensidad</label>
                <input 
                  type="range" 
                  min="0" 
                  max="5" 
                  step="0.1"
                  value={postProcessingSettings.bloomIntensity}
                  onChange={(e) => setPostProcessingSettings({ bloomIntensity: parseFloat(e.target.value) })}
                />
                <span>{postProcessingSettings.bloomIntensity.toFixed(1)}</span>
              </div>

               <h4>Tone Mapping</h4>
               <div className="setting-row">
                <label>Exposición</label>
                <input 
                  type="range" 
                  min="0" 
                  max="5" 
                  step="0.1"
                  value={postProcessingSettings.tonemappingExposure}
                  onChange={(e) => setPostProcessingSettings({ tonemappingExposure: parseFloat(e.target.value) })}
                />
                <span>{postProcessingSettings.tonemappingExposure.toFixed(1)}</span>
              </div>
              
              <h4>🎨 Color Grading (LUT)</h4>
              <div className="setting-row">
                <label>Activar LUT</label>
                <input 
                  type="checkbox" 
                  checked={postProcessingSettings.useLUT}
                  onChange={(e) => setPostProcessingSettings({ useLUT: e.target.checked })}
                />
              </div>
              <div className="setting-row">
                <label>Preset</label>
                <select
                  value={postProcessingSettings.lutPreset}
                  onChange={(e) => setPostProcessingSettings({ lutPreset: e.target.value as any })}
                  disabled={!postProcessingSettings.useLUT}
                  style={{ padding: '4px 8px', borderRadius: '4px', background: '#2a2a3e', color: '#fff', border: '1px solid #444' }}
                >
                  <option value="genshin">Genshin Impact</option>
                  <option value="honkai">Honkai Impact</option>
                  <option value="classicAnime">Classic Anime</option>
                  <option value="vibrant">Vibrant</option>
                  <option value="neutral">Neutral</option>
                </select>
              </div>
              <div className="setting-row">
                <label style={{ fontSize: '0.8em', opacity: 0.7 }}>
                  ℹ️ Genshin: sombras frías, luces cálidas
                </label>
              </div>
              {/* Note: LUT file upload would require additional implementation */}
            </div>
          )}
          
          {/* Camera Tab */}
          {activeTab === 'camera' && (
            <div className="settings-section">
              <p className="coming-soon">📷 Controles de cámara próximamente...</p>
            </div>
          )}
          
          {/* Physics Tab */}
          {activeTab === 'physics' && (
            <div className="settings-section">
              <h4>🌍 Mundo Físico</h4>
              <div className="setting-row">
                <label>
                  <input 
                    type="checkbox"
                    checked={physicsSettings?.enabled ?? true}
                    onChange={(e) => setPhysicsSettings({ enabled: e.target.checked })}
                  />
                  Activar Física
                </label>
              </div>
              
              <div className="setting-row">
                <label>Gravedad</label>
                <input 
                  type="range" 
                  min="-20" 
                  max="0" 
                  step="0.5"
                  value={physicsSettings?.gravity ?? -9.8}
                  onChange={(e) => setPhysicsSettings({ gravity: parseFloat(e.target.value) })}
                  disabled={!physicsSettings?.enabled}
                />
                <span>{(physicsSettings?.gravity ?? -9.8).toFixed(1)} m/s²</span>
              </div>
              
              <div className="setting-row">
                <label>Damping Global</label>
                <input 
                  type="range" 
                  min="0" 
                  max="0.1" 
                  step="0.001"
                  value={physicsSettings?.worldDamping ?? 0.01}
                  onChange={(e) => setPhysicsSettings({ worldDamping: parseFloat(e.target.value) })}
                  disabled={!physicsSettings?.enabled}
                />
                <span>{(physicsSettings?.worldDamping ?? 0.01).toFixed(3)}</span>
              </div>
              
              <h4>🎯 Cuerpos Rígidos</h4>
              <div className="setting-row">
                <label>Masa</label>
                <input 
                  type="range" 
                  min="0.1" 
                  max="5" 
                  step="0.1"
                  value={physicsSettings?.bodyMass ?? 1.0}
                  onChange={(e) => setPhysicsSettings({ bodyMass: parseFloat(e.target.value) })}
                  disabled={!physicsSettings?.enabled}
                />
                <span>{(physicsSettings?.bodyMass ?? 1.0).toFixed(1)}</span>
              </div>
              
              <div className="setting-row">
                <label>Damping (Resistencia)</label>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05"
                  value={physicsSettings?.bodyDamping ?? 0.8}
                  onChange={(e) => setPhysicsSettings({ bodyDamping: parseFloat(e.target.value) })}
                  disabled={!physicsSettings?.enabled}
                />
                <span>{(physicsSettings?.bodyDamping ?? 0.8).toFixed(2)}</span>
              </div>
              
              <div className="setting-row">
                <label>Fricción</label>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05"
                  value={physicsSettings?.bodyFriction ?? 0.5}
                  onChange={(e) => setPhysicsSettings({ bodyFriction: parseFloat(e.target.value) })}
                  disabled={!physicsSettings?.enabled}
                />
                <span>{(physicsSettings?.bodyFriction ?? 0.5).toFixed(2)}</span>
              </div>
              
              <h4>💥 Colisiones</h4>
              <div className="setting-row">
                <label>Margen de Colisión</label>
                <input 
                  type="range" 
                  min="0.001" 
                  max="0.05" 
                  step="0.001"
                  value={physicsSettings?.collisionMargin ?? 0.01}
                  onChange={(e) => setPhysicsSettings({ collisionMargin: parseFloat(e.target.value) })}
                  disabled={!physicsSettings?.enabled}
                />
                <span>{(physicsSettings?.collisionMargin ?? 0.01).toFixed(3)}</span>
              </div>
              
              <p className="setting-hint" style={{ fontSize: '0.8em', opacity: 0.7, marginTop: '5px' }}>
                ⚠️ Aumentar el margen de colisión ayuda a prevenir que el cabello/ropa atraviesen el cuerpo
              </p>
              
              <h4>🔗 Constraints (Joints)</h4>
              <div className="setting-row">
                <label>Rigidez</label>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05"
                  value={physicsSettings?.constraintStiffness ?? 0.8}
                  onChange={(e) => setPhysicsSettings({ constraintStiffness: parseFloat(e.target.value) })}
                  disabled={!physicsSettings?.enabled}
                />
                <span>{(physicsSettings?.constraintStiffness ?? 0.8).toFixed(2)}</span>
              </div>
              
              <div className="setting-row">
                <label>Damping de Joints</label>
                <input 
                  type="range" 
                  min="0" 
                  max="0.5" 
                  step="0.01"
                  value={physicsSettings?.constraintDamping ?? 0.1}
                  onChange={(e) => setPhysicsSettings({ constraintDamping: parseFloat(e.target.value) })}
                  disabled={!physicsSettings?.enabled}
                />
                <span>{(physicsSettings?.constraintDamping ?? 0.1).toFixed(2)}</span>
              </div>
              
              <button 
                className="reset-button"
                onClick={() => {
                  setPhysicsSettings({
                    gravity: -9.8,
                    bodyMass: 1.0,
                    bodyDamping: 0.8,
                    bodyFriction: 0.5,
                    collisionMargin: 0.01,
                    constraintStiffness: 0.8,
                    constraintDamping: 0.1,
                  });
                }}
                style={{
                  marginTop: '15px',
                  padding: '8px 16px',
                  background: '#3a3a5e',
                  border: '1px solid #555',
                  borderRadius: '6px',
                  color: '#fff',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                🔄 Restaurar Valores por Defecto
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
