// Theme Loader - Apply saved theme immediately on page load
// This script should be loaded early to prevent flash of unstyled content

(function() {
    // Apply saved theme immediately
    function applySavedTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);

        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');

            // Force dark theme on any white elements
            setTimeout(() => {
                forceThemeOnElements();
            }, 100);
        } else {
            document.body.classList.remove('dark-theme');
        }

        console.log(`Applied saved theme: ${savedTheme}`);
    }

    // Force dark theme on elements that might have white backgrounds
    function forceThemeOnElements() {
        const currentTheme = localStorage.getItem('theme');
        if (currentTheme !== 'dark') return;

        // Find all elements with white backgrounds
        const allElements = document.querySelectorAll('*');
        allElements.forEach(element => {
            const computedStyle = window.getComputedStyle(element);
            const bgColor = computedStyle.backgroundColor;

            // Check for white backgrounds
            if (bgColor === 'rgb(255, 255, 255)' || bgColor === 'white' || bgColor === '#fff' || bgColor === '#ffffff') {
                element.style.backgroundColor = '#2d3748';
                element.style.color = '#e2e8f0';
            }

            // Check for black text
            const textColor = computedStyle.color;
            if (textColor === 'rgb(0, 0, 0)' || textColor === 'black' || textColor === '#000' || textColor === '#000000') {
                element.style.color = '#e2e8f0';
            }
        });
    }

    // Apply theme as soon as possible
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applySavedTheme);
    } else {
        applySavedTheme();
    }

    // Also apply on page show (for back/forward navigation)
    window.addEventListener('pageshow', applySavedTheme);

    // Watch for dynamically added elements
    if (typeof MutationObserver !== 'undefined') {
        const observer = new MutationObserver((mutations) => {
            const currentTheme = localStorage.getItem('theme');
            if (currentTheme === 'dark') {
                setTimeout(forceThemeOnElements, 50);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
})();
