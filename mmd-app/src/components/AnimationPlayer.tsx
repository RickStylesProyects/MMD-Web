import { useStore } from '../store/useStore';
import './AnimationPlayer.css';

export function AnimationPlayer() {
  const { 
    animationState, 
    setPlaying, 
    setCurrentTime, 
    setPlaybackSpeed, 
    toggleLoop,
    resetAnimation,
    models,
    activeModelId
  } = useStore();
  
  const activeModel = models.find(m => m.id === activeModelId);
  const hasAnimation = activeModel?.motionUrl;
  
  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Handle timeline scrub
  const handleTimelineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
  };
  
  // Skip forward/backward
  const skip = (seconds: number) => {
    const newTime = Math.max(0, Math.min(animationState.duration, animationState.currentTime + seconds));
    setCurrentTime(newTime);
  };
  
  // Speed options
  const speeds = [0.25, 0.5, 1, 1.5, 2];
  
  if (!hasAnimation) {
    return null;
  }
  
  return (
    <div className="animation-player">
      {/* Timeline */}
      <div className="timeline-container">
        <input
          type="range"
          className="timeline"
          min={0}
          max={animationState.duration || 100}
          step={0.01}
          value={animationState.currentTime}
          onChange={handleTimelineChange}
        />
        <div className="time-display">
          <span>{formatTime(animationState.currentTime)}</span>
          <span>/</span>
          <span>{formatTime(animationState.duration)}</span>
        </div>
      </div>
      
      {/* Controls */}
      <div className="player-controls">
        {/* Left controls */}
        <div className="controls-group">
          <button 
            className="control-btn"
            onClick={() => setCurrentTime(0)}
            title="Al inicio"
          >
            ⏮
          </button>
          <button 
            className="control-btn"
            onClick={() => skip(-5)}
            title="Retroceder 5s"
          >
            ⏪
          </button>
          <button 
            className={`control-btn play-btn ${animationState.isPlaying ? 'playing' : ''}`}
            onClick={() => setPlaying(!animationState.isPlaying)}
            title={animationState.isPlaying ? 'Pausar' : 'Reproducir'}
          >
            {animationState.isPlaying ? '⏸' : '▶'}
          </button>
          <button 
            className="control-btn"
            onClick={() => skip(5)}
            title="Adelantar 5s"
          >
            ⏩
          </button>
          <button 
            className="control-btn"
            onClick={() => setCurrentTime(animationState.duration)}
            title="Al final"
          >
            ⏭
          </button>
        </div>
        
        {/* Right controls */}
        <div className="controls-group">
          <button 
            className={`control-btn ${animationState.loop ? 'active' : ''}`}
            onClick={toggleLoop}
            title="Loop"
          >
            🔁
          </button>
          
          <select 
            className="speed-select"
            value={animationState.playbackSpeed}
            onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
            title="Velocidad"
          >
            {speeds.map(speed => (
              <option key={speed} value={speed}>
                {speed}x
              </option>
            ))}
          </select>
          
          <button 
            className="control-btn"
            onClick={resetAnimation}
            title="Detener"
          >
            ⏹
          </button>
        </div>
      </div>
    </div>
  );
}
