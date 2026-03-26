/**
 * Utility functions for triggering device haptic feedback using the Web Vibration API.
 * Safely falls back if the API is unsupported or disabled.
 */

export const triggerHaptic = (pattern: number | number[]) => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        try {
            window.navigator.vibrate(pattern)
        } catch (e) {
            // Ignore errors (e.g., user hasn't interacted with document yet)
        }
    }
}

// Light tap for basic interactions (buttons, tabs, small actions)
export const vibrateLight = () => triggerHaptic(15)

// Medium tap for important actions (logging pages, starting timer)
export const vibrateMedium = () => triggerHaptic(40)

// Success pattern (e.g., finishing a book, unlocking achievement, leveled up)
export const vibrateSuccess = () => triggerHaptic([30, 60, 40])

// Error pattern 
export const vibrateError = () => triggerHaptic([50, 100, 50, 100, 50])
