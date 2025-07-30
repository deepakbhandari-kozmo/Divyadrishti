// Aggressive Translation System - Translates EVERYTHING
console.log('🌐 Loading Aggressive Translator...');

// Comprehensive translation dictionary
const aggressiveTranslations = {
    // Navigation & UI
    'Login': 'लॉगिन',
    'Register': 'पंजीकरण',
    'English': 'अंग्रेजी',
    'हिंदी': 'हिंदी',
    'Dashboard': 'डैशबोर्ड',
    'Profile': 'प्रोफ़ाइल',
    'Logout': 'लॉगआउट',
    
    // Headers and titles
    'Drone Application & Research Center': 'ड्रोन अनुप्रयोग और अनुसंधान केंद्र',
    'Uttarakhand Space Application Center': 'उत्तराखंड अंतरिक्ष अनुप्रयोग केंद्र',
    'Drone Maps': 'ड्रोन मैप्स',
    'Clear Quality Maps': 'स्पष्ट गुणवत्ता मानचित्र',
    'Create Account': 'खाता बनाएं',
    'Join the Drone Mapping Community': 'ड्रोन मैपिंग समुदाय में शामिल हों',
    
    // Form labels
    'Full Name': 'पूरा नाम',
    'Username': 'उपयोगकर्ता नाम',
    'Username/Email': 'उपयोगकर्ता नाम/ईमेल',
    'Email Address': 'ईमेल पता',
    'Password': 'पासवर्ड',
    'Confirm Password': 'पासवर्ड की पुष्टि करें',
    'Phone Number': 'फोन नंबर',
    'Organization': 'संगठन',
    'Security Code': 'सुरक्षा कोड',
    
    // Placeholders
    'Enter your full name': 'अपना पूरा नाम दर्ज करें',
    'Choose a username': 'उपयोगकर्ता नाम चुनें',
    'Enter your email address': 'अपना ईमेल पता दर्ज करें',
    'Enter username or email': 'उपयोगकर्ता नाम या ईमेल दर्ज करें',
    'Enter password': 'पासवर्ड दर्ज करें',
    'Create a password': 'पासवर्ड बनाएं',
    'Confirm your password': 'अपना पासवर्ड पुष्टि करें',
    'Enter the code above': 'ऊपर दिया गया कोड दर्ज करें',
    'Your organization (optional)': 'आपका संगठन (वैकल्पिक)',
    'Your phone number (optional)': 'आपका फोन नंबर (वैकल्पिक)',
    
    // Buttons and actions
    'Save': 'सहेजें',
    'Cancel': 'रद्द करें',
    'Update': 'अपडेट',
    'Delete': 'हटाएं',
    'Edit': 'संपादित करें',
    'Submit': 'जमा करें',
    'Reset': 'रीसेट',
    
    // Links and navigation
    "Don't have an account?": 'खाता नहीं है?',
    'Register here': 'यहाँ पंजीकरण करें',
    'Already have an account?': 'पहले से खाता है?',
    'Sign in here': 'यहाँ साइन इन करें',
    
    // Legal and policy
    'I agree to the': 'मैं सहमत हूं',
    'Terms of Service': 'सेवा की शर्तें',
    'and': 'और',
    'Privacy Policy': 'गोपनीयता नीति',
    'I agree to the Terms of Service and Privacy Policy': 'मैं सेवा की शर्तों और गोपनीयता नीति से सहमत हूं',
    
    // Messages and notifications
    'Note: New registrations require admin approval': 'नोट: नए पंजीकरण के लिए व्यवस्थापक की अनुमति आवश्यक है',
    'Account registration requires admin approval. You will be notified once your account is approved.': 'खाता पंजीकरण के लिए व्यवस्थापक की अनुमति आवश्यक है। आपके खाते की अनुमति मिलने पर आपको सूचित किया जाएगा।',
    
    // Profile page
    'Personal Info': 'व्यक्तिगत जानकारी',
    'Security': 'सुरक्षा',
    'App Settings': 'ऐप सेटिंग्स',
    'Activity Log': 'गतिविधि लॉग',
    'Personal Information': 'व्यक्तिगत जानकारी',
    'Account Status': 'खाता स्थिति',
    'Role': 'भूमिका',
    'Member Since': 'सदस्य बनने की तारीख',
    'Last Login': 'अंतिम लॉगिन',
    'Never': 'कभी नहीं',
    
    // Status and states
    'Active': 'सक्रिय',
    'Inactive': 'निष्क्रिय',
    'Pending': 'लंबित',
    'Approved': 'अनुमोदित',
    'Suspended': 'निलंबित',
    'Admin': 'व्यवस्थापक',
    'User': 'उपयोगकर्ता',
    'Analyst': 'विश्लेषक',

    // Map and navigation
    'Map View': 'मानचित्र दृश्य',
    'Projects': 'परियोजनाएं',
    'Select Base Map': 'आधार मानचित्र चुनें',
    'Base Map:': 'आधार मानचित्र:',
    'Base Map': 'आधार मानचित्र',
    'OpenStreetMap': 'ओपनस्ट्रीटमैप',
    'Welcome, admin': 'स्वागत, व्यवस्थापक',
    'Welcome': 'स्वागत',
    'admin': 'व्यवस्थापक',

    // Search functionality
    'Search Project': 'परियोजना खोजें',
    'No projects found for': 'के लिए कोई परियोजना नहीं मिली',
    'Try a different search term': 'एक अलग खोज शब्द आज़माएं',

    // Additional translations for login/register
    "Don't have an account?": 'खाता नहीं है?',
    'Register here': 'यहाँ पंजीकरण करें',
    'Note: New registrations require admin approval': 'नोट: नए पंजीकरण के लिए व्यवस्थापक की अनुमति आवश्यक है',
    'Already have an account?': 'पहले से खाता है?',
    'Login here': 'यहाँ लॉगिन करें',

    // Dynamic project names - basic fallback translations
    // Note: These will be supplemented by dynamic translation API
};

// Current language state
let currentLang = localStorage.getItem('language') || 'en';

// Store original content
const originalTexts = new WeakMap();

// Dynamic translation cache
const dynamicTranslationCache = new Map();

// Simple translation rules for dynamic content
const translationRules = {
    // Common English words to Hindi
    'test': 'परीक्षण',
    'new': 'नया',
    'project': 'परियोजना',
    'data': 'डेटा',
    'map': 'मानचित्र',
    'survey': 'सर्वेक्षण',
    'area': 'क्षेत्र',
    'zone': 'क्षेत्र',
    'region': 'क्षेत्र',
    'district': 'जिला',
    'village': 'गांव',
    'city': 'शहर',
    'town': 'कस्बा',
    'river': 'नदी',
    'mountain': 'पर्वत',
    'forest': 'वन',
    'road': 'सड़क',
    'bridge': 'पुल',
    'dam': 'बांध',
    'lake': 'झील',
    'valley': 'घाटी',
    'hill': 'पहाड़ी',
    'colony': 'कॉलोनी',
    'block': 'ब्लॉक',
    'sector': 'सेक्टर',
    'phase': 'चरण',
    'development': 'विकास',
    'construction': 'निर्माण',
    'infrastructure': 'अवसंरचना',
    'residential': 'आवासीय',
    'commercial': 'व्यावसायिक',
    'industrial': 'औद्योगिक',
    'agricultural': 'कृषि',
    'boundary': 'सीमा',
    'border': 'सीमा',
    'limit': 'सीमा'
};

// Dynamic translation function with multiple strategies
function translateText(text) {
    if (!text || typeof text !== 'string') return text;

    const trimmedText = text.trim();
    if (!trimmedText) return text;

    // Check cache first
    if (dynamicTranslationCache.has(trimmedText.toLowerCase())) {
        return dynamicTranslationCache.get(trimmedText.toLowerCase());
    }

    // Strategy 1: Direct lookup in static dictionary
    if (aggressiveTranslations[trimmedText]) {
        return aggressiveTranslations[trimmedText];
    }

    // Strategy 2: Case-insensitive lookup in static dictionary
    for (const [key, value] of Object.entries(aggressiveTranslations)) {
        if (key.toLowerCase() === trimmedText.toLowerCase()) {
            return value;
        }
    }

    // Strategy 3: Dynamic word-by-word translation
    const dynamicTranslation = translateDynamically(trimmedText);
    if (dynamicTranslation !== trimmedText) {
        // Cache the result
        dynamicTranslationCache.set(trimmedText.toLowerCase(), dynamicTranslation);
        return dynamicTranslation;
    }

    // Strategy 4: Partial word matching (fallback)
    for (const [key, value] of Object.entries(aggressiveTranslations)) {
        if (trimmedText.includes(key) || key.includes(trimmedText)) {
            return value;
        }
    }

    return text;
}

// Dynamic translation using word rules and patterns
function translateDynamically(text) {
    const originalText = text;
    let translatedText = text;

    // Convert to lowercase for processing
    const lowerText = text.toLowerCase();

    // Strategy 1: Direct word lookup
    if (translationRules[lowerText]) {
        return translationRules[lowerText];
    }

    // Strategy 2: Word-by-word translation for compound terms
    const words = lowerText.split(/[\s_-]+/);
    if (words.length > 1) {
        const translatedWords = words.map(word => {
            // Remove numbers and special characters for translation
            const cleanWord = word.replace(/[0-9]/g, '').replace(/[^a-zA-Z]/g, '');
            if (cleanWord && translationRules[cleanWord]) {
                return translationRules[cleanWord];
            }
            return word; // Keep original if no translation found
        });

        // If any words were translated, return the result
        const result = translatedWords.join(' ');
        if (result !== lowerText) {
            return result;
        }
    }

    // Strategy 3: Pattern-based translation
    // Handle common patterns like "Name_Year", "Place_Type", etc.
    if (lowerText.includes('_')) {
        const parts = lowerText.split('_');
        const translatedParts = parts.map(part => {
            const cleanPart = part.replace(/[0-9]/g, '').replace(/[^a-zA-Z]/g, '');
            if (cleanPart && translationRules[cleanPart]) {
                return translationRules[cleanPart] + (part.match(/[0-9]+/) ? ' ' + part.match(/[0-9]+/)[0] : '');
            }
            return part;
        });

        const result = translatedParts.join(' ');
        if (result !== lowerText) {
            return result;
        }
    }

    // Strategy 4: Partial matching for known words
    for (const [englishWord, hindiWord] of Object.entries(translationRules)) {
        if (lowerText.includes(englishWord)) {
            translatedText = translatedText.replace(new RegExp(englishWord, 'gi'), hindiWord);
        }
    }

    return translatedText;
}

// Handle data-i18n attributes
function handleDataI18nAttributes() {
    console.log('🔄 Processing data-i18n attributes...');

    // Define i18n translations
    const i18nTranslations = {
        'appTitle': 'ड्रोन अनुप्रयोग और अनुसंधान केंद्र',
        'subTitle': 'उत्तराखंड अंतरिक्ष अनुप्रयोग केंद्र',
        'mapView': 'मानचित्र दृश्य',
        'dashboard': 'डैशबोर्ड',
        'profile': 'प्रोफ़ाइल',
        'welcome': 'स्वागत',
        'logout': 'लॉगआउट',
        'selectBaseMap': 'आधार मानचित्र चुनें',
        'geoserverProjects': 'परियोजनाएं',
        'searchPlaceholder': 'स्थान खोजें',
        'searchProject': 'परियोजना खोजें'
    };

    let translatedCount = 0;

    // Handle data-i18n attributes
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const translation = i18nTranslations[key];

        if (translation) {
            // Store original if not already stored
            if (!element.hasAttribute('data-original-text')) {
                element.setAttribute('data-original-text', element.textContent);
            }
            element.textContent = translation;
            translatedCount++;
        }
    });

    // Handle data-i18n-placeholder attributes
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        const translation = i18nTranslations[key];

        if (translation) {
            // Store original if not already stored
            if (!element.hasAttribute('data-original-placeholder')) {
                element.setAttribute('data-original-placeholder', element.placeholder);
            }
            element.placeholder = translation;
            translatedCount++;
        }
    });

    console.log(`✅ Processed ${translatedCount} data-i18n elements`);
}

// Restore data-i18n elements
function restoreDataI18nElements() {
    console.log('🔄 Restoring data-i18n elements...');

    let restoredCount = 0;

    // Restore data-i18n elements
    document.querySelectorAll('[data-i18n]').forEach(element => {
        if (element.hasAttribute('data-original-text')) {
            element.textContent = element.getAttribute('data-original-text');
            element.removeAttribute('data-original-text');
            restoredCount++;
        }
    });

    // Restore data-i18n-placeholder elements
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        if (element.hasAttribute('data-original-placeholder')) {
            element.placeholder = element.getAttribute('data-original-placeholder');
            element.removeAttribute('data-original-placeholder');
            restoredCount++;
        }
    });

    console.log(`✅ Restored ${restoredCount} data-i18n elements`);
}

// Handle buttons and links with icons
function handleButtonWithIcon(element) {
    // Find text nodes that are not inside icon elements
    const textNodes = [];

    function findTextNodes(node) {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
            // Check if this text node is not inside an icon
            let parent = node.parentElement;
            let isInsideIcon = false;
            while (parent && parent !== element) {
                if (parent.tagName === 'I' && parent.classList.contains('fas')) {
                    isInsideIcon = true;
                    break;
                }
                parent = parent.parentElement;
            }
            if (!isInsideIcon) {
                textNodes.push(node);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            // Don't traverse into icon elements
            if (!(node.tagName === 'I' && node.classList.contains('fas'))) {
                node.childNodes.forEach(findTextNodes);
            }
        }
    }

    element.childNodes.forEach(findTextNodes);

    // Translate only the text nodes (not the icons)
    textNodes.forEach((textNode, index) => {
        const originalText = textNode.textContent.trim();
        if (originalText.length > 1) {
            const translation = translateText(originalText);

            if (translation !== originalText) {
                // Store original
                const dataAttr = `data-original-button-text-${index}`;
                if (!element.hasAttribute(dataAttr)) {
                    element.setAttribute(dataAttr, originalText);
                }
                textNode.textContent = ` ${translation}`;
                console.log(`✅ Translated button text: "${originalText}" → "${translation}"`);
            }
        }
    });
}

// Restore buttons with icons
function restoreButtonsWithIcons() {
    document.querySelectorAll('button, a').forEach(element => {
        const buttonTextAttrs = Array.from(element.attributes).filter(attr =>
            attr.name.startsWith('data-original-button-text-')
        );

        if (buttonTextAttrs.length > 0) {
            // Find text nodes again
            const textNodes = [];

            function findTextNodes(node) {
                if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                    let parent = node.parentElement;
                    let isInsideIcon = false;
                    while (parent && parent !== element) {
                        if (parent.tagName === 'I' && parent.classList.contains('fas')) {
                            isInsideIcon = true;
                            break;
                        }
                        parent = parent.parentElement;
                    }
                    if (!isInsideIcon) {
                        textNodes.push(node);
                    }
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    if (!(node.tagName === 'I' && node.classList.contains('fas'))) {
                        node.childNodes.forEach(findTextNodes);
                    }
                }
            }

            element.childNodes.forEach(findTextNodes);

            // Restore text nodes
            buttonTextAttrs.forEach((attr, index) => {
                const originalText = attr.value;
                if (textNodes[index]) {
                    textNodes[index].textContent = ` ${originalText}`;
                }
                element.removeAttribute(attr.name);
            });
        }
    });
}

// Aggressive translation - hits everything
function aggressiveTranslate() {
    console.log('🔄 Starting aggressive translation...');

    // First handle data-i18n attributes
    handleDataI18nAttributes();

    // Get ALL elements
    const allElements = document.querySelectorAll('*');
    let translatedCount = 0;

    allElements.forEach(element => {
        // Skip script and style
        if (element.tagName === 'SCRIPT' || element.tagName === 'STYLE') return;

        // Skip elements marked as non-translatable
        if (element.hasAttribute('data-no-translate')) return;

        // Skip notification elements
        if (element.classList.contains('language-notification')) return;

        // Special handling for buttons and links with icons
        if ((element.tagName === 'BUTTON' || element.tagName === 'A') && element.querySelector('i.fas')) {
            handleButtonWithIcon(element);
            return;
        }

        // Method 1: Translate text content if element has only text (no child elements)
        if (element.children.length === 0 && element.textContent.trim()) {
            const originalText = element.textContent.trim();

            // Skip if this looks like it contains icons or special characters
            if (originalText.includes('fas fa-') || originalText.includes('➡️') || originalText.includes('👤')) {
                return;
            }

            const translation = translateText(originalText);

            if (translation !== originalText) {
                // Store original in data attribute
                if (!element.hasAttribute('data-original-text')) {
                    element.setAttribute('data-original-text', originalText);
                }
                element.textContent = translation;
                translatedCount++;
                console.log(`✅ Translated: "${originalText}" → "${translation}"`);
            }
        }

        // Method 2: Handle text nodes within elements that have children (like buttons with icons)
        if (element.childNodes.length > 0) {
            element.childNodes.forEach(node => {
                if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                    const originalText = node.textContent.trim();

                    // Skip whitespace-only nodes or nodes that are just spaces
                    if (originalText.length < 2) return;

                    const translation = translateText(originalText);

                    if (translation !== originalText) {
                        // Store original in a unique data attribute for this specific text node
                        const parentElement = node.parentElement;
                        if (parentElement) {
                            const nodeIndex = Array.from(parentElement.childNodes).indexOf(node);
                            const dataAttr = `data-original-text-node-${nodeIndex}`;
                            if (!parentElement.hasAttribute(dataAttr)) {
                                parentElement.setAttribute(dataAttr, originalText);
                            }
                        }
                        node.textContent = ` ${translation}`;
                        translatedCount++;
                        console.log(`✅ Translated text node: "${originalText}" → "${translation}"`);
                    }
                }
            });
        }
        
        // Translate placeholder
        if (element.placeholder) {
            const originalPlaceholder = element.placeholder;
            const translation = translateText(originalPlaceholder);

            if (translation !== originalPlaceholder) {
                // Store original in data attribute
                if (!element.hasAttribute('data-original-placeholder')) {
                    element.setAttribute('data-original-placeholder', originalPlaceholder);
                }
                element.placeholder = translation;
                translatedCount++;
                console.log(`✅ Translated placeholder: "${originalPlaceholder}" → "${translation}"`);
            }
        }
        
        // Translate title
        if (element.title) {
            const originalTitle = element.title;
            const translation = translateText(originalTitle);

            if (translation !== originalTitle) {
                // Store original in data attribute
                if (!element.hasAttribute('data-original-title')) {
                    element.setAttribute('data-original-title', originalTitle);
                }
                element.title = translation;
                translatedCount++;
                console.log(`✅ Translated title: "${originalTitle}" → "${translation}"`);
            }
        }
        
        // Translate value for buttons
        if (element.tagName === 'INPUT' && element.type === 'submit' && element.value) {
            const originalValue = element.value;
            const translation = translateText(originalValue);

            if (translation !== originalValue) {
                // Store original in data attribute
                if (!element.hasAttribute('data-original-value')) {
                    element.setAttribute('data-original-value', originalValue);
                }
                element.value = translation;
                translatedCount++;
                console.log(`✅ Translated button value: "${originalValue}" → "${translation}"`);
            }
        }
    });
    
    console.log(`✅ Aggressive translation completed! Translated ${translatedCount} elements.`);
}

// Restore everything
function restoreAllContent() {
    console.log('🔄 Restoring all content...');

    // First restore data-i18n elements
    restoreDataI18nElements();

    // Restore buttons with icons
    restoreButtonsWithIcons();

    let restoredCount = 0;

    // Restore from data attributes
    document.querySelectorAll('*').forEach(element => {
        // Restore text content
        if (element.hasAttribute('data-original-text')) {
            element.textContent = element.getAttribute('data-original-text');
            element.removeAttribute('data-original-text');
            restoredCount++;
        }

        // Restore text nodes (handle indexed text nodes)
        const textNodeAttrs = Array.from(element.attributes).filter(attr =>
            attr.name.startsWith('data-original-text-node-')
        );

        textNodeAttrs.forEach(attr => {
            const nodeIndex = parseInt(attr.name.replace('data-original-text-node-', ''));
            const originalText = attr.value;
            const targetNode = element.childNodes[nodeIndex];

            if (targetNode && targetNode.nodeType === Node.TEXT_NODE) {
                targetNode.textContent = ` ${originalText}`;
                element.removeAttribute(attr.name);
                restoredCount++;
            }
        });

        // Restore placeholder
        if (element.hasAttribute('data-original-placeholder')) {
            element.placeholder = element.getAttribute('data-original-placeholder');
            element.removeAttribute('data-original-placeholder');
            restoredCount++;
        }

        // Restore title
        if (element.hasAttribute('data-original-title')) {
            element.title = element.getAttribute('data-original-title');
            element.removeAttribute('data-original-title');
            restoredCount++;
        }

        // Restore value
        if (element.hasAttribute('data-original-value')) {
            element.value = element.getAttribute('data-original-value');
            element.removeAttribute('data-original-value');
            restoredCount++;
        }
    });

    // Clear the original texts map
    originalTexts.clear();

    console.log(`✅ Restoration completed! Restored ${restoredCount} elements.`);
}

// Set language
function setLanguage(lang) {
    console.log('🌐 Setting language to:', lang);
    currentLang = lang;
    localStorage.setItem('language', lang);

    // Prepare notification message BEFORE any translation/restoration
    const notificationMessage = lang === 'hi' ?
        'भाषा हिंदी में बदल गई' :
        'Language changed to English';

    // Update button states
    const langEn = document.getElementById('lang-en');
    const langHi = document.getElementById('lang-hi');

    if (langEn && langHi) {
        if (lang === 'hi') {
            langHi.classList.add('active');
            langEn.classList.remove('active');

            // Show notification first, then translate
            console.log('🔔 Showing notification:', notificationMessage);
            showNotification(notificationMessage);

            // Multiple translation attempts to catch everything
            setTimeout(aggressiveTranslate, 100);
            setTimeout(aggressiveTranslate, 500);
            setTimeout(aggressiveTranslate, 1000);

            // Set up periodic re-translation for dynamic content
            const retranslateInterval = setInterval(() => {
                if (currentLang === 'hi') {
                    aggressiveTranslate();
                } else {
                    clearInterval(retranslateInterval);
                }
            }, 2000);

        } else {
            langEn.classList.add('active');
            langHi.classList.remove('active');

            // Show notification first, then restore
            console.log('🔔 Showing notification:', notificationMessage);
            showNotification(notificationMessage);

            // Restore content after showing notification
            setTimeout(restoreAllContent, 50);
        }
    }
}

// Show notification
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'language-notification'; // Add class for identification
    notification.setAttribute('data-no-translate', 'true'); // Mark as non-translatable
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transition: all 0.3s ease;
        transform: translateX(100%);
        opacity: 0;
        max-width: 300px;
        word-wrap: break-word;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
        notification.style.opacity = '1';
    }, 10);

    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        notification.style.opacity = '0';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 300);
    }, 3000);
}

// Setup language switchers
function setupLanguageSwitchers() {
    const langEn = document.getElementById('lang-en');
    const langHi = document.getElementById('lang-hi');
    
    console.log('🔍 Setting up language switchers...', { langEn, langHi });
    
    if (langEn && langHi) {
        langEn.addEventListener('click', () => setLanguage('en'));
        langHi.addEventListener('click', () => setLanguage('hi'));
        
        // Set initial state
        if (currentLang === 'hi') {
            langHi.classList.add('active');
            langEn.classList.remove('active');
            setTimeout(aggressiveTranslate, 200);
        } else {
            langEn.classList.add('active');
            langHi.classList.remove('active');
        }
        
        console.log('✅ Language switchers set up');
    } else {
        console.warn('⚠️ Language switcher buttons not found');
    }
}

// Setup mutation observer to catch dynamic content
function setupMutationObserver() {
    const observer = new MutationObserver(function(mutations) {
        let shouldRetranslate = false;

        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
                        shouldRetranslate = true;
                    }
                });
            }
        });

        if (shouldRetranslate && currentLang === 'hi') {
            console.log('🔄 New content detected, re-translating...');
            setTimeout(aggressiveTranslate, 100);
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
    });

    console.log('👁️ Mutation observer set up');
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('🌐 Aggressive Translator initializing...');
    setupLanguageSwitchers();
    setupMutationObserver();

    // If already in Hindi mode, translate immediately
    if (currentLang === 'hi') {
        setTimeout(aggressiveTranslate, 200);
    }

    console.log('✅ Aggressive Translator ready!');
});

// Also initialize immediately if DOM is already loaded
if (document.readyState !== 'loading') {
    console.log('🌐 DOM already loaded, initializing Aggressive Translator...');
    setupLanguageSwitchers();
    setupMutationObserver();

    // If already in Hindi mode, translate immediately
    if (currentLang === 'hi') {
        setTimeout(aggressiveTranslate, 200);
    }
}

console.log('✅ Aggressive Translator script loaded');
