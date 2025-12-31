import { useState } from 'react';
import { useStore } from '../store/useStore';
import './SettingsPanel.css';

export function SettingsPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'lighting' | 'shader' | 'camera'>('lighting');
  
  const { lightSettings, setLightSettings, shaderSettings, setShaderSettings } = useStore();

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
              className={activeTab === 'camera' ? 'active' : ''}
              onClick={() => setActiveTab('camera')}
            >
              📷 Cámara
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
                  max="3" 
                  step="0.1"
                  value={lightSettings.keyIntensity}
                  onChange={(e) => setLightSettings({ keyIntensity: parseFloat(e.target.value) })}
                />
                <span>{lightSettings.keyIntensity.toFixed(1)}</span>
              </div>
              <div className="setting-row">
                <label>Color</label>
                <input 
                  type="color" 
                  value={lightSettings.keyColor}
                  onChange={(e) => setLightSettings({ keyColor: e.target.value })}
                />
              </div>
              
              <h4>Fill Light</h4>
              <div className="setting-row">
                <label>Intensidad</label>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05"
                  value={lightSettings.fillIntensity}
                  onChange={(e) => setLightSettings({ fillIntensity: parseFloat(e.target.value) })}
                />
                <span>{lightSettings.fillIntensity.toFixed(2)}</span>
              </div>
              <div className="setting-row">
                <label>Color</label>
                <input 
                  type="color" 
                  value={lightSettings.fillColor}
                  onChange={(e) => setLightSettings({ fillColor: e.target.value })}
                />
              </div>
              
              <h4>Ambient</h4>
              <div className="setting-row">
                <label>Intensidad</label>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05"
                  value={lightSettings.ambientIntensity}
                  onChange={(e) => setLightSettings({ ambientIntensity: parseFloat(e.target.value) })}
                />
                <span>{lightSettings.ambientIntensity.toFixed(2)}</span>
              </div>
              <div className="setting-row">
                <label>Color</label>
                <input 
                  type="color" 
                  value={lightSettings.ambientColor}
                  onChange={(e) => setLightSettings({ ambientColor: e.target.value })}
                />
              </div>
              
              <h4>Rim Light</h4>
              <div className="setting-row">
                <label>Intensidad</label>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05"
                  value={lightSettings.rimIntensity}
                  onChange={(e) => setLightSettings({ rimIntensity: parseFloat(e.target.value) })}
                />
                <span>{lightSettings.rimIntensity.toFixed(2)}</span>
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
                  max="1" 
                  step="0.05"
                  value={shaderSettings.shadowDarkness}
                  onChange={(e) => setShaderSettings({ shadowDarkness: parseFloat(e.target.value) })}
                />
                <span>{shaderSettings.shadowDarkness.toFixed(2)}</span>
              </div>
              <div className="setting-row">
                <label>Threshold</label>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05"
                  value={shaderSettings.shadowThreshold}
                  onChange={(e) => setShaderSettings({ shadowThreshold: parseFloat(e.target.value) })}
                />
                <span>{shaderSettings.shadowThreshold.toFixed(2)}</span>
              </div>
              <div className="setting-row">
                <label>Suavidad</label>
                <input 
                  type="range" 
                  min="0" 
                  max="0.3" 
                  step="0.01"
                  value={shaderSettings.shadowSoftness}
                  onChange={(e) => setShaderSettings({ shadowSoftness: parseFloat(e.target.value) })}
                />
                <span>{shaderSettings.shadowSoftness.toFixed(2)}</span>
              </div>
              
              <h4>Efectos</h4>
              <div className="setting-row">
                <label>Rim Strength</label>
                <input 
                  type="range" 
                  min="0" 
                  max="2" 
                  step="0.1"
                  value={shaderSettings.rimStrength}
                  onChange={(e) => setShaderSettings({ rimStrength: parseFloat(e.target.value) })}
                />
                <span>{shaderSettings.rimStrength.toFixed(1)}</span>
              </div>
              <div className="setting-row">
                <label>Specular</label>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05"
                  value={shaderSettings.specularStrength}
                  onChange={(e) => setShaderSettings({ specularStrength: parseFloat(e.target.value) })}
                />
                <span>{shaderSettings.specularStrength.toFixed(2)}</span>
              </div>
              <div className="setting-row">
                <label>Outline</label>
                <input 
                  type="range" 
                  min="0" 
                  max="0.1" 
                  step="0.005"
                  value={shaderSettings.outlineThickness}
                  onChange={(e) => setShaderSettings({ outlineThickness: parseFloat(e.target.value) })}
                />
                <span>{shaderSettings.outlineThickness.toFixed(3)}</span>
              </div>
            </div>
          )}
          
          {/* Camera Tab */}
          {activeTab === 'camera' && (
            <div className="settings-section">
              <p className="coming-soon">📷 Controles de cámara próximamente...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
