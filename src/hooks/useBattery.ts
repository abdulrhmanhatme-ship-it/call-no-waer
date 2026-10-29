import { useState, useEffect } from 'react';

interface BatteryState {
  level: number; // 0.0 to 1.0
  charging: boolean;
  supported: boolean;
}

export function useBattery(): BatteryState {
  const [battery, setBattery] = useState<BatteryState>({
    level: 1.0,
    charging: false,
    supported: false,
  });

  useEffect(() => {
    let batteryManager: any = null;

    const updateBattery = () => {
      if (batteryManager) {
        setBattery({
          level: batteryManager.level,
          charging: batteryManager.charging,
          supported: true,
        });
      }
    };

    if ('getBattery' in navigator) {
      (navigator as any)
        .getBattery()
        .then((bm: any) => {
          batteryManager = bm;
          updateBattery();
          bm.addEventListener('levelchange', updateBattery);
          bm.addEventListener('chargingchange', updateBattery);
        })
        .catch(() => {
          // Battery API not available or blocked by permissions
        });
    }

    return () => {
      if (batteryManager) {
        batteryManager.removeEventListener('levelchange', updateBattery);
        batteryManager.removeEventListener('chargingchange', updateBattery);
      }
    };
  }, []);

  return battery;
}
