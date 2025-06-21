// Import các module
import { renderStars } from '../../utils/rating';
import { cartService } from '../../services/cartService';
import { paymentService } from '../../services/paymentService';
import { authService } from '../../services/authService';
import { chatService } from '../../services/chatService';
import { productService } from '../../services/productService';
import { uiService } from '../../services/uiService';
import { notificationService } from '../../services/notificationService';

// Khởi tạo các service
    // Ensure rating is a number and between 0-5
    rating = Math.min(5, Math.max(0, parseFloat(rating) || 0));
    
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return `
        <div class="stars">
            ${Array(fullStars).fill('<i class="fas fa-star"></i>').join('')}
            ${hasHalfStar ? '<i class="fas fa-star-half-alt"></i>' : ''}
            ${Array(emptyStars).fill('<i class="far fa-star"></i>').join('')}
        </div>
    `;
}

// Move the global variables next
let currentFilters = {
    category: 'Tất cả',
    subcategory: null,
    style: [],
    suitable: [],
    temperature: [],
    sugar: [],
    price: null
};

let loadedProducts = [];
// These variables are already declared at the end of the file

window.scrollToTop = function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.toggleChatbot = function() {
    const chatbotContent = document.querySelector('.chatbot-content');
    const chatbotButton = document.querySelector('button[onClick="toggleChatbot()"]');

    if (chatbotContent.style.display === 'none') {
        chatbotContent.style.display = 'block';
        if (chatbotButton) {
            chatbotButton.style.display = 'none'; // Hide the button
        }
    } else {
        chatbotContent.style.display = 'none';
        if (chatbotButton) {
            chatbotButton.style.display = 'block'; // Show the button
        }
    }
}

let cartCount = 0;
window.addToCart = function(product, quantity = 1) {
    const cartItems = document.querySelector('.cart-items');
    const existingItem = cartItems.querySelector(`.cart-item[data-id="${product.id}"]`);
    
    if (existingItem) {
        // Nếu sản phẩm đã tồn tại, tăng số lượng
        const quantitySpan = existingItem.querySelector('.item-quantity span');
        const currentQuantity = parseInt(quantitySpan.textContent);
        quantitySpan.textContent = currentQuantity + quantity;
        cartCount++;
    } else {
        // Nếu là sản phẩm mới, thêm mới vào giỏ hàng
        cartCount += quantity;
        const newItem = `
            <div class="cart-item" data-price="${product.price}" data-id="${product.id}">
                <img src="${product.image}" alt="${product.name}" style="width: 50px; height: 50px; object-fit: cover;">
                <div class="item-details">
                    <h4>${product.name}</h4>
                    <p>${product.price.toLocaleString('vi-VN')} VNĐ</p>
                </div>
                <div class="item-quantity">
                    <button class="quantity-btn" onclick="updateQuantity(this, -1)">-</button>
                    <span>${quantity}</span>
                    <button class="quantity-btn" onclick="updateQuantity(this, 1)">+</button>
                </div>
                <button onclick="removeFromCart(this)" class="remove-item"><i class="fas fa-times"></i></button>
            </div>
        `;
        cartItems.innerHTML += newItem;
    }

    document.querySelector('.cart-count').textContent = cartCount;
    updateCartTotal();
    updatePaymentMethods(); // Thêm cập nhật phương thức thanh toán
    saveCart();
}

// Thêm hàm cập nhật phương thức thanh toán trong giỏ hàng
function updatePaymentMethods() {
    let cartItems = document.querySelector('.cart-items');
    let paymentMethods = document.querySelector('.payment-methods');
    
    // Nếu giỏ hàng không trống và chưa có phần phương thức thanh toán
    if (cartCount > 0 && !paymentMethods) {
        paymentMethods = document.createElement('div');
        paymentMethods.className = 'payment-methods';
        paymentMethods.innerHTML = `
            <h4>Phương thức thanh toán:</h4>
            <div class="payment-options">
                <button class="payment-option active" onclick="selectCartPayment('cash')">
                    <i class="fas fa-money-bill"></i> Tiền mặt
                </button>
                <button class="payment-option" onclick="selectCartPayment('qr')">
                    <i class="fas fa-qrcode"></i> QR Code
                </button>
            </div>
        `;
        cartItems.parentNode.insertBefore(paymentMethods, cartItems.nextSibling);
    } else if (cartCount === 0 && paymentMethods) {
        paymentMethods.remove();
    }
}

// Hàm xử lý chọn phương thức thanh toán trong giỏ hàng
window.selectCartPayment = function(method) {
    const options = document.querySelectorAll('.payment-option');
    options.forEach(opt => opt.classList.remove('active'));
    document.querySelector(`.payment-option[onclick*="${method}"]`).classList.add('active');
    window.selectedPaymentMethod = method;
}

window.updateQuantity = function(btn, change) {
    const quantitySpan = btn.parentElement.querySelector('span');
    let quantity = parseInt(quantitySpan.textContent) + change;
    if (quantity > 0) {
        quantitySpan.textContent = quantity;
        updateCartTotal();
        saveCart(); // Lưu sau khi cập nhật số lượng
    } else {
        removeFromCart(btn.parentElement.parentElement);
    }
}

window.updateCartTotal = function() {
    let subtotal = 0;
    document.querySelectorAll('.cart-item').forEach(item => {
        const price = parseInt(item.dataset.price);
        const quantity = parseInt(item.querySelector('.item-quantity span').textContent);
        subtotal += price * quantity;
    });

    const subtotalEl = document.querySelector('.subtotal-price');
    const totalEl = document.querySelector('.total-price');
    
    subtotalEl.textContent = subtotal.toLocaleString('vi-VN') + ' VNĐ';
    totalEl.textContent = subtotal.toLocaleString('vi-VN') + ' VNĐ';
}

window.removeFromCart = function(button) {
    button.parentElement.remove();
    cartCount--;
    document.querySelector('.cart-count').textContent = cartCount;
    updateCartTotal();
    saveCart(); // Lưu sau khi xóa
}

window.clearNotifications = function() {
    document.querySelector('.notification-items').innerHTML = '';
}

window.showForm = function(type) {
    document.getElementById(type + 'Form').style.display = 'flex';
}

window.hideForm = function(type) {
    document.getElementById(type + 'Form').style.display = 'none';
}

window.handleLogin = async function(event) {
    event.preventDefault();
    const email = event.target.querySelector('input[type="text"]').value;
    const password = event.target.querySelector('input[type="password"]').value;

    try {
        const response = await fetch('Asset/Data/users.json');
        const data = await response.json();
        const user = data.users.find(u => u.email === email && u.password === password);

        if (user) {
            // Store user data in localStorage instead of sessionStorage
            localStorage.setItem('currentUser', JSON.stringify(user));
            updateUIAfterLogin(user);
            hideForm('login');
            addNotification(`Chào mừng ${user.name} đã quay trở lại!`, 'success');
            
            // Kiểm tra nếu đang trong quá trình thanh toán mang về
            const delivery = document.querySelector('input[name="delivery"]:checked')?.value;
            if (delivery === 'dine-in') {
                
            }
        } else {
            alert('Email hoặc mật khẩu không đúng!');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Có lỗi xảy ra khi đăng nhập');
    }
}

window.updateUIAfterLogin = function(user) {
    document.querySelector('.auth-buttons').style.display = 'none';
    const userIcon = document.querySelector('.user-icon');
    userIcon.style.display = 'block';
    
    // Update user info
    userIcon.querySelector('img').src = user.avatar;
    userIcon.querySelector('.user-name').textContent = user.name;
}

window.showPaymentForm = function() {
    // Ẩn toàn bộ modal cũ và modal mới trước khi mở modal mới
    const dineInModal = document.getElementById('dineInPaymentModal');
    const takeawayModal = document.getElementById('takeawayPaymentModal');
    const oldPaymentForm = document.getElementById('paymentForm');
    const oldPaymentOverlay = document.querySelector('.payment-overlay');
    if (oldPaymentForm) oldPaymentForm.style.display = 'none';
    if (oldPaymentOverlay) oldPaymentOverlay.style.display = 'none';
    if (dineInModal) dineInModal.style.display = 'none';
    if (takeawayModal) takeawayModal.style.display = 'none';

    // Lấy loại đơn hàng
    const delivery = document.querySelector('input[name="delivery"]:checked')?.value;
    if (delivery === 'dine-in') {
        if (dineInModal) {
            dineInModal.style.display = 'flex';
            window.currentPaymentModal = dineInModal;
            // Cập nhật tổng tiền
            const total = document.querySelector('.total-price').textContent;
            dineInModal.querySelector('.total-price').textContent = total;
        }
    } else if (delivery === 'takeaway') {
        if (takeawayModal) {
            takeawayModal.style.display = 'flex';
            window.currentPaymentModal = takeawayModal;
            // Cập nhật tổng tiền
            const total = document.querySelector('.total-price').textContent;
            takeawayModal.querySelector('.total-price').textContent = total;
        }
    }
}

window.selectPaymentMethod = function(method, modalId) {
    // modalId: 'dineInPaymentModal' hoặc 'takeawayPaymentModal'
    const modal = document.getElementById(modalId);
    if (!modal) return;
    // Đánh dấu active cho option
    modal.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('active'));
    const selectedOption = modal.querySelector(`.payment-option[data-method="${method}"]`);
    if (selectedOption) selectedOption.classList.add('active');
    // QR section
    const qrSection = modal.querySelector('.qr-section');
    const confirmBtn = modal.querySelector('.confirm-payment-btn');
    if (method === 'qr') {
        if (qrSection) {
            qrSection.style.display = 'block';
            // Tạo nội dung QR
            const totalAmount = document.querySelector('.total-price').textContent.replace(' VNĐ', '').replace(/\./g, '');
            qrSection.innerHTML = `
                <div class="payment-instructions">
                    <h3>Hướng dẫn thanh toán QR</h3>
                    <p>1. Mở ứng dụng ngân hàng hoặc ví điện tử của bạn</p>
                    <p>2. Quét mã QR bên dưới</p>
                    <p>3. Kiểm tra số tiền: <span class="amount">${parseInt(totalAmount).toLocaleString('vi-VN')} VNĐ</span></p>
                    <p>4. Xác nhận thanh toán</p>
                    ${modalId === 'dineInPaymentModal' ? '<p>5. Đưa màn hình xác nhận cho nhân viên</p>' : ''}
                </div>
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=Total:${totalAmount}VND" alt="QR Code">
                <button class="qr-done-btn" onclick="handleQRDone('${modalId}')">Đã quét xong</button>
            `;
        }
        if (confirmBtn) confirmBtn.style.display = 'none';
    } else {
        if (qrSection) qrSection.style.display = 'none';
        if (confirmBtn) confirmBtn.style.display = 'block';
    }
    // Lưu phương thức đã chọn
    window.selectedPaymentMethod = method;
}

window.handleQRDone = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
    document.querySelector('.cart-items').innerHTML = '';
    cartCount = 0;
    document.querySelector('.cart-count').textContent = cartCount;
    updateCartTotal();
    saveCart();
    const message = modalId === 'dineInPaymentModal'
        ? 'Thanh toán QR thành công! Vui lòng đưa màn hình xác nhận cho nhân viên.'
        : 'Thanh toán QR thành công! Đơn hàng sẽ được giao đến bạn.';
    addNotification(message, 'success');
}

window.updateQuantity = function(btn, change) {
    const quantitySpan = btn.parentElement.querySelector('span');
    let quantity = parseInt(quantitySpan.textContent) + change;
    if (quantity > 0) {
        quantitySpan.textContent = quantity;
        updateCartTotal();
        saveCart(); // Lưu sau khi cập nhật số lượng
    } else {
        removeFromCart(btn.parentElement.parentElement);
    }
}

window.updateCartTotal = function() {
    let subtotal = 0;
    document.querySelectorAll('.cart-item').forEach(item => {
        const price = parseInt(item.dataset.price);
        const quantity = parseInt(item.querySelector('.item-quantity span').textContent);
        subtotal += price * quantity;
    });

    const subtotalEl = document.querySelector('.subtotal-price');
    const totalEl = document.querySelector('.total-price');
    
    subtotalEl.textContent = subtotal.toLocaleString('vi-VN') + ' VNĐ';
    totalEl.textContent = subtotal.toLocaleString('vi-VN') + ' VNĐ';
}

window.removeFromCart = function(button) {
    button.parentElement.remove();
    cartCount--;
    document.querySelector('.cart-count').textContent = cartCount;
    updateCartTotal();
    saveCart(); // Lưu sau khi xóa
}

window.clearNotifications = function() {
    document.querySelector('.notification-items').innerHTML = '';
}

window.showForm = function(type) {
    document.getElementById(type + 'Form').style.display = 'flex';
}

window.hideForm = function(type) {
    document.getElementById(type + 'Form').style.display = 'none';
}

window.handleLogin = async function(event) {
    event.preventDefault();
    const email = event.target.querySelector('input[type="text"]').value;
    const password = event.target.querySelector('input[type="password"]').value;

    try {
        const response = await fetch('Asset/Data/users.json');
        const data = await response.json();
        const user = data.users.find(u => u.email === email && u.password === password);

        if (user) {
            // Store user data in localStorage instead of sessionStorage
            localStorage.setItem('currentUser', JSON.stringify(user));
            updateUIAfterLogin(user);
            hideForm('login');
            addNotification(`Chào mừng ${user.name} đã quay trở lại!`, 'success');
            
            // Kiểm tra nếu đang trong quá trình thanh toán mang về
            const delivery = document.querySelector('input[name="delivery"]:checked')?.value;
            if (delivery === 'dine-in') {
                
            }
        } else {
            alert('Email hoặc mật khẩu không đúng!');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Có lỗi xảy ra khi đăng nhập');
    }
}

window.updateUIAfterLogin = function(user) {
    document.querySelector('.auth-buttons').style.display = 'none';
    const userIcon = document.querySelector('.user-icon');
    userIcon.style.display = 'block';
    
    // Update user info
    userIcon.querySelector('img').src = user.avatar;
    userIcon.querySelector('.user-name').textContent = user.name;
}

window.showPaymentForm = function() {
    // Ẩn toàn bộ modal cũ và modal mới trước khi mở modal mới
    const dineInModal = document.getElementById('dineInPaymentModal');
    const takeawayModal = document.getElementById('takeawayPaymentModal');
    const oldPaymentForm = document.getElementById('paymentForm');
    const oldPaymentOverlay = document.querySelector('.payment-overlay');
    if (oldPaymentForm) oldPaymentForm.style.display = 'none';
    if (oldPaymentOverlay) oldPaymentOverlay.style.display = 'none';
    if (dineInModal) dineInModal.style.display = 'none';
    if (takeawayModal) takeawayModal.style.display = 'none';

    // Lấy loại đơn hàng
    const delivery = document.querySelector('input[name="delivery"]:checked')?.value;
    if (delivery === 'dine-in') {
        if (dineInModal) {
            dineInModal.style.display = 'flex';
            window.currentPaymentModal = dineInModal;
            // Cập nhật tổng tiền
            const total = document.querySelector('.total-price').textContent;
            dineInModal.querySelector('.total-price').textContent = total;
        }
    } else if (delivery === 'takeaway') {
        if (takeawayModal) {
            takeawayModal.style.display = 'flex';
            window.currentPaymentModal = takeawayModal;
            // Cập nhật tổng tiền
            const total = document.querySelector('.total-price').textContent;
            takeawayModal.querySelector('.total-price').textContent = total;
        }
    }
}

window.selectPaymentMethod = function(method, modalId) {
    // modalId: 'dineInPaymentModal' hoặc 'takeawayPaymentModal'
    const modal = document.getElementById(modalId);
    if (!modal) return;
    // Đánh dấu active cho option
    modal.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('active'));
    const selectedOption = modal.querySelector(`.payment-option[data-method="${method}"]`);
    if (selectedOption) selectedOption.classList.add('active');
    // QR section
    const qrSection = modal.querySelector('.qr-section');
    const confirmBtn = modal.querySelector('.confirm-payment-btn');
    if (method === 'qr') {
        if (qrSection) {
            qrSection.style.display = 'block';
            // Tạo nội dung QR
            const totalAmount = document.querySelector('.total-price').textContent.replace(' VNĐ', '').replace(/\./g, '');
            qrSection.innerHTML = `
                <div class="payment-instructions">
                    <h3>Hướng dẫn thanh toán QR</h3>
                    <p>1. Mở ứng dụng ngân hàng hoặc ví điện tử của bạn</p>
                    <p>2. Quét mã QR bên dưới</p>
                    <p>3. Kiểm tra số tiền: <span class="amount">${parseInt(totalAmount).toLocaleString('vi-VN')} VNĐ</span></p>
                    <p>4. Xác nhận thanh toán</p>
                    ${modalId === 'dineInPaymentModal' ? '<p>5. Đưa màn hình xác nhận cho nhân viên</p>' : ''}
                </div>
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=Total:${totalAmount}VND" alt="QR Code">
                <button class="qr-done-btn" onclick="handleQRDone('${modalId}')">Đã quét xong</button>
            `;
        }
        if (confirmBtn) confirmBtn.style.display = 'none';
    } else {
        if (qrSection) qrSection.style.display = 'none';
        if (confirmBtn) confirmBtn.style.display = 'block';
    }
    // Lưu phương thức đã chọn
    window.selectedPaymentMethod = method;
}

window.handleQRDone = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
    document.querySelector('.cart-items').innerHTML = '';
    cartCount = 0;
    document.querySelector('.cart-count').textContent = cartCount;
    updateCartTotal();
    saveCart();
    const message = modalId === 'dineInPaymentModal'
        ? 'Thanh toán QR thành công! Vui lòng đưa màn hình xác nhận cho nhân viên.'
        : 'Thanh toán QR thành công! Đơn hàng sẽ được giao đến bạn.';
    addNotification(message, 'success');
}

window.logout = function() {
    localStorage.removeItem('currentUser');
    document.querySelector('.auth-buttons').style.display = 'flex';
    document.querySelector('.user-icon').style.display = 'none';
}

window.sendMessage = function() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (message) {
        const chatMessages = document.querySelector('.chat-messages');
        
        // Add user message
        chatMessages.innerHTML += `
            <div class="message user-message">
                <p>${message}</p>
                <i class="fas fa-user"></i>
            </div>
        `;
        
        // Clear input
        input.value = '';
        
        // Auto scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Simulate bot response after 1 second
        setTimeout(() => {
            chatMessages.innerHTML += `
                <div class="message bot-message">
                    <i class="fas fa-robot"></i>
                    <p>Xin lỗi, tôi đang được phát triển và chưa thể trả lời câu hỏi của bạn.</p>
                </div>
            `;
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 1000);
    }
}

function toggleDropdown(type) {
    const overlay = document.querySelector('.dropdown-overlay');
    const dropdown = document.querySelector(`.${type}-dropdown`);
    
    overlay.classList.toggle('active');
    dropdown.classList.toggle('active');
}

// Update navigation button click handler
function initializeNavButtons() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const category = button.textContent;
            currentCategory = category; // Update current category
            
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            displayProducts(loadedProducts, category);
        });
    });
}

function switchForm(type) {
    if (type === 'login') {
        hideForm('register');
        showForm('login');
    } else {
        hideForm('login');
        showForm('register');
    }
}

// Add social login handlers
function handleSocialLogin(provider) {
    console.log(`Logging in with ${provider}`);
    // Add your social login logic here
}

// Replace toggleDeliveryFields with this new function
window.toggleDeliveryOption = function(type) {
    const options = document.querySelectorAll('.delivery-options .option');

    
    options.forEach(opt => {
        if (opt.querySelector('input').value === type) {
            opt.classList.add('active');
        } else {
            opt.classList.remove('active');
        }
    });


}

function addNotification(message, type = 'info') {
    const notificationItems = document.querySelector('.notification-items');
    const icon = type === 'success' ? 'check-circle' : 'info-circle';
    const notification = `
        <div class="notification-item">
            <i class="fas fa-${icon}" style="color: ${type === 'success' ? '#28a745' : '#ff6b6b'}"></i>
            <p>${message}</p>
        </div>
    `;
    notificationItems.insertAdjacentHTML('afterbegin', notification);
}

window.showToast = function(message, type = 'success') {
    // type: 'success' | 'error' | 'info'
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.innerHTML = `<i class='fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'times-circle' : 'info-circle'}'></i> <span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = 0; }, 2200);
    setTimeout(() => { toast.remove(); }, 2700);
}

// Thêm hàm lưu giỏ hàng
function saveCart() {
    const cartItems = document.querySelector('.cart-items').innerHTML;
    localStorage.setItem('cartItems', cartItems);
    localStorage.setItem('cartCount', cartCount);
}

// Thêm hàm khôi phục giỏ hàng
function restoreCart() {
    const savedItems = localStorage.getItem('cartItems');
    const savedCount = localStorage.getItem('cartCount');
    
    if (savedItems) {
        document.querySelector('.cart-items').innerHTML = savedItems;
        cartCount = parseInt(savedCount || '0');
        document.querySelector('.cart-count').textContent = cartCount;
        updateCartTotal();
    }
}

// Initialize all event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', async function() {
    // Add this near the top of the function
    // Setup password toggle icons
    document.querySelectorAll('.toggle-password').forEach(icon => {
        icon.addEventListener('click', function() {
            const input = this.previousElementSibling;
            if (input.type === 'password') {
                input.type = 'text';
                this.classList.remove('fa-eye-slash');
                this.classList.add('fa-eye');
                this.classList.add('visible');
            } else {
                input.type = 'password';
                this.classList.remove('fa-eye');
                this.classList.add('fa-eye-slash');
                this.classList.remove('visible');
            }
        });
    });

    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        updateUIAfterLogin(JSON.parse(savedUser));
    }

    // Khôi phục giỏ hàng ngay khi trang tải xong
    restoreCart();
    
    // Cart and notification events
    const cartIcon = document.querySelector('.cart-icon');
    const notificationIcon = document.querySelector('.notification-icon');
    const overlay = document.querySelector('.dropdown-overlay');
    const closeCartBtn = document.querySelector('.close-cart');
    const closeNotificationsBtn = document.querySelector('.close-notifications');
    const clearNotificationsBtn = document.querySelector('.clear-notifications');
    const chatInput = document.getElementById('chatInput');

    if (cartIcon) {
        cartIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDropdown('cart');
        });
    }

    if (notificationIcon) {
        notificationIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDropdown('notification');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', () => {
            overlay.classList.remove('active');
            document.querySelectorAll('.cart-dropdown, .notification-dropdown').forEach(el => {
                el.classList.remove('active');
            });
        });
    }

    if (closeCartBtn) {
        closeCartBtn.addEventListener('click', () => toggleDropdown('cart'));
    }

    if (closeNotificationsBtn) {
        closeNotificationsBtn.addEventListener('click', () => toggleDropdown('notification'));
    }

    if (clearNotificationsBtn) {
        clearNotificationsBtn.addEventListener('click', clearNotifications);
    }

    if (chatInput) {
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }

    // Initialize navigation buttons
    initializeNavButtons();

    document.querySelectorAll('.google-btn').forEach(btn => {
        btn.addEventListener('click', () => handleSocialLogin('Google'));
    });

    document.querySelectorAll('.facebook-btn').forEach(btn => {
        btn.addEventListener('click', () => handleSocialLogin('Facebook'));
    });

    // Initialize delivery option on page load
    toggleDeliveryOption('dine-in');

    const checkoutBtn = document.querySelector('.checkout-btn');
    const closePaymentBtn = document.querySelector('.close-payment');
    
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            // Ẩn giỏ hàng và overlay trước khi mở modal thanh toán
            document.querySelector('.cart-dropdown').classList.remove('active');
            document.querySelector('.dropdown-overlay').classList.remove('active');
            // Gọi modal xác nhận thanh toán đúng logic
            showPaymentForm();
        });
    }
    
    if (closePaymentBtn) {
        closePaymentBtn.addEventListener('click', () => {
            document.querySelector('.payment-overlay').style.display = 'none';
        });
    }
    
    // Payment method selection
    document.querySelectorAll('.payment-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
        });
    });

    const confirmPaymentBtn = document.querySelector('.confirm-payment-btn');
    if (confirmPaymentBtn) {
        confirmPaymentBtn.addEventListener('click', () => {
            const nameInput = document.querySelector('.delivery-address input[placeholder="Họ và tên người nhận"]');
            const phoneInput = document.querySelector('.delivery-address input[placeholder="Số điện thoại"]');
            const addressInput = document.querySelector('.delivery-address textarea');
            
            if (!nameInput.value || !phoneInput.value || !addressInput.value) {
                alert('Vui lòng điền đầy đủ thông tin giao hàng!');
                return;
            }
            
            // Add success notification
            const orderTime = new Date().toLocaleTimeString();
            addNotification(`Đơn hàng đã được đặt thành công lúc ${orderTime}. Cảm ơn bạn đã mua hàng!`, 'success');
            
            // Clear cart and hide payment form
            clearCart();
            document.querySelector('.payment-overlay').style.display = 'none';
        });
    }

    // Load and display products
    const data = await loadProducts();
    loadedProducts = data.products;
    displayProducts(loadedProducts);

    // Update nav buttons to filter products
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const category = button.textContent;
            displayProducts(data.products, category);
            
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });

    const closeProfileBtn = document.querySelector('.close-profile');
    if (closeProfileBtn) {
        closeProfileBtn.addEventListener('click', () => {
            document.querySelector('.profile-overlay').style.display = 'none';
        });
    }

    // Add event listeners for sidebar categories
    document.querySelectorAll('.category-section li').forEach(item => {
        item.addEventListener('click', () => {
            const category = item.dataset.category;
            const subcategory = item.dataset.subcategory;
            
            // Remove active class from all items
            document.querySelectorAll('.category-section li').forEach(li => {
                li.classList.remove('active');
            });
            
            // Add active class to clicked item
            item.classList.add('active');
            
            // Filter products
            if (subcategory) {
                displayProducts(data.products, category, subcategory);
            } else {
                displayProducts(data.products, category);
            }
        });
    });

    initializeSearch();
});
    // Gọi hàm kiểm tra và hiển thị sản phẩm
// Add scroll event listener for back-to-top button


// Add scroll event listener for back-to-top button
window.addEventListener('scroll', () => {
    const backToTop = document.querySelector('.back-to-top');
    if (window.scrollY > 300) {
        backToTop.classList.add('visible');
    } else {
        backToTop.classList.remove('visible');
    }
});

function showPaymentForm() {
    // Ẩn toàn bộ modal cũ và modal mới trước khi mở modal mới
    const dineInModal = document.getElementById('dineInPaymentModal');
    const takeawayModal = document.getElementById('takeawayPaymentModal');
    const oldPaymentForm = document.getElementById('paymentForm');
    const oldPaymentOverlay = document.querySelector('.payment-overlay');
    if (oldPaymentForm) oldPaymentForm.style.display = 'none';
    if (oldPaymentOverlay) oldPaymentOverlay.style.display = 'none';
    if (dineInModal) dineInModal.style.display = 'none';
    if (takeawayModal) takeawayModal.style.display = 'none';

    // Lấy loại đơn hàng
    const delivery = document.querySelector('input[name="delivery"]:checked')?.value;
    if (delivery === 'dine-in') {
        if (dineInModal) {
            dineInModal.style.display = 'flex';
            window.currentPaymentModal = dineInModal;
            // Cập nhật tổng tiền
            const total = document.querySelector('.total-price').textContent;
            dineInModal.querySelector('.total-price').textContent = total;
        }
    } else if (delivery === 'takeaway') {
        if (takeawayModal) {
            takeawayModal.style.display = 'flex';
            window.currentPaymentModal = takeawayModal;
            // Cập nhật tổng tiền
            const total = document.querySelector('.total-price').textContent;
            takeawayModal.querySelector('.total-price').textContent = total;
        }
    }
}

function updatePaymentSummary() {
    const subtotal = document.querySelector('.cart-total .total-price').textContent;
    const shippingFee = '30.000 VNĐ';
    
    document.querySelector('.order-summary .subtotal').textContent = subtotal;
    document.querySelector('.order-summary .final-total').textContent = 
        (parseInt(subtotal.replace(/\D/g,'')) + 30000).toLocaleString('vi-VN') + ' VNĐ';
}

function clearCart() {
    // Clear cart items
    document.querySelector('.cart-items').innerHTML = '';
    // Reset cart count
    cartCount = 0;
    document.querySelector('.cart-count').textContent = '0';
    // Reset cart totals
    document.querySelector('.subtotal-price').textContent = '0 VNĐ';
    document.querySelector('.total-price').textContent = '0 VNĐ';
    localStorage.removeItem('cartItems'); // Xóa giỏ hàng khỏi localStorage
}

async function loadProducts() {
    console.log('Loading products...');
    try {
        const response = await fetch('Asset/Data/products.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Products loaded:', data);
        return data;
    } catch (error) {
        console.error('Error loading products:', error);
        return { products: [] };
    }
}

function displayProducts(products, category = 'Tất cả', subcategory = null) {
    if (!currentFilters) {
        console.error('currentFilters not initialized');
        return;
    }
    currentFilters.category = category;
    currentFilters.subcategory = subcategory;
    updateSidebar(category);   
    applyFiltersAndRender();
}

function updateSidebar(category) {
    const sidebar = document.querySelector('.sidebar .category-menu');
    if (!sidebar) {
        console.error('Sidebar element not found');
        return;
    }
    
    switch(category) {
        case 'Bánh kem':
            sidebar.innerHTML = `
                <div class="category-section">
                    <h3>Phân loại bánh</h3>
                    <ul>  
                        <li data-subcategory="banh-san-co" class="active">Bánh sẵn có</li>
                        <li data-subcategory="dat-lam-banh">Đặt làm bánh</li>
                    </ul>
                </div>
                <div class="category-section">
                    <h3>Phong cách</h3>
                    <div class="filter-options" data-filter="style">
                        <button data-value="Ngọt ngào">Ngọt ngào</button>
                        <button data-value="Sang trọng">Sang trọng</button>
                        <button data-value="Đơn giản">Đơn giản</button>
                        <button data-value="Hoạt hình">Hoạt hình</button>
                    </div>
                </div>
                <div class="category-section">
                    <h3>Phù hợp với</h3>
                    <div class="filter-options" data-filter="suitable">
                        <button data-value="Nam">Nam</button>
                        <button data-value="Nữ">Nữ</button>
                        <button data-value="Trẻ em">Trẻ em</button>
                        <button data-value="Người lớn">Người lớn</button>
                    </div>
                </div>
                <div class="category-section">
                    <h3>Giá</h3>
                    <div class="price-range">
                        <select onchange="updatePriceFilter(this.value)">
                            <option value="">Tất cả giá</option>
                            <option value="0-100000">Dưới 100,000đ</option>
                            <option value="100000-200000">100,000đ - 200,000đ</option>
                            <option value="200000-300000">200,000đ - 300,000đ</option>
                            <option value="300000+">Trên 300,000đ</option>
                        </select>
                    </div>
                </div>
            `;
            break;

        case 'Đồ uống':
            sidebar.innerHTML = `
                <div class="category-section">
                    <h3>Loại đồ uống</h3>
                    <ul>
                        <li data-subcategory="coffee">Cà phê</li>
                        <li data-subcategory="tra">Trà</li>
                        <li data-subcategory="tra-sua">Trà sữa</li>
                        <li data-subcategory="nuoc-ngot">Nước ngọt</li>
                        <li data-subcategory="sinh-to">Sinh tố</li>
                    </ul>
                </div>
                <div class="category-section">
                    <h3>Nhiệt độ</h3>
                    <div class="filter-options" data-filter="temperature">
                        <button data-value="Nóng">Nóng</button>
                        <button data-value="Lạnh">Lạnh</button>
                    </div>
                </div>
                <div class="category-section">
                    <h3>Độ ngọt</h3>
                    <div class="filter-options" data-filter="sugar">
                        <button data-value="0%">0%</button>
                        <button data-value="30%">30%</button>
                        <button data-value="50%">50%</button>
                        <button data-value="100%">100%</button>
                    </div>
                </div>
                <div class="category-section">
                    <h3>Giá</h3>
                    <div class="price-range">
                        <select onchange="updatePriceFilter(this.value)">
                            <option value="">Tất cả giá</option>
                            <option value="0-30000">Dưới 30,000đ</option>
                            <option value="30000-50000">30,000đ - 50,000đ</option>
                            <option value="50000+">Trên 50,000đ</option>
                        </select>
                    </div>
                </div>
            `;
            break;

        case 'Đồ ăn':
            sidebar.innerHTML = `
                <div class="category-section">
                    <h3>Loại món</h3>
                    <ul>
                        <li data-subcategory="com">Cơm</li>
                        <li data-subcategory="mi">Mì</li>
                        <li data-subcategory="banh-mi">Bánh mì</li>
                        <li data-subcategory="an-vat">Ăn vặt</li>
                    </ul>
                </div>
                <div class="category-section">
                    <h3>Giá</h3>
                    <div class="price-range">
                        <select onchange="updatePriceFilter(this.value)">
                            <option value="">Tất cả giá</option>
                            <option value="0-30000">Dưới 30,000đ</option>
                            <option value="30000-50000">30,000đ - 50,000đ</option>
                            <option value="50000+">Trên 50,000đ</option>
                        </select>
                    </div>
                </div>
            `;
            break;

        default:
            // Xóa sidebar cho category "Tất cả"
            sidebar.innerHTML = '';
            break;
    }
    // Khởi tạo sự kiện cho sidebar mới
    initializeSidebarEvents();
}

function updatePriceFilter(range) {
    currentFilters.price = range;
    applyFiltersAndRender();
}

function applyFiltersAndRender() {
    let filteredProducts = loadedProducts;

    // Reset filters if category is "Tất cả"
    if (currentFilters.category === 'Tất cả') {
        resetCurrentFilters();
        renderProducts(filteredProducts);
        return;
    }

    // Lọc theo category
    if (currentFilters.category !== 'Tất cả') {
        filteredProducts = filteredProducts.filter(product => product.category === currentFilters.category);
    }

    // Lọc theo subcategory
    if (currentFilters.subcategory) {
        filteredProducts = filteredProducts.filter(product => product.subcategory === currentFilters.subcategory);
    }

    // Lọc theo các thuộc tính
    ['style', 'suitable', 'temperature', 'sugar'].forEach(filterType => {
        if (currentFilters[filterType] && currentFilters[filterType].length > 0) {
            filteredProducts = filteredProducts.filter(product => {
                if (!product.attributes || !product.attributes[filterType]) return false;
                if (Array.isArray(product.attributes[filterType])) {
                    return currentFilters[filterType].some(value => 
                        product.attributes[filterType].includes(value));
                } else {
                    return currentFilters[filterType].includes(product.attributes[filterType]);
                }
            });
        }
    });

    // Lọc theo giá
    if (currentFilters.price) {
        const [minStr, maxStr] = currentFilters.price.split('-');
        let min = parseInt(minStr);
        let max;
        if (maxStr === '+') {
            // Nếu là giá từ X trở lên
            filteredProducts = filteredProducts.filter(product => product.price >= min);
        } else if (maxStr) {
            // Nếu có khoảng giá từ min đến max
            max = parseInt(maxStr);
            filteredProducts = filteredProducts.filter(product => 
                product.price >= min && product.price <= max
            );
        }
    }

    renderProducts(filteredProducts);
}

function resetCurrentFilters() {
    currentFilters = {
        category: 'Tất cả',
        subcategory: null,
        style: [],
        suitable: [],
        temperature: [],
        sugar: [],
        price: null
    };
}

function initializeSidebarEvents() {
    // Xử lý subcategory
    document.querySelectorAll('.category-section li').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.category-section li').forEach(li => li.classList.remove('active'));
            item.classList.add('active'); 
            currentFilters.subcategory = item.dataset.subcategory;
            applyFiltersAndRender();
        });
    });

    // Xử lý filter buttons
    document.querySelectorAll('.filter-options button').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('active');
            const filterType = btn.parentElement.dataset.filter;
            const value = btn.dataset.value;
            
            if (btn.classList.contains('active')) {
                if (!currentFilters[filterType].includes(value)) {
                    currentFilters[filterType].push(value);
                }
            } else {
                currentFilters[filterType] = currentFilters[filterType].filter(v => v !== value);
            }
            
            applyFiltersAndRender();
        });
    });
}

function renderProducts(products) {
    console.log('Rendering products:', products);
    const container = document.querySelector('.products');
    if (!container) {
        console.error('Products container not found');
        return;
    }
    
    if (!products || products.length === 0) {
        container.innerHTML = `
            <div class="no-products">
                <i class="fas fa-search"></i>
                <p>Không tìm thấy sản phẩm phù hợp</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = products.map(product => `
        <div class="product" data-id="${product.id}">
            <div class="product-image-container" onclick="showProductDetails(${product.id})">
                <img src="${product.image}" 
                     alt="${product.name}" 
                     loading="lazy"
                     onload="this.classList.add('loaded')"
                     onerror="this.src='Asset/images/default.jpg'; this.classList.add('loaded')">
                <div class="quick-add">
                    <button onclick="event.stopPropagation(); addToCart(${JSON.stringify(product)})">
                        <i class="fas fa-shopping-cart"></i>
                        Thêm vào giỏ hàng
                    </button>
                </div>
            </div>
            <h3>${product.name}</h3>
            <div class="product-rating">
                ${renderStars(product.rating || 0)}
                <span class="rating-count">${product.ratingCount || 0} đánh giá</span>
            </div>
            <p class="price">${product.price.toLocaleString('vi-VN')} VNĐ</p>
        </div>
    `).join('');
}

// Thêm hàm để kiểm tra việc load sản phẩm
async function checkAndDisplayProducts() {
    console.log('Checking products...');
    try {
        const data = await loadProducts();
        console.log('Loaded products:', data);
        if (data && data.products) {
            loadedProducts = data.products;
            displayProducts(loadedProducts);
        } else {
            console.error('No products found in data');
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

async function showProductDetails(productId) {
    try {
        const product = loadedProducts.find(p => p.id === productId);
        if (!product) {
            console.error('Product not found:', productId);
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'product-modal';
        modal.innerHTML = `
            <div class="modal-header">
                <button class="modal-close" onclick="closeProductModal(this)">&times;</button>
            </div>
            <div class="modal-content">
                <div class="product-gallery">
                    <img src="${product.image}" alt="${product.name}">
                </div>
                <div class="product-info">
                    <h2 class="product-title">${product.name}</h2>
                    <div class="product-rating">
                        ${renderStars(product.rating)}
                        <span class="rating-count">${product.ratingCount} đánh giá</span>
                    </div>
                    <p class="product-price">${product.price.toLocaleString('vi-VN')} VNĐ</p>
                    ${product.options ? renderProductOptions(product.options) : ''}
                    <div class="quantity-selector">
                        <button class="qty-btn minus" onclick="updateQuantityModal(this, -1)">-</button>
                        <span>1</span>
                        <button class="qty-btn plus" onclick="updateQuantityModal(this, 1)">+</button>
                    </div>
                    <button class="add-to-cart-btn" onclick="addToCartFromModal(${product.id})">
                        <i class="fas fa-cart-plus"></i>
                        Thêm vào giỏ hàng
                    </button>
                </div>
                ${renderReviews(product.reviews || [])}
            </div>
        `;

        // Ensure overlay exists and is active before appending modal
        const overlay = document.querySelector('.dropdown-overlay');
        if (overlay) {
            overlay.classList.add('active');
        }

        // Clean up any existing modals
        const existingModal = document.querySelector('.product-modal');
        if (existingModal) {
            existingModal.remove();
        }

        document.body.appendChild(modal);
        modal.style.display = 'block';

    } catch (error) {
        console.error('Error showing product details:', error);
    }
}

function renderProductOptions(options) {
    return Object.entries(options).map(([groupName, values]) => `
        <h4>${formatOptionName(groupName)}</h4>
        <div class="option-group">
            <div class="option-buttons">
                ${values.map(value => `
                    <button class="option-button" onclick="toggleOption(this)" data-group="${groupName}">
                        ${value}
                    </button>
                `).join('')}
            </div>
        </div>
    `).join('');
}

function formatOptionName(name) {
    return name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, ' $1');
}

function renderReviews(reviews) {
    if (!reviews || reviews.length === 0) {
        return '<p>Chưa có đánh giá nào cho sản phẩm này</p>';
    }
    return reviews.map(review => `
        <div class="review-item">
            <img src="${review.avatar}" alt="${review.userName}" class="review-avatar">
            <div class="review-content">
                <div class="review-header">
                    <strong>${review.userName}</strong>
                    <div>${renderStars(review.rating)}</div>
                    <span class="review-date">${new Date(review.date).toLocaleDateString('vi-VN')}</span>
                </div>
                <p class="review-text">${review.comment}</p>
            </div>
        </div>
    `).join('');
}

function closeProductModal(closeBtn) {
    const modal = closeBtn.closest('.product-modal');
    const overlay = document.querySelector('.dropdown-overlay');
    modal.remove();
    overlay.classList.remove('active');
}

function toggleOption(button) {
    const group = button.parentElement;
    group.querySelectorAll('.option-button').forEach(btn => 
        btn.classList.remove('selected'));
    button.classList.add('selected');
}

function updateQuantityModal(btn, change) {
    const span = btn.parentElement.querySelector('span');
    let quantity = parseInt(span.textContent) + change;
    if (quantity > 0) {
        span.textContent = quantity;
    }
}

function addToCartFromModal(productId) {
    const product = loadedProducts.find(p => p.id === productId);
    if (!product) return;

    const modal = document.querySelector('.product-modal');
    const quantity = parseInt(modal.querySelector('.quantity-selector span').textContent);
    const selectedOptions = {};
    
    modal.querySelectorAll('.option-button.selected').forEach(btn => {
        const group = btn.dataset.group;
        selectedOptions[group] = btn.textContent.trim();
    });
    
    // Thêm một lần với số lượng chỉ định
    addToCart({...product, selectedOptions}, quantity);
    
    closeProductModal(modal.querySelector('.modal-close'));
}

function initializeCakeFilters() {
    // Subcategory switching
    document.querySelectorAll('.subcategory-selector button').forEach(btn => {
        btn.addEventListener('click', () => {
            const isCustom = btn.dataset.subcategory === 'dat-lam-banh';
            document.getElementById('banhSanCoFilters').style.display = isCustom ? 'none' : 'flex'; 
            document.getElementById('datLamBanhForm').style.display = isCustom ? 'block' : 'none';     
            document.querySelector('.products-grid').style.display = isCustom ? 'none' : 'grid';            
            document.querySelectorAll('.subcategory-selector button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Filter buttons
    document.querySelectorAll('.filter-options button').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('active');
            applyFilters();
        });
    });
}

function applyFilters() {
    const activeFilters = {};
    document.querySelectorAll('.filter-options').forEach(group => {
        const filterType = group.dataset.filter;
        activeFilters[filterType] = [];
        group.querySelectorAll('button.active').forEach(btn => {
            activeFilters[filterType].push(btn.dataset.value);
        });
    });

    document.querySelectorAll('.products-grid .product').forEach(product => {
        const attributes = JSON.parse(product.dataset.attributes || '{}');
        let shouldShow = true;

        Object.entries(activeFilters).forEach(([filter, values]) => {
            if (values.length > 0) {
                const productValues = attributes[filter] || [];
                shouldShow = shouldShow && values.some(v => 
                    Array.isArray(productValues) 
                        ? productValues.includes(v)
                        : productValues === v
                );
            }
        });

        product.style.display = shouldShow ? 'block' : 'none';
    });
}

function handleCustomCakeOrder(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const orderDetails = Object.fromEntries(formData);
    
    addNotification(`Đã nhận yêu cầu đặt bánh. Chúng tôi sẽ liên hệ với bạn sớm!`, 'success');
    event.target.reset();
}

function showUserProfile() {
    const user = JSON.parse(localStorage.getItem('currentUser')); // Thay đổi từ sessionStorage sang localStorage
    if (!user) return;

    document.getElementById('profileName').value = user.name;   
    document.getElementById('profileEmail').value = user.email;    
    document.querySelector('.profile-avatar').src = user.avatar;    
    
    // Hiển thị lịch sử đơn hàng nếu có
    if (user.orderHistory && user.orderHistory.length > 0) {
        displayOrderHistory(user.orderHistory);
    } else {
        document.querySelector('.order-list').innerHTML = `
            <div class="order-item">
                <p style="text-align: center; color: #666;">Chưa có lịch sử đơn hàng</p>
            </div>
        `;
    }
    
    document.querySelector('.profile-overlay').style.display = 'flex';
}

function showOrderHistory() {
    const user = JSON.parse(localStorage.getItem('currentUser')); // Thay đổi từ sessionStorage sang localStorage
    if (!user) return;
    
    // Hiển thị overlay profile và scroll đến phần lịch sử đơn hàng
    document.querySelector('.profile-overlay').style.display = 'flex';
    document.querySelector('.order-history').scrollIntoView({ behavior: 'smooth' });
}

function displayOrderHistory(orders) {
    const orderList = document.querySelector('.order-list');
    orderList.innerHTML = orders.map(order => `
        <div class="order-item">
            <div class="order-header">
                <strong>Mã đơn: ${order.id}</strong>
                <div>${new Date(order.date).toLocaleDateString('vi-VN')}</div>
                <div class="order-status">${order.status}</div>
            </div>
            <div class="order-items">
                ${order.items.map(item => `
                    <div class="order-product">
                        ${item.name} x${item.quantity} - ${item.price.toLocaleString('vi-VN')} VNĐ
                    </div>
                `).join('')}
            </div>
            <div class="order-total">
                <strong>Tổng cộng: ${order.total.toLocaleString('vi-VN')} VNĐ</strong>
            </div>
        </div>
    `).join('');
}

// Thêm biến global để lưu kết quả tìm kiếm
let searchTimeout;
let searchResults = [];

function initializeSearch() {
    const searchInput = document.querySelector('.search-bar input');
    const searchBtn = document.querySelector('.search-btn');
    
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        // Tạo delay để tránh search quá nhiều
        searchTimeout = setTimeout(() => {
            const query = e.target.value.toLowerCase().trim();
            handleSearch(query);
        }, 300);
    });

    searchInput.addEventListener('focus', () => {
        if (searchResults.length > 0) {
            showSearchSuggestions(searchResults);
        }
    });

    searchBtn.addEventListener('click', () => {
        const query = searchInput.value.toLowerCase().trim();
        if (query) {
            handleSearch(query, true); // true = force search
        }
    });

    // Đóng suggestions khi click ngoài
    document.addEventListener('click', (e) => {
        const searchContainer = document.querySelector('.search-bar');
        const suggestionBox = document.querySelector('.search-suggestions');
        if (!searchContainer.contains(e.target) && suggestionBox) {
            suggestionBox.remove();
        }
    });
}

function handleSearch(query, forceSearch = false) {
    if (!query) {
        const suggestionBox = document.querySelector('.search-suggestions');
        if (suggestionBox) suggestionBox.remove();
        if (forceSearch) {
            resetSearchAndDisplayAll();
        }
        return;
    }
    
    searchResults = loadedProducts.filter(product => {
        const searchableText = `${product.name} ${product.description} ${product.category}`.toLowerCase();
        return searchableText.includes(query);
    });

    if (forceSearch) {
        // Hiển thị kết quả tìm kiếm trong grid sản phẩm
        renderProducts(searchResults);
        const suggestionBox = document.querySelector('.search-suggestions');
        if (suggestionBox) suggestionBox.remove();
    } else {
        // Hiển thị gợi ý
        showSearchSuggestions(searchResults);
    }
}

function showSearchSuggestions(results) {
    let suggestionBox = document.querySelector('.search-suggestions');
    if (!suggestionBox) {
        suggestionBox = document.createElement('div');
        suggestionBox.className = 'search-suggestions';
        document.querySelector('.search-bar').appendChild(suggestionBox);
    }

    const maxSuggestions = 5;
    const suggestions = results.slice(0, maxSuggestions);
    
    suggestionBox.innerHTML = suggestions.length > 0 ? `
        ${suggestions.map(product => `
            <div class="suggestion-item" onclick="selectSuggestion('${product.name}')">
                <img src="${product.image}" alt="${product.name}">
                <div class="suggestion-details">
                    <div class="suggestion-name">${product.name}</div>
                    <div class="suggestion-price">${product.price.toLocaleString('vi-VN')} VNĐ</div>
                    <div class="suggestion-category">${product.category}</div>
                </div>
            </div>
        `).join('')}
        ${results.length > maxSuggestions ? 
            `<div class="suggestion-more">Xem thêm ${results.length - maxSuggestions} kết quả...</div>` : 
            ''}
    ` : '<div class="no-suggestions">Không tìm thấy kết quả</div>';
}

function selectSuggestion(productName) {
    const searchInput = document.querySelector('.search-bar input');
    searchInput.value = productName;
    handleSearch(productName, true);
}

function resetSearchAndDisplayAll() {
    displayProducts(loadedProducts, currentFilters.category);
}