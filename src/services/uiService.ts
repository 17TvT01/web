export type FormType = 'login' | 'register' | 'payment' | 'profile' | 'orders' | 'orderType' | 'paymentOptions';
export type DropdownType = 'cart' | 'notification';

class UIService {
    private initialized = false;
    private overlay: HTMLElement | null = null;
    private forms: { [key in FormType]?: HTMLElement } = {};
    private dropdowns: { [key in DropdownType]?: HTMLElement } = {};
    private chatbot: HTMLElement | null = null;

    initialize() {
        if (this.initialized) {
            console.log('UIService already initialized');
            return;
        }

        console.log('Initializing UIService...'); // Debug

        // Initialize overlay
        this.overlay = document.querySelector('.dropdown-overlay');

        // Initialize chatbot
        this.chatbot = document.querySelector('.chatbot-content');

        // Initialize forms
        const formTypes: FormType[] = ['login', 'register', 'payment', 'profile', 'orders', 'orderType', 'paymentOptions'];
        formTypes.forEach(type => {
            const form = document.querySelector(`.${type}-form`);
            if (form instanceof HTMLElement) {
                this.forms[type] = form;
                console.log(`Form '${type}' initialized`); // Debug
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

        // Add click handlers for close buttons
        document.querySelectorAll('.close-form, .modal-close').forEach(btn => {
            if (btn instanceof HTMLElement) {
                const form = btn.closest('.form-overlay');
                if (form) {
                    btn.addEventListener('click', () => {
                        this.hideAllOverlays();
                    });
                }
            }
        });

        this.initialized = true;
        console.log('UIService initialization complete');
    }

    showForm(type: FormType) {
        console.log(`Showing form: ${type}`); // Debug

        // Hide other forms and dropdowns first
        this.hideAllOverlays();

        const form = this.forms[type];
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

        const form = this.forms[type];
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

    toggleChatbot() {
        console.log('Toggling chatbot'); // Debug

        if (!this.chatbot) {
            console.warn('Chatbot element not found');
            return;
        }

        const isVisible = this.chatbot.style.display === 'block';
        this.chatbot.style.display = isVisible ? 'none' : 'block';

        // Hide overlay when closing chatbot
        if (isVisible) {
            this.overlay?.classList.remove('active');
        }
    }

    hideAllOverlays() {
        console.log('Hiding all overlays'); // Debug

        // Hide all forms
        Object.values(this.forms).forEach(form => {
            form?.classList.remove('active');
        });

        // Hide all dropdowns
        Object.values(this.dropdowns).forEach(dropdown => {
            dropdown?.classList.remove('active');
        });

        // Hide chatbot
        if (this.chatbot) {
            this.chatbot.style.display = 'none';
        }

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