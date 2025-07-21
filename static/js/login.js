// Login form functionality
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const togglePassword = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('password');
    const langEn = document.getElementById('lang-en');
    const langHi = document.getElementById('lang-hi');
    const captchaDisplay = document.getElementById('captcha-display');
    const captchaRefresh = document.getElementById('captcha-refresh');
    const captchaInput = document.getElementById('captcha');

    let currentCaptcha = '';

    // Generate random captcha
    function generateCaptcha() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let captcha = '';
        for (let i = 0; i < 5; i++) {
            captcha += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        currentCaptcha = captcha;
        captchaDisplay.textContent = captcha;
        captchaInput.value = '';
    }

    // Initialize captcha
    generateCaptcha();

    // Refresh captcha
    captchaRefresh.addEventListener('click', generateCaptcha);

    // Password toggle functionality
    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });

    // Form submission
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const captcha = captchaInput.value.toUpperCase();
        
        // Validate captcha
        if (captcha !== currentCaptcha) {
            alert('Invalid security code. Please try again.');
            generateCaptcha();
            return;
        }
        
        // Show loading state
        const loginBtn = document.querySelector('.login-btn');
        const originalHTML = loginBtn.innerHTML;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
        loginBtn.disabled = true;
        
        // Send login request
        fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username,
                password: password,
                captcha: captcha
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.location.href = '/';
            } else {
                alert(data.message || 'Login failed. Please check your credentials.');
                generateCaptcha();
                
                loginBtn.innerHTML = originalHTML;
                loginBtn.disabled = false;
            }
        })
        .catch(error => {
            console.error('Login error:', error);
            alert('Login failed. Please try again.');
            generateCaptcha();
            
            loginBtn.innerHTML = originalHTML;
            loginBtn.disabled = false;
        });
    });

    // Language switch functionality
    langEn.addEventListener('click', () => {
        setLanguage('en');
        langEn.classList.add('active');
        langHi.classList.remove('active');
    });
    
    langHi.addEventListener('click', () => {
        setLanguage('hi');
        langHi.classList.add('active');
        langEn.classList.remove('active');
    });

    // Language translations
    const translations = {
        en: {
            appTitle: "Drone Application & Research Center",
            subTitle: "Uttarakhand Space Application Center",
            appName: "Divyadrishti",
            appSlogan: "Aerial Intelligence | Ground-Level Precision",
            username: "Username/Email",
            password: "Password",
            login: "Login",
            usernamePlaceholder: "Enter username or email",
            passwordPlaceholder: "Enter password",
            securityCode: "Security Code",
            captchaPlaceholder: "Enter the code above"
        },
        hi: {
            appTitle: "ड्रोन अनुप्रयोग और अनुसंधान केंद्र",
            subTitle: "उत्तराखंड अंतरिक्ष अनुप्रयोग केंद्र",
            appName: "दिव्यदृष्टि",
            appSlogan: "आकाशीय दृष्टि | स्थलीय सटीकता",
            username: "उपयोगकर्ता नाम/ईमेल",
            password: "पासवर्ड",
            login: "लॉगिन",
            usernamePlaceholder: "उपयोगकर्ता नाम या ईमेल दर्ज करें",
            passwordPlaceholder: "पासवर्ड दर्ज करें",
            securityCode: "सुरक्षा कोड",
            captchaPlaceholder: "ऊपर दिया गया कोड दर्ज करें"
        }
    };

    // Function to set language
    function setLanguage(lang) {
        document.querySelector('.title-container h1').textContent = translations[lang].appTitle;
        document.querySelector('.title-container h2').textContent = translations[lang].subTitle;
        
        document.querySelector('.app-name').textContent = translations[lang].appName;
        document.querySelector('.app-slogan').textContent = translations[lang].appSlogan;
        
        document.querySelector('label[for="username"]').textContent = translations[lang].username;
        document.querySelector('label[for="password"]').textContent = translations[lang].password;
        document.querySelector('label[for="captcha"]').textContent = translations[lang].securityCode;
        document.querySelector('.user-type-label').textContent = translations[lang].loginAs;
        
        document.getElementById('username').placeholder = translations[lang].usernamePlaceholder;
        document.getElementById('password').placeholder = translations[lang].passwordPlaceholder;
        document.getElementById('captcha').placeholder = translations[lang].captchaPlaceholder;
        
        document.querySelector('.login-btn').innerHTML = `<i class="fas fa-sign-in-alt"></i> ${translations[lang].login}`;
    }
});
