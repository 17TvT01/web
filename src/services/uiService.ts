export type FormType = 'login' | 'register' | 'payment' | 'profile' | 'orders' | 'orderType' | 'paymentOptions';
export type DropdownType = 'cart' | 'notification';

class UIService {
    private initialized = false;
    private overlay: HTMLElement | null = null;
    private forms: { [key in FormType]?: HTMLElement } = {};
    private dropdowns: { [key in DropdownType]?: HTMLElement } = {};

    initialize() {
        if (this.initialized) {
            console.log('UIService already initialized');
            return;
        }

        console.log('Initializing UIService...'); // Debug

        try {
            // Initialize overlay
            this.overlay = document.querySelector('.dropdown-overlay');
            console.log('Overlay initialized:', this.overlay); // Debug

            // Initialize forms
            const formTypes: FormType[] = ['login', 'register', 'payment', 'profile', 'orders', 'orderType', 'paymentOptions'];
            formTypes.forEach(type => {
                // Try both class and ID selectors
                const form = document.querySelector(`#${type}-form`) || document.querySelector(`.${type}-form`);
                console.log(`Searching for form '${type}':`, form); // Debug
                
                if (form instanceof HTMLElement) {
                    this.forms[type] = form;
                    console.log(`Form '${type}' initialized`); // Debug

                    // Add close button handlers
                    const closeBtn = form.querySelector('.close-form');
                    if (closeBtn) {
                        closeBtn.addEventListener('click', () => this.hideForm(type));
                        console.log(`Close button handler added for '${type}'`); // Debug
                    }
                } else {
                    console.warn(`Form '${type}' not found`);
                }
            });

            // Initialize dropdowns
            const dropdownTypes: DropdownType[] = ['cart', 'notification'];
            dropdownTypes.forEach(type => {
                const dropdown = document.querySelector(`.${type}-dropdown`);
                if (dropdown instanceof HTMLElement) {
                    this.dropdowns[type] = dropdown;
                    console.log(`Dropdown '${type}' initialized`); // Debug
                } else {
                    console.warn(`Dropdown '${type}' not found`);
                }
            });

            this.initialized = true;
            console.log('UIService initialization complete');
            console.log('Registered forms:', Object.keys(this.forms)); // Debug

        } catch (error) {
            console.error('Error initializing UIService:', error);
        }
    }

    showForm(type: FormType) {
        console.log(`Attempting to show form: ${type}`); // Debug

        // Hide other forms and dropdowns first
        this.hideAllOverlays();

        // Try both class and ID selectors
        const form = document.querySelector(`#${type}-form`) || document.querySelector(`.${type}-form`);
        console.log(`Found form element:`, form); // Debug

        if (!form) {
            console.warn(`Form '${type}' not found`);
            return;
        }

        // Show form and overlay
        form.classList.add('active');
        if (this.overlay) {
            this.overlay.classList.add('active');
            console.log('Overlay activated'); // Debug
        }

        console.log(`Form '${type}' displayed`); // Debug
    }

    hideForm(type: FormType) {
        console.log(`Hiding form: ${type}`); // Debug

        // Try both class and ID selectors
        const form = document.querySelector(`#${type}-form`) || document.querySelector(`.${type}-form`);
        console.log(`Found form element to hide:`, form); // Debug

        if (!form) {
            console.warn(`Form '${type}' not found`);
            return;
        }

        form.classList.remove('active');
        this.overlay?.classList.remove('active');
    }

    toggleDropdown(type: DropdownType) {
        console.log(`Toggling dropdown: ${type}`); // Debug

        const dropdown = this.dropdowns[type];
        if (!dropdown) {
            console.warn(`Dropdown '${type}' not found`);
            return;
        }

        // Hide other dropdowns and forms
        this.hideAllOverlays();

        // Toggle current dropdown
        dropdown.classList.toggle('active');
        this.overlay?.classList.toggle('active');
    }

    hideAllOverlays() {
        console.log('Hiding all overlays'); // Debug

        // Hide all forms
        const forms = document.querySelectorAll('.form-overlay');
        forms.forEach(form => {
            form.classList.remove('active');
            console.log('Removed active class from form:', form); // Debug
        });

        // Hide all dropdowns
        Object.values(this.dropdowns).forEach(dropdown => {
            dropdown?.classList.remove('active');
        });

        // Hide overlay
        this.overlay?.classList.remove('active');
    }

    updateUserUI(user: any) {
        const authButtons = document.querySelector('.auth-buttons');
        const userInfo = document.querySelector('.user-menu');
        const userName = userInfo?.querySelector('.user-name');
        const userAvatar = userInfo?.querySelector<HTMLImageElement>('.user-avatar img');

        if (authButtons && userInfo) {
            authButtons.classList.add('hidden');
            userInfo.classList.remove('hidden');
            if (userName) userName.textContent = user.name;
            if (userAvatar) userAvatar.src = user.avatar || '/images/default-avatar.png';
        }

        // Dispatch custom event to notify React components
        const event = new CustomEvent('auth:updated', { detail: { user } });
        window.dispatchEvent(event);
    }

    resetUserUI() {
        const authButtons = document.querySelector('.auth-buttons');
        const userInfo = document.querySelector('.user-menu');

        if (authButtons && userInfo) {
            authButtons.classList.remove('hidden');
            userInfo.classList.add('hidden');
        }
    }
}

export const uiService = new UIService();