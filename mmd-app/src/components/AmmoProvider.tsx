import React, { createContext, useContext, useEffect, useState } from 'react';

interface AmmoState {
  isLoaded: boolean;
  error: string | null;
  hasPhysics: boolean;
}

const AmmoContext = createContext<AmmoState>({
  isLoaded: false,
  error: null,
  hasPhysics: false
});

export const useAmmo = () => useContext(AmmoContext);

export function AmmoProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AmmoState>({
    isLoaded: false,
    error: null,
    hasPhysics: false
  });

  useEffect(() => {
    let isMounted = true;

    const initAmmo = async () => {
      // Check if already loaded and initialized
      // @ts-ignore
      if (window.Ammo && typeof window.Ammo !== 'function') {
        console.log("✅ Ammo.js already initialized");
        if (isMounted) {
          setState({ isLoaded: true, error: null, hasPhysics: true });
        }
        return;
      }

      try {
        // Dynamic import of the npm package
        const AmmoModule = await import('ammo.js');
        const Ammo = AmmoModule.default || AmmoModule;
        
        if (typeof Ammo === 'function') {
          // Initialize Ammo and store on window for MMDPhysics
          // @ts-ignore
          const ammoInstance = await Ammo();
          // @ts-ignore
          window.Ammo = ammoInstance;
          console.log("✅ Ammo.js loaded and initialized from npm");
          
          if (isMounted) {
            setState({ isLoaded: true, error: null, hasPhysics: true });
          }
        } else if (Ammo) {
          // Already an object
          // @ts-ignore
          window.Ammo = Ammo;
          console.log("✅ Ammo.js loaded from npm (pre-initialized)");
          
          if (isMounted) {
            setState({ isLoaded: true, error: null, hasPhysics: true });
          }
        } else {
          throw new Error("Ammo module is empty");
        }
      } catch (error) {
        console.warn("⚠️ Failed to load Ammo.js from npm:", error);
        console.log("Continuing without physics.");
        
        if (isMounted) {
          setState({ 
            isLoaded: true, 
            error: `Failed to load physics: ${error}`, 
            hasPhysics: false 
          });
        }
      }
    };

    initAmmo();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!state.isLoaded) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black text-white z-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading Physics Engine...</p>
          <p className="text-xs text-gray-500 mt-2">This may take a few seconds</p>
        </div>
      </div>
    );
  }

  return (
    <AmmoContext.Provider value={state}>
      {state.error && !state.hasPhysics && (
        <div className="absolute top-4 right-4 z-50 bg-yellow-900/80 text-yellow-200 px-4 py-2 rounded-lg text-sm max-w-xs">
          ⚠️ Physics disabled: {state.error}
        </div>
      )}
      {children}
    </AmmoContext.Provider>
  );
}
