# Contributing to Divyadrishti

Thank you for your interest in contributing to Divyadrishti! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Types of Contributions

We welcome several types of contributions:

- **🐛 Bug Reports**: Help us identify and fix issues
- **✨ Feature Requests**: Suggest new functionality
- **📝 Documentation**: Improve or add documentation
- **🔧 Code Contributions**: Submit bug fixes or new features
- **🌐 Translations**: Help with internationalization
- **🧪 Testing**: Write tests or test new features

## 🚀 Getting Started

### 1. Fork and Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/divyadrishti.git
cd divyadrishti

# Add upstream remote
git remote add upstream https://github.com/original-org/divyadrishti.git
```

### 2. Development Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Install pre-commit hooks
pre-commit install

# Copy environment template
cp .env.example .env
# Edit .env with your development settings
```

### 3. Development Environment

```bash
# Start development server
python app.py

# Run tests
pytest

# Run linting
flake8 .
black .
isort .

# Run type checking
mypy .
```

## 📋 Development Guidelines

### Code Style

We follow Python PEP 8 and JavaScript Standard Style:

#### Python
```python
# Use Black for formatting
black --line-length 88 .

# Use isort for imports
isort .

# Use flake8 for linting
flake8 --max-line-length=88 --extend-ignore=E203,W503 .
```

#### JavaScript
```javascript
// Use Prettier for formatting
prettier --write "static/js/**/*.js"

// Use ESLint for linting
eslint static/js/
```

#### CSS
```css
/* Use Prettier for CSS */
prettier --write "static/css/**/*.css"

/* Follow BEM methodology for class names */
.block__element--modifier {
    /* styles */
}
```

### Commit Messages

Follow the Conventional Commits specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(map): add layer opacity controls
fix(auth): resolve login session timeout issue
docs(api): update endpoint documentation
style(css): improve responsive design for mobile
refactor(translation): optimize language switching performance
test(geoserver): add integration tests for layer loading
chore(deps): update dependencies to latest versions
```

### Branch Naming

Use descriptive branch names:

```
feature/layer-opacity-controls
bugfix/login-session-timeout
docs/api-documentation-update
refactor/translation-system
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_auth.py

# Run with coverage
pytest --cov=app --cov-report=html

# Run integration tests
pytest tests/integration/

# Run frontend tests
npm test
```

### Writing Tests

#### Python Tests
```python
# tests/test_auth.py
import pytest
from app import app, db

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client
            db.drop_all()

def test_login_success(client):
    """Test successful login"""
    response = client.post('/login', data={
        'username': 'admin',
        'password': 'admin',
        'captcha': 'test'
    })
    assert response.status_code == 302
    assert b'dashboard' in response.data
```

#### JavaScript Tests
```javascript
// tests/js/test_map.js
describe('Map Functionality', () => {
    beforeEach(() => {
        // Setup test environment
        document.body.innerHTML = '<div id="map"></div>';
    });

    test('should initialize map correctly', () => {
        const map = initializeMap();
        expect(map).toBeDefined();
        expect(map.getZoom()).toBe(7);
    });

    test('should load layers from workspace', async () => {
        const layers = await loadWorkspaceLayers('test_workspace');
        expect(layers).toHaveLength(3);
        expect(layers[0]).toHaveProperty('name');
    });
});
```

### Test Coverage

Maintain test coverage above 80%:

```bash
# Generate coverage report
pytest --cov=app --cov-report=html --cov-report=term

# View coverage report
open htmlcov/index.html
```

## 📝 Documentation

### Code Documentation

#### Python Docstrings
```python
def load_workspace_layers(workspace_name: str) -> List[Dict]:
    """
    Load layers from a GeoServer workspace.
    
    Args:
        workspace_name (str): Name of the GeoServer workspace
        
    Returns:
        List[Dict]: List of layer information dictionaries
        
    Raises:
        GeoServerError: If workspace cannot be accessed
        
    Example:
        >>> layers = load_workspace_layers('administrative')
        >>> print(len(layers))
        5
    """
    pass
```

#### JavaScript JSDoc
```javascript
/**
 * Initialize the map with default settings
 * @param {string} containerId - ID of the map container element
 * @param {Object} options - Map initialization options
 * @param {number} options.zoom - Initial zoom level
 * @param {Array} options.center - Initial center coordinates [lat, lng]
 * @returns {L.Map} Initialized Leaflet map instance
 * @example
 * const map = initializeMap('map', {
 *   zoom: 10,
 *   center: [30.3165, 78.0322]
 * });
 */
function initializeMap(containerId, options = {}) {
    // Implementation
}
```

### API Documentation

Update API documentation when adding new endpoints:

```python
@app.route('/api/layers/<workspace>', methods=['GET'])
def get_workspace_layers(workspace):
    """
    Get layers for a specific workspace.
    
    ---
    tags:
      - GeoServer
    parameters:
      - name: workspace
        in: path
        type: string
        required: true
        description: Workspace name
    responses:
      200:
        description: List of layers
        schema:
          type: object
          properties:
            layers:
              type: array
              items:
                type: object
                properties:
                  name:
                    type: string
                  type:
                    type: string
    """
    pass
```

## 🌐 Internationalization

### Adding New Languages

1. **Create translation files:**
```bash
# Create new language directory
mkdir -p static/js/translations/es

# Create translation file
touch static/js/translations/es/common.js
```

2. **Add translations:**
```javascript
// static/js/translations/es/common.js
const esTranslations = {
    'login': 'Iniciar sesión',
    'logout': 'Cerrar sesión',
    'dashboard': 'Panel de control',
    'map': 'Mapa',
    'layers': 'Capas'
};
```

3. **Update translation system:**
```javascript
// static/js/aggressive-translator.js
const supportedLanguages = {
    'en': 'English',
    'hi': 'हिंदी',
    'es': 'Español'  // Add new language
};
```

### Translation Guidelines

- Keep translations concise and contextually appropriate
- Test translations with actual users when possible
- Maintain consistency in terminology
- Consider cultural differences in UI design

## 🔧 Adding New Features

### Feature Development Process

1. **Create Feature Branch**
```bash
git checkout -b feature/new-feature-name
```

2. **Implement Feature**
   - Write code following style guidelines
   - Add comprehensive tests
   - Update documentation
   - Add translations if needed

3. **Test Thoroughly**
```bash
# Run all tests
pytest
npm test

# Test manually in browser
python app.py

# Test with different user roles
# Test with different languages
# Test responsive design
```

4. **Submit Pull Request**
   - Fill out PR template completely
   - Include screenshots for UI changes
   - Reference related issues
   - Request appropriate reviewers

### Feature Examples

#### Adding a New Map Layer Type

```python
# app.py
@app.route('/api/layers/custom/<layer_id>')
def get_custom_layer(layer_id):
    """Handle custom layer types"""
    # Implementation
    pass
```

```javascript
// static/js/map.js
function addCustomLayer(layerId, options) {
    /**
     * Add custom layer to map
     */
    // Implementation
}
```

#### Adding New User Role

```python
# app.py
USER_ROLES = {
    'admin': 'Administrator',
    'analyst': 'Data Analyst', 
    'user': 'Regular User',
    'viewer': 'Read-only Viewer'  # New role
}

def check_permission(required_role):
    """Check if user has required permission level"""
    # Implementation
```

## 🐛 Bug Reports

### Before Reporting

1. **Search existing issues** to avoid duplicates
2. **Test with latest version** to ensure bug still exists
3. **Gather information:**
   - Browser and version
   - Operating system
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots or videos if applicable

### Bug Report Template

```markdown
**Bug Description**
A clear description of the bug.

**Steps to Reproduce**
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

**Expected Behavior**
What you expected to happen.

**Actual Behavior**
What actually happened.

**Screenshots**
If applicable, add screenshots.

**Environment**
- OS: [e.g. Windows 10, macOS 11.0, Ubuntu 20.04]
- Browser: [e.g. Chrome 95, Firefox 94, Safari 15]
- Version: [e.g. v2.0.0]

**Additional Context**
Any other context about the problem.
```

## 📋 Pull Request Process

### Before Submitting

1. **Update your branch:**
```bash
git fetch upstream
git rebase upstream/main
```

2. **Run quality checks:**
```bash
# Code formatting
black .
isort .
prettier --write "static/**/*.{js,css}"

# Linting
flake8 .
eslint static/js/

# Tests
pytest
npm test

# Type checking
mypy .
```

3. **Update documentation** if needed

### Pull Request Template

```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Cross-browser testing (if UI changes)

## Screenshots
Include screenshots for UI changes.

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Code is commented where necessary
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] No breaking changes (or clearly documented)
```

### Review Process

1. **Automated checks** must pass
2. **Code review** by maintainers
3. **Testing** in development environment
4. **Approval** from at least one maintainer
5. **Merge** to main branch

## 🏷️ Release Process

### Version Numbering

We follow Semantic Versioning (SemVer):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist

1. **Update version numbers**
2. **Update CHANGELOG.md**
3. **Create release branch**
4. **Final testing**
5. **Create GitHub release**
6. **Deploy to production**
7. **Announce release**

## 📞 Getting Help

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and discussions
- **Email**: development@divyadrishti.gov.in
- **Documentation**: [docs.divyadrishti.gov.in](https://docs.divyadrishti.gov.in)

### Development Questions

When asking for help:

1. **Be specific** about the problem
2. **Include relevant code** snippets
3. **Describe what you've tried**
4. **Provide context** about your goal

## 📄 License

By contributing to Divyadrishti, you agree that your contributions will be licensed under the same license as the project.

## 🙏 Recognition

Contributors are recognized in:

- **CONTRIBUTORS.md** file
- **GitHub contributors** page
- **Release notes** for significant contributions
- **Annual contributor** acknowledgments

Thank you for contributing to Divyadrishti! Your efforts help make this project better for everyone. 🚀
