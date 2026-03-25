import React, { useEffect } from 'react';
import { Platform, View, StyleSheet } from 'react-native';

// iPhone 16 Pro logical dimensions (393 x 852 points)
const PHONE_WIDTH = 393;
const PHONE_HEIGHT = 852;
const BEZEL = 10;
const RADIUS = 55; // iPhone 16 Pro corner radius

// Scale factor so the phone looks like a real-size phone on a desktop screen
// iPhone 16 Pro is ~71.5mm wide ≈ ~290px at 96 DPI
const SCALE = 0.72;

/**
 * Web: wraps the entire app in a realistic iPhone 16 Pro frame, scaled to
 * real-world proportions, centered on a dark background.
 * Native: transparent pass-through.
 */
export function DeviceFrame({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }
  return <WebFrame>{children}</WebFrame>;
}

function WebFrame({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const id = 'device-frame-global-css';
    if (document.getElementById(id)) return;

    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      html, body, #root {
        margin: 0;
        padding: 0;
        height: 100%;
        background-color: #0c0c10 !important;
        overflow: hidden;
      }
      #root {
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      #root::before {
        content: '';
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 500px;
        height: 800px;
        background: radial-gradient(ellipse, rgba(55,68,200,0.06) 0%, transparent 70%);
        pointer-events: none;
        z-index: 0;
      }
    `;
    document.head.appendChild(style);
    return () => {
      const el = document.getElementById(id);
      if (el) el.remove();
    };
  }, []);

  const totalW = PHONE_WIDTH + BEZEL * 2;
  const totalH = PHONE_HEIGHT + BEZEL * 2;

  return (
    // Outer wrapper: has the VISUAL dimensions so flex centering works correctly.
    // Without this, transform:scale reduces visual size but layout remains full-size,
    // causing the phone to overflow smaller viewports.
    <View style={{ width: totalW * SCALE, height: totalH * SCALE, alignSelf: 'center' }}>
      <View
        style={[
          styles.phoneBody,
          {
            width: totalW,
            height: totalH,
            transform: [{ scale: SCALE }],
            transformOrigin: '0 0',
          } as any,
        ]}
      >
      {/* Dynamic Island */}
      <View style={[styles.dynamicIsland, { left: totalW / 2 - 62 }]} />

      {/* Screen */}
      <View style={styles.screen}>{children}</View>

      {/* Home indicator */}
      <View style={[styles.homeBar, { left: totalW / 2 - 67 }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  phoneBody: {
    backgroundColor: '#1c1c1f',
    borderRadius: RADIUS,
    padding: BEZEL,
    position: 'relative',
    zIndex: 1,
    ...Platform.select({
      web: {
        // Use box-shadow for the border so it doesn't eat into layout space.
        // The 1.5px outset ring replaces borderWidth/borderColor.
        boxShadow:
          '0 0 0 1.5px #303035, 0 30px 80px rgba(0,0,0,0.55), 0 0 0 0.5px rgba(255,255,255,0.06) inset',
      } as any,
    }),
  },
  screen: {
    flex: 1,
    // Top corners match the phone shell; bottom corners are tighter so the
    // tab bar's white background isn't clipped by large rounded corners.
    borderTopLeftRadius: RADIUS - BEZEL,
    borderTopRightRadius: RADIUS - BEZEL,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  dynamicIsland: {
    position: 'absolute',
    top: BEZEL + 11,
    width: 124,
    height: 36,
    backgroundColor: '#000',
    borderRadius: 20,
    zIndex: 200,
  },
  homeBar: {
    position: 'absolute',
    bottom: BEZEL + 8,
    width: 134,
    height: 5,
    backgroundColor: '#ffffff',
    borderRadius: 3,
    opacity: 0.2,
    zIndex: 200,
  },
});
