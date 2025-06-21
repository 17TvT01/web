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

            // Initialize forms
            const formTypes: FormType[] = ['login', 'register', 'payment', 'profile', 'orders', 'orderType', 'paymentOptions'];
            formTypes.forEach(type => {
                const form = document.querySelector(`.${type}-form`);
                if (form instanceof HTMLElement) {
                    this.forms[type] = form;
                    console.log(`Form '${type}' initialized`); // Debug

                    // Add close button handlers
                    const closeBtn = form.querySelector('.close-form');
                    if (closeBtn) {
                        closeBtn.addEventListener('click', () => this.hideForm(type));
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

        } catch (error) {
            console.error('Error initializing UIService:', error);
        }
    }

    showForm(type: FormType) {
        console.log(`Showing form: ${type}`); // Debug

        // Hide other forms and dropdowns first
        this.hideAllOverlays();

        const form = document.querySelector(`.${type}-form`);
        if (!form) {
            console.warn(`Form '${type}' not found`);
            return;
        }

        // Show form and overlay
        form.classList.add('active');
        this.overlay?.classList.add('active');

        console.log(`Form '${type}' displayed`); // Debug
    }

    hideForm(type: FormType) {
        console.log(`Hiding form: ${type}`); // Debug

        const form = document.querySelector(`.${type}-form`);
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
        forms.forEach(form => form.classList.remove('active'));

        // Hide all dropdowns
        Object.values(this.dropdowns).forEach(dropdown => {
            dropdown?.classList.remove('active');
        });

        // Hide overlay
        this.overlay?.classList.remove('active');
    }

    updateUserUI(user: any) {
        const authButtons = document.querySelector('.auth-buttons');
        const userIcon = document.querySelector('.user-icon');
        const userName = document.querySelector('.user-name');
        const userAvatar = document.querySelector<HTMLImageElement>('.user-avatar img');

        if (authButtons instanceof HTMLElement && 
            userIcon instanceof HTMLElement && 
            userName instanceof HTMLElement && 
            userAvatar) {
            authButtons.style.display = 'none';
            userIcon.style.display = 'block';
            userName.textContent = user.name;
            userAvatar.src = user.avatar || '/images/default-avatar.png';
        }
    }

    resetUserUI() {
        const authButtons = document.querySelector('.auth-buttons');
        const userIcon = document.querySelector('.user-icon');

        if (authButtons instanceof HTMLElement && userIcon instanceof HTMLElement) {
            authButtons.style.display = 'flex';
            userIcon.style.display = 'none';
        }
    }
}

export const uiService = new UIService();