export const Footer = () => {
    return (
        <footer>
            <div>
                <h3>Về chúng tôi</h3>
                <p>
                    <i className="fas fa-store"></i>
                    Store chuyên cung cấp các loại bánh, đồ uống và thức ăn nhanh.
                </p>
                <p>
                    <i className="fas fa-map-marker-alt"></i>
                    123 Đường ABC, Quận XYZ, TP.HCM
                </p>
                <p>
                    <i className="fas fa-phone"></i>
                    1900 1234
                </p>
                <p>
                    <i className="fas fa-envelope"></i>
                    info@store.com
                </p>
            </div>

            <div>
                <h3>Mạng xã hội</h3>
                <div className="social-icons">
                    <a href="#" target="_blank" rel="noopener noreferrer">
                        <i className="fab fa-facebook"></i>
                    </a>
                    <a href="#" target="_blank" rel="noopener noreferrer">
                        <i className="fab fa-instagram"></i>
                    </a>
                    <a href="#" target="_blank" rel="noopener noreferrer">
                        <i className="fab fa-youtube"></i>
                    </a>
                </div>
                <div className="map-container">
                    <iframe
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.1235641承"
                        allowFullScreen
                        loading="lazy"
                        title="Store location"
                    ></iframe>
                </div>
            </div>

            <div>
                <h3>FAQ</h3>
                <p>
                    <strong>Q:</strong> Thời gian giao hàng?
                    <br />
                    <strong>A:</strong> 30-45 phút trong khu vực nội thành
                </p>
                <p>
                    <strong>Q:</strong> Phương thức thanh toán?
                    <br />
                    <strong>A:</strong> Tiền mặt, chuyển khoản, ví điện tử
                </p>
                <p>
                    <strong>Q:</strong> Phí giao hàng?
                    <br />
                    <strong>A:</strong> Miễn phí trong bán kính 3km
                </p>
            </div>
        </footer>
    );
};