// Registration form functionality
document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('register-form');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm_password');
    const togglePassword = document.getElementById('toggle-password');
    const toggleConfirmPassword = document.getElementById('toggle-confirm-password');
    const captchaDisplay = document.getElementById('captcha-display');
    const captchaRefresh = document.getElementById('captcha-refresh');
    const captchaInput = document.getElementById('captcha');
    const passwordStrength = document.getElementById('password-strength');
    const passwordMatch = document.getElementById('password-match');

    let currentCaptcha = '';

    // Generate random captcha
    function generateCaptcha() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let captcha = '';
        for (let i = 0; i < 6; i++) {
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

    toggleConfirmPassword.addEventListener('click', function() {
        const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        confirmPasswordInput.setAttribute('type', type);
        
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });

    // Password strength checker
    passwordInput.addEventListener('input', function() {
        const password = this.value;
        const strength = checkPasswordStrength(password);
        
        passwordStrength.className = `password-strength ${strength}`;
        
        // Check password match when password changes
        checkPasswordMatch();
    });

    // Password match checker
    confirmPasswordInput.addEventListener('input', checkPasswordMatch);

    function checkPasswordStrength(password) {
        if (password.length < 6) return 'weak';
        
        let score = 0;
        
        // Length check
        if (password.length >= 8) score++;
        
        // Uppercase check
        if (/[A-Z]/.test(password)) score++;
        
        // Lowercase check
        if (/[a-z]/.test(password)) score++;
        
        // Number check
        if (/\d/.test(password)) score++;
        
        // Special character check
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
        
        if (score < 2) return 'weak';
        if (score < 4) return 'medium';
        return 'strong';
    }

    function checkPasswordMatch() {
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        if (confirmPassword === '') {
            passwordMatch.textContent = '';
            passwordMatch.className = 'password-match';
            return;
        }
        
        if (password === confirmPassword) {
            passwordMatch.textContent = '✓ Passwords match';
            passwordMatch.className = 'password-match match';
        } else {
            passwordMatch.textContent = '✗ Passwords do not match';
            passwordMatch.className = 'password-match no-match';
        }
    }

    // Username validation
    const usernameInput = document.getElementById('username');
    usernameInput.addEventListener('input', function() {
        const username = this.value;
        
        // Remove invalid characters
        this.value = username.replace(/[^a-zA-Z0-9_]/g, '');
        
        // Check length
        if (this.value.length < 3) {
            this.setCustomValidity('Username must be at least 3 characters long');
        } else {
            this.setCustomValidity('');
        }
    });

    // Email validation
    const emailInput = document.getElementById('email');
    emailInput.addEventListener('input', function() {
        const email = this.value;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (email && !emailRegex.test(email)) {
            this.setCustomValidity('Please enter a valid email address');
        } else {
            this.setCustomValidity('');
        }
    });

    // Phone number formatting
    const phoneInput = document.getElementById('phone');
    phoneInput.addEventListener('input', function() {
        let phone = this.value.replace(/\D/g, '');
        
        if (phone.length >= 10) {
            phone = phone.substring(0, 10);
            phone = phone.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
        }
        
        this.value = phone;
    });

    // Form submission
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form data
        const formData = {
            full_name: document.getElementById('full_name').value.trim(),
            username: document.getElementById('username').value.trim(),
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value,
            confirm_password: document.getElementById('confirm_password').value,
            organization: document.getElementById('organization').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            captcha: document.getElementById('captcha').value.toUpperCase(),
            terms: document.getElementById('terms').checked
        };

        // Validation
        if (!validateForm(formData)) {
            return;
        }

        // Show loading state
        const registerBtn = document.querySelector('.register-btn');
        const originalHTML = registerBtn.innerHTML;
        registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
        registerBtn.disabled = true;

        // Send registration request
        fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showMessage(data.message, 'success');
                registerForm.reset();
                generateCaptcha();
                passwordStrength.className = 'password-strength';
                passwordMatch.textContent = '';
            } else {
                showMessage(data.message, 'error');
                generateCaptcha();
            }
        })
        .catch(error => {
            console.error('Registration error:', error);
            showMessage('Registration failed. Please try again.', 'error');
            generateCaptcha();
        })
        .finally(() => {
            registerBtn.innerHTML = originalHTML;
            registerBtn.disabled = false;
        });
    });

    function validateForm(data) {
        // Check required fields
        if (!data.full_name || !data.username || !data.email || !data.password || !data.confirm_password) {
            showMessage('Please fill in all required fields.', 'error');
            return false;
        }

        // Check username length
        if (data.username.length < 3) {
            showMessage('Username must be at least 3 characters long.', 'error');
            return false;
        }

        // Check password length
        if (data.password.length < 6) {
            showMessage('Password must be at least 6 characters long.', 'error');
            return false;
        }

        // Check password match
        if (data.password !== data.confirm_password) {
            showMessage('Passwords do not match.', 'error');
            return false;
        }

        // Check captcha
        if (data.captcha !== currentCaptcha) {
            showMessage('Invalid security code. Please try again.', 'error');
            return false;
        }

        // Check terms acceptance
        if (!data.terms) {
            showMessage('Please accept the Terms of Service and Privacy Policy.', 'error');
            return false;
        }

        return true;
    }

    function showMessage(message, type) {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());

        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        
        const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
        messageDiv.innerHTML = `<i class="fas ${icon}"></i> ${message}`;

        // Insert after header
        const header = document.querySelector('.register-header');
        header.insertAdjacentElement('afterend', messageDiv);

        // Scroll to message
        messageDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Auto-remove success messages after 5 seconds
        if (type === 'success') {
            setTimeout(() => {
                messageDiv.remove();
            }, 5000);
        }
    }

    // Language switch functionality (placeholder)
    const langEn = document.getElementById('lang-en');
    const langHi = document.getElementById('lang-hi');
    
    langEn.addEventListener('click', () => {
        langEn.classList.add('active');
        langHi.classList.remove('active');
    });
    
    langHi.addEventListener('click', () => {
        langHi.classList.add('active');
        langEn.classList.remove('active');
    });
});
